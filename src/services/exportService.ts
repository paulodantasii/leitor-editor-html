/**
 * Service to generate and download a portable Markdown file or trigger clean PDF printing.
 */

/**
 * Triggers a browser file download of the Markdown document.
 */
export function downloadMarkdownFile(content: string, filename: string = 'documento.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Ensure the extension is .md
  const finalFilename = filename.endsWith('.md') ? filename : filename.replace(/\.[^/.]+$/, "") + '.md';
  
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean page printing / Save as PDF with optimal document title for file naming.
 */
export function printDocument(docTitle: string = 'documento'): void {
  const cleanTitle = docTitle.replace(/\.(md|markdown|txt)$/i, '').trim() || 'documento';
  const previousTitle = document.title;
  
  // Set clean title so browser PDF export defaults to this filename
  document.title = cleanTitle;

  window.print();

  // Restore title after print dialog closes
  setTimeout(() => {
    document.title = previousTitle;
  }, 1000);
}

