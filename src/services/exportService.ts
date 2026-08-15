/**
 * Service to generate and download a portable Markdown file.
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
