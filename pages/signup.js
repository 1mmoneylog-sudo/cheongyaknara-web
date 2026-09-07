import Link from "next/link";

export default function Signup() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="auth-card-title">회원가입</h1>

        {/* 상단 혜택 안내 연두색 박스 */}
        <div className="signup-notice-box">
          <p>✓ 관심 지역·유형에 새 공고를 문자로 받아보세요</p>
          <p>✓ 찜한 공고는 마감 임박(D-3, D-1)에 다시 알려드려요</p>
          <p>✓ 관심 공고 저장하려면 가입까지 전부 무료</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">아이디</label>
            <input
              type="text"
              className="form-input"
              placeholder="로그인에 사용할 아이디"
              required
            />
            <span className="input-subtext">영문·숫자 4~20자 (로그인할 때 사용합니다)</span>
          </div>

          <div className="input-group">
            <label className="input-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              placeholder=""
              required
            />
            <span className="input-subtext">8자 이상, 숫자/문자 조합을 권장해요</span>
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
            <label className="input-label">연락처</label>
            <input
              type="tel"
              className="form-input"
              placeholder="-빼고 숫자만 입력"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">이름(실명)</label>
            <input
              type="text"
              className="form-input"
              placeholder="실명"
              required
            />
          </div>

          {/* 약관 동의 체크박스 4개 */}
          <div className="checkbox-list">
            <label className="checkbox-item">
              <input type="checkbox" required />
              <span>이용약관에 동의합니다 (필수)</span>
            </label>
            <label className="checkbox-item">
              <input type="checkbox" required />
              <span>개인정보처리방침에 동의합니다 (필수)</span>
            </label>
            <label className="checkbox-item">
              <input type="checkbox" required />
              <span>만 14세 이상입니다 (필수)</span>
            </label>
            <label className="checkbox-item">
              <input type="checkbox" />
              <span>(선택) 새 공고 등 광고성 정보 메일 수신에 동의합니다</span>
            </label>
          </div>

          <button type="submit" className="btn-submit">
            가입하기
          </button>
        </form>

        <div className="divider">또는 간편하게</div>

        <div className="social-buttons">
          <button type="button" className="btn-social btn-kakao">
            💬 카카오로 시작하기
          </button>
          <button type="button" className="btn-social btn-naver">
            N 네이버로 시작하기
          </button>
          <button type="button" className="btn-social btn-google">
            G 구글로 시작하기
          </button>
        </div>

        <div className="auth-footer">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
