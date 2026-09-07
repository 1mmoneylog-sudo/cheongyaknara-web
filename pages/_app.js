import Link from "next/link";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="logo-dot"></span>
            청약나라
          </Link>
          <nav className="gnb">
            <Link href="/">모집공고</Link>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar">청약캘린더</Link>
          </nav>
        </div>
      </header>
      <Component {...pageProps} />
    </>
  );
}
