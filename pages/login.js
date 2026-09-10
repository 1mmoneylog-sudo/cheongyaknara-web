import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setErrorMsg("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push("/");
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="auth-card-title">로그인</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">이메일</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
          </div>

          {errorMsg && (
            <p style={{ color: "#c92a2a", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
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
          계정이 없으신가요? <Link href="/signup">회원가입</Link> · <Link href="/find-password">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
