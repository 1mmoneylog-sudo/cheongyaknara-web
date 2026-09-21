const { chromium } = require("playwright");
const fs = require("fs");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const show = (type, buf) =>
  String(type || "").includes("text")
    ? buf.toString("utf8").replace(/\s+/g, " ").slice(0, 700)
    : "(이미지/바이너리)";

(async () => {
  const data = JSON.parse(fs.readFileSync("data/notices.json", "utf-8"));
  const n = (data.notices || []).find(
    (x) => x.source_agency === "LH" && (x.image_urls || []).length > 0 && x.detail_url
  );
  if (!n) {
    console.log("[테스트] 대상 공고 없음");
    return;
  }
  const imgUrl = n.image_urls[0].url;
  const detailUrl = n.detail_url;
  console.log("[상세페이지]", detailUrl);
  console.log("[이미지 URL]", imgUrl);

  try {
    const r1 = await fetch(imgUrl, { headers: { "User-Agent": UA, Referer: detailUrl } });
    const b1 = Buffer.from(await r1.arrayBuffer());
    const t1 = r1.headers.get("content-type");
    console.log(`[1. fetch+Referer] status=${r1.status} type=${t1} size=${b1.length}`);
    console.log("  본문:", show(t1, b1));
  } catch (e) {
    console.log("[1] 실패:", e.message);
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, locale: "ko-KR" });
  const page = await ctx.newPage();
  try {
    const dr = await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    const db = await dr.body();
    console.log(`[2-a. 상세페이지 방문] status=${dr.status()} size=${db.length}`);
    console.log("  본문 앞부분:", show("text", db).slice(0, 300));
  } catch (e) {
    console.log("[2-a] 실패:", e.message);
  }
  try {
    const r2 = await page.request.get(imgUrl, { headers: { Referer: detailUrl } });
    const b2 = await r2.body();
    const t2 = r2.headers()["content-type"];
    console.log(`[2-b. 방문 후 이미지 요청] status=${r2.status()} type=${t2} size=${b2.length}`);
    console.log("  본문:", show(t2, b2));
  } catch (e) {
    console.log("[2-b] 실패:", e.message);
  }
  await browser.close();
})().catch((e) => console.log("[테스트 오류]", e.message));
