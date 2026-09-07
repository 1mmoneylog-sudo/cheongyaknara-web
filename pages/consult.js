import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    topic: "청약 자격 및 가점 진단",
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
    alert("상담 신청이 완료되었습니다. 전문 상담사가 확인 후 신속히 연락드리겠습니다.");
  };

  return (
    <div className="contact-page-container">
      <div className="contact-wrapper">
        {/* 헤더 섹션: 위원나라 스타일 톤앤매너 */}
        <div className="contact-header">
          <span className="contact-badge">전문가 1:1 맞춤 상담</span>
          <h1 className="contact-title">
            내집마련 고민,<br />전문 상담 신청하기
          </h1>
          <p className="contact-desc">
            청약 자격, 가점 계산, 분양 일정 등 궁금하신 점을 남겨주시면 전문가가 맞춤 솔루션을 제공해 드립니다.
          </p>
        </div>

        {/* 폼 카드 */}
        <div className="contact-form-card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">신청자 성함</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="성함을 입력해 주세요"
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
              <label className="input-label">주요 상담 분야</label>
              <select
                name="topic"
                className="form-input form-select"
                value={formData.topic}
                onChange={handleChange}
              >
                <option value="청약 자격 및 가점 진단">청약 자격 및 가점 진단</option>
                <option value="신혼부부/생애최초 특별공급">신혼부부/생애최초 특별공급</option>
                <option value="관심 단지 분석 및 전략">관심 단지 분석 및 전략</option>
                <option value="기타 청약 일반 문의">기타 청약 일반 문의</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">상담 요청 내용</label>
              <textarea
                name="content"
                className="form-input form-textarea"
                placeholder="현재 상황이나 궁금하신 내용을 상세히 적어주시면 더 정확한 상담이 가능합니다."
                rows={5}
                value={formData.content}
                onChange={handleChange}
                required
              />
            </div>

            <div className="checkbox-item" style={{ margin: "20px 0 24px 0" }}>
              <input
                type="checkbox"
                name="agree"
                id="agree"
                checked={formData.agree}
                onChange={handleChange}
                required
              />
              <label htmlFor="agree">개인정보 수집 및 상담 활용에 동의합니다 (필수)</label>
            </div>

            <button type="submit" className="btn-submit btn-consulting">
              1:1 맞춤 상담 신청하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
