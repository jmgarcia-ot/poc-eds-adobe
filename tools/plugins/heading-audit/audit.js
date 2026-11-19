/**
 * Audits the heading hierarchy of an HTML document.
 * @param {Document} doc parsed document
 * @returns {{level: number, text: string}[]} headings, plus issues via auditHeadings
 */
export function collectHeadings(doc) {
  return [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => ({
    level: Number(el.tagName[1]),
    text: el.textContent.replace(/\s+/g, ' ').trim(),
  }));
}

/**
 * Checks: exactly one h1, no skipped levels, no empty headings.
 * @param {{level: number, text: string}[]} headings
 * @returns {{type: string, message: string}[]} list of warnings (empty when all is fine)
 */
export function auditHeadings(headings) {
  const issues = [];
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) issues.push({ type: 'no-h1', message: 'La página no tiene ningún h1.' });
  if (h1s.length > 1) issues.push({ type: 'multi-h1', message: `Hay ${h1s.length} h1; debería haber solo uno.` });
  let prev = 0;
  headings.forEach((h, i) => {
    if (!h.text) {
      issues.push({ type: 'empty', message: `Encabezado vacío h${h.level} (posición ${i + 1}).` });
    }
    if (prev && h.level > prev + 1) {
      issues.push({
        type: 'skip',
        message: `Salto de h${prev} a h${h.level}${h.text ? ` en «${h.text}»` : ''} (posición ${i + 1}).`,
      });
    }
    prev = h.level;
  });
  return issues;
}
