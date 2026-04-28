const V1_ALLOWED_NODE_TYPES = new Set([
  'source-text',
  'source-image',
  'ai-text',
  'ai-image',
  'storyboard',
  'storyboard-script',
  'text',
  'image',
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
  '视频',
  '音频',
  '360',
  '全景',
  '3D场景',
  '3D 场景',
  '场景编辑',
  '调试节点',
  '新建组',
  'group',
  'debug',
];

const V1_ALLOWED_NODE_LABELS = new Set([
  '生成文本',
  '生成图像',
  '源文本',
  '源图像',
]);

const V1_NODE_MENU_SECTION_LABELS = new Set(['生成节点', '源节点']);

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
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

function hideElement(el) {
  if (!el || el.dataset?.v1Hidden === '1') return;
  el.dataset.v1Hidden = '1';
  el.style.display = 'none';
}

function filterNodeMenuButtons(root = document) {
  const buttons = root.querySelectorAll('.nam-item[data-type]');
  buttons.forEach((btn) => {
    const type = btn.dataset.type;
    if (shouldHideByType(type)) {
      hideElement(btn);
    }
  });
}

function filterDynamicRows(root = document) {
  const rows = root.querySelectorAll('.v2-menu-row, .nam-item, button');
  rows.forEach((row) => {
    const type = row.dataset?.type;
    const label = String(row.textContent || '').trim();
    const normalizedLabel = normalizeText(label);
    const isNodeSectionLabel = V1_NODE_MENU_SECTION_LABELS.has(label);
    const isAllowedNodeLabel = V1_ALLOWED_NODE_LABELS.has(label);
    const shouldHideNodeLabel =
      !isNodeSectionLabel &&
      normalizedLabel &&
      (normalizedLabel.includes(normalizeText('生成')) ||
        normalizedLabel.includes(normalizeText('源'))) &&
      !isAllowedNodeLabel;

    if (
      shouldHideByType(type) ||
      shouldHideByLabel(label) ||
      shouldHideNodeLabel
    ) {
      hideElement(row);
    }
  });
}

function preventBlockedClicks(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const trigger = target.closest('button, .nam-item, .v2-menu-row');
  if (!trigger) return;
  const type = trigger.dataset?.type;
  const label = trigger.textContent || '';
  if (shouldHideByType(type) || shouldHideByLabel(label)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }
}

function runWhitelistFilter(root = document) {
  filterNodeMenuButtons(root);
  filterDynamicRows(root);
}

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
