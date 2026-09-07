import Link from "next/link";
import { useMemo, useState } from "react";
import FloatingContactButton from "../components/FloatingContactButton";

const QUESTIONS = [
  { key: "noHouse", label: "현재 무주택 세대구성원입니다" },
  { key: "newborn", label: "2년 이내 출산(임신/입양 포함)한 자녀가 있습니다 (신생아 특공)" },
  { key: "young", label: "만 19세 ~ 39세 청년입니다" },
  { key: "newlywed", label: "혼인 7년 이내 신혼부부, 또는 예비신혼부부입니다" },
  { key: "manyChildren", label: "미성년 자녀가 2명 이상입니다 (다자녀)" },
  { key: "parentSupport", label: "만 65세 이상 부모님을 3년 이상 연속하여 부양하고 있습니다" },
  { key: "firstTime", label: "생애 최초로 주택을 구입하려 합니다 (세대원 전원 무주택 이력)" },
  { key: "hasAccount", label: "청약통장(주택청약종합저축)에 가입되어 있습니다" },
];

function buildResult(answers) {
  const tags = [];

  // 최우선 공급 유형 (신생아)
  if (answers.newborn) {
    tags.push({
      title: "👶 신생아 특별공급 · 우선공급",
      desc: "입주자모집공고일 기준 2년 이내 출산(임신·입양)한 가구 대상 우선 배정 유형입니다."
    });
  }

  if (answers.young) {
    tags.push({
      title: "🙋‍♂️ 청년 특별공급 · 청년안심주택",
      desc: "만 19~39세 무주택 청년 대상 특별공급 및 전용 임대주택 지원이 가능합니다."
    });
  }

  if (answers.newlywed) {
    tags.push({
      title: "💍 신혼부부 특별공급 · 신혼희망타운",
      desc: "혼인기간 7년 이내 또는 예비신혼부부 대상이며, 신생아 가구 시 우선순위가 높습니다."
    });
  }

  if (answers.manyChildren) {
    tags.push({
      title: "👨‍👩‍👧‍👦 다자녀가구 특별공급",
      desc: "미성년 자녀 2명 이상부터 신청할 수 있으며, 자녀 수 및 영유아 수에 따라 가점이 부여됩니다."
    });
  }

  if (answers.parentSupport) {
    tags.push({
      title: "👵 노부모부양 특별공급",
      desc: "만 65세 이상 직계존속을 3년 이상 연속하여 동일 주민등록표상 부양 시 지원 가능합니다."
    });
  }

  if (answers.firstTime) {
    tags.push({
      title: "🏠 생애최초 특별공급",
      desc: "세대원 전원이 과거 주택을 소유한 사실이 없는 경우 추첨 및 소득기준별 지원이 가능합니다."
    });
  }

  if (answers.noHouse && tags.length === 0) {
    tags.push({
      title: "📋 일반공급 · 공공임대(국민임대·행복주택)",
      desc: "무주택 세대구성원 요건을 충족하여 일반공급 및 다양한 공공임대주택 신청이 가능합니다."
    });
  }

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
          <div className="header-right">
            <Link href="/login" className="btn-ghost-inv">로그인</Link>
            <Link href="/signup" className="btn-primary-inv">회원가입</Link>
          </div>
        </div>
      </header>

      <div className="tool-hero">
        <div className="tool-hero-inner">
          <h1>청약 자격 자가진단</h1>
          <p>나에게 해당하는 조건을 체크하면, 신청 가능한 최적의 청약 및 공급 유형을 추천해 드립니다.</p>
        </div>
      </div>

      <div className="layout" style={{ maxWidth: 720, display: "block" }}>
        <div className="info-card">
          <h3>해당하는 항목을 모두 선택하세요</h3>
          <div className="checklist">
            {QUESTIONS.map((q) => (
              <label key={q.key} className="checklist-item">
                <input
                  type="checkbox"
                  checked={!!answers[q.key]}
                  onChange={() => toggle(q.key)}
                />
                {q.label}
              </label>
            ))}
          </div>
        </div>

        {result.length > 0 ? (
          <div className="info-card">
            <h3>💡 추천 및 살펴볼 수 있는 공급유형</h3>
            {result.map((r) => (
              <div key={r.title} className="result-tag" style={{ marginBottom: 12 }}>
                <div className="result-tag-title" style={{ fontWeight: 700, fontSize: 16 }}>
                  {r.title}
                </div>
                <div className="result-tag-desc" style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 4 }}>
                  {r.desc}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            위의 항목에서 해당하는 조건에 체크하시면 지원 가능한 유형을 실시간으로 안내해 드립니다.
          </div>
        )}

        <div className="warning-box" style={{ marginTop: 16 }}>
          ⚠️ 본 진단 결과는 참고용 가이드입니다. <b>주택소유 여부 판단, 소득·자산 기준 및 세대원 인정 범위는 모집공고일 기준 해당 단지의 입주자모집공고문</b>을 반드시 최종 확인하셔야 합니다.
        </div>
      </div>

      <FloatingContactButton />
    </div>
  );
}
