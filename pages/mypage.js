import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../lib/useUser";

const REGION_OPTIONS = [
  "서울", "경기도", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];
const KIND_OPTIONS = ["분양", "임대"];
const AGENCY_OPTIONS = ["LH", "SH", "GH", "청약홈"];

export default function MyPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  const [regions, setRegions] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [emailNotify, setEmailNotify] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("user_preferences")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRegions(data.interested_regions ?? []);
          setKinds(data.interested_kinds ?? []);
          setAgencies(data.interested_agencies ?? []);
          setEmailNotify(data.email_notify ?? true);
        }
      });

    supabase
      .from("user_bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBookmarks(data ?? []);
      });
  }, [user]);

  function toggleItem(list, setList, item) {
    setList((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    const { error } = await supabase.from("user_preferences").upsert({
      id: user.id,
      interested_regions: regions,
      interested_kinds: kinds,
      interested_agencies: agencies,
      email_notify: emailNotify,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaveMsg(error ? "저장에 실패했어요. 다시 시도해주세요." : "저장됐어요!");
  }

  async function handleRemoveBookmark(noticeId) {
    await supabase.from("user_bookmarks").delete().eq("user_id", user.id).eq("notice_id", noticeId);
    setBookmarks((prev) => prev.filter((b) => b.notice_id !== noticeId));
  }

  if (loading || !user) {
    return <div style={{ padding: 60, textAlign: "center" }}>불러오는 중...</div>;
  }

  return (
    <div className="bg-light-gray min-h-screen">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="dot" />
            청약나라
          </Link>
          <nav>
            <Link href="/">모집공고</Link>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
          </nav>
        </div>
      </header>

      <div className="layout" style={{ flexDirection: "column" }}>
        <h2 className="section-title" style={{ marginBottom: 20 }}>마이페이지</h2>

        <div className="filter-card">
          <h3 style={{ marginBottom: 14 }}>관심 지역</h3>
          <div className="chip-row">
            {REGION_OPTIONS.map((r) => (
              <button
                key={r}
                className={`chip-btn ${regions.includes(r) ? "active" : ""}`}
                onClick={() => toggleItem(regions, setRegions, r)}
              >
                {r}
              </button>
            ))}
          </div>

          <h3 style={{ margin: "22px 0 14px" }}>관심 유형</h3>
          <div className="chip-row">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k}
                className={`chip-btn ${kinds.includes(k) ? "active" : ""}`}
                onClick={() => toggleItem(kinds, setKinds, k)}
              >
                {k}
              </button>
            ))}
          </div>

          <h3 style={{ margin: "22px 0 14px" }}>관심 기관</h3>
          <div className="chip-row">
            {AGENCY_OPTIONS.map((a) => (
              <button
                key={a}
                className={`chip-btn ${agencies.includes(a) ? "active" : ""}`}
                onClick={() => toggleItem(agencies, setAgencies, a)}
              >
                {a}
              </button>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={emailNotify}
              onChange={(e) => setEmailNotify(e.target.checked)}
            />
            관심 조건에 맞는 새 공고를 이메일로 받기
          </label>

          <button
            className="primary-btn"
            style={{ marginTop: 20, width: 200 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
          {saveMsg && <p style={{ marginTop: 10, fontSize: 13.5, color: "var(--ink-soft)" }}>{saveMsg}</p>}
        </div>

        <div className="filter-card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 14 }}>관심 공고 ({bookmarks.length})</h3>
          {bookmarks.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>아직 등록한 관심 공고가 없어요.</p>
          ) : (
            bookmarks.map((b) => (
              <div
                key={b.notice_id}
                className="info-row"
                style={{ alignItems: "center" }}
              >
                <Link href={`/notice/${b.notice_id}`} style={{ fontSize: 14, fontWeight: 600 }}>
                  {b.notice_title || b.notice_id}
                </Link>
                <button
                  className="secondary-btn"
                  style={{ width: "auto", padding: "6px 12px", marginBottom: 0 }}
                  onClick={() => handleRemoveBookmark(b.notice_id)}
                >
                  삭제
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
