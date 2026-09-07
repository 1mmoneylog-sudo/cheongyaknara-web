import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "일반문의",
    title: "",
    content: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("문의가 정상적으로 접수되었습니다.");
  };

  return (
    <div className="page-container">
      <div className="form-card contact-card">
        <h1 className="auth-card-title">문의하기</h1>
        <p className="contact-subtitle">
          청약나라 이용 중 궁금한 점이나 불편한 사항을 남겨주시면 빠르게 답변해 드리겠습니다.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">이름</label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="홍길동"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">답변받을 이메일</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">문의 유형</label>
            <select
              name="category"
              className="form-input form-select"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="일반문의">일반문의</option>
              <option value="공고오류제보">공고 오류 제보</option>
              <option value="계정문의">계정/로그인 문의</option>
              <option value="제휴문의">제휴 및 제안</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">제목</label>
            <input
              type="text"
              name="title"
              className="form-input"
              placeholder="문의 제목을 입력해 주세요"
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
              placeholder="상세 내용을 작성해 주세요"
              rows={5}
              value={formData.content}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-submit" style={{ marginTop: "12px" }}>
            문의 보내기
          </button>
        </form>
      </div>
    </div>
  );
}
