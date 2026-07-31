import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML documents safely for the Tiptap editor.
 * Strictly preserves <img> tags (including base64 data URIs and external URLs),
 * <mark> tags with hl-* classes, standard HTML structures, and styling attributes.
 */
export function sanitizeHTML(rawHTML: string): string {
  if (!rawHTML) return '';

  return DOMPurify.sanitize(rawHTML, {
    ADD_TAGS: ['mark', 'style', 'img', 'figure', 'figcaption'],
    ADD_ATTR: ['class', 'style', 'data-color', 'src', 'alt', 'width', 'height', 'target', 'href'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    WHOLE_DOCUMENT: false,
    FORCE_BODY: false,
  });
}
