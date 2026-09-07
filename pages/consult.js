import { useState } from "react";

export default function Consult() {
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
      alert("개인정보 수집 및 상담 활용 동의가 필요합니다.");
      return;
    }

    console.log("제출된 상담 데이터:", formData);
    alert("상담 신청이 완료되었습니다. 담당 전문가가 빠른 시일 내에 연락드리겠습니다.");

    setFormData({
      name: "",
      phone: "",
      topic: "청약 자격 및 가점 진단",
      content: "",
      agree: false,
    });
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      backgroundColor: "#f8fafc",
      padding: "40px 20px 80px 20px",
      display: "flex",
      justifyContent: "center"
    }}>
      <div style={{ width: "100%", maxWidth: "580px" }}>
        
        {/* 헤더 부분 */}
        <div style={{ textAlign: "left", marginBottom: "20px" }}>
          <div style={{
            display: "inline-block",
            backgroundColor: "#1e3a8a",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "700",
            padding: "4px 12px",
            borderRadius: "4px",
            marginBottom: "12px"
          }}>
            전문가 1:1 맞춤 컨설팅
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", lineHeight: "1.3", marginBottom: "8px" }}>
            청약 관련 전문가 상담 신청
          </h1>
          <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.5", margin: 0 }}>
            복잡한 자격 조건, 가점 계산, 특별공급 전략 등 고민되는 사항을 남겨주시면
            담당 전문가가 직접 분석 후 연락을 드립니다.
          </p>
        </div>

        {/* 안내 박스 */}
        <div style={{
          backgroundColor: "#e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "24px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
            <span style={{ color: "#1e3a8a", fontWeight: "800" }}>✓</span>
            <span>전문 상담사의 1:1 맞춤 분석</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
            <span style={{ color: "#1e3a8a", fontWeight: "800" }}>✓</span>
            <span>접수 후 24시간 이내 신속한 상담</span>
          </div>
        </div>

        {/* 폼 카드 */}
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)"
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>신청자 성함</label>
              <input
                type="text"
                name="name"
                placeholder="성함을 입력해 주세요"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: "100%", height: "46px", padding: "0 14px", border: "1px solid #d1d5db",
                  borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>연락처</label>
              <input
                type="tel"
                name="phone"
                placeholder="010-0000-0000 ('-' 제외 가능)"
                value={formData.phone}
                onChange={handleChange}
                required
                style={{
                  width: "100%", height: "46px", padding: "0 14px", border: "1px solid #d1d5db",
                  borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>상담 분야 선택</label>
              <select
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                style={{
                  width: "100%", height: "46px", padding: "0 14px", border: "1px solid #d1d5db",
                  borderRadius: "8px", fontSize: "14px", outline: "none", backgroundColor: "#fff",
                  cursor: "pointer", boxSizing: "border-box"
                }}
              >
                <option value="청약 자격 및 가점 진단">청약 자격 및 가점 진단</option>
                <option value="신혼부부 / 생애최초 특별공급">신혼부부 / 생애최초 특별공급</option>
                <option value="관심 단지 분석 및 당첨 전략">관심 단지 분석 및 당첨 전략</option>
                <option value="기타 청약/부동산 문의">기타 청약/부동산 문의</option>
              </select>
            </div>

            <div style={{ marginBottom: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>상담 요청 내용</label>
              <textarea
                name="content"
                rows={5}
                placeholder="현재 무주택 여부, 부양가족 수, 청약통장 가입 기간 등 상황을 함께 남겨주시면 더욱 정확한 상담이 가능합니다."
                value={formData.content}
                onChange={handleChange}
                required
                style={{
                  width: "100%", padding: "12px 14px", border: "1px solid #d1d5db",
                  borderRadius: "8px", fontSize: "14px", outline: "none", resize: "vertical",
                  lineHeight: "1.5", boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0 24px 0" }}>
              <input
                type="checkbox"
                name="agree"
                id="agree"
                checked={formData.agree}
                onChange={handleChange}
                required
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="agree" style={{ fontSize: "13px", color: "#374151", cursor: "pointer" }}>
                개인정보 수집 및 상담 활용 동의 (필수)
              </label>
            </div>

            <button
              type="submit"
              style={{
                width: "100%", height: "50px", backgroundColor: "#1e3a8a", color: "#ffffff",
                fontSize: "16px", fontWeight: "700", border: "none", borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              무료 상담 신청하기
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
