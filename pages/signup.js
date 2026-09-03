import Link from "next/link";

export default function Signup() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>회원가입</h1>

        <div className="signup-benefit-box">
          <div className="benefit-item">
            <span className="dot-icon">○</span>
            관심 <b>지역·분야</b>의 새 공고를 이메일로 받아보세요
          </div>
          <div className="benefit-item">
            <span className="dot-icon">○</span>
            찜한 공고는 <b>마감 임박(D-3·D-1)</b>에 다시 알려드려요
          </div>
          <div className="benefit-item">
            <span className="dot-icon">○</span>
            관심 공고 저장·이력서 관리까지 <b>전부 무료</b>
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

        {/* 여기 아래에 전화번호, 약관동의, 가입버튼 등이 이어질 예정 */}
      </div>
    </div>
  );
}
