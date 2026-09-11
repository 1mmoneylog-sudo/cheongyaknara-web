import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../lib/useUser";
import { getDday, getUrgencyLevel } from "../lib/dday";

const REGION_OPTIONS = [
  "서울", "경기도", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const KIND_OPTIONS = ["분양", "임대"];

export default function MyPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [regions, setRegions] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [bookmarks, setBookmarks] = useState([]);
  const [bmLoading, setBmLoading] = useState(true);

  // 미로그인 시 로그인 페이지로 이동
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  // 관심 조건 및 관심공고 목록 불러오기
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      setBmLoading(true);

      // 1. 관심 설정 불러오기
      const { data: prefData } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (prefData) {
        setRegions(prefData.regions || []);
        setKinds(prefData.kinds || []);
      }
      setLoading(false);

      // 2. 관심공고 목록 불러오기
      const { data: bmData } = await supabase
        .from("user_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bmData) {
        setBookmarks(bmData);
      }
      setBmLoading(false);
    }

    fetchData();
  }, [user]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2200);
  }

  // 관심지역 토글
  function toggleRegion(r) {
    setRegions((prev) =>
      prev.includes(r) ? prev.filter((i) => i !== r) : [...prev, r]
    );
  }

  // 관심유형 토글
  function toggleKind(k) {
    setKinds((prev) =>
      prev.includes(k) ? prev.filter((i) => i !== k) : [...prev, k]
    );
  }

  // 관심 설정 저장
  async function handleSavePreferences() {
    if (!user || saving) return;
    setSaving(true);

    try {
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: user.id,
        regions,
        kinds,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      showToast("청약 설정이 저장되었습니다.");
    } catch (err) {
      console.error("설정 저장 실패:", err);
      showToast("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  // 북마크 삭제 처리
  async function handleRemoveBookmark(noticeId) {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("notice_id", noticeId);

      if (error) throw error;

      setBookmarks((prev) => prev.filter((b) => b.notice_id !== noticeId));
      showToast("관심공고에서 삭제했습니다.");
    } catch (err) {
      console.error("북마크 삭제 실패:", err);
      showToast("삭제 실패했습니다. 다시 시도해주세요.");
    }
  }

  // 마감임박 공고 수 계산 (D-3 이하)
  const urgentCount = useMemo(() => {
    return bookmarks.filter((b) => {
      const d = getDday(b.apply_end_date);
      return d !== null && d >= 0 && d <= 3;
    }).length;
  }, [bookmarks]);

  if (userLoading || loading) {
    return (
      <div className="container" style={{ paddingTop: 40, textAlign: "center" }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      {/* 1. 관심공고 섹션 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>관심공고</h2>

        {bmLoading ? (
          <div>관심공고를 불러오는 중...</div>
        ) : bookmarks.length === 0 ? (
          <div style={{ color: "var(--ink-soft)", padding: "20px 0" }}>
            저장된 관심공고가 없습니다. 공고 목록에서 ☆를 눌러 저장해보세요.
          </div>
        ) : (
          <>
            <div className="bookmark-summary">
              <span>
                관심공고 <b>{bookmarks.length}개</b>
              </span>
              <span className="urgent-count">
                마감임박 <b>{urgentCount}개</b>
              </span>
            </div>

            <div className="bookmark-list">
              {bookmarks.map((bm) => {
                const dday = getDday(bm.apply_end_date);
                const urgency = getUrgencyLevel(dday);
                const applyRange =
                  bm.apply_start_date && bm.apply_end_date
                    ? `${bm.apply_start_date} ~ ${bm.apply_end_date}`
                    : bm.apply_end_date
                    ? `~${bm.apply_end_date}`
                    : "-";

                return (
                  <div key={bm.notice_id} className="bookmark-item">
                    <div className="bookmark-item-main">
                      <Link href={`/notice/${bm.notice_id}`} className="bookmark-item-title">
                        {bm.notice_title}
                      </Link>
                      <div className="bookmark-item-meta">
                        <span>{bm.region_sido ?? "-"}</span>
                        <span>{bm.source_agency ?? "-"}</span>
                        <span>접수기간: {applyRange}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className={`bookmark-item-dday ${urgency}`}>
                        {dday === null || dday < 0 ? "마감" : `D-${dday}`}
                      </span>
                      <button
                        onClick={() => handleRemoveBookmark(bm.notice_id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--ink-faint)",
                          fontSize: 16,
                        }}
                        title="삭제"
                      >
                        ★
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* 2. 나의 청약 설정 섹션 */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>나의 청약 설정</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 20 }}>
          내가 원하는 청약만 골라서 받아보세요.
        </p>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>관심 지역</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {REGION_OPTIONS.map((r) => {
              const active = regions.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRegion(r)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: "1px solid var(--line)",
                    background: active ? "var(--ink)" : "#fff",
                    color: active ? "#fff" : "var(--ink)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>관심 유형</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {KIND_OPTIONS.map((k) => {
              const active = kinds.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: "1px solid var(--line)",
                    background: active ? "var(--ink)" : "#fff",
                    color: active ? "#fff" : "var(--ink)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={saving}
          className="primary-btn"
          style={{ width: "100%", padding: "12px 0" }}
        >
          {saving ? "저장 중..." : "설정 저장하기"}
        </button>
      </section>

      {/* 토스트 메시지 */}
      {toastMsg && <div className="toast-message">{toastMsg}</div>}
    </div>
  );
}
