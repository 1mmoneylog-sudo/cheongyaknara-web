import Link from "next/link";

export default function Contact() {
  return (
    <div className="tool-hero-inner" style={{ padding: "60px 20px", textAlign: "center" }}>
      <h1>문의하기</h1>
      <p>준비 중입니다. 곧 만나요!</p>
      <Link href="/">← 메인으로 돌아가기</Link>
    </div>
  );
}
