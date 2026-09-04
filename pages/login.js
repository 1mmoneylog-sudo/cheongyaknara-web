import Link from "next/link";
import { useState } from "react";

export default function Login() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

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
          <h1>로그인</h1>

          <label className="auth-label">아이디 또는 이메일</label>
          <input
            className="auth-input"
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />

          <label className="auth-label">비밀번호</label>
          <input
            className="auth-input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />

          <button className="auth-submit-btn" onClick={(e) => e.preventDefault()}>
            로그인
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
            계정이 없으신가요? <Link href="/signup">회원가입</Link> · <a href="#">비밀번호 찾기</a>
          </div>
        </div>
      </div>
    </div>
  );
}
