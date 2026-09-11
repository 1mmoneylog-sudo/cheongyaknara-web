import { useEffect, useState } from "react";
import { isInAppBrowser, isAndroid, tryOpenExternalBrowser } from "../lib/browserDetect";

export default function InAppBrowserBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isInAppBrowser());
  }, []);

  if (!show) return null;

  return (
    <div className="inapp-browser-banner">
      <p>
        📱 카카오톡·네이버 등 앱 안에서는 알림 설정이 제한돼요.
        {isAndroid()
          ? " 아래 버튼을 눌러 크롬으로 열어주세요."
          : " 우측 상단 메뉴(⋮ 또는 공유 아이콘)에서 '다른 브라우저로 열기'를 눌러주세요."}
      </p>
      {isAndroid() && (
        <button className="secondary-btn" style={{ width: "auto", padding: "8px 16px", marginBottom: 0 }} onClick={tryOpenExternalBrowser}>
          크롬으로 열기
        </button>
      )}
    </div>
  );
}
