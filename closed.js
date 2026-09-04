import Link from "next/link";
import { useMemo, useState } from "react";
import closedData from "../data/closed-notices.json";
import NoticeCard from "../components/NoticeCard";

const PAGE_SIZE = 10;

export async function getStaticProps() {
  return { props: { generatedAt: closedData.generated_at }, revalidate: 3600 };
}

export default function ClosedNotices() {
  const notices = closedData.notices;
  const [agencyFilter, setAgencyFilter] = useState("전체");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (agencyFilter === "전체") return notices;
    return notices.filter((n) => n.source_agency === agencyFilter);
  }, [notices, agencyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
            <Link href="/closed" className="active">마감공고</Link>
          </nav>
        </div>
      </header>

      <div className="tool-hero">
        <div className="tool-hero-inner">
          <h1>마감된 공고</h1>
          <p>최근 90일 이내에 접수가 마감된 공고를 모아둔 보관함입니다. (그 이전 공고는 자동으로 정리됩니다)</p>
        </div>
      </div>

      <div className="layout">
        <div className="main-col">
          <div className="filter-row" style={{ marginBottom: 16 }}>
            <div className="seg">
              {["전체", "LH", "GH", "청약홈"].map((a) => (
                <button
                  key={a}
                  className={agencyFilter === a ? "active" : ""}
                  onClick={() => {
                    setAgencyFilter(a);
                    setPage(1);
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="result-count">
            총 <b>{filtered.length}</b>건의 마감된 공고
          </div>

          {pageItems.length === 0 && <div className="empty-state">마감된 공고가 없습니다.</div>}

          {pageItems.map((n) => (
            <NoticeCard key={n.id} notice={n} closed />
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
      </div>
    </div>
  );
}
