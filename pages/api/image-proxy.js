// GH·LH 등 일부 기관 사이트는 이미지에 "핫링크 방지"를 걸어둬서, 우리 사이트에서
// 직접 <img src="원본URL">로 불러오면 브라우저가 차단당한다 (깨진 이미지로 보임).
// 이 API가 대신 이미지를 가져와서 우리 서버를 거쳐 전달해주면 문제가 해결된다.
//
// 사용법 (프론트엔드에서):
//   <img src={`/api/image-proxy?url=${encodeURIComponent(원본이미지URL)}`} />
//
// ✅ 2026-09: LH 이미지 도메인(apply.lh.or.kr) 추가.
//    실제로 403이 나던 요청을 확인해보니 LH 공고 이미지가
//    https://apply.lh.or.kr/lhapply/lhImageView2.do?fileid=... 형태였음.

// ⚠️ 보안: 아무 URL이나 중계해주면 우리 서버가 악용될 수 있으므로(SSRF),
//    실제로 이미지가 오는 도메인만 허용 목록에 넣어둔다.
const ALLOWED_HOSTS = [
  "apply-cdn.gh.or.kr",
  "apply.gh.or.kr",
  "apply.lh.or.kr", // ✅ 추가: LH 이미지 뷰어 도메인
  // 다른 기관 이미지 도메인도 문제가 생기면 여기에 추가하면 됨
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
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send("원본 이미지 서버 오류");
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable"); // 하루 동안 캐시
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("이미지 프록시 실패:", err.message);
    return res.status(500).send("이미지를 불러오지 못했습니다.");
  }
}
