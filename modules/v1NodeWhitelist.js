const V1_ALLOWED_NODE_TYPES = new Set([
  'text',
  'image',
  'ai-text',
  'ai-image',
  'source-text',
  'source-image',
  'storyboard',
  'storyboard-script',
]);

const V1_BLOCKED_NODE_TYPES = new Set([
  'video',
  'test-video',
  'ai-video',
  'audio',
  'ai-audio',
  'source-video',
  'source-audio',
  'panorama-scene',
  'panorama-360',
  'panorama360',
  'panorama_360',
  'resource',
  'debug',
  'group',
]);

const V1_BLOCKED_LABEL_KEYWORDS = [
  '生成视频',
  '生视频',
  '视频',
  '生成音频',
  '生音频',
  '音频',
  '生成声音',
  '生声音',
  '声音',
  '360全景图',
  '全景图',
  '全景',
  '上传文件',
  '上传',
  'source-video',
  'source-audio',
  'debug',
  'group',
];

const V1_ALLOWED_NODE_LABELS = new Set(['生成文本', '生成图像', '源文本', '源图像']);
const V1_NODE_MENU_SECTION_LABELS = new Set(['生成节点', '源节点', '引用该节点生成']);

const CREATION_SCOPE_SELECTOR = [
  '#nodeMenu',
  '.v2-canvas-ctx-menu',
  '.empty-hint',
  '.node-add-menu',
  '.v2-menu-submenu',
  '.v2-node-picker',
  '.v2-picker-menu',
].join(',');

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function inCreationScope(el) {
  return !!el?.closest?.(CREATION_SCOPE_SELECTOR);
}

function shouldHideByType(type) {
  const normalized = normalizeText(type);
  if (!normalized) return false;
  if (V1_BLOCKED_NODE_TYPES.has(normalized)) return true;
  if (V1_ALLOWED_NODE_TYPES.has(normalized)) return false;
  return false;
}

function shouldHideByLabel(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return V1_BLOCKED_LABEL_KEYWORDS.some((kw) =>
    normalized.includes(normalizeText(kw)),
  );
}

function isAllowedNodeLabel(text) {
  return V1_ALLOWED_NODE_LABELS.has(String(text || '').trim());
}

function hideElement(el) {
  if (!el || el.dataset?.v1Hidden === '1') return;
  el.dataset.v1Hidden = '1';
  el.style.display = 'none';
}

function shouldForceHideGenerationLabel(label) {
  const normalizedLabel = normalizeText(label);
  if (!normalizedLabel) return false;
  if (V1_NODE_MENU_SECTION_LABELS.has(label)) return false;
  if (isAllowedNodeLabel(label)) return false;

  const hasGenerateWord =
    normalizedLabel.includes(normalizeText('生成')) ||
    normalizedLabel.includes(normalizeText('生'));

  const hasBlockedMeaning =
    normalizedLabel.includes(normalizeText('视频')) ||
    normalizedLabel.includes(normalizeText('音频')) ||
    normalizedLabel.includes(normalizeText('声音')) ||
    normalizedLabel.includes(normalizeText('360')) ||
    normalizedLabel.includes(normalizeText('全景')) ||
    normalizedLabel.includes(normalizeText('上传'));

  return hasGenerateWord && hasBlockedMeaning;
}

function filterCreationButtons(root = document) {
  const buttons = root.querySelectorAll(
    '#nodeMenu .nam-item[data-type], .empty-hint .pill-btn[data-type], .v2-canvas-ctx-menu button, .v2-node-picker button',
  );

  buttons.forEach((btn) => {
    const type = btn.dataset?.type;
    const label = String(btn.textContent || '').trim();

    if (
      shouldHideByType(type) ||
      shouldHideByLabel(label) ||
      shouldForceHideGenerationLabel(label)
    ) {
      hideElement(btn);
    }
  });
}

function filterContextMenuRows(root = document) {
  const rows = root.querySelectorAll(
    '.v2-menu-row, .v2-menu-submenu .v2-menu-row, .v2-canvas-ctx-menu .v2-menu-row, .v2-node-picker .v2-menu-row, button',
  );

  rows.forEach((row) => {
    if (!inCreationScope(row)) return;

    const type = row.dataset?.type;
    const label = String(row.textContent || '').trim();

    if (
      shouldHideByType(type) ||
      shouldHideByLabel(label) ||
      shouldForceHideGenerationLabel(label)
    ) {
      hideElement(row);
    }
  });
}

function preventBlockedClicks(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!inCreationScope(target)) return;

  const trigger = target.closest('button, .nam-item, .v2-menu-row');
  if (!trigger) return;

  const type = trigger.dataset?.type;
  const label = trigger.textContent || '';

  if (
    shouldHideByType(type) ||
    shouldHideByLabel(label) ||
    shouldForceHideGenerationLabel(label)
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }
}

function runWhitelistFilter(root = document) {
  filterCreationButtons(root);
  filterContextMenuRows(root);
}

function injectHardHideStyle() {
  if (document.getElementById('v1-node-whitelist-style')) return;
  const style = document.createElement('style');
  style.id = 'v1-node-whitelist-style';
  style.textContent = `
    #nodeMenu .nam-item[data-type="video"],
    #nodeMenu .nam-item[data-type="audio"],
    #nodeMenu .nam-item[data-type="test-video"],
    #nodeMenu .nam-item[data-type="panorama-scene"],
    #nodeMenu .nam-item[data-type="panorama-360"],
    #nodeMenu .nam-item[data-type="resource"],
    .empty-hint .pill-btn[data-type="video"],
    .v2-canvas-ctx-menu .v2-menu-row[data-type="ai-video"],
    .v2-canvas-ctx-menu .v2-menu-row[data-type="ai-audio"],
    .v2-canvas-ctx-menu .v2-menu-row[data-type="panorama-360"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

injectHardHideStyle();
runWhitelistFilter(document);

let rafId = 0;
function scheduleFullFilter() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    runWhitelistFilter(document);
  });
}

const observer = new MutationObserver(() => {
  scheduleFullFilter();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
});

document.addEventListener('pointerdown', preventBlockedClicks, true);
document.addEventListener('click', preventBlockedClicks, true);
