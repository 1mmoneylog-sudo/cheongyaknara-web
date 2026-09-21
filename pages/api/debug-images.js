// pages/api/debug-images.js
// 브라우저에서 /api/debug-images?panId=2015122300020696 처럼 열면
// LH API가 실제로 뭘 주는지 그 자리에서 바로 볼 수 있음.

export default async function handler(req, res) {
  const { panId } = req.query;
  if (!panId) return res.status(400).json({ error: "panId 파라미터 필요" });

  const noticesData = require("../../data/notices.json");
  const notice = noticesData.notices.find((n) => n.source_notice_id === panId || n.id === `lh-${panId}`);

  if (!notice) {
    return res.status(404).json({ error: "해당 panId의 공고를 notices.json에서 찾을 수 없음" });
  }

  return res.status(200).json({
    id: notice.id,
    title: notice.title,
    image_urls: notice.image_urls,       // 지금 저장된 이미지 URL들 그대로
    detail_url: notice.detail_url,        // LH 원문 링크
  });
}
