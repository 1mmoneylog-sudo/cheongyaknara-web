import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useUser } from "../lib/useUser";
import { useBookmarks } from "../lib/useBookmarks";
import { supabase } from "../lib/supabaseClient";
import noticesData from "../data/notices.json";
import { getDday } from "../lib/dday";

const REGION_OPTIONS = [
  "서울", "경기도", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
];
const KIND_OPTIONS = ["분양", "임대"];

export default function MyPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const [mounted, setMounted] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedKinds, setSelectedKinds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !userLoading && !user) {
      router.push("/login");
    }
  }, [mounted, userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_preferences")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSelectedRegions(data.interested_regions ?? []);
          setSelectedKinds(data.interested_kinds ?? []);
        }
      });
  }, [user]);

  const bookmarkedNotices = useMemo(() => {
    return noticesData.notices
      .filter((n) => bookmarks.has(n.id))
      .map((n) => ({ ...n, dday: getDday(n.apply_end_date) }));
  }, [bookmarks]);

  const urgentCount = bookmarkedNotices.filter(
    (n) => n.dday !== null && n.dday >= 0 && n.dday <= 3
  ).length;

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

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg("");

    const { error } = await supabase.from("user_preferences").upsert({
      id: user.id,
      interested_regions: selectedRegions,
      interested_kinds: selectedKinds,
      email_notify: true,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      console.error("설정 저장 실패:", error.message);
      setSaveMsg("저장에 실패했어요. 다시 시도해주세요.");
      return;
    }

    setSaveMsg("✅ 설정이 저장됐어요! 관심 조건에 맞는 새 공고를 이메일로 보내드릴게요.");
  };


    const pushResult = await subscribeToPush(user.id);
    setSaving(false);

    if (pushResult.ok) {
      setSaveMsg("🔔 알림 설정 완료! 조건에 맞는 새 공고가 뜨면 알려드릴게요.");
    } else if (pushResult.reason === "denied") {
      setSaveMsg("조건은 저장됐어요. 알림을 받으시려면 브라우저 알림 권한을 허용해주세요.");
    } else if (pushResult.reason === "unsupported") {
      setSaveMsg("조건은 저장됐어요. (이 브라우저는 알림 기능을 지원하지 않아요.)");
    } else {
      setSaveMsg("조건은 저장됐지만, 알림 구독 중 오류가 발생했어요.");
    }
  };

  if (!mounted || !user) return null;

  return (
    <div className="mypage-container">
      <section className="mypage-section">
        <h3>
          관심공고
          {bookmarkedNotices.length > 0 && ` ${bookmarkedNotices.length}개`}
          {urgentCount > 0 && ` · 마감임박 ${urgentCount}개`}
        </h3>
        {bookmarkedNotices.length === 0 ? (
          <p className="sub-desc">
            저장된 관심공고가 없습니다. 공고 목록에서 ☆를 눌러 저장해보세요.
          </p>
        ) : (
          <div className="bookmark-list">
            {bookmarkedNotices.map((item) => (
              <div key={item.id} className="bookmark-item">
                <div className="bookmark-item-main">
                  <Link href={`/notice/${item.id}`} className="bookmark-item-title">
                    {item.title}
                  </Link>
                  <div className="bookmark-item-meta">
                    <span>{item.region_sido ?? "-"}</span>
                    <span>{item.source_agency}</span>
                    <span>
                      {item.apply_start_date ?? "-"} ~ {item.apply_end_date ?? "-"}
                    </span>
                    {item.dday !== null && <span>D-{item.dday}</span>}
                  </div>
                </div>
                <button
                  className="bookmark-text-btn active"
                  onClick={() => toggleBookmark(item.id)}
                >
                  ♥ 관심공고 삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

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

        <button className="primary-btn" onClick={handleSaveSettings} disabled={saving}>
          {saving ? "처리 중..." : "나에게 맞는 청약공고 알림받기 🔔"}
        </button>
        {saveMsg && (
          <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--ink-soft)" }}>{saveMsg}</p>
        )}
      </section>
    </div>
  );
}
