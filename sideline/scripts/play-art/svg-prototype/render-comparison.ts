/**
 * Operator-only HTML comparison page for raster vs traced SVG.
 */

export type ComparisonRow = {
  slug: string;
  category: string;
  formation: string;
  playName: string;
  note: string;
  originalRel: string;
  inputRel: string;
  svgRel: string;
  originalBytes: number;
  inputBytes: number;
  svgBytes: number;
  pathCount: number;
  traceMs: number;
  width: number;
  height: number;
  assessment?: string;
  assessmentNotes?: string;
};

export type ComparisonPageInput = {
  title: string;
  generatedAt: string;
  tool: string;
  preprocessSummary: string;
  tracerConfigSummary: string;
  rows: ComparisonRow[];
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderComparisonHtml(input: ComparisonPageInput): string {
  const rowsHtml = input.rows
    .map((row, i) => {
      const assessment = row.assessment ?? "—";
      const notes = row.assessmentNotes ?? "";
      return `
    <section class="play" id="${esc(row.slug)}">
      <header>
        <h2>${i + 1}. ${esc(row.formation)} — ${esc(row.playName)}</h2>
        <p class="meta">
          <span class="tag">${esc(row.category)}</span>
          ${esc(row.note)}
        </p>
        <p class="stats">
          original ${row.originalBytes.toLocaleString()} B ·
          input ${row.inputBytes.toLocaleString()} B ·
          SVG ${row.svgBytes.toLocaleString()} B ·
          ${row.pathCount} paths ·
          ${row.traceMs} ms ·
          ${row.width}×${row.height}
        </p>
        <p class="assessment"><strong>Assessment:</strong> ${esc(assessment)}${
          notes ? ` — ${esc(notes)}` : ""
        }</p>
      </header>
      <div class="grid">
        <figure>
          <figcaption>Original raster</figcaption>
          <img src="${esc(row.originalRel)}" alt="original" width="400" />
        </figure>
        <figure>
          <figcaption>Preprocessed input</figcaption>
          <img src="${esc(row.inputRel)}" alt="preprocessed" width="400" />
        </figure>
        <figure>
          <figcaption>Traced SVG (400px)</figcaption>
          <img src="${esc(row.svgRel)}" alt="svg" width="400" />
        </figure>
        <figure class="zoom">
          <figcaption>Traced SVG (800px / 2× zoom)</figcaption>
          <img src="${esc(row.svgRel)}" alt="svg zoom" width="800" />
        </figure>
      </div>
    </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(input.title)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      margin: 0; padding: 24px; background: #f4f4f2; color: #1a1a1a;
    }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    .summary { max-width: 960px; margin-bottom: 28px; line-height: 1.45; }
    .summary code { background: #e8e8e4; padding: 1px 5px; border-radius: 3px; font-size: 0.9em; }
    .play {
      background: #fff; border: 1px solid #d0d0c8; border-radius: 8px;
      padding: 16px 18px 22px; margin-bottom: 24px;
    }
    .play h2 { margin: 0 0 6px; font-size: 1.1rem; }
    .meta { margin: 0 0 4px; color: #444; font-size: 0.92rem; }
    .tag {
      display: inline-block; background: #e8efe8; color: #1f4d2a;
      padding: 1px 8px; border-radius: 999px; font-size: 0.75rem;
      text-transform: uppercase; letter-spacing: 0.04em; margin-right: 8px;
    }
    .stats { margin: 0 0 6px; font-size: 0.82rem; color: #666; font-variant-numeric: tabular-nums; }
    .assessment { margin: 0 0 14px; font-size: 0.95rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }
    figure { margin: 0; }
    figcaption { font-size: 0.8rem; color: #555; margin-bottom: 6px; }
    img {
      display: block; width: 100%; max-width: 400px; height: auto;
      background: #fff; border: 1px solid #ddd; image-rendering: auto;
    }
    .zoom img { max-width: 800px; }
  </style>
</head>
<body>
  <h1>${esc(input.title)}</h1>
  <div class="summary">
    <p>Generated ${esc(input.generatedAt)}</p>
    <p><strong>Tool:</strong> ${esc(input.tool)}</p>
    <p><strong>Preprocess:</strong> ${esc(input.preprocessSummary)}</p>
    <p><strong>VTracer config:</strong> <code>${esc(input.tracerConfigSummary)}</code></p>
    <p>Operator diagnostic only — not shipped to users.</p>
  </div>
  ${rowsHtml}
</body>
</html>
`;
}
