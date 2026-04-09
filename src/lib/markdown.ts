// Minimal markdown → HTML for AI responses. Matches the original app's
// simple subset: headings, **bold**, lists, paragraphs, line breaks.

export function mdToHtml(md: string): string {
  if (!md) return '';
  let html = escapeHtml(md);

  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Lists: consecutive `- ` or `* ` or `1.` lines -> <ul><li>
  const lines = html.split('\n');
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
    if (m) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${m[1]}</li>`);
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(line);
    }
  }
  if (inList) out.push('</ul>');
  html = out.join('\n');

  // Paragraph breaks
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br/>');
  if (!/^<h|^<ul|^<p/.test(html)) html = `<p>${html}</p>`;
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
