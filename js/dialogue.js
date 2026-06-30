/* ============================================================
 * dialogue.js — 하단 대화/혼잣말 창 (window.Dialogue)
 * 일반 게임처럼 화면 하단에 대사 박스를 띄운다. 타자기 효과,
 * 클릭/Enter/Space 로 다음 줄. 큐가 비면 닫힌다.
 *   Dialogue.say([{who:'서진', text:'...'}, '나레이션 한 줄', ...])
 * who 가 없으면 혼잣말/나레이션으로 처리.
 * ============================================================ */
window.Dialogue = (function () {
  let queue = [], idx = 0, timer = null, full = '', shown = 0;
  let el = null, nameEl = null, textEl = null, mounted = false, onEmpty = null;

  function mount() {
    if (mounted) return;
    el = document.createElement('div');
    el.id = 'dialogue-box'; el.hidden = true;
    el.innerHTML =
      '<div class="dlg-inner">' +
      '<div id="dlg-name" class="dlg-name"></div>' +
      '<div id="dlg-text" class="dlg-text"></div>' +
      '<div class="dlg-cont">▼</div></div>';
    (document.querySelector('#os') || document.body).appendChild(el);
    nameEl = el.querySelector('#dlg-name');
    textEl = el.querySelector('#dlg-text');
    el.addEventListener('click', advance);
    document.addEventListener('keydown', onKey);
    mounted = true;
  }

  function onKey(e) {
    if (!el || el.hidden) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; // 터미널 입력과 충돌 방지
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
  }

  function say(lines, opts) {
    mount();
    const arr = (lines || []).map(l => (typeof l === 'string' ? { who: '', text: l } : l));
    if (!arr.length) return;
    // 이미 열려있으면 이어붙인다
    if (!el.hidden && idx < queue.length) { queue = queue.slice(idx).concat(arr); idx = 0; }
    else { queue = arr; idx = 0; }
    onEmpty = (opts && opts.onEmpty) || null;
    el.hidden = false;
    render();
  }

  function render() {
    const line = queue[idx];
    if (!line) { hide(); return; }
    nameEl.textContent = line.who || '';
    nameEl.style.display = line.who ? 'inline-block' : 'none';
    full = line.text || ''; shown = 0; textEl.textContent = '';
    clearInterval(timer);
    timer = setInterval(() => {
      shown++; textEl.textContent = full.slice(0, shown);
      if (shown >= full.length) { clearInterval(timer); timer = null; }
    }, 16);
  }

  function advance() {
    if (timer) { clearInterval(timer); timer = null; textEl.textContent = full; return; } // 타자 스킵
    idx++;
    if (idx >= queue.length) { hide(); } else render();
  }

  function hide() {
    if (el) el.hidden = true;
    clearInterval(timer); timer = null;
    const cb = onEmpty; onEmpty = null;
    if (cb) try { cb(); } catch (e) {}
  }

  return { say, hide, mount, isOpen: () => !!(el && !el.hidden) };
})();
