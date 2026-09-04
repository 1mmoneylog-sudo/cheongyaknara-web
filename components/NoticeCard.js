import Link from "next/link";
import { getDday, getUrgencyLevel, getProgressPercent } from "../lib/dday";

function isRecentlyAnnounced(announceDate, windowDays = 3) {
  if (!announceDate) return false;
  const cleaned = String(announceDate).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return false;
  const d = new Date(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= windowDays;
}

/** 항상 정해진 항목만, 정해진 순서로 렌더링. 값이 없으면 "-"로 표시 */
function MetaRow({ items }) {
  return (
    <div className="meta-row">
      {items.map((it, i) => (
        <span key={it.label}>
          {i > 0 && <span className="meta-divider">|</span>}
          {it.label} <b>{it.value ?? "-"}</b>
        </span>
      ))}
    </div>
  );
}

export default function NoticeCard({ notice, bookmarked, onToggleBookmark, closed = false }) {
  const dday = getDday(notice.apply_end_date);
  const urgency = closed ? "calm" : getUrgencyLevel(dday);
  const progress = getProgressPercent(notice.apply_start_date, notice.apply_end_date);
  const isNew = !closed && isRecentlyAnnounced(notice.announce_date);
  const applyRange =
    notice.apply_start_date && notice.apply_end_date
      ? `${notice.apply_start_date} ~ ${notice.apply_end_date}`
      : notice.apply_end_date
      ? `~${notice.apply_end_date}`
      : null;

  function handleBookmarkClick(e) {
    if (!onToggleBookmark) return;
    e.preventDefault();
    e.stopPropagation();
    onToggleBookmark(notice.id);
  }

  return (
    <Link href={`/notice/${notice.id}`} className={`card ${urgency}`} style={closed ? { opacity: 0.75 } : undefined}>
      <div className="card-body">
        <div className="badge-row">
          {isNew && <span className="badge new">NEW</span>}
          <span className="badge agency">{notice.source_agency}</span>
          {notice.notice_type && <span className="badge type">{notice.notice_type}</span>}
          {notice.supply_kind && <span className="badge kind">{notice.supply_kind}</span>}
        </div>
        <p className="card-title">{notice.title}</p>
        <MetaRow
          items={[
            { label: "위치", value: notice.region_sido },
            { label: "모집세대수", value: notice.household_count },
            { label: "접수기간", value: applyRange },
            { label: "당첨자발표", value: notice.winner_date },
          ]}
        />
      </div>
      <div className="dday-block">
        <div className="dday-foot">
          {onToggleBookmark && (
            <div className={`bookmark ${bookmarked ? "active" : ""}`} onClick={handleBookmarkClick}>
              {bookmarked ? "★" : "☆"}
            </div>
          )}
          <div className={`dday-num mono ${urgency}`}>
            {closed || dday === null || dday < 0 ? "마감" : `D-${dday}`}
          </div>
        </div>
        {!closed && (
          <div className="gauge">
            <div className={`gauge-fill ${urgency}`} style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="dday-sub mono">~{notice.apply_end_date ?? "-"}</div>
      </div>
    </Link>
  );
}
