// 새로 추가된 공고를 감지해서, 관심조건이 일치하는 사용자에게 이메일 알림을 보냅니다.
// collect.js가 notices.json을 갱신한 "직후"에 실행되어야 합니다.

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const NOTICES_PATH = path.join(__dirname, "..", "data", "notices.json");
const PREV_NOTICES_PATH = path.join(__dirname, "..", "data", "notices.prev.json");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return { notices: [] };
  }
}

/** 사용자의 관심조건과 공고가 일치하는지 확인 */
function matchesPreference(notice, pref) {
  const regionOk =
    !pref.interested_regions?.length || pref.interested_regions.includes(notice.region_sido);
  const kindOk =
    !pref.interested_kinds?.length || pref.interested_kinds.includes(notice.supply_kind);
  return regionOk && kindOk;
}

function buildEmailHtml(userNotices) {
  const rows = userNotices
    .map(
      (n) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;">
          <a href="https://cheongyaknara-web.vercel.app/notice/${n.id}" style="color:#0F2A43;font-weight:700;text-decoration:none;">
            ${n.title}
          </a>
          <div style="font-size:13px;color:#888;margin-top:4px;">
            ${n.region_sido ?? "-"} · ${n.source_agency} · 접수 ${n.apply_start_date ?? "-"} ~ ${n.apply_end_date ?? "-"}
          </div>
        </td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#0F2A43;">🔔 관심 조건에 맞는 새 청약공고가 올라왔어요</h2>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin-top:24px;font-size:13px;color:#999;">
        이 메일은 청약나라 마이페이지에서 설정하신 관심 조건에 따라 발송됩니다.
      </p>
    </div>
  `;
}

async function main() {
  const current = loadJson(NOTICES_PATH);
  const previous = loadJson(PREV_NOTICES_PATH);

  const prevIds = new Set((previous.notices || []).map((n) => n.id));
  const newNotices = (current.notices || []).filter((n) => !prevIds.has(n.id));

  console.log(`[알림] 이전 대비 신규 공고: ${newNotices.length}건`);

  if (newNotices.length === 0) {
    console.log("[알림] 새 공고가 없어 발송을 건너뜁니다.");
    fs.writeFileSync(PREV_NOTICES_PATH, JSON.stringify(current, null, 2));
    return;
  }

  const { data: prefs, error } = await supabase
    .from("user_preferences")
    .select("id, interested_regions, interested_kinds, email_notify");

  if (error) {
    console.error("[알림] 사용자 조건 조회 실패:", error.message);
    return;
  }

  const activePrefs = (prefs || []).filter((p) => p.email_notify);
  console.log(`[알림] 알림 활성 사용자: ${activePrefs.length}명`);

  let sentCount = 0;

  for (const pref of activePrefs) {
    const matched = newNotices.filter((n) => matchesPreference(n, pref));
    if (matched.length === 0) continue;

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(pref.id);
    if (userErr || !userData?.user?.email) {
      console.error(`[알림] 사용자 이메일 조회 실패 (id=${pref.id}):`, userErr?.message);
      continue;
    }

    const toEmail = userData.user.email;

    try {
      await resend.emails.send({
        from: "청약나라 <onboarding@resend.dev>",
        to: toEmail,
        subject: `[청약나라] 관심 조건에 맞는 새 공고 ${matched.length}건`,
        html: buildEmailHtml(matched),
      });
      sentCount++;
      console.log(`[알림] 발송 완료 → ${toEmail} (${matched.length}건)`);
    } catch (err) {
      console.error(`[알림] 발송 실패 (${toEmail}):`, err.message);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[알림] 총 ${sentCount}명에게 발송 완료`);

  fs.writeFileSync(PREV_NOTICES_PATH, JSON.stringify(current, null, 2));
}

main().catch((err) => {
  console.error("[알림] 스크립트 실행 실패:", err);
  process.exit(1);
});
