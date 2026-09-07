import { useState } from "react";
import Link from "next/link";

// 이미지 스크린샷과 동일한 카드 목록 컴포넌트
export default function Home() {
  const [bookmarks, setBookmarks] = useState({});

  const dummyNotices = [
    {
      id: "1",
      agency: "청약홈",
      type: "무순위·잔여세대",
      title: "포레나더샵 인천시청역(3차)",
      location: "인천",
      units: "5세대",
      period: "2026-09-07 ~ 2026-09-07",
      winnerDate: "2026-09-10",
      dday: "D-1",
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80", // 예시 주택 이미지
      isNew: true,
    },
    {
      id: "2",
      agency: "청약홈",
      type: "무순위·잔여세대",
      title: "대방역 여의도 더로드캐슬(5차)",
      location: "서울",
      units: "3세대",
      period: "2026-09-01 ~ 2026-09-07",
      winnerDate: "2026-09-10",
      dday: "D-1",
      imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80",
      isNew: false,
    },
    {
      id: "3",
      agency: "SH",
      type: "임대/분양",
      title: "[SH] NEW [서류심사대상자 발표] 2026년 1차 일반주택형 미리내집",
      location: "서울특별시",
      units: "-",
      period: "2026-09-07 ~ 2026-09-07",
      winnerDate: "-",
      dday: "D-Day",
      imageUrl: "", // 이미지 없는 경우 예시
      isNew: true,
    },
  ];

  const toggleBookmark = (id) => {
    setBookmarks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      {/* GNB 네비게이션 */}
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="logo-dot" /> 청약나라
          </Link>
          <nav className="nav-links">
            <Link href="/" className="active">모집공고</Link>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
          </nav>
          <div className="auth-links">
            <Link href="/contact" style={{ color: "#64748b" }}>문의하기</Link>
            <Link href="/login" style={{ color: "#64748b" }}>로그인</Link>
            <Link href="/signup" style={{ color: "#2563eb" }}>회원가입</Link>
          </div>
        </div>
      </header>

      {/* 메인 본문 */}
      <main className="home-container">
        <h1 className="main-title">
          청약 모집공고,<br />한 곳에서 한눈에
        </h1>
        <p className="main-sub">
          LH · SH · GH · 청약홈에 흩어진 공공분양 및 임대주택 공고를 실시간 수집하여 정리합니다.
        </p>

        {/* 검색창 & 필터 */}
        <div className="search-card">
          <div className="search-input-box">
            <input type="text" placeholder="관심 지역, 단지명, 기관명 검색" />
          </div>
          <div className="filter-row" style={{ marginBottom: "8px" }}>
            <button className="filter-btn active">기관 전체</button>
            <button className="filter-btn">LH</button>
            <button className="filter-btn">GH</button>
            <button className="filter-btn">SH</button>
            <button className="filter-btn">청약홈</button>
          </div>
          <div className="filter-row">
            <button className="filter-btn active">유형 전체</button>
            <button className="filter-btn">분양</button>
            <button className="filter-btn">임대</button>
            <button className="filter-btn">지역 전체</button>
          </div>
        </div>

        {/* 카드 그리드 영역 */}
        <h2 className="grid-title">현재 지원 가능한 공고</h2>

        <div className="notice-grid">
          {dummyNotices.map((item) => (
            <div key={item.id} className="card-item">
              {/* 이미지 섬네일 영역 */}
              <div className="card-image-box">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} />
                ) : (
                  <span className="image-placeholder">이미지 준비중</span>
                )}
              </div>

              {/* 카드 정보 */}
              <div className="card-content">
                <div className="badge-group">
                  <span className="tag-badge agency">{item.agency}</span>
                  <span className="tag-badge type">{item.type}</span>
                  {item.isNew && <span className="tag-badge new">NEW</span>}
                </div>

                <div className="item-title">{item.title}</div>

                <div className="item-info-row">
                  <div><b>위치:</b> {item.location} | <b>모집세대수:</b> {item.units}</div>
                  <div><b>접수기간:</b> {item.period}</div>
                  <div><b>당첨자발표:</b> {item.winnerDate}</div>
                </div>

                <div className="item-footer">
                  <span className="dday-tag">{item.dday}</span>
                  <span
                    className={`bookmark-icon ${bookmarks[item.id] ? "active" : ""}`}
                    onClick={() => toggleBookmark(item.id)}
                  >
                    ★
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
