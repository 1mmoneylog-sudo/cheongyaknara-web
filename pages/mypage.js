export default function MyPage() {
  const router = useRouter();
  // ... (기존 state 및 함수 로직 유지)

  return (
    <div className="mypage-container">
      {/* 관심공고 영역 */}
      <section className="mypage-section">
        <h3>관심공고</h3>
        {bookmarks.length === 0 ? (
          <p className="sub-desc">
            저장된 관심공고가 없습니다. 공고 목록에서 [관심공고 등록]을 눌러 저장해보세요.
          </p>
        ) : (
          <div className="bookmark-list">
            {bookmarks.map((item) => (
              <div key={item.id} className="bookmark-item">
                <div className="bookmark-item-main">
                  <Link href={`/detail/${item.id}`} className="bookmark-item-title">
                    {item.title}
                  </Link>
                  <div className="bookmark-item-meta">
                    <span>{item.region}</span>
                    <span>{item.agency}</span>
                    <span>{item.type}</span>
                  </div>
                </div>
                {/* 우측 관심공고 등록 버튼 */}
                <button
                  className="bookmark-text-btn active"
                  onClick={() => handleRemoveBookmark(item.id)}
                >
                  ♥ 관심공고 등록됨
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 나의 청약 설정 영역 */}
      <section className="mypage-section">
        <h3>나의 청약 설정</h3>
        <p className="sub-desc">내가 원하는 청약만 골라서 받아보세요.</p>

        {/* 관심 지역 */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "10px" }}>관심 지역</div>
          <div className="chip-row">
            {REGION_OPTIONS.map((region) => (
              <button
                key={region}
                className={`chip-btn ${selectedRegions.includes(region) ? "active" : ""}`}
                onClick={() => toggleRegion(region)}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* 관심 유형 */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "10px" }}>관심 유형</div>
          <div className="chip-row">
            {KIND_OPTIONS.map((kind) => (
              <button
                key={kind}
                className={`chip-btn ${selectedKinds.includes(kind) ? "active" : ""}`}
                onClick={() => toggleKind(kind)}
              >
                {kind}
              </button>
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <button className="primary-btn" onClick={handleSaveSettings}>
          설정 저장하기
        </button>
      </section>
    </div>
  );
}
