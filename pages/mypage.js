import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const REGION_OPTIONS = [
  "서울", "경기도", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
];
const KIND_OPTIONS = ["분양", "임대"];

export default function MyPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedKinds, setSelectedKinds] = useState([]);

  // 클라이언트 마운트 이후에만 렌더링 실행 (빌드 에러 방지 핵심 코드)
  useEffect(() => {
    setMounted(true);
    // 기존에 localStorage나 supabase 데이터 가져오던 로직을 여기에 넣으세요
  }, []);

  const handleRemoveBookmark = (id) => {
    setBookmarks((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleRegion = (region) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const toggleKind = (kind) => {
    setSelectedKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
    );
  };

  const handleSaveSettings = () => {
    alert("설정이 저장되었습니다.");
  };

  // 마운트되기 전(서버 렌더링 시점)에는 빈 컴포넌트 반환
  if (!mounted) return null;

  return (
    <div className="mypage-container">
      {/* 관심공고 섹션 */}
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

      {/* 나의 청약 설정 섹션 */}
      <section className="mypage-section">
        <h3>나의 청약 설정</h3>
        <p className="sub-desc">내가 원하는 청약만 골라서 받아보세요.</p>

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

        <button className="primary-btn" onClick={handleSaveSettings}>
          설정 저장하기
        </button>
      </section>
    </div>
  );
}
