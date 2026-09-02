import Link from "next/link";

export default function Login() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>로그인</h1>
        <label>아이디 또는 이메일</label>
        <input type="text" />
        <label>비밀번호</label>
        <input type="password" />
        <button className="login-submit">로그인</button>
        <div className="divider"><span>또는 간편하게</span></div>
        <button className="social-btn kakao">카카오로 시작하기</button>
        <button className="social-btn naver">N 네이버로 시작하기</button>
        <button className="social-btn google">G 구글로 시작하기</button>
        <p className="login-footer">
          계정이 없으신가요? <Link href="/signup">회원가입</Link> ·{" "}
          <Link href="/find-password">비밀번호 찾기</Link>
        </p>
      </div>
    </div>
  );
}
