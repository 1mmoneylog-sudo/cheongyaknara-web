import Link from "next/link";

export default function Signup() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="auth-card-title">회원가입</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">아이디 또는 이메일</label>
            <input
              type="email"
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

          <div className="input-group">
            <label className="input-label">비밀번호 확인</label>
            <input
              type="password"
              className="form-input"
              placeholder=""
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">이름</label>
            <input
              type="text"
              className="form-input"
              placeholder=""
              required
            />
          </div>

          <button type="submit" className="btn-submit" style={{ marginTop: '16px' }}>
            회원가입
          </button>
        </form>

        <div className="divider">또는 간편 회원가입</div>

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
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
