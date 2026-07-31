/**
 * Service to generate a 100% portable, standalone HTML file
 * with embedded CSS styles for highlight marks (<mark class="hl-*">).
 */

const HIGHLIGHT_EMBEDDED_STYLES = `
  <style type="text/css">
    mark {
      background-color: #fef08a;
      color: inherit;
      border-radius: 3px;
      padding: 0.1em 0.2em;
      margin: 0 0.05em;
    }
    mark.hl-yellow { background-color: #fef08a; color: #1e293b; }
    mark.hl-blue   { background-color: #bae6fd; color: #0f172a; }
    mark.hl-pink   { background-color: #fbcfe8; color: #0f172a; }
    mark.hl-green  { background-color: #bbf7d0; color: #0f172a; }
    mark.hl-purple { background-color: #e9d5ff; color: #0f172a; }
    mark.hl-orange { background-color: #fed7aa; color: #0f172a; }
    mark.hl-gray   { background-color: #cbd5e1; color: #0f172a; }

    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0f172a;
        color: #f8fafc;
      }
      mark.hl-yellow { background-color: #fef08a; color: #1e293b; }
      mark.hl-blue   { background-color: #7dd3fc; color: #0f172a; }
      mark.hl-pink   { background-color: #f472b6; color: #0f172a; }
      mark.hl-green  { background-color: #86efac; color: #0f172a; }
      mark.hl-purple { background-color: #d8b4fe; color: #0f172a; }
      mark.hl-orange { background-color: #fb923c; color: #0f172a; }
      mark.hl-gray   { background-color: #94a3b8; color: #0f172a; }
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      line-height: 1.7;
      max-width: 80ch;
      margin: 2rem auto;
      padding: 0 1rem;
    }
  </style>
`;

/**
 * Builds standalone HTML code with head and styles embedded.
 */
export function createStandaloneHTML(bodyContent: string, title: string = 'Documento Grifado'): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${HIGHLIGHT_EMBEDDED_STYLES}
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

/**
 * Triggers a browser file download of the standalone HTML document.
 */
export function downloadHTMLFile(content: string, filename: string = 'documento.html'): void {
  const fullHTML = createStandaloneHTML(content, filename.replace('.html', ''));
  const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.html') ? filename : `${filename}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
