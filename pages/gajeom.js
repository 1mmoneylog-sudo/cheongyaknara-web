import FloatingContactButton from "../components/FloatingContactButton";
import { useMemo, useState } from "react";

const HOMELESS_OPTIONS = [
  { label: "1년 미만", score: 2 },
  { label: "1년 ~ 2년", score: 4 },
  { label: "2년 ~ 3년", score: 6 },
  { label: "3년 ~ 4년", score: 8 },
  { label: "4년 ~ 5년", score: 10 },
  { label: "5년 ~ 6년", score: 12 },
  { label: "6년 ~ 7년", score: 14 },
  { label: "7년 ~ 8년", score: 16 },
  { label: "8년 ~ 9년", score: 18 },
  { label: "9년 ~ 10년", score: 20 },
  { label: "10년 ~ 11년", score: 22 },
  { label: "11년 ~ 12년", score: 24 },
  { label: "12년 ~ 13년", score: 26 },
  { label: "13년 ~ 14년", score: 28 },
  { label: "14년 ~ 15년", score: 30 },
  { label: "15년 이상", score: 32 },
];

const FAMILY_OPTIONS = [
  { label: "0명", score: 5 },
  { label: "1명", score: 10 },
  { label: "2명", score: 15 },
  { label: "3명", score: 20 },
  { label: "4명", score: 25 },
  { label: "5명", score: 30 },
  { label: "6명 이상", score: 35 },
];

const ACCOUNT_OPTIONS = [
  { label: "6개월 미만", score: 1 },
  { label: "6개월 ~ 1년", score: 2 },
  { label: "1년 ~ 2년", score: 3 },
  { label: "2년 ~ 3년", score: 4 },
  { label: "3년 ~ 4년", score: 5 },
  { label: "4년 ~ 5년", score: 6 },
  { label: "5년 ~ 6년", score: 7 },
  { label: "6년 ~ 7년", score: 8 },
  { label: "7년 ~ 8년", score: 9 },
  { label: "8년 ~ 9년", score: 10 },
  { label: "9년 ~ 10년", score: 11 },
  { label: "10년 ~ 11년", score: 12 },
  { label: "11년 ~ 12년", score: 13 },
  { label: "12년 ~ 13년", score: 14 },
  { label: "13년 ~ 14년", score: 15 },
  { label: "14년 ~ 15년", score: 16 },
  { label: "15년 이상", score: 17 },
];

export default function Gajeom() {
  const [homelessIdx, setHomelessIdx] = useState(0);
  const [familyIdx, setFamilyIdx] = useState(0);
  const [accountIdx, setAccountIdx] = useState(0);

  const homelessScore = HOMELESS_OPTIONS[homelessIdx].score;
  const familyScore = FAMILY_OPTIONS[familyIdx].score;
  const accountScore = ACCOUNT_OPTIONS[accountIdx].score;
  const total = homelessScore + familyScore + accountScore;

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
            <Link href="/gajeom" className="active">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
          </nav>
        </div>
      </header>

      <div className="tool-hero">
        <div className="tool-hero-inner">
          <h1>청약 가점 계산기</h1>
          <p>무주택기간 · 부양가족수 · 청약통장 가입기간을 기준으로 하는 청약 가점제(84점 만점) 공식 계산식입니다.</p>
        </div>
      </div>

      <div className="layout" style={{ maxWidth: 720, display: "block" }}>
        <div className="info-card">
          <h3>무주택기간</h3>
          <select className="pill-select full" value={homelessIdx} onChange={(e) => setHomelessIdx(Number(e.target.value))}>
            {HOMELESS_OPTIONS.map((o, i) => (
              <option key={o.label} value={i}>
                {o.label} — {o.score}점
              </option>
            ))}
          </select>
        </div>

        <div className="info-card">
          <h3>부양가족수 (본인 제외)</h3>
          <select className="pill-select full" value={familyIdx} onChange={(e) => setFamilyIdx(Number(e.target.value))}>
            {FAMILY_OPTIONS.map((o, i) => (
              <option key={o.label} value={i}>
                {o.label} — {o.score}점
              </option>
            ))}
          </select>
        </div>

        <div className="info-card">
          <h3>청약통장(주택청약종합저축) 가입기간</h3>
          <select className="pill-select full" value={accountIdx} onChange={(e) => setAccountIdx(Number(e.target.value))}>
            {ACCOUNT_OPTIONS.map((o, i) => (
              <option key={o.label} value={i}>
                {o.label} — {o.score}점
              </option>
            ))}
          </select>
        </div>

        <div className="result-card">
          <div className="result-label">예상 청약 가점</div>
          <div className="result-total mono">{total}<span>/84점</span></div>
          <div className="result-breakdown">
            <span>무주택기간 {homelessScore}점</span>
            <span>부양가족 {familyScore}점</span>
            <span>가입기간 {accountScore}점</span>
          </div>
        </div>

        <div className="warning-box" style={{ marginTop: 16 }}>
          ⚠️ 이 계산기는 <b>민간분양 일반공급 청약가점제</b>(84점 만점) 공식 산정 기준입니다. LH·GH의 국민임대·행복주택 등
          공공임대주택은 소득·자산 기준과 별도의 배점·추첨 방식을 적용하므로, 각 공고문의 자격요건을 반드시 함께 확인하세요.
        </div>
      </div>
         <FloatingContactButton />   
    </div>
  );
}
