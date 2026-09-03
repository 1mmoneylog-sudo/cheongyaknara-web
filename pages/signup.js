import Link from "next/link";

export default function Signup() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>회원가입</h1>

        <div className="signup-benefit-box">
          <div className="benefit-item">
            <span className="dot-icon">○</span>
            관심 <b>지역</b>의 새 공고를 이메일로 받아보세요
          </div>
          <div className="benefit-item">
            <span className="dot-icon">○</span>
            찜한 공고는 <b>마감 임박(D-3·D-1)</b>에 다시 알려드려요
          </div>
          <div className="benefit-item">
            <span className="dot-icon">○</span>
            관심 공고 저장 및 관리까지 <b>전부 무료</b>
          </div>
        </div>

        <label>아이디</label>
        <input type="text" placeholder="로그인에 사용할 아이디" />
        <p className="field-hint">영문·숫자 4~20자 (로그인할 때 사용합니다)</p>

        <label>비밀번호</label>
        <input type="password" />
        <p className="field-hint">8자 이상, 숫자로만 만들지 마세요.</p>

        <label>비밀번호 확인</label>
        <input type="password" />

        <label>이메일</label>
        <input type="email" placeholder="you@example.com" />

        <label>이름(실명)</label>
        <input type="text" placeholder="실명 (신청서·이력서에 사용)" />

        <div className="agree-list">
          <label className="agree-item">
            <input type="checkbox" />
            <span><Link href="/terms">이용약관</Link>에 동의합니다 (필수)</span>
          </label>
          <label className="agree-item">
            <input type="checkbox" />
            <span><Link href="/privacy">개인정보처리방침</Link>에 동의합니다 (필수)</span>
          </label>
          <label className="agree-item">
            <input type="checkbox" />
            <span>만 14세 이상입니다 (필수)</span>
          </label>

          <label className="agree-item agree-optional">
            <input type="checkbox" />
            <span>[선택] 맞춤알림용 이메일 수신에 동의합니다</span>
          </label>
          <p className="agree-hint">
            동의하지 않으시면 가입과 공고 열람 이용에는 지장이 없으나, 가입 후 혜택 알림에서 안내드릴 수 있어요.
          </p>
        </div>

        <button className="login-submit">가입하기</button>

        <div className="divider"><span>또는 간편하게</span></div>

        <button className="social-btn kakao">카카오로 시작하기</button>
        <button className="social-btn naver">N 네이버로 시작하기</button>
        <button className="social-btn google">G 구글로 시작하기</button>

        <p className="login-footer">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
