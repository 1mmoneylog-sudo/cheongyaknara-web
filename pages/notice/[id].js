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

function parseFlex(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return null;
  return new Date(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
}

function formatKorean(d) {
  if (!d) return null;
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${weekday})`;
}

/** 이 공고의 접수기간·당첨자발표일을 표시하는 미니 캘린더 (해당 월 기준, 읽기 전용) */
function MiniCalendar({ startDate, endDate, winnerDate }) {
  const start = parseFlex(startDate);
  const end = parseFlex(endDate);
  const winner = parseFlex(winnerDate);
  const anchor = start || end || winner;
  if (!anchor) return null;

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function cellType(d) {
    if (!d) return null;
    const cur = new Date(year, month, d).getTime();
    if (start && end && cur >= start.setHours(0, 0, 0, 0) && cur <= end.setHours(23, 59, 59, 999)) return "apply";
    if (winner && new Date(year, month, d).toDateString() === winner.toDateString()) return "winner";
    return null;
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-title">
        {year}년 {month + 1}월
      </div>
      <div className="mini-calendar-grid">
        {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
          <div key={w} className="mini-calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          const type = cellType(d);
          return (
            <div key={i} className={`mini-calendar-cell ${type ?? ""}`}>
              {d ?? ""}
            </div>
          );
        })}
      </div>
      <div className="mini-calendar-legend">
        <span>
          <i className="dot apply" /> 접수기간
        </span>
        <span>
          <i className="dot winner" /> 당첨자발표
        </span>
      </div>
    </div>
  );
}

export default function NoticeDetail({ notice }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const ai = notice.ai_analysis;

  const [reportOpen, setReportOpen] = useState(false);
const [reportText, setReportText] = useState("");
const [reportCopied, setReportCopied] = useState(false);
const KAKAO_LINK = "https://open.kakao.com/o/sJ2e8KMi";

async function handleReportSend() {
  const message = `[공고 신고] ${notice.title}\n${typeof window !== "undefined" ? window.location.href : ""}\n\n${reportText || "(내용 없음)"}`;
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(message);
      setReportCopied(true);
    } catch (e) {}
  }
  window.open(KAKAO_LINK, "_blank", "noopener,noreferrer");
  setTimeout(() => {
    setReportOpen(false);
    setReportCopied(false);
    setReportText("");
  }, 1200);
}
  const isNew = isRecentlyAnnounced(notice.announce_date);

  const dday = getDday(notice.apply_end_date);
  const urgency = getUrgencyLevel(dday);
  const progress = getProgressPercent(notice.apply_start_date, notice.apply_end_date);
  const endDateObj = parseFlex(notice.apply_end_date);

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
      <div className="layout">
        {/* ===== 왼쪽: 본문 ===== */}
        <div className="main-col">
          <div className="badge-row">
            {isNew && <span className="badge new">NEW</span>}
            <span className="badge agency">{notice.source_agency}</span>
            {notice.notice_type && <span className="badge type">{notice.notice_type}</span>}
            {notice.supply_kind && <span className="badge kind">{notice.supply_kind}</span>}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "10px 0 8px", lineHeight: 1.4 }}>
            {notice.title}
          </h1>
          <div style={{ fontSize: 13.5, color: "var(--ink-faint)", marginBottom: 20 }}>
            {notice.source_agency} 공식 공고
            {notice.announce_date ? ` · 게시일 ${notice.announce_date}` : ""}
            {notice.address_detail ? ` · 조회 ${notice.address_detail}` : ""}
          </div>

          <div className="warning-box">
            ⚠️ 꼭 확인하세요 — 이 페이지는 공공데이터포털 API로 자동 수집된 요약 정보입니다. 정확한 자격요건·제출서류·평형별
            보증금은 반드시 <b>원문 공고문(PDF/HWP)</b>을 확인하세요.
          </div>
{/* ⚠️ warning-box 아래에 이 AI 카드 블록을 그대로 추가하세요 */}
          {ai && (
            <div className="info-card" style={{ border: "1.5px solid #3b82f6", backgroundColor: "#f0f7ff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "20px" }}>🤖</span>
                <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "17px", fontWeight: "bold" }}>
                  AI 공고문 핵심 요약
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", lineHeight: "1.6" }}>
                {ai.price_and_finance && (
                  <div>
                    <strong style={{ color: "#1d4ed8" }}>💰 분양가 및 대출 조건</strong>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                      {ai.price_and_finance.max_price && <li>최고 분양가: {ai.price_and_finance.max_price}</li>}
                      {ai.price_and_finance.payment_schedule && <li>납부 일정: {ai.price_and_finance.payment_schedule}</li>}
                      {ai.price_and_finance.financing_conditions && <li>대출 조건: {ai.price_and_finance.financing_conditions}</li>}
                    </ul>
                  </div>
                )}

                {ai.qualification_and_conditions && (
                  <div>
                    <strong style={{ color: "#1d4ed8" }}>📋 자격 요건 및 제한 사항</strong>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                      {ai.qualification_and_conditions.residence_requirement && <li>거주 요건: {ai.qualification_and_conditions.residence_requirement}</li>}
                      {ai.qualification_and_conditions.home_ownership && <li>주택 소유 여부: {ai.qualification_and_conditions.home_ownership}</li>}
                      {ai.qualification_and_conditions.restrictions && <li>제한 사항: {ai.qualification_and_conditions.restrictions}</li>}
                    </ul>
                  </div>
                )}

                {ai.supply_and_selection && (
                  <div>
                    <strong style={{ color: "#1d4ed8" }}>📊 공급 규모 및 당첨자 선정 방식</strong>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                      {ai.supply_and_selection.supply_types && <li>공급 유형: {ai.supply_and_selection.supply_types}</li>}
                      {ai.supply_and_selection.selection_method && <li>선정 방식: {ai.supply_and_selection.selection_method}</li>}
                    </ul>
                  </div>
                )}

                {ai.location_and_complex && (
                  <div>
                    <strong style={{ color: "#1d4ed8" }}>🏘️ 입지 환경 및 단지 특징</strong>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                      {ai.location_and_complex.location_info && <li>입지 정보: {ai.location_and_complex.location_info}</li>}
                      {ai.location_and_complex.move_in_date && <li>입주 예정 시기: {ai.location_and_complex.move_in_date}</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
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
        </div>

        {/* ===== 오른쪽: 사이드바 (위원나라 스타일) ===== */}
        <aside className="sidebar detail-sidebar">
          <div className={`dday-hero-box ${urgency}`}>
            <div className="dday-hero-date">{endDateObj ? formatKorean(endDateObj) : "마감일 미정"} 마감</div>
            <div className="dday-hero-num mono">
              {dday === null ? "-" : dday >= 0 ? `D-${dday}` : "마감"}
            </div>
            <div className="gauge" style={{ marginTop: 10 }}>
              <div className={`gauge-fill ${urgency}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="stat-box-row">
            <div className="stat-box">
              <div className="label">세대수</div>
              <div className="value">{notice.household_count ?? "-"}</div>
            </div>
            <div className="stat-box">
              <div className="label">전용면적</div>
              <div className="value">{notice.area_range ? `${notice.area_range}㎡` : "-"}</div>
            </div>
          </div>
          <div className="stat-box-row">
            <div className="stat-box wide">
              <div className="label">당첨자 발표</div>
              <div className="value">{notice.winner_date ?? "정보 없음"}</div>
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
              {copied ? "복사됨!" : "🔗 공유"}
            </button>
          </div>
<button className="secondary-btn" style={{ marginBottom: 14 }} onClick={() => setReportOpen(true)}>
  이 공고 이상해요
</button>

{reportOpen && (
  <div className="report-modal-overlay" onClick={() => setReportOpen(false)}>
    <div className="report-modal" onClick={(e) => e.stopPropagation()}>
      <h4>이 공고 이상해요</h4>
      <p>잘못된 부분을 알려주시면 바로 확인합니다. 안 적고 보내셔도 됩니다.</p>
      <textarea
        value={reportText}
        onChange={(e) => setReportText(e.target.value)}
        placeholder="예) 마감일이 원문과 달라요 / 첨부파일이 다른 공고 것이에요 (선택)"
      />
      <div className="report-modal-actions">
        <button className="secondary-btn" onClick={() => setReportOpen(false)}>
          닫기
        </button>
        <button className="primary-btn" onClick={handleReportSend}>
          {reportCopied ? "복사됨! 카톡에서 붙여넣기" : "보내기"}
        </button>
      </div>
    </div>
  </div>
)}
          {notice.detail_url && (
            <a href={notice.detail_url} target="_blank" rel="noreferrer" className="primary-btn">
              원문 공고 보기 →
            </a>
          )}
          <Link href="/" className="secondary-btn">
            목록으로
          </Link>

          <MiniCalendar
            startDate={notice.apply_start_date}
            endDate={notice.apply_end_date}
            winnerDate={notice.winner_date}
          />

          {(notice.contact_phone || notice.contact_address) && (
            <div className="side-card">
              <h3>담당자·접수처 정보</h3>
              {notice.contact_phone && (
                <div className="info-row" style={{ padding: "6px 0" }}>
                  <span style={{ fontSize: 13 }}>연락처</span>
                  <span style={{ fontSize: 13 }}>{notice.contact_phone}</span>
                </div>
              )}
              {notice.contact_address && (
                <div className="info-row" style={{ padding: "6px 0" }}>
                  <span style={{ fontSize: 13 }}>접수처</span>
                  <span style={{ fontSize: 12.5, textAlign: "right" }}>{notice.contact_address}</span>
                </div>
              )}
            </div>
          )}
               </aside>
      </div>

      <div className="detail-bottom-extra">
        {notice.etc_note && (
          <div className="info-card">
            <h3>유의사항</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {notice.etc_note}
            </p>
          </div>
        )}

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
