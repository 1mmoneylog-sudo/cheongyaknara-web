import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    title: "",
    content: "",
    agree: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.agree) {
      alert("개인정보 수집 및 이용에 동의해 주세요.");
      return;
    }
    alert("문의가 정상적으로 접수되었습니다. 확인 후 신속히 연락드리겠습니다.");
  };

  return (
    <div className="contact-page-container">
      <div className="contact-wrapper">
        {/* 헤더 섹션 */}
        <div className="contact-header">
          <span className="contact-badge">고객센터</span>
          <h1 className="contact-title">
            문의사항이 있으신가요?<br />빠르게 답변드릴게요
          </h1>
          <p className="contact-desc">
            청약나라 이용 중 궁금한 점이나 오류를 남겨주시면 확인 후 답변드립니다.
          </p>
        </div>

        {/* 문의 폼 카드 */}
        <div className="contact-form-card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">이름</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="이름을 입력해주세요"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">연락처</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="010-0000-0000 ('-' 제외 가능)"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">제목</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="문의 제목을 입력해주세요"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">내용</label>
              <textarea
                name="content"
                className="form-input form-textarea"
                placeholder="문의하실 내용을 자세히 적어주세요"
                rows={6}
                value={formData.content}
                onChange={handleChange}
                required
              />
            </div>

            <div className="checkbox-item" style={{ margin: "16px 0 24px 0" }}>
              <input
                type="checkbox"
                name="agree"
                id="agree"
                checked={formData.agree}
                onChange={handleChange}
                required
              />
              <label htmlFor="agree">개인정보 수집 및 이용에 동의합니다 (필수)</label>
            </div>

            <button type="submit" className="btn-submit">
              문의 보내기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
