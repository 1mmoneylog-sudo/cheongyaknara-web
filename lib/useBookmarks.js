import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useUser } from "./useUser";

export function useBookmarks() {
  const { user } = useUser();
  const [bookmarks, setBookmarks] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setBookmarks(new Set());
      setLoaded(true);
      return;
    }
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("notice_id")
        .eq("user_id", user.id);
      if (!active) return;
      if (error) {
        console.error("관심공고 불러오기 실패:", error.message);
        setBookmarks(new Set());
      } else {
        setBookmarks(new Set(data.map((row) => row.notice_id)));
      }
      setLoaded(true);
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const toggleBookmark = useCallback(
    async (noticeId) => {
      if (!user) return { ok: false, reason: "no-user" };

      const isBookmarked = bookmarks.has(noticeId);
      if (isBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("notice_id", noticeId);
        if (error) {
          console.error("관심공고 삭제 실패:", error.message);
          return { ok: false, reason: "error" };
        }
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(noticeId);
          return next;
        });
        return { ok: true, action: "removed" };
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, notice_id: noticeId });
        if (error) {
          console.error("관심공고 저장 실패:", error.message);
          return { ok: false, reason: "error" };
        }
        setBookmarks((prev) => new Set(prev).add(noticeId));
        return { ok: true, action: "added" };
      }
    },
    [user, bookmarks]
  );

  return { bookmarks, toggleBookmark, loaded };
}
