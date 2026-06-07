import { useEffect } from 'react';

const DEFAULT_TITLE = 'EchoWing - AI Bird Sound Recognition';

/**
 * Sets document title and meta description for SEO.
 * @param {string} title - Page title (will be appended with " | EchoWing")
 * @param {string} [description] - Meta description for the page
 * @param {string} [defaultTitle] - Title restored on unmount or when `title` is empty
 */
export default function usePageMeta(title, description, defaultTitle = DEFAULT_TITLE) {
  useEffect(() => {
    document.title = title ? `${title} | EchoWing` : defaultTitle;

    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', description);
      }
    }

    return () => {
      document.title = defaultTitle;
    };
  }, [title, description, defaultTitle]);
}
