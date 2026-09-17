// PDF 공고문을 다운로드해서 텍스트를 추출하고, Gemini API로
// 가격/자격요건/공급방식/입지 정보를 구조화된 JSON으로 뽑아낸다.
//
// ✅ 수정 이력
//  - v2: Gemini 모델명을 gemini-3.6-flash로 변경 + PDF 여부 진단 로그 추가
//  - v3: 첨부파일 중 "진짜 PDF"를 정확히 골라내도록 수정.
//        예전 로직은 라벨에 "공고문"이라는 글자만 있으면 골랐는데, LH 공고는
//        보통 PDF판과 HWP(한글)판 공고문을 둘 다 "공고문"이라는 라벨로 올려두기
//        때문에, 어쩌다 HWP 파일이 먼저 걸리면 그걸 PDF인 줄 알고 통째로
//        분석하려다 실패했었음 (실제로는 네트워크 차단이 아니라 이 문제였음).
//        이제는 파일명/URL의 실제 확장자(.pdf)를 최우선으로 확인한다.
//
// 필요한 환경변수: GEMINI_API_KEY (GitHub Actions Secrets에 이미 등록됨)
// 필요한 패키지: pdf-parse (package.json에 이미 추가됨)

const pdfParse = require("pdf-parse");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** url이나 파일명이 실제로 특정 확장자로 끝나는지 확인 (쿼리스트링은 무시) */
function hasExtension(str, ext) {
  if (typeof str !== "string") return false;
  const withoutQuery = str.split("?")[0].split("#")[0];
  return withoutQuery.toLowerCase().endsWith(ext);
}

/** 첨부파일 목록에서 "진짜 PDF" 하나를 정확히 골라낸다 */
function findPdfAttachment(attachments) {
  if (!attachments || attachments.length === 0) return null;

  // 1순위: url이나 파일명이 실제로 .pdf로 끝나는 첨부파일만 인정
  const byExtension = attachments.find(
    (a) => a.url && (hasExtension(a.url, ".pdf") || hasExtension(a.name, ".pdf"))
  );
  if (byExtension) return byExtension;

  // 2순위: 확장자 정보 자체가 없고, 다른 문서 형식(hwp/hwpx/doc 등)도
  //        아닌 게 확실한 경우에만 라벨 텍스트로 추정 (최후 수단).
  //        hwp/hwpx처럼 확장자가 분명히 문서형인 파일은 여기서 확실히 제외한다.
  const nonPdfExtPattern = /\.(hwp|hwpx|hml|doc|docx|xls|xlsx|ppt|pptx|zip)$/i;
  const byLabel = attachments.find((a) => {
    if (!a.url) return false;
    const urlPart = a.url.split("?")[0];
    if (nonPdfExtPattern.test(urlPart) || nonPdfExtPattern.test(a.name || "")) return false;
    return a.label?.includes("PDF") || a.label?.includes("공고문");
  });
  return byLabel || null;
}

async function downloadPdfText(pdfUrl) {
  const res = await fetch(pdfUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/pdf,*/*",
    },
  });
  if (!res.ok) throw new Error(`PDF 다운로드 실패: ${res.status}`);

  const contentType = res.headers.get("content-type") || "(없음)";
  const buffer = Buffer.from(await res.arrayBuffer());

  // PDF 파일은 항상 앞 4바이트가 "%PDF"로 시작한다.
  const isRealPdf = buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF";
  if (!isRealPdf) {
    const preview = buffer.slice(0, 500).toString("utf-8").replace(/\s+/g, " ").trim();
    throw new Error(
      `응답이 PDF가 아닙니다 (content-type: ${contentType}, 크기: ${buffer.length}바이트). ` +
        `응답 내용 미리보기: ${preview || "(빈 응답 또는 텍스트로 표시 불가)"}`
    );
  }

  const data = await pdfParse(buffer);
  return data.text;
}

const EXTRACTION_PROMPT = `
당신은 대한민국 부동산 청약 및 임대주택 공고문 분석 전문가입니다.
제공된 공고문 내용을 읽고 분석하여, 반드시 아래의 JSON 포맷으로만 응답하세요.
Markdown 형태(\`\`\`json ...)나 추가 텍스트 없이 순수 JSON 구조만 출력해야 합니다.
공고문에 없는 내용은 지어내지 말고 null로 두세요.

{
  "price_and_finance": {
    "max_price": "최고 분양가 또는 보증금/월세 조건",
    "payment_schedule": "계약금, 중도금, 잔금 납부 일정",
    "financing_conditions": "대출 관련 조건 및 안내사항"
  },
  "qualification_and_conditions": {
    "residence_requirement": "거주지 요건 (예: 서울시 연속 1년 이상 등)",
    "home_ownership": "주택 소유 여부 요건 (무주택 세대구성원 등)",
    "restrictions": "전매제한, 재당첨제한, 의무거주기간 등"
  },
  "supply_and_selection": {
    "supply_types": "공급 유형 (일반공급, 우선공급, 특별공급 등)",
    "selection_method": "당첨자 선정 방식 (가점제, 추첨제, 순위별 등)"
  },
  "location_and_complex": {
    "location_info": "입지 특징 및 주변 인프라 요약",
    "move_in_date": "입주 예정 시기"
  }
}

공고문 내용:
`;

async function analyzeWithGemini(pdfText) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");

  const trimmedText = pdfText.slice(0, 15000);

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: EXTRACTION_PROMPT + trimmedText }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 오류 ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답에서 텍스트를 찾을 수 없습니다.");

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Gemini 응답이 JSON 형식이 아닙니다: " + text.slice(0, 200));
  }
}

/** 공고 하나에 붙은 PDF 공고문을 찾아서 분석하고, ai_analysis 필드에 넣을 객체를 반환한다.
 *  PDF가 없거나 텍스트 추출이 안 되면(스캔 이미지 PDF 등) null 반환. */
async function analyzeNoticePdf(notice) {
  const pdfAttachment = findPdfAttachment(notice.attachment_urls);
  if (!pdfAttachment) return null;

  const pdfText = await downloadPdfText(pdfAttachment.url);
  if (!pdfText || pdfText.trim().length < 50) {
    throw new Error("PDF에서 텍스트를 거의 추출하지 못했습니다 (스캔 이미지 PDF일 가능성)");
  }

  const analysis = await analyzeWithGemini(pdfText);
  return {
    ...analysis,
    analyzed_at: new Date().toISOString(),
    source_pdf: pdfAttachment.url,
  };
}

module.exports = { analyzeNoticePdf };
