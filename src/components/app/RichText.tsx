import katex from "katex";
import hljs from "highlight.js/lib/common";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tex = (s: string, display: boolean) => {
  try { return katex.renderToString(s, { displayMode: display, throwOnError: false }); } catch { return esc(s); }
};

function inline(s: string) {
  // Protect code and math, escape the rest, then light markdown (bold / italic).
  const parts = s.split(/(`[^`]+`|\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g);
  return parts.map((p) => {
    if (p.startsWith("$$")) return tex(p.slice(2, -2), true);
    if (p.startsWith("$") && p.length > 1) return tex(p.slice(1, -1), false);
    if (p.startsWith("`")) return `<code>${esc(p.slice(1, -1))}</code>`;
    return esc(p).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|\s)\*(.+?)\*/g, "$1<em>$2</em>");
  }).join("");
}

export function renderRich(src: string): string {
  const blocks = src.split(/(```[\w+-]*\n[\s\S]*?```)/g);
  return blocks.map((b) => {
    const m = b.match(/^```([\w+-]*)\n([\s\S]*?)```$/);
    if (m) {
      const lang = m[1] && hljs.getLanguage(m[1]) ? m[1] : "python";
      return `<pre><code class="hljs">${hljs.highlight((m[2] ?? "").replace(/\n$/, ""), { language: lang }).value}</code></pre>`;
    }
    return b.split(/\n{2,}/).filter((p) => p.trim()).map((p) => `<p>${inline(p.trim()).replace(/\n/g, "<br/>")}</p>`).join("");
  }).join("");
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return <div className={`prose-q ${className}`} dangerouslySetInnerHTML={{ __html: renderRich(text) }} />;
}
