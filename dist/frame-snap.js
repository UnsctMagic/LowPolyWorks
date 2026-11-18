// Stone frames (ui/slate-frame-v2.webp, border-image 180 round) tile their side
// stone in fixed pieces. Keeping each framed panel a whole number of pieces tall
// means the stone never squeezes when the panel's content changes height.
const FRAME_SIZE = 1254;
const FRAME_SLICE = 180;
const SELECTOR = '.slab,.side-menu';

const watched = new WeakSet();
let resizes;

function snap(panel) {
  const style = getComputedStyle(panel);
  if (!style.borderImageSource.includes('slate-frame') || style.display === 'none') return;
  const side = parseFloat(style.borderLeftWidth);
  const top = parseFloat(style.borderTopWidth);
  const bottom = parseFloat(style.borderBottomWidth);
  if (!side) return;
  const piece = (FRAME_SIZE - 2 * FRAME_SLICE) * side / FRAME_SLICE;
  panel.style.paddingBottom = '';
  const height = panel.getBoundingClientRect().height;
  const pieces = Math.max(1, Math.ceil((height - top - bottom) / piece - 0.01));
  const extra = top + bottom + pieces * piece - height;
  if (extra > 0.25) panel.style.paddingBottom = `${parseFloat(getComputedStyle(panel).paddingBottom) + extra}px`;
}

function watch(root) {
  const panels = root.matches?.(SELECTOR) ? [root] : [];
  if (root.querySelectorAll) panels.push(...root.querySelectorAll(SELECTOR));
  for (const panel of panels) {
    if (watched.has(panel)) continue;
    watched.add(panel);
    resizes.observe(panel, { box: 'border-box' });
  }
}

export function startFrameSnap() {
  if (resizes || typeof ResizeObserver !== 'function') return;
  resizes = new ResizeObserver(entries => { for (const entry of entries) snap(entry.target); });
  watch(document.body);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) watch(node);
  }).observe(document.body, { childList: true, subtree: true });
}
