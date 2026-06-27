/* ============================================================
 * terminal-app.js — 터미널 앱 (명령 콘솔)
 * 입력 → game.exec → 출력. 히스토리/Tab 자동완성. window.TerminalApp.
 * ============================================================ */
(function () {
  const TerminalApp = {
    mount(body) {
      body.classList.add('term-app');
      body.innerHTML =
        `<div class="t-screen"><div class="t-output"></div></div>` +
        `<div class="t-cmd"><span class="t-prompt">guest@nullsec-node:~$</span>` +
        `<input class="t-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="명령 입력 후 Enter…" /></div>`;
      this.screenEl = body.querySelector('.t-screen');
      this.outEl = body.querySelector('.t-output');
      this.promptEl = body.querySelector('.t-prompt');
      this.inputEl = body.querySelector('.t-input');
      this.histIdx = -1;
      this._bind();
      this.updatePrompt();
    },
    focus() { if (this.inputEl) setTimeout(() => this.inputEl.focus(), 0); },

    _bind() {
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this._enter(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this._hist(-1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); this._hist(1); }
        else if (e.key === 'Tab') { e.preventDefault(); this._tab(); }
        else if (e.key.length === 1 && window.term) window.term._blip(1200, 0.012, 0.04);
      });
      this.screenEl.addEventListener('click', () => this.inputEl.focus());
    },
    _enter() {
      const g = window.game; if (!g) return;
      const raw = this.inputEl.value;
      this.inputEl.value = ''; this.histIdx = -1;
      this.println(this.promptString() + ' ' + raw, 'cmd-echo');
      if (window.term) window.term._blip(660, 0.03);
      if (raw.trim() && g.appMode !== 'menu') {
        const out = g.exec(raw);
        if (out) this.printBlock(out);
      } else if (raw.trim() && g.appMode === 'menu') {
        this.println('지금은 데스크톱 메뉴 상태다 — 런처/시작메뉴에서 선택하라.', 'dim');
      }
      this.updatePrompt();
      if (window.term) window.term.afterExec();
    },
    _hist(d) {
      const h = (window.game && window.game.history) || [];
      if (!h.length) return;
      if (d < 0) this.histIdx = this.histIdx < 0 ? h.length - 1 : Math.max(0, this.histIdx - 1);
      else { if (this.histIdx < 0) return; this.histIdx++; if (this.histIdx >= h.length) { this.histIdx = -1; this.inputEl.value = ''; return; } }
      this.inputEl.value = h[this.histIdx] || '';
    },
    _tab() {
      const v = this.inputEl.value;
      if (v.includes(' ')) return;
      const m = Object.keys(window.COMMANDS || {}).filter(c => c.startsWith(v));
      if (m.length === 1) this.inputEl.value = m[0] + ' ';
      else if (m.length > 1) this.printBlock(m.join('  '), 'dim');
    },

    promptString() {
      const g = window.game || {};
      return `${g.user || 'guest'}@${g.host || 'nullsec-node'}:${g.cwd || '~'}$`;
    },
    updatePrompt() { if (this.promptEl) this.promptEl.textContent = this.promptString(); },

    println(text, cls) {
      if (!this.outEl) return;
      const d = document.createElement('div');
      d.className = 'line' + (cls ? ' ' + cls : '');
      d.textContent = String(text == null ? '' : text);
      this.outEl.appendChild(d);
      this._scroll();
    },
    printBlock(text, cls) { String(text == null ? '' : text).split('\n').forEach(l => this.println(l, cls)); },
    clear() { if (this.outEl) this.outEl.innerHTML = ''; },
    flashClear() { if (this.screenEl) { this.screenEl.classList.add('flash'); setTimeout(() => this.screenEl.classList.remove('flash'), 220); } },
    _scroll() { if (this.screenEl) this.screenEl.scrollTop = this.screenEl.scrollHeight; }
  };

  window.TerminalApp = TerminalApp;
  if (window.WM) WM.register('terminal', {
    title: '터미널', icon: '💻', w: 680, h: 440, x: 560, y: 130, minW: 380, minH: 240,
    onMount: (b) => TerminalApp.mount(b), onFocus: () => TerminalApp.focus()
  });
})();
