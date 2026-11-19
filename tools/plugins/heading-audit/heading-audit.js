import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { collectHeadings, auditHeadings } from './audit.js';

const DA_ADMIN = 'https://admin.da.live/source';

function render(headings, issues) {
  const status = document.querySelector('#status');
  const issuesList = document.querySelector('#issues');
  const outline = document.querySelector('#outline');
  status.className = issues.length ? 'warn' : 'ok';
  status.textContent = issues.length
    ? `${issues.length} aviso(s) en la jerarquía de encabezados`
    : 'Jerarquía de encabezados correcta';
  issuesList.replaceChildren(...issues.map((i) => {
    const li = document.createElement('li');
    li.textContent = i.message;
    return li;
  }));
  outline.replaceChildren(...headings.map((h) => {
    const li = document.createElement('li');
    li.style.marginLeft = `${(h.level - 1) * 12}px`;
    li.textContent = `h${h.level} ${h.text || '(vacío)'}`;
    return li;
  }));
}

async function run() {
  const { context, token } = await DA_SDK;
  const { org, repo } = context;
  const path = context.path.replace(/\.html$/, '');
  const resp = await fetch(`${DA_ADMIN}/${org}/${repo}${path}.html`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`No se pudo leer el documento (${resp.status})`);
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  const headings = collectHeadings(doc);
  render(headings, auditHeadings(headings));
}

document.querySelector('#refresh').addEventListener('click', () => run().catch(showError));
function showError(e) {
  const status = document.querySelector('#status');
  status.className = 'warn';
  status.textContent = e.message;
}
run().catch(showError);
