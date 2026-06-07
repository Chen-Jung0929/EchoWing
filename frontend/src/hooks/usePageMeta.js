import { useEffect } from 'react';

/**
 * Sets document title and meta description for SEO.
 * @param {string} title - Page title (will be appended with " | EchoWing")
 * @param {string} [description] - Meta description for the page
 */
export default function usePageMeta(title, description) {
  useEffect(() => {
    // Set title
    document.title = title ? `${title} | EchoWing` : 'EchoWing - AI 鳥類聲學辨識平台';
    
    // Set meta description
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', description);
      }
    }

    // Cleanup: restore default on unmount
    return () => {
      document.title = 'EchoWing - AI 鳥類聲學辨識平台 | Bird Sound Recognition';
    };
  }, [title, description]);
}
