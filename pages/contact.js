import Link from "next/link";
import { useState } from "react";

const TOPICS = ["일반 문의", "오류 신고", "제휴·광고 문의", "기타"];

export default function Contact() {
  const [form, setForm] = useState({
    topic: "",
    name: "",
    email: "",
    title: "",
    content: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) {
      alert("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    setSubmitted(true);
  }

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

      <div className="wn-page">
        <div className="wn-inner">
          <div className="wn-badge">고객센터</div>
          <h1 className="wn-title">
            문의사항이 있으신가요?
            <br />
            빠르게 답변드릴게요
          </h1>
          <p className="wn-subtitle">
            청약나라 이용 중 궁금한 점이나 오류를 남겨주시면 확인 후 답변드립니다.
          </p>

          <div className="wn-step-card">
            <div className="wn-step-num">1</div>
            <div>
              <div className="wn-step-title">문의 유형 선택</div>
              <div className="wn-step-desc">일반 문의·오류 신고·제휴 문의 등 유형을 골라주세요.</div>
            </div>
          </div>

          <div className="wn-step-card">
            <div className="wn-step-num">2</div>
            <div>
              <div className="wn-step-title">내용 작성</div>
              <div className="wn-step-desc">문의하실 내용을 최대한 자세히 적어주시면 빠른 확인에 도움이 돼요.</div>
            </div>
          </div>

          <div className="wn-step-card">
            <div className="wn-step-num">3</div>
            <div>
              <div className="wn-step-title">답변 받기</div>
              <div className="wn-step-desc">입력하신 이메일로 확인 후 답변을 보내드립니다.</div>
            </div>
          </div>

          <div className="wn-highlight-box">
            {submitted ? (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div className="contact-done-icon" style={{ margin: "0 auto 16px" }}>✓</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>문의가 접수되었습니다</h2>
                <p style={{ fontSize: 14, color: "#6B7684", marginBottom: 24 }}>
                  빠른 시일 내에 답변드리겠습니다. 감사합니다.
                </p>
                <Link href="/" className="wn-submit-btn" style={{ display: "inline-block", width: "auto", padding: "12px 32px", textDecoration: "none" }}>
                  메인으로 돌아가기
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="wn-form-row">
                  <div>
                    <label className="auth-label">문의 유형</label>
                    <select
                      className="pill-select full"
                      value={form.topic}
                      onChange={(e) => update("topic", e.target.value)}
                      required
                    >
                      <option value="">선택해주세요</option>
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="auth-label">이름</label>
                    <input
                      className="auth-input"
                      type="text"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="이름을 입력해주세요"
                      required
                    />
                  </div>
                </div>

                <label className="auth-label">이메일</label>
                <input
                  className="auth-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com"
                  required
                />

                <label className="auth-label">제목</label>
                <input
                  className="auth-input"
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="문의 제목을 입력해주세요"
                  required
                />

                <label className="auth-label">내용</label>
                <textarea
                  className="auth-input wn-textarea"
                  value={form.content}
                  onChange={(e) => update("content", e.target.value)}
                  placeholder="문의하실 내용을 자세히 적어주세요"
                  required
                />

                <label className="auth-checkbox-row" style={{ marginTop: 16 }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  개인정보 수집 및 이용에 동의합니다 (필수)
                </label>

                <button type="submit" className="wn-submit-btn">
                  문의 보내기
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
