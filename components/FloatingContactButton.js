import Link from "next/link";

export default function FloatingContactButton() {
  return (
    <Link href="/contact" className="fab-contact" aria-label="문의하기">
      <span className="fab-icon">💬</span>
      <span className="fab-text">문의하기</span>
    </Link>
  );
}
