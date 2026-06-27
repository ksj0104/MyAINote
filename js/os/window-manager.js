/* ============================================================
 * window-manager.js — NULLSEC OS 창 관리
 * 앱별 단일 창. 드래그 이동·리사이즈·포커스·최소화·최대화·닫기 + 작업표시줄 동기화.
 * window.WM 로 노출. 앱은 register(key, cfg) 후 open(key).
 * ============================================================ */
(function () {
  const layer = () => document.getElementById('window-layer');
  const taskList = () => document.getElementById('task-list');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  class WindowManager {
    constructor() { this.configs = {}; this.wins = {}; this.z = 20; }

    // cfg: { title, icon, w, h, x, y, minW, minH, onMount(bodyEl), onFocus() }
    register(key, cfg) { this.configs[key] = cfg; }

    _ensure(key) {
      if (this.wins[key]) return this.wins[key];
      const cfg = this.configs[key];
      if (!cfg) return null;
      const el = document.createElement('div');
      el.className = 'win';
      el.dataset.app = key;
      el.innerHTML =
        `<div class="win-bar">` +
        `<span class="win-ic">${cfg.icon || ''}</span>` +
        `<span class="win-title">${cfg.title || key}</span>` +
        `<span class="win-btns">` +
        `<button class="wb wb-min" title="최소화">─</button>` +
        `<button class="wb wb-max" title="최대화">▢</button>` +
        `<button class="wb wb-x" title="닫기">✕</button>` +
        `</span></div>` +
        `<div class="win-body"></div>` +
        `<div class="win-resize"></div>`;
      el.hidden = true;                 // 생성 시 숨김 — open/openBg 로 표시
      layer().appendChild(el);
      const body = el.querySelector('.win-body');
      const win = { key, el, body, cfg, min: false, max: false, rect: null };
      this.wins[key] = win;

      // 위치/크기
      const vw = layer().clientWidth || window.innerWidth;
      const vh = layer().clientHeight || window.innerHeight;
      const w = cfg.w || 640, h = cfg.h || 420;
      const idx = Object.keys(this.wins).length;
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.left = clamp((cfg.x != null ? cfg.x : 60 + idx * 26), 0, Math.max(0, vw - 120)) + 'px';
      el.style.top = clamp((cfg.y != null ? cfg.y : 40 + idx * 22), 0, Math.max(0, vh - 120)) + 'px';

      // 포커스
      el.addEventListener('mousedown', () => this.focus(key), true);
      // 버튼
      el.querySelector('.wb-min').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMin(key); });
      el.querySelector('.wb-max').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMax(key); });
      el.querySelector('.wb-x').addEventListener('click', (e) => { e.stopPropagation(); this.close(key); });
      el.querySelector('.win-bar').addEventListener('dblclick', () => this.toggleMax(key));
      this._drag(win);
      this._resize(win);

      if (cfg.onMount) { try { cfg.onMount(body); } catch (e) { console.error(e); } }
      return win;
    }

    _drag(win) {
      const bar = win.el.querySelector('.win-bar');
      let sx, sy, ox, oy, on = false;
      const move = (e) => {
        if (!on) return;
        const vw = layer().clientWidth, vh = layer().clientHeight;
        win.el.style.left = clamp(ox + (e.clientX - sx), -40, vw - 60) + 'px';
        win.el.style.top = clamp(oy + (e.clientY - sy), 0, vh - 40) + 'px';
      };
      const up = () => { on = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
      bar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.wb') || win.max) return;
        on = true; sx = e.clientX; sy = e.clientY;
        ox = parseInt(win.el.style.left, 10) || 0; oy = parseInt(win.el.style.top, 10) || 0;
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      });
    }

    _resize(win) {
      const h = win.el.querySelector('.win-resize');
      let sx, sy, ow, oh, on = false;
      const move = (e) => {
        if (!on) return;
        win.el.style.width = Math.max(win.cfg.minW || 320, ow + (e.clientX - sx)) + 'px';
        win.el.style.height = Math.max(win.cfg.minH || 220, oh + (e.clientY - sy)) + 'px';
      };
      const up = () => { on = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
      h.addEventListener('mousedown', (e) => {
        if (win.max) return;
        e.stopPropagation(); on = true; sx = e.clientX; sy = e.clientY;
        ow = win.el.offsetWidth; oh = win.el.offsetHeight;
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      });
    }

    ensure(key) { return this._ensure(key); }
    // 포커스를 가져가지 않고 표시(브리핑 중 터미널을 배경에 띄울 때)
    openBg(key) {
      const w = this._ensure(key);
      if (!w) return null;
      w.el.hidden = false; w.min = false; w.el.classList.remove('minimized');
      if (!w.el.style.zIndex) w.el.style.zIndex = ++this.z;
      this._syncTask();
      return w;
    }
    open(key) {
      const w = this._ensure(key);
      if (!w) return null;
      w.el.hidden = false; w.min = false; w.el.classList.remove('minimized');
      this.focus(key); this._syncTask();
      return w;
    }
    focus(key) {
      const w = this.wins[key];
      if (!w || w.el.hidden) return;
      w.el.style.zIndex = ++this.z;
      Object.values(this.wins).forEach(o => o.el.classList.toggle('focused', o === w));
      if (w.cfg.onFocus) { try { w.cfg.onFocus(w.body); } catch (e) {} }
      this._syncTask();
    }
    close(key) { const w = this.wins[key]; if (!w) return; w.el.hidden = true; w.min = false; this._syncTask(); }
    toggleMin(key) {
      const w = this.wins[key]; if (!w) return;
      w.min = !w.min; w.el.classList.toggle('minimized', w.min);
      if (!w.min) this.focus(key);
      this._syncTask();
    }
    toggleMax(key) {
      const w = this.wins[key]; if (!w) return;
      w.max = !w.max; w.el.classList.toggle('maxed', w.max);
      this.focus(key);
    }
    isOpen(key) { const w = this.wins[key]; return !!(w && !w.el.hidden && !w.min); }
    exists(key) { return !!this.wins[key]; }
    closeAll() { Object.keys(this.wins).forEach(k => this.close(k)); }

    _syncTask() {
      const tl = taskList(); if (!tl) return;
      const top = Object.values(this.wins).reduce((a, w) => (!w.el.hidden && +w.el.style.zIndex > a.z ? { z: +w.el.style.zIndex, w } : a), { z: -1, w: null }).w;
      tl.innerHTML = '';
      Object.values(this.wins).forEach(w => {
        if (w.el.hidden) return;
        const b = document.createElement('button');
        b.className = 'task-btn' + (w === top && !w.min ? ' active' : '') + (w.min ? ' min' : '');
        b.innerHTML = `<span class="tb-ic">${w.cfg.icon || ''}</span><span class="tb-l">${w.cfg.title || w.key}</span>`;
        b.addEventListener('click', () => {
          if (w.min) { this.toggleMin(w.key); }
          else if (w === top) { this.toggleMin(w.key); }
          else { this.focus(w.key); }
        });
        tl.appendChild(b);
      });
    }
  }

  window.WM = new WindowManager();
})();
