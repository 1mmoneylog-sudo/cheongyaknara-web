import { useMemo, useState } from "react";
import Link from "next/link";
import noticesData from "../data/notices.json";
import { parseDate } from "../lib/dday";

export async function getStaticProps() {
  return { props: { generatedAt: noticesData.generated_at }, revalidate: 3600 };
}

// 당첨자 발표일을 얼마나 지난 것까지 "발표 완료" 탭에 보여줄지 (collect.js의
// WINNER_TRACK_DAYS와 맞춰뒀어요 — 그보다 오래된 건 애초에 데이터에 없음)
const WINNER_TRACK_DAYS = 14;

function formatWinnerDate(str) {
  if (!str) return "-";
  const cleaned = String(str).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return str;
  return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 6)}.${cleaned.slice(6, 8)}`;
}

export default function Winners() {
  const notices = noticesData.notices;
  const [tab, setTab] = useState("upcoming"); // upcoming | announced

  const withWinnerDate = useMemo(() => {
    const now = new Date();
    return notices
      .map((n) => {
        const winner = parseDate(n.winner_date);
        if (!winner) return null;
        const diffDays = Math.ceil((winner.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...n, winnerDiffDays: diffDays };
      })
      .filter(Boolean);
  }, [notices]);

  const upcoming = useMemo(
    () =>
      withWinnerDate
        .filter((n) => n.winnerDiffDays >= 0)
        .sort((a, b) => a.winnerDiffDays - b.winnerDiffDays),
    [withWinnerDate]
  );

  const announced = useMemo(
    () =>
      withWinnerDate
        .filter((n) => n.winnerDiffDays < 0 && n.winnerDiffDays >= -WINNER_TRACK_DAYS)
        .sort((a, b) => b.winnerDiffDays - a.winnerDiffDays), // 최근 발표된 것부터
    [withWinnerDate]
  );

  const list = tab === "upcoming" ? upcoming : announced;

  return (
    <div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="dot" />
            청약나라
          </Link>
          <nav>
            <a href="/">모집공고</a>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
            <Link href="/winners" className="active">당첨자 발표</Link>
          </nav>
          <div className="header-right">
            <Link href="/contact" className="gnb-link">문의하기</Link>
            <Link href="/login" className="gnb-link">로그인</Link>
            <Link href="/signup" className="btn-signup">회원가입</Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <h1>당첨자 발표, 놓치지 않게</h1>
          <p>접수가 끝난 공고의 당첨자 발표일을 예정순으로 정리합니다.</p>
          <div className="stat-row">
            <div className="stat-chip">
              <div className="num accent">{upcoming.length}</div>
              <div className="label">발표 예정</div>
            </div>
            <div className="stat-chip">
              <div className="num">{announced.length}</div>
              <div className="label">최근 발표됨</div>
            </div>
          </div>
        </div>
      </section>

      <div className="search-wrap">
        <div className="search-inner">
          <div className="filter-row">
            <div className="seg">
              <button className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}>
                발표 예정
              </button>
              <button className={tab === "announced" ? "active" : ""} onClick={() => setTab("announced")}>
                발표 완료
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="layout">
        <div className="main-col" style={{ width: "100%" }}>
          <div className="result-count">
            총 <b>{list.length}</b>개
          </div>

          {list.length === 0 && (
            <div className="empty-state">
              {tab === "upcoming" ? "발표 예정인 공고가 없습니다." : "최근 발표된 공고가 없습니다."}
            </div>
          )}

          {list.map((n) => (
            <Link key={n.id} href={`/notice/${n.id}`} className="card calm">
              <div className="card-body">
                <div className="badge-row">
                  <span className="badge agency">{n.source_agency}</span>
                  {n.notice_type && <span className="badge type">{n.notice_type}</span>}
                  {n.supply_kind && <span className="badge kind">{n.supply_kind}</span>}
                </div>
                <p className="card-title">{n.title}</p>
                <div className="meta-row">
                  {n.region_sido && (
                    <span>
                      위치 <b>{n.region_sido}</b>
                    </span>
                  )}
                  {n.household_count && (
                    <span>
                      세대수 <b>{n.household_count}</b>
                    </span>
                  )}
                </div>
              </div>
              <div className="dday-block">
                <div className="dday-foot">
                  <div className="dday-num mono calm">
                    {tab === "upcoming"
                      ? n.winnerDiffDays === 0
                        ? "오늘 발표"
                        : `D-${n.winnerDiffDays}`
                      : `${Math.abs(n.winnerDiffDays)}일 전 발표`}
                  </div>
                </div>
                <div className="dday-sub mono">발표일 {formatWinnerDate(n.winner_date)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
