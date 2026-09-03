import Link from "next/link";
import { useMemo, useState } from "react";

const QUESTIONS = [
  { key: "noHouse", label: "현재 무주택 세대구성원입니다" },
  { key: "young", label: "만 19세 ~ 39세 청년입니다" },
  { key: "newlywed", label: "혼인 7년 이내 신혼부부, 또는 예비신혼부부입니다" },
  { key: "manyChildren", label: "미성년 자녀가 2명 이상입니다 (다자녀)" },
  { key: "parentSupport", label: "만 65세 이상 부모님을 3년 이상 부양하고 있습니다" },
  { key: "firstTime", label: "생애 최초로 주택을 청약하려 합니다" },
  { key: "hasAccount", label: "청약통장(주택청약종합저축)에 가입되어 있습니다" },
];

function buildResult(answers) {
  const tags = [];
  if (answers.young) tags.push({ title: "청년특별공급 · 청년안심주택", desc: "만 19~39세 무주택 청년 대상 특별공급/전용 임대주택입니다." });
  if (answers.newlywed) tags.push({ title: "신혼부부 특별공급 · 신혼희망타운", desc: "혼인기간·자녀 유무에 따라 우선순위가 달라집니다." });
  if (answers.manyChildren) tags.push({ title: "다자녀가구 특별공급", desc: "미성년 자녀 수가 많을수록 배점이 높아집니다." });
  if (answers.parentSupport) tags.push({ title: "노부모부양 특별공급", desc: "3년 이상 직계존속 부양 시 지원 가능합니다." });
  if (answers.firstTime) tags.push({ title: "생애최초 특별공급", desc: "주택을 소유한 적이 없는 분에게 우선순위가 주어집니다." });
  if (answers.noHouse && !tags.length) tags.push({ title: "일반공급 · 국민임대·행복주택", desc: "무주택 세대구성원 기준으로 일반공급에 지원할 수 있습니다." });
  return tags;
}

export default function Jagyeok() {
  const [answers, setAnswers] = useState({});
  const result = useMemo(() => buildResult(answers), [answers]);

  function toggle(key) {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
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
            <Link href="/jagyeok" className="active">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
          </nav>
        </div>
      </header>

      <div className="tool-hero">
        <div className="tool-hero-inner">
          <h1>자격 자가진단</h1>
          <p>해당하는 항목을 체크하면, 살펴볼 만한 공급유형을 안내해드립니다.</p>
        </div>
      </div>

      <div className="layout" style={{ maxWidth: 720, display: "block" }}>
        <div className="info-card">
          <h3>해당하는 항목을 모두 선택하세요</h3>
          <div className="checklist">
            {QUESTIONS.map((q) => (
              <label key={q.key} className="checklist-item">
                <input type="checkbox" checked={!!answers[q.key]} onChange={() => toggle(q.key)} />
                {q.label}
              </label>
            ))}
          </div>
        </div>

        {result.length > 0 ? (
          <div className="info-card">
            <h3>살펴보면 좋은 공급유형</h3>
            {result.map((r) => (
              <div key={r.title} className="result-tag">
                <div className="result-tag-title">{r.title}</div>
                <div className="result-tag-desc">{r.desc}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">해당 항목을 체크하시면 안내를 보여드려요.</div>
        )}

        <div className="warning-box" style={{ marginTop: 16 }}>
          ⚠️ 이 진단은 대략적인 방향을 안내하는 참고용입니다. <b>정확한 소득·자산 기준, 세대원 요건은 공고마다, 그리고
          매년 다릅니다.</b> 반드시 관심 있는 공고의 원문 공고문에서 자격요건을 확인하세요.
        </div>
      </div>
    </div>
  );
}
