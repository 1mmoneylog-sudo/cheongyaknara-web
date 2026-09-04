import Link from "next/link";
import { useState } from "react";

export default function Signup() {
  const [form, setForm] = useState({ id: "", pw: "", pw2: "", email: "", name: "" });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

      <div className="auth-page">
        <div className="auth-card">
          <h1>회원가입</h1>

          <div className="auth-benefit-box">
            <div>✓ 관심 지역·유형에 새 공고를 문자로 받아보세요</div>
            <div>✓ 찜한 공고는 마감 임박(D-3, D-1)에 다시 알려드려요</div>
            <div>✓ 관심 공고 저장하려면 가입까지 전부 무료</div>
          </div>

          <label className="auth-label">아이디</label>
          <input
            className="auth-input"
            type="text"
            placeholder="로그인에 사용할 아이디"
            value={form.id}
            onChange={(e) => update("id", e.target.value)}
          />
          <div className="auth-hint">영문·숫자 4~20자 (로그인할 때 사용합니다)</div>

          <label className="auth-label">비밀번호</label>
          <input
            className="auth-input"
            type="password"
            value={form.pw}
            onChange={(e) => update("pw", e.target.value)}
          />
          <div className="auth-hint">8자 이상, 숫자/문자 조합을 권장해요</div>

          <label className="auth-label">비밀번호 확인</label>
          <input
            className="auth-input"
            type="password"
            value={form.pw2}
            onChange={(e) => update("pw2", e.target.value)}
          />

          <label className="auth-label">연락처</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />

          <label className="auth-label">이름(실명)</label>
          <input
            className="auth-input"
            type="text"
            placeholder="실명"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />

          <label className="auth-checkbox-row">
            <input type="checkbox" /> 이용약관에 동의합니다 (필수)
          </label>
          <label className="auth-checkbox-row">
            <input type="checkbox" /> 개인정보처리방침에 동의합니다 (필수)
          </label>
          <label className="auth-checkbox-row">
            <input type="checkbox" /> 만 14세 이상입니다 (필수)
          </label>
          <label className="auth-checkbox-row">
            <input type="checkbox" /> (선택) 새 공고 등 광고성 정보 메일 수신에 동의합니다
          </label>

          <button className="auth-submit-btn" onClick={(e) => e.preventDefault()}>
            가입하기
          </button>

          <div className="auth-divider"><span>또는 간편하게</span></div>

          <button className="social-btn kakao" onClick={(e) => e.preventDefault()}>
            💬 카카오로 시작하기
          </button>
          <button className="social-btn naver" onClick={(e) => e.preventDefault()}>
            N 네이버로 시작하기
          </button>
          <button className="social-btn google" onClick={(e) => e.preventDefault()}>
            G 구글로 시작하기
          </button>

          <div className="auth-footer-links">
            이미 계정이 있으신가요? <Link href="/login">로그인</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
