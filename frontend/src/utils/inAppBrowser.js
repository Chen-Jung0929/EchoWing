/**
 * Detect embedded in-app browsers that typically block getUserMedia / MediaRecorder.
 * @returns {boolean}
 */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';

  return (
    /FB_IAB|FBAV|FBAN/i.test(ua) ||
    /Instagram/i.test(ua) ||
    /Messenger/i.test(ua) ||
    /Line\//i.test(ua) ||
    /MicroMessenger/i.test(ua) ||
    /LinkedInApp/i.test(ua) ||
    /BytedanceWebview/i.test(ua) ||
    /Twitter/i.test(ua)
  );
}
