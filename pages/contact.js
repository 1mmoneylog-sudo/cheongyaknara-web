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

      <div className="contact-page">
        <div className="contact-hero">
          <div className="contact-hero-icon">🎧</div>
          <h1>고객센터</h1>
          <p>청약나라 이용 중 궁금하신 점이나 오류를 문의해주세요.</p>
        </div>

        <div className="contact-card">
          {submitted ? (
            <div className="contact-done">
              <div className="contact-done-icon">✓</div>
              <h2>문의가 접수되었습니다</h2>
              <p>빠른 시일 내에 답변드리겠습니다. 감사합니다.</p>
              <Link href="/" className="primary-btn contact-done-btn">
                메인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="contact-notice">
                남겨주신 정보는 문의 답변 목적으로만 사용되며, 답변 완료 후 안전하게 파기됩니다.
              </p>

              <div className="contact-row">
                <div>
                  <label>문의 유형</label>
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
                  <label>이름</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="이름을 입력해주세요"
                    required
                  />
                </div>
              </div>

              <label>이메일</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
                required
              />

              <label>제목</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="문의 제목을 입력해주세요"
                required
              />

              <label>내용</label>
              <textarea
                className="contact-textarea"
                value={form.content}
                onChange={(e) => update("content", e.target.value)}
                placeholder="문의하실 내용을 자세히 적어주세요"
                required
              />

              <div className="contact-agree-box">
                <div className="contact-agree-title">개인정보 수집 및 이용 동의</div>
                <div className="contact-agree-scroll">
                  수집 항목: 이름, 이메일 / 수집 목적: 문의 답변 / 보유 기간: 답변 완료 후 즉시 파기.
                  위 개인정보 수집·이용에 동의하지 않으실 경우 문의 접수가 제한됩니다.
                </div>
                <label className="agree-item">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>개인정보 수집 및 이용에 동의합니다 (필수)</span>
                </label>
              </div>

              <button type="submit" className="login-submit" style={{ marginTop: 20 }}>
                문의 보내기
              </button>
            </form>
          )}
        </div>
      </div>

      <FloatingContactButtonPlaceholder />
    </div>
  );
}

function FloatingContactButtonPlaceholder() {
  return null;
}
