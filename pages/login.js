import Link from "next/link";

export default function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // 기존 로그인 로직 유지
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="card-title">로그인</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">아이디 또는 이메일</label>
            <input
              type="text"
              className="form-input"
              placeholder=""
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              placeholder=""
              required
            />
          </div>

          <button type="submit" className="btn-submit">
            로그인
          </button>
        </form>

        <div className="divider">또는 간편하게</div>

        <div className="social-buttons">
          <button type="button" className="btn-social btn-kakao">
            <span>💬</span> 카카오로 시작하기
          </button>
          <button type="button" className="btn-social btn-naver">
            <span>N</span> 네이버로 시작하기
          </button>
          <button type="button" className="btn-social btn-google">
            <span>G</span> 구글로 시작하기
          </button>
        </div>

        <div className="auth-footer">
          계정이 없으신가요? <Link href="/signup">회원가입</Link> · <Link href="/find-password">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
