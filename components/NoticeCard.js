import Link from "next/link";
import { useEffect, useState } from "react";
import { getDday, getUrgencyLevel, getProgressPercent } from "../lib/dday";
import { useUser } from "../lib/useUser";
import { supabase } from "../lib/supabaseClient";

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
      {items.map((it) => (
        <span key={it.label} className="meta-item">
          {it.label} <b>{it.value ?? "-"}</b>
        </span>
      ))}
    </div>
  );
}

export default function NoticeCard({ notice, bookmarked, onBookmarkChange, closed = false }) {
  const { user } = useUser();

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

  const [isBookmarked, setIsBookmarked] = useState(!!bookmarked);
  const [busy, setBusy] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    setIsBookmarked(!!bookmarked);
  }, [bookmarked]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2200);
  }

  async function handleBookmarkClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (busy) return;
    setBusy(true);

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from("user_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("notice_id", notice.id);
        if (error) throw error;
        setIsBookmarked(false);
        showToast("관심공고에서 삭제했습니다.");
        onBookmarkChange?.(notice.id, false);
      } else {
        const { error } = await supabase.from("user_bookmarks").insert({
          user_id: user.id,
          notice_id: notice.id,
          notice_title: notice.title,
          region_sido: notice.region_sido ?? null,
          source_agency: notice.source_agency ?? null,
          apply_start_date: notice.apply_start_date ?? null,
          apply_end_date: notice.apply_end_date ?? null,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
        setIsBookmarked(true);
        showToast("관심공고에 저장했습니다.");
        onBookmarkChange?.(notice.id, true);
      }
    } catch (err) {
      console.error("북마크 처리 실패:", err);
      showToast("오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
          <button
            type="button"
            className={`bookmark-btn ${isBookmarked ? "active" : ""}`}
            onClick={handleBookmarkClick}
          >
            {isBookmarked ? "♥ 관심공고 등록됨" : "♡ 관심공고 등록"}
          </button>
          <div className="dday-foot">
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

      {toastMsg && <div className="toast-message">{toastMsg}</div>}

      {showLoginModal && (
        <div className="report-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-prompt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowLoginModal(false)}>
              ✕
            </button>
            <h4>마음에 드는 청약, 저장해두세요.</h4>
            <p>관심공고로 저장하면 마이페이지에서 접수일정과 함께 관리할 수 있습니다.</p>
            <div className="login-prompt-benefits">
              <div>♡ 관심공고 저장</div>
              <div>📅 접수일정 관리</div>
              <div>🔔 새로운 공고 알림</div>
            </div>
            <a href="/signup" className="primary-btn">
              무료 회원가입
            </a>
            <a href="/login" className="secondary-btn">
              로그인
            </a>
          </div>
        </div>
      )}
    </>
  );
}
