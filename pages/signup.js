import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== passwordConfirm) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone },
      },
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    alert("가입 확인 이메일을 보냈어요. 메일함을 확인해 링크를 눌러주세요.");
    router.push("/login");
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="auth-card-title">회원가입</h1>

        <div className="signup-notice-box">
          <p>✓ 관심 지역·유형에 새 공고를 문자로 받아보세요</p>
          <p>✓ 찜한 공고는 마감 임박(D-3, D-1)에 다시 알려드려요</p>
          <p>✓ 관심 공고 저장하려면 가입까지 전부 무료</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">이메일</label>
            <input
              type="email"
              className="form-input"
              placeholder="로그인에 사용할 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="input-subtext">로그인 및 알림 수신에 사용됩니다</span>
          </div>

          <div className="input-group">
            <label className="input-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="input-subtext">8자 이상, 숫자/문자 조합을 권장해요</span>
          </div>

          <div className="input-group">
            <label className="input-label">비밀번호 확인</label>
            <input
              type="password"
              className="form-input"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">연락처</label>
            <input
              type="tel"
              className="form-input"
              placeholder="-빼고 숫자만 입력"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">이름(실명)</label>
            <input
              type="text"
              className="form-input"
              placeholder="실명"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          {errorMsg && (
            <p style={{ color: "#c92a2a", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <div className="divider">또는 간편하게</div>

        <div className="social-buttons">
          <button type="button" className="btn-social btn-kakao" disabled>
            💬 카카오로 시작하기 (준비중)
          </button>
          <button type="button" className="btn-social btn-naver" disabled>
            N 네이버로 시작하기 (준비중)
          </button>
          <button type="button" className="btn-social btn-google" disabled>
            G 구글로 시작하기 (준비중)
          </button>
        </div>

        <div className="auth-footer">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
