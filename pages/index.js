import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import noticesData from "../data/notices.json";
import { getDday, getUrgencyLevel, getProgressPercent } from "../lib/dday";
import NoticeCard from "../components/NoticeCard";

// 최신순 정렬용 — lib/dday.js를 건드리지 않도록 이 파일 안에 별도로 둠
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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

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

  // 상세페이지 하단 링크(?agency=LH, ?region=경기도)로 들어온 경우 초기 필터 적용
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
      // 마감일이 없거나 이미 지난 공고는 화면에 노출하지 않음
      .filter((n) => n.apply_end_date && n.dday !== null && n.dday >= 0),
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
  const chCount = enriched.filter((n) => n.source_agency === "청약홈").length;
  const todayNewCount = enriched.filter((n) => n.isNew).length;
  const threeDayCount = enriched.filter((n) => n.dday !== null && n.dday >= 0 && n.dday <= 3).length;

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
    <div>
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

      <section className="hero">
        <div className="hero-inner">
          <h1>LH·GH 모집공고, 한 곳에서 놓치지 않게</h1>
          <p>공공분양·공공임대 공고를 모아 마감 D-day 순으로 정리합니다. (SH는 연동 준비중)</p>
          <div className="stat-row">
            <div className="stat-chip">
              <div className="num">{todayNewCount}</div>
              <div className="label">최근 {NEW_WINDOW_DAYS}일 내 신규</div>
            </div>
            <div className="stat-chip">
              <div className="num accent">{threeDayCount}</div>
              <div className="label">3일 안에 마감</div>
            </div>
            <div className="stat-chip">
              <div className="num">{lhCount}</div>
              <div className="label">LH 공고</div>
            </div>
            <div className="stat-chip">
              <div className="num">{ghCount}</div>
              <div className="label">GH 공고</div>
            </div>
            <div className="stat-chip">
              <div className="num">{chCount}</div>
              <div className="label">청약홈 공고</div>
            </div>
          </div>
        </div>
      </section>

      <div className="search-wrap">
        <div className="search-inner">
          <div className="search-box">
            <span className="icon">⌕</span>
            <input
              type="text"
              placeholder="단지명, 지역, 기관으로 검색 (예: 위례, 화성시, LH)"
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
              className="search-confirm-btn"
              onClick={() => {
                setQuery(pendingQuery);
                resetPage();
              }}
            >
              확인
            </button>
          </div>
          <div className="filter-row">
            <div className="seg">
  {["전체", "LH", "GH", "SH", "청약홈"].map((a) => (
                <button
                  key={a}
                  className={agencyFilter === a ? "active" : ""}
                  onClick={() => {
                    setAgencyFilter(a);
                    resetPage();
                  }}
                >
                  {a}
                </button>
              ))}
              <button className="disabled" disabled title="곧 연동 예정">
                SH(준비중)
              </button>
            </div>

            <select
              className="pill-select"
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

            <select
              className="pill-select"
              value={kindFilter}
              onChange={(e) => {
                setKindFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="전체">공급유형 전체</option>
              <option value="임대">임대</option>
              <option value="분양">분양</option>
            </select>

            <div className="filter-spacer" />

            <div className="sort-tabs">
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
        </div>
      </div>

      <div className="layout">
        <div className="main-col">
          <div className="result-count">
            총 <b>{filtered.length}</b>개의 접수중·예정 공고
          </div>

          {pageItems.length === 0 && (
            <div className="empty-state">조건에 맞는 공고가 없습니다. 필터를 조정해보세요.</div>
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

        <aside className="sidebar">
          <div className="side-card">
            <h3>기관별</h3>
            <div className="side-link-list">
              <button
                className={agencyFilter === "LH" ? "active" : ""}
                onClick={() => {
                  setAgencyFilter("LH");
                  resetPage();
                }}
              >
                LH <span className="n">{lhCount}</span>
              </button>
              <button
                className={agencyFilter === "GH" ? "active" : ""}
                onClick={() => {
                  setAgencyFilter("GH");
                  resetPage();
                }}
              >
                GH <span className="n">{ghCount}</span>
              </button>
              <button
                className={agencyFilter === "청약홈" ? "active" : ""}
                onClick={() => {
                  setAgencyFilter("청약홈");
                  resetPage();
                }}
              >
                청약홈 <span className="n">{chCount}</span>
              </button>
            </div>
          </div>

          <div className="side-card">
            <h3>지역별 (많은 순)</h3>
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
                  {region} {count}
                </button>
              ))}
            </div>
          </div>

          <div className="cta-card">
            <h4>가점 계산이 헷갈리시나요?</h4>
            <p>청약저축 기간·부양가족 수를 입력해 예상 가점을 계산하는 기능을 준비 중입니다.</p>
            <button disabled style={{ opacity: 0.6, cursor: "default" }}>
              준비중
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
