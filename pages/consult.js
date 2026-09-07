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
      alert("개인정보 수집 및 상담 활용에 동의해 주세요.");
      return;
    }
    alert("상담 신청이 접수되었습니다. 담당 전문가가 빠른 시일 내에 연락드리겠습니다.");
  };

  return (
    <div className="consult-page-container">
      <div className="consult-wrapper">
        {/* 위원나라 스타일 상단 헤더 */}
        <div className="consult-header">
          <div className="consult-badge">전문가 1:1 맞춤 컨설팅</div>
          <h1 className="consult-title">청약 관련 전문가 상담 신청</h1>
          <p className="consult-desc">
            복잡한 자격 조건, 가점 계산, 특별공급 전략 등 고민되는 사항을 남겨주시면
            담당 전문가가 직접 분석 후 연락을 드립니다.
          </p>
        </div>

        {/* 신뢰감을 주는 안내 박스 */}
        <div className="consult-notice-box">
          <div className="notice-item">
            <span className="notice-icon">✓</span>
            <span>전문 상담사의 1:1 맞춤 분석</span>
          </div>
          <div className="notice-item">
            <span className="notice-icon">✓</span>
            <span>접수 후 24시간 이내 신속한 상담</span>
          </div>
        </div>

        {/* 상담 신청 폼 */}
        <div className="consult-form-card">
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
              <label className="input-label">상담 분야 선택</label>
              <select
                name="topic"
                className="form-input form-select"
                value={formData.topic}
                onChange={handleChange}
              >
                <option value="청약 자격 및 가점 진단">청약 자격 및 가점 진단</option>
                <option value="신혼부부 / 생애최초 특별공급">신혼부부 / 생애최초 특별공급</option>
                <option value="관심 단지 분석 및 당첨 전략">관심 단지 분석 및 당첨 전략</option>
                <option value="기타 청약/부동산 문의">기타 청약/부동산 문의</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">상담 요청 내용</label>
              <textarea
                name="content"
                className="form-input form-textarea"
                placeholder="현재 무주택 여부, 부양가족 수, 청약통장 가입 기간 등 상황을 함께 남겨주시면 더욱 정확한 상담이 가능합니다."
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
              <label htmlFor="agree">개인정보 수집 및 상담 활용 동의 (필수)</label>
            </div>

            <button type="submit" className="btn-consult-submit">
              무료 상담 신청하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
