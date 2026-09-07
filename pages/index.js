import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import noticesData from "../data/notices.json";
import { getDday, getUrgencyLevel, getProgressPercent } from "../lib/dday";
import NoticeCard from "../components/NoticeCard";

function parseAnnounceDate(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return null;
  return new Date(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
}

export async function getStaticProps() {
  return { props: { generatedAt: noticesData.generated_at }, revalidate: 3600 };
}

const PAGE_SIZE = 8;
const NEW_WINDOW_DAYS = 3;

function isRecentlyAnnounced(announceDate) {
  if (!announceDate) return false;
  const cleaned = String(announceDate).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return false;
  const d = new Date(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= NEW_WINDOW_DAYS;
}

export default function Home() {
  const notices = noticesData.notices;
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [pendingQuery, setPendingQuery] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("전체");
  const [regionFilter, setRegionFilter] = useState("전체");
  const [kindFilter, setKindFilter] = useState("전체");
  const [sortMode, setSortMode] = useState("dday");
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState(new Set());

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof router.query.agency === "string") setAgencyFilter(router.query.agency);
    if (typeof router.query.region === "string") setRegionFilter(router.query.region);
  }, [router.isReady, router.query.agency, router.query.region]);

  const enriched = useMemo(
    () =>
      notices
        .map((n) => ({
          ...n,
          dday: getDday(n.apply_end_date),
          urgency: getUrgencyLevel(getDday(n.apply_end_date)),
          progress: getProgressPercent(n.apply_start_date, n.apply_end_date),
          isNew: isRecentlyAnnounced(n.announce_date),
        }))
       .filter((n) => {
  // 1. 마감일 또는 공고일 날짜 추출
  const endDateStr = n.apply_end_date || n.announce_date;
  if (!endDateStr) return false;

  // 2. YYYYMMDD 8자리 숫자만 추출
  const cleanEndDate = String(endDateStr).replace(/[^0-9]/g, "");
  if (cleanEndDate.length !== 8) return false;

  // 3. 마감일 오후 5시(17:00:00) 객체 생성
  const year = cleanEndDate.slice(0, 4);
  const month = cleanEndDate.slice(4, 6);
  const day = cleanEndDate.slice(6, 8);
  const deadline = new Date(`${year}-${month}-${day}T17:00:00`);

  // 4. 현재 시간이 마감일 17:00을 지났으면 자동 제외 (지나간 공고 삭제)
  return Date.now() <= deadline.getTime();
})
    [notices]
  );

  const regionCounts = useMemo(() => {
    const map = new Map();
    enriched.forEach((n) => {
      if (!n.region_sido) return;
      map.set(n.region_sido, (map.get(n.region_sido) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [enriched]);

  const lhCount = enriched.filter((n) => n.source_agency === "LH").length;
  const ghCount = enriched.filter((n) => n.source_agency === "GH").length;
  const shCount = enriched.filter((n) => n.source_agency === "SH").length;
  const chCount = enriched.filter((n) => n.source_agency === "청약홈").length;
  const todayNewCount = enriched.filter((n) => n.isNew).length;
  const threeDayCount = enriched.filter((n) => n.dday !== null && n.dday >= 0 && n.dday <= 3).length;

  // 롤링 배너용 최신 공고 5개 추출
  const newNotices = useMemo(() => enriched.filter((n) => n.isNew).slice(0, 5), [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (agencyFilter !== "전체") list = list.filter((n) => n.source_agency === agencyFilter);
    if (regionFilter !== "전체") list = list.filter((n) => n.region_sido === regionFilter);
    if (kindFilter !== "전체") list = list.filter((n) => n.supply_kind === kindFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.region_sido?.toLowerCase().includes(q) ||
          n.source_agency?.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortMode === "dday") {
      sorted.sort((a, b) => (a.dday ?? 9999) - (b.dday ?? 9999));
    } else if (sortMode === "latest") {
      sorted.sort(
        (a, b) =>
          (parseAnnounceDate(b.announce_date)?.getTime() ?? 0) -
          (parseAnnounceDate(a.announce_date)?.getTime() ?? 0)
      );
    } else if (sortMode === "household") {
      sorted.sort((a, b) => (b.household_count ?? 0) - (a.household_count ?? 0));
    }
    return sorted;
  }, [enriched, agencyFilter, regionFilter, kindFilter, query, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  function toggleBookmark(id) {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-light-gray min-h-screen">
      {/* 헤더 네비게이션 */}
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="dot" />
            청약나라
          </Link>
          <nav>
            <a href="/" className="active">모집공고</a>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
          </nav>
          <div className="header-right">
            <Link href="/contact" className="btn-ghost-inv">문의하기</Link>
            <Link href="/login" className="btn-ghost-inv">로그인</Link>
            <Link href="/signup" className="btn-primary-inv">회원가입</Link>
          </div>
        </div>
      </header>

      {/* 위원나라 스타일 히어로 세션 */}
      <section className="hero-section">
        <div className="hero-container">
          {/* 좌측 히어로 메인 */}
          <div className="hero-left">
            <h1 className="hero-title">
              청약 모집공고, <br />
              한 곳에서 한눈에
            </h1>
            <p className="hero-desc">
              LH · SH · GH · 청약홈에 흩어진 공공분양 및 임대주택 공고를 실시간 수집하여 정리합니다.
            </p>
            {/* 알약형 통합 검색창 */}
            <div className="hero-search-box">
              <input
                type="text"
                placeholder="관심 지역, 단지명, 기관명 검색 (예: 판교, LH)"
                value={pendingQuery}
                onChange={(e) => setPendingQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setQuery(pendingQuery);
                    resetPage();
                  }
                }}
              />
              <button
                onClick={() => {
                  setQuery(pendingQuery);
                  resetPage();
                }}
              >
                검색
              </button>
            </div>
          </div>

          {/* 우측 위원나라 요약 대시보드 위젯 */}
          <div className="hero-right">
            <div className="status-widget">
              <div className="widget-header">
                <span className="widget-date">{new Date().toLocaleDateString("ko-KR")} 기준</span>
              </div>
              <div className="widget-item">
                <span className="label">오늘 새로 올라온 공고</span>
                <span className="val text-primary">{todayNewCount}</span>
              </div>
              <div className="widget-item">
                <span className="label">3일 안에 마감되는 공고</span>
                <span className="val text-red">{threeDayCount}</span>
              </div>
              <div className="widget-item border-none">
                <span className="label">전체 수집 공고 수</span>
                <span className="val">{enriched.length}</span>
              </div>
              <div className="widget-sub-stats">
                <span>LH <b>{lhCount}</b></span>
                <span>SH <b>{shCount}</b></span>
                <span>GH <b>{ghCount}</b></span>
                <span>청약홈 <b>{chCount}</b></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 실시간 롤링 띠 배너 */}
      <div className="ticker-banner">
        <div className="ticker-inner">
          <div className="ticker-track">
            {newNotices.length > 0 ? (
              newNotices.map((n) => (
                <span key={n.id} className="ticker-item">
                  <span className="badge-new">NEW</span> {n.title} (~{n.apply_end_date})
                </span>
              ))
            ) : (
              <span className="ticker-item">
                <span className="badge-new">NEW</span> 실시간 최신 청약 공고가 자동으로 업데이트됩니다.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 메인 리스트 레이아웃 */}
      <div className="layout">
        <div className="main-col">
          {/* 상단 탭 & 필터 바 */}
          <div className="filter-card">
            <div className="filter-header">
              <h2 className="section-title">현재 지원 가능한 공고</h2>
              <div className="sort-pill-tabs">
                <button className={sortMode === "dday" ? "active" : ""} onClick={() => setSortMode("dday")}>
                  마감임박순
                </button>
                <button className={sortMode === "latest" ? "active" : ""} onClick={() => setSortMode("latest")}>
                  최신순
                </button>
                <button className={sortMode === "household" ? "active" : ""} onClick={() => setSortMode("household")}>
                  세대수순
                </button>
              </div>
            </div>

            {/* 기관별 칩 필터 */}
            <div className="chip-row">
              <span className="chip-label">기관</span>
              {["전체", "LH", "GH", "SH", "청약홈"].map((a) => (
                <button
                  key={a}
                  className={`chip-btn ${agencyFilter === a ? "active" : ""}`}
                  onClick={() => {
                    setAgencyFilter(a);
                    resetPage();
                  }}
                >
                  {a}
                </button>
              ))}
            </div>

            {/* 공급유형 & 지역 선택 세그먼트 */}
            <div className="chip-row">
              <span className="chip-label">유형</span>
              {["전체", "분양", "임대"].map((k) => (
                <button
                  key={k}
                  className={`chip-btn ${kindFilter === k ? "active" : ""}`}
                  onClick={() => {
                    setKindFilter(k);
                    resetPage();
                  }}
                >
                  {k}
                </button>
              ))}
              <select
                className="region-select"
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  resetPage();
                }}
              >
                <option value="전체">지역 전체</option>
                {regionCounts.map(([region]) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="result-count">
            총 <b>{filtered.length}</b>개의 공고를 찾았습니다.
          </div>

          {pageItems.length === 0 && (
            <div className="empty-state">조건에 맞는 공고가 없습니다. 필터를 조정해 보세요.</div>
          )}

          {pageItems.map((n) => (
            <NoticeCard
              key={n.id}
              notice={n}
              bookmarked={bookmarks.has(n.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))}

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={p === currentPage ? "active" : ""} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                ›
              </button>
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <aside className="sidebar">
          <div className="side-card">
            <h3>기관별 공고 현황</h3>
            <div className="side-link-list">
              <button className={agencyFilter === "LH" ? "active" : ""} onClick={() => { setAgencyFilter("LH"); resetPage(); }}>
                LH 한국토지주택공사 <span className="n">{lhCount}</span>
              </button>
              <button className={agencyFilter === "SH" ? "active" : ""} onClick={() => { setAgencyFilter("SH"); resetPage(); }}>
                SH 서울주택도시공사 <span className="n">{shCount}</span>
              </button>
              <button className={agencyFilter === "GH" ? "active" : ""} onClick={() => { setAgencyFilter("GH"); resetPage(); }}>
                GH 경기주택도시공사 <span className="n">{ghCount}</span>
              </button>
              <button className={agencyFilter === "청약홈" ? "active" : ""} onClick={() => { setAgencyFilter("청약홈"); resetPage(); }}>
                한국부동산원 청약홈 <span className="n">{chCount}</span>
              </button>
            </div>
          </div>

          <div className="side-card">
            <h3>인기 지역</h3>
            <div className="type-grid">
              {regionCounts.slice(0, 6).map(([region, count]) => (
                <button
                  key={region}
                  className={regionFilter === region ? "active" : ""}
                  onClick={() => {
                    setRegionFilter(region);
                    resetPage();
                  }}
                >
                  {region} ({count})
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
