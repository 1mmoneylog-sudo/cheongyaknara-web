// GH·LH 등 일부 기관 사이트는 이미지에 "핫링크 방지"를 걸어둬서, 우리 사이트에서
// 직접 <img src="원본URL">로 불러오면 브라우저가 차단당한다 (깨진 이미지로 보임).
// 이 API가 대신 이미지를 가져와서 우리 서버를 거쳐 전달해주면 문제가 해결된다.
//
// ✅ v2: LH 이미지 도메인(apply.lh.or.kr) 추가
// ✅ v3: 응답이 진짜 이미지인지 확인하는 진단 코드 추가
// ✅ v4: LH의 lhImageView2.do 주소는 진짜 이미지가 아니라, 그 안에
//    <img src="진짜경로"> 하나만 들어있는 "래퍼(wrapper) HTML 페이지"임을 확인.
//    이제 HTML이 오면 그 안의 <img> 태그를 찾아서, 진짜 이미지 경로를
//    한 번 더 가져오도록 처리한다.

const ALLOWED_HOSTS = [
  "apply-cdn.gh.or.kr",
  "apply.gh.or.kr",
  "apply.lh.or.kr",
];

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,text/html,*/*;q=0.8",
};

/** 상대경로 안에 인코딩되지 않은 한글 등이 섞여 있어도 안전하게 URL로 조합한다 */
function resolveUrlSafely(relativeSrc, baseUrl) {
  const encodedPath = relativeSrc
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
  try {
    return new URL(encodedPath, baseUrl).href;
  } catch {
    return null;
  }
}

/** HTML 안에서 첫 번째 <img src="..."> 값을 찾는다 */
function extractImgSrc(html) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

async function fetchOnce(url, referer) {
  const res = await fetch(url, {
    headers: { ...FETCH_HEADERS, Referer: referer },
  });
  const contentType = res.headers.get("content-type") || "";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { ok: res.ok, status: res.status, contentType, buffer };
}

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
    let result = await fetchOnce(target.href, `${target.protocol}//${target.hostname}/`);

    if (!result.ok) {
      return res.status(result.status).send(`원본 이미지 서버 오류 (${result.status})`);
    }

    // ✅ HTML이 왔으면, 그 안에 진짜 이미지 경로가 있는지 한 번 더 확인
    if (result.contentType.includes("text/html")) {
      const html = result.buffer.toString("utf-8");
      const innerSrc = extractImgSrc(html);

      if (!innerSrc) {
        const preview = html.replace(/\s+/g, " ").trim().slice(0, 300);
        return res
          .status(502)
          .send(`HTML 응답 안에서 이미지 경로를 찾지 못했습니다. 미리보기: ${preview}`);
      }

      const realImageUrl = resolveUrlSafely(innerSrc, target.href);
      if (!realImageUrl) {
        return res.status(502).send(`이미지 경로 변환 실패: ${innerSrc}`);
      }

      result = await fetchOnce(realImageUrl, target.href);
      if (!result.ok) {
        return res.status(result.status).send(`진짜 이미지 요청 실패 (${result.status}): ${realImageUrl}`);
      }
    }

    if (!result.contentType.startsWith("image/")) {
      const preview = result.buffer.slice(0, 300).toString("utf-8").replace(/\s+/g, " ").trim();
      return res
        .status(502)
        .send(`여전히 이미지가 아닌 응답입니다 (content-type: ${result.contentType}). 미리보기: ${preview}`);
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.status(200).send(result.buffer);
  } catch (err) {
    console.error("이미지 프록시 실패:", err.message);
    return res.status(500).send("이미지를 불러오지 못했습니다.");
  }
}
