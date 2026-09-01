import { useMemo, useState } from "react";
import Link from "next/link";
import noticesData from "../data/notices.json";
import { getDday, getUrgencyLevel, getProgressPercent } from "../lib/dday";

export async function getStaticProps() {
  // 배포 시 매 빌드마다 data/notices.json(수집 스크립트가 갱신한 최신본)을 읽어 정적 페이지로 만듦
  return { props: { generatedAt: noticesData.generated_at }, revalidate: 3600 };
}

function urgencyLabel(level) {
  if (level === "urgent") return "긴급";
  if (level === "soon") return "임박";
  return "여유";
}

export default function Home({ generatedAt }) {
  const [agencyFilter, setAgencyFilter] = useState("전체");
  const notices = noticesData.notices;

  const filtered = useMemo(() => {
    return notices
      .filter((n) => agencyFilter === "전체" || n.source_agency === agencyFilter)
      .map((n) => ({
        ...n,
        dday: getDday(n.apply_end_date),
        urgency: getUrgencyLevel(getDday(n.apply_end_date)),
        progress: getProgressPercent(n.apply_start_date, n.apply_end_date),
      }))
      .sort((a, b) => (a.dday ?? 9999) - (b.dday ?? 9999));
  }, [notices, agencyFilter]);

  return (
    <div>
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <span className="dot" />
            청약나라
          </div>
        </div>
      </header>

      <div className="layout">
        <div className="filter-row">
          <div className="seg">
            {["전체", "LH", "GH"].map((a) => (
              <button
                key={a}
                className={agencyFilter === a ? "active" : ""}
                onClick={() => setAgencyFilter(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="result-count">
          총 <b>{filtered.length}</b>건의 공고 · 마감임박순
        </div>

        {filtered.map((n) => (
          <Link key={n.id} href={`/notice/${n.id}`} className={`card ${n.urgency}`}>
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
                {n.area_range && (
                  <span>
                    전용면적 <b>{n.area_range}㎡</b>
                  </span>
                )}
              </div>
            </div>
            <div className="dday-block">
              <div className={`dday-num mono ${n.urgency}`}>
                {n.dday === null ? "-" : n.dday >= 0 ? `D-${n.dday}` : "마감"}
              </div>
              <div className="gauge">
                <div className={`gauge-fill ${n.urgency}`} style={{ width: `${n.progress}%` }} />
              </div>
              <div className="dday-sub mono">~{n.apply_end_date ?? "-"}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
