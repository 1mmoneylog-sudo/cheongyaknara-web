import Link from "next/link";
import noticesData from "../../data/notices.json";
import { getDday, getUrgencyLevel } from "../../lib/dday";

export async function getStaticPaths() {
  const paths = noticesData.notices.map((n) => ({ params: { id: n.id } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const notice = noticesData.notices.find((n) => n.id === params.id);
  if (!notice) return { notFound: true };
  return { props: { notice } };
}

export default function NoticeDetail({ notice }) {
  const dday = getDday(notice.apply_end_date);
  const urgency = getUrgencyLevel(dday);

  return (
    <div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="dot" />
            청약나라
          </Link>
        </div>
      </header>

      <div className="detail-hero">
        <div className="inner">
          <div className="badge-row">
            <span className="badge agency">{notice.source_agency}</span>
            {notice.notice_type && <span className="badge type">{notice.notice_type}</span>}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "10px 0 0" }}>{notice.title}</h1>
        </div>
      </div>

      <div className="layout" style={{ maxWidth: 800 }}>
        <div className={`info-card`} style={{ borderLeft: `5px solid var(--${urgency})` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>접수기간</div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                {notice.apply_start_date ?? "-"} ~ {notice.apply_end_date ?? "-"}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 800 }}>
              {dday === null ? "-" : dday >= 0 ? `D-${dday}` : "마감"}
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3>공급 정보</h3>
          <div className="info-row">
            <span>위치</span>
            <span>{notice.address_detail ?? notice.region_sido ?? "-"}</span>
          </div>
          <div className="info-row">
            <span>세대수</span>
            <span>{notice.household_count ?? "-"}</span>
          </div>
          <div className="info-row">
            <span>전용면적</span>
            <span>{notice.area_range ? `${notice.area_range}㎡` : "-"}</span>
          </div>
          <div className="info-row">
            <span>당첨자 발표</span>
            <span>{notice.winner_date ?? "-"}</span>
          </div>
        </div>

        {notice.unit_types?.length > 0 && (
          <div className="info-card">
            <h3>주택형별 상세</h3>
            {notice.unit_types.map((u, i) => (
              <div className="info-row" key={i}>
                <span>
                  {u.type} ({u.area}㎡)
                </span>
                <span>{u.household_count}세대</span>
              </div>
            ))}
          </div>
        )}

        {notice.attachment_urls?.length > 0 && (
          <div className="info-card file-list">
            <h3>첨부파일</h3>
            {notice.attachment_urls.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer">
                📎 {f.label} — {f.name}
              </a>
            ))}
          </div>
        )}

        {notice.detail_url && (
          <a
            href={notice.detail_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              textAlign: "center",
              background: "var(--brand)",
              color: "#fff",
              padding: 14,
              borderRadius: 10,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            원문 공고 보기 →
          </a>
        )}
      </div>
    </div>
  );
}
