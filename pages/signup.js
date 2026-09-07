import Link from "next/link";

export default function Signup() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // 기존 회원가입 제출 로직 유지
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="auth-card-title">회원가입</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">이름</label>
            <input
              type="text"
              className="form-input"
              placeholder="홍길동"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">이메일 계정</label>
            <input
              type="email"
              className="form-input"
              placeholder="example@email.com"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              placeholder="8자리 이상 입력"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">비밀번호 확인</label>
            <input
              type="password"
              className="form-input"
              placeholder="비밀번호 재입력"
              required
            />
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>[필수] 이용약관 및 개인정보 수집·이용에 동의합니다.</span>
            </label>
          </div>

          <button type="submit" className="btn-submit">
            가입하기
          </button>
        </form>

        <div className="auth-footer">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
