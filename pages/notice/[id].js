import Link from "next/link";
import { useState } from "react";
import noticesData from "../../data/notices.json";
import { getDday, getUrgencyLevel, getProgressPercent } from "../../lib/dday";

export async function getStaticPaths() {
  const paths = noticesData.notices.map((n) => ({ params: { id: n.id } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const notice = noticesData.notices.find((n) => n.id === params.id);
  if (!notice) return { notFound: true };
  return { props: { notice } };
}

function isRecentlyAnnounced(announceDate) {
  if (!announceDate) return false;
  const cleaned = String(announceDate).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return false;
  const d = new Date(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

export default function NoticeDetail({ notice }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const isNew = isRecentlyAnnounced(notice.announce_date);

  const dday = getDday(notice.apply_end_date);
  const urgency = getUrgencyLevel(dday);
  const progress = getProgressPercent(notice.apply_start_date, notice.apply_end_date);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: notice.title, url });
        return;
      } catch (e) {
        /* 사용자가 공유 취소 */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="dot" />
            청약나라
          </Link>
          <nav>
            <Link href="/">모집공고</Link>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
          </nav>
        </div>
      </header>

      <div className="breadcrumb-wrap">
        <div className="breadcrumb">
          <Link href="/">홈</Link> › <Link href="/">모집공고</Link> › 상세
        </div>
      </div>

      <div className="detail-hero">
        <div className="inner">
          <div className="badge-row">
            {isNew && <span className="badge new">NEW</span>}
            <span className="badge agency">{notice.source_agency}</span>
            {notice.notice_type && <span className="badge type">{notice.notice_type}</span>}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "10px 0 8px", lineHeight: 1.4 }}>
            {notice.title}
          </h1>
          <div style={{ fontSize: 13.5, color: "#B9CADA" }}>
            {notice.source_agency} 공식 공고
            {notice.announce_date ? ` · 게시일 ${notice.announce_date}` : ""}
          </div>
        </div>
      </div>

      <div className="layout" style={{ maxWidth: 800, display: "block" }}>
        <div className="warning-box">
          ⚠️ 꼭 확인하세요 — 이 페이지는 공공데이터포털 API로 자동 수집된 요약 정보입니다. 정확한 자격요건·제출서류·평형별
          보증금은 반드시 <b>원문 공고문(PDF/HWP)</b>을 확인하세요.
        </div>

        <div className="info-card">
          <h3>기본 정보</h3>
          <div className="info-row">
            <span>공급기관</span>
            <span>{notice.source_agency}</span>
          </div>
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
            <span>접수기간</span>
            <span>
              {notice.apply_start_date ?? "-"} ~ {notice.apply_end_date ?? "-"}
              {dday !== null && (
                <span className={`inline-dday ${urgency}`}> D-{dday >= 0 ? dday : "마감"}</span>
              )}
            </span>
          </div>
          <div className="info-row">
            <span>입주예정</span>
            <span>{notice.move_in_date ?? "정보 없음"}</span>
          </div>
          <div className="info-row">
            <span>당첨자 발표</span>
            <span>{notice.winner_date ?? "정보 없음"}</span>
          </div>
        </div>

        {notice.unit_types?.length > 0 && (
          <div className="info-card">
            <h3>주택형별 상세</h3>
            {notice.unit_types.map((u, i) => (
              <div className="info-row" key={i}>
                <span>
                  {u.type ? `${u.type} · ` : ""}
                  {u.area}㎡
                </span>
                <span>{u.household_count}세대</span>
              </div>
            ))}
          </div>
        )}

        {(notice.attachment_urls?.length > 0 || notice.image_urls?.length > 0) && (
          <div className="info-card file-list">
            <h3>첨부파일 · 이미지</h3>
            {notice.attachment_urls?.map((f, i) => (
              <a key={`f${i}`} href={f.url} target="_blank" rel="noreferrer">
                📎 {f.label} — {f.name}
              </a>
            ))}
            {notice.image_urls?.map((img, i) => (
              <a key={`i${i}`} href={img.url} target="_blank" rel="noreferrer">
                🖼️ {img.label}
              </a>
            ))}
          </div>
        )}

        {(notice.contact_phone || notice.contact_address) && (
          <div className="info-card">
            <h3>담당자·접수처 정보</h3>
            {notice.contact_phone && (
              <div className="info-row">
                <span>연락처</span>
                <span>{notice.contact_phone}</span>
              </div>
            )}
            {notice.contact_address && (
              <div className="info-row">
                <span>접수처 주소</span>
                <span>{notice.contact_address}</span>
              </div>
            )}
            {notice.contact_note && (
              <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.6 }}>
                {notice.contact_note}
              </p>
            )}
          </div>
        )}

        {notice.etc_note && (
          <div className="info-card">
            <h3>유의사항</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {notice.etc_note}
            </p>
          </div>
        )}

        {/* 하단 D-day 요약 스트립 */}
        <div className={`summary-strip ${urgency}`}>
          <div className={`summary-dday mono ${urgency}`}>
            {dday === null ? "-" : dday >= 0 ? `D-${dday}` : "마감"}
          </div>
          <div className="summary-chips">
            <div className="summary-chip">
              <div className="label">세대수</div>
              <div className="value">{notice.household_count ?? "-"}</div>
            </div>
            <div className="summary-chip">
              <div className="label">전용면적</div>
              <div className="value">{notice.area_range ? `${notice.area_range}㎡` : "-"}</div>
            </div>
            <div className="summary-chip">
              <div className="label">공급유형</div>
              <div className="value">{notice.supply_kind ?? "-"}</div>
            </div>
          </div>
          <div className="gauge" style={{ marginTop: 10 }}>
            <div className={`gauge-fill ${urgency}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="action-row">
          <button
            className={`action-btn ${bookmarked ? "active" : ""}`}
            onClick={() => setBookmarked((v) => !v)}
          >
            {bookmarked ? "★ 관심 등록됨" : "☆ 관심 등록"}
          </button>
          <button className="action-btn" onClick={handleShare}>
            {copied ? "링크 복사됨!" : "🔗 공유"}
          </button>
        </div>

        {notice.detail_url && (
          <a href={notice.detail_url} target="_blank" rel="noreferrer" className="primary-btn">
            원문 공고 보기 →
          </a>
        )}
        <Link href="/" className="secondary-btn">
          목록으로
        </Link>

        <div className="bottom-links">
          <div className="side-card">
            <h3>기관별 공고 더보기</h3>
            <div className="type-grid">
              <Link href="/?agency=LH">LH 공고</Link>
              <Link href="/?agency=GH">GH 공고</Link>
            </div>
          </div>
          {notice.region_sido && (
            <div className="side-card">
              <h3>같은 지역 공고 더보기</h3>
              <div className="type-grid">
                <Link href={`/?region=${encodeURIComponent(notice.region_sido)}`}>{notice.region_sido}</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
