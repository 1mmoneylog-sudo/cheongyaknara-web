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
      alert("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }

    console.log("문의 접수 데이터:", formData);
    alert("문의가 정상적으로 접수되었습니다.");

    setFormData({
      name: "",
      phone: "",
      title: "",
      content: "",
      agree: false,
    });
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="auth-card-title">1:1 문의하기</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">성함</label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="성함을 입력해주세요"
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
              placeholder="연락처를 입력해주세요"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">문의 제목</label>
            <input
              type="text"
              name="title"
              className="form-input"
              placeholder="제목을 입력해주세요"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">문의 내용</label>
            <textarea
              name="content"
              className="form-input form-textarea"
              rows={5}
              placeholder="문의 내용을 상세히 작성해주세요"
              value={formData.content}
              onChange={handleChange}
              required
            />
          </div>

          <div className="checkbox-item" style={{ margin: "20px 0" }}>
            <input
              type="checkbox"
              name="agree"
              id="agree"
              checked={formData.agree}
              onChange={handleChange}
              required
            />
            <label htmlFor="agree">개인정보 수집 및 이용 동의 (필수)</label>
          </div>

          <button type="submit" className="btn-submit">
            문의하기 제출
          </button>
        </form>
      </div>
    </div>
  );
}
