export function isInAppBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("kakaotalk") ||
    ua.includes("naver") ||
    ua.includes("line/") ||
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("instagram") ||
    ua.includes("everytimeapp") ||
    ua.includes("daumapps")
  );
}

export function isAndroid() {
  if (typeof window === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/** 안드로이드에서는 intent 링크로 크롬 강제 실행 시도, iOS/그 외는 안내만 */
export function tryOpenExternalBrowser() {
  if (typeof window === "undefined") return;
  const url = window.location.href;

  if (isAndroid()) {
    const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
  }
}
