import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  readBlockConfig,
  toClassName,
  toCamelCase,
} from './aem.js';

export const NX_ORIGIN = 'https://da.live/nx';

export const LOCALES = ['es', 'fr', 'jp'];
const LANG_MAP = { es: 'es', fr: 'fr', jp: 'ja' };

/**
 * Returns the locale root of the current page ('' for the English root, '/es', '/fr', '/jp').
 * @returns {string}
 */
export function getRootPath() {
  const [first] = window.location.pathname.split('/').filter(Boolean);
  return LOCALES.includes(first) ? `/${first}` : '';
}

/**
 * Prefixes a root-relative link with the current locale root.
 * @param {string} link url to be localized
 * @returns {string} The localized link
 */
export function rootLink(link) {
  const root = getRootPath();
  if (!root || link.startsWith(`${root}/`) || link === root) return link;
  return `${root}${link}`;
}

/**
 * Checks whether an image URL is served from this site's own origin.
 * @param {string} src The image URL (absolute or relative)
 * @returns {boolean} true if the image is same-origin
 */
export function isSameOriginImage(src) {
  return new URL(src, window.location.href).origin === window.location.origin;
}

/**
 * Moves instrumentation attributes (UE) from one element to another.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  [...from.attributes]
    .map(({ nodeName }) => nodeName)
    .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-'))
    .forEach((attr) => {
      to.setAttribute(attr, from.getAttribute(attr));
      from.removeAttribute(attr);
    });
}

/**
 * Reads the author's heading level from a `heading-level | h4` config row of the block
 * (the Library "options" sheet offers it as a dropdown), removes that row from the block
 * and turns it into the `heading-hN` variant class. Call it at the START of decorate(),
 * before the block reads its rows. Does nothing when the row is missing or invalid.
 * @param {Element} block the block element
 */
export function extractHeadingLevel(block) {
  const row = [...block.children].find(
    (r) => r.children[0]?.textContent.trim().toLowerCase() === 'heading-level',
  );
  if (!row) return;
  const value = row.children[1]?.textContent.trim().toLowerCase();
  if (/^h[2-6]$/.test(value)) block.classList.add(`heading-${value}`);
  row.remove();
}

/**
 * Applies the author-selected structural heading level to a block.
 * The level is chosen with a block variant `heading-h2` ... `heading-h6`
 * (e.g. "Cards (heading-h3)" in DA) or with a `heading-level` row
 * (see extractHeadingLevel). The first heading of the block becomes the
 * requested level and the remaining headings keep their relative offset (clamped to h1-h6).
 * The original visual style is kept through a `.hN` class, so changing the structure
 * never changes the look. Without a variant the block is left untouched.
 * @param {Element} block the block element, call it at the end of decorate()
 */
export function applyHeadingLevel(block) {
  const variant = [...block.classList].find((c) => /^heading-h[1-6]$/.test(c));
  if (!variant) return;
  const headings = [...block.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  if (!headings.length) return;
  const target = Number(variant.slice(-1));
  const base = Number(headings[0].tagName[1]);
  headings.forEach((heading) => {
    const original = Number(heading.tagName[1]);
    const level = Math.min(6, Math.max(1, target + (original - base)));
    if (level === original) return;
    const el = document.createElement(`h${level}`);
    [...heading.attributes].forEach(({ name, value }) => el.setAttribute(name, value));
    el.classList.add(`h${original}`);
    el.append(...heading.childNodes);
    heading.replaceWith(el);
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
// eslint-disable-next-line no-unused-vars
function buildAutoBlocks(main) {
  try {
    // no auto blocks: the source site (frescopa.coffee) does not use any
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates all sections in a container element.
 * @param {Element} main The container element
 */
function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if (e.classList.contains('richtext')) {
        e.removeAttribute('class');
        if (!defaultContent) {
          const wrapper = document.createElement('div');
          wrapper.classList.add('default-content-wrapper');
          wrappers.push(wrapper);
          defaultContent = true;
        }
      } else if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = document.createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV';
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });

    // Add wrapped content back
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';

    // Process section metadata
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          const styles = meta.style
            .split(',')
            .filter((style) => style)
            .map((style) => toClassName(style.trim()));
          styles.forEach((style) => section.classList.add(style));
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });
      sectionMeta.parentNode.remove();
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  const root = getRootPath().substring(1);
  doc.documentElement.lang = LANG_MAP[root] || 'en';
  decorateTemplateAndTheme();
  if (getMetadata('breadcrumbs').toLowerCase() === 'true') {
    doc.body.dataset.breadcrumbs = true;
  }
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    doc.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadCSS(`${window.hlx.codeBasePath}/styles/article.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadSidekick() {
  if (document.querySelector('aem-sidekick')) {
    import('./sidekick.js');
    return;
  }

  document.addEventListener('sidekick-ready', () => {
    import('./sidekick.js');
  });
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
  loadSidekick();
}

// UE Editor support before page load
if (/\.(stage-ue|ue)\.da\.live$/.test(window.location.hostname)) {
  // eslint-disable-next-line import/no-unresolved
  await import(`${window.hlx.codeBasePath}/ue/scripts/ue.js`).then(({ default: ue }) => ue());
}

loadPage();

(function da() {
  const { searchParams } = new URL(window.location.href);

  const lp = searchParams.get('dapreview');
  // eslint-disable-next-line import/no-unresolved
  if (lp) import('https://da.live/scripts/dapreview.js').then((mod) => mod.default(loadPage));

  const exp = searchParams.get('daexperiment');
  // eslint-disable-next-line import/no-unresolved
  if (exp) import('https://da.live/nx/public/plugins/exp/exp.js');
}());
