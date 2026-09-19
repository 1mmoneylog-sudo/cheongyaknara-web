// GH·LH 등 일부 기관 사이트는 이미지에 "핫링크 방지"를 걸어둬서, 우리 사이트에서
// 직접 <img src="원본URL">로 불러오면 브라우저가 차단당한다 (깨진 이미지로 보임).
// 이 API가 대신 이미지를 가져와서 우리 서버를 거쳐 전달해주면 문제가 해결된다.
//
// ✅ v2: LH 이미지 도메인(apply.lh.or.kr) 추가
// ✅ v3: 원본 서버가 200(성공)을 줘도 실제로는 이미지가 아니라 HTML(로그인 요구,
//    에러 페이지 등)을 줄 수 있음을 발견. content-type이 "image/"로 시작하는지
//    확인하고, 아니면 실제로 뭐가 왔는지 그대로 보여주도록 진단 코드 추가.

const ALLOWED_HOSTS = [
  "apply-cdn.gh.or.kr",
  "apply.gh.or.kr",
  "apply.lh.or.kr",
];

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).send("url 파라미터가 필요합니다.");
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).send("올바르지 않은 URL입니다.");
  }

  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    return res.status(403).send("허용되지 않은 이미지 도메인입니다.");
  }

  try {
    const upstream = await fetch(target.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: `${target.protocol}//${target.hostname}/`,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send(`원본 이미지 서버 오류 (${upstream.status})`);
    }

    const contentType = upstream.headers.get("content-type") || "";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    // ✅ 진짜 이미지가 맞는지 확인. 아니면 실제로 뭐가 왔는지 그대로 알려줌
    //    (브라우저 네트워크 탭의 Response에서 바로 원인 확인 가능하도록).
    if (!contentType.startsWith("image/")) {
      const preview = buffer.slice(0, 500).toString("utf-8").replace(/\s+/g, " ").trim();
      console.error(
        `[이미지 프록시] 이미지가 아닌 응답 (content-type: ${contentType}, url: ${target.href})`
      );
      return res
        .status(502)
        .send(
          `이미지가 아닌 응답을 받았습니다 (content-type: ${contentType}). 응답 미리보기: ${preview}`
        );
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("이미지 프록시 실패:", err.message);
    return res.status(500).send("이미지를 불러오지 못했습니다.");
  }
}
