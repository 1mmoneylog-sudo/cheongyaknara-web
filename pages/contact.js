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
