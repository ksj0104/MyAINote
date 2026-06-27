/* ============================================================
 * messenger.js — 메신저 앱 (브리핑/교신)
 * 0xMOTHER·WRAITH 대화, 미션 브리핑/디브리핑 도착. 타이핑 큐 + 연락처.
 * window.Messenger. renderStory/appendStory/msgrChat 를 스레드에 렌더.
 * ============================================================ */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const Messenger = {
    mount(body) {
      body.classList.add('msgr-app');
      body.innerHTML =
        `<div class="m-contacts" id="m-contacts"></div>` +
        `<div class="m-main">` +
        `<div class="m-head"><span id="m-chan" class="m-chan">◉ 0xMOTHER</span><span id="m-mid" class="m-sec">암호 채널</span></div>` +
        `<div class="m-thread" id="msgr-thread"></div>` +
        `<div class="m-input"><input id="m-in" type="text" autocomplete="off" placeholder="메시지 입력 후 Enter (chat)…" /><button id="m-send" class="m-send">전송</button></div>` +
        `</div>`;
      this.threadEl = body.querySelector('#msgr-thread');
      this.contactsEl = body.querySelector('#m-contacts');
      this.chanEl = body.querySelector('#m-chan');
      this.midEl = body.querySelector('#m-mid');
      const inp = body.querySelector('#m-in'), send = body.querySelector('#m-send');
      const fire = () => { const v = inp.value.trim(); if (!v) return; inp.value = ''; window.game.exec('chat ' + v); if (window.term) window.term.afterExec(); };
      send.addEventListener('click', fire);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') fire(); });
      this.threadEl.addEventListener('click', () => this._flush());  // 클릭 = 타이핑 스킵
      this.renderContacts();
    },
    focus() { const i = document.getElementById('m-in'); if (i) setTimeout(() => i.focus(), 0); },

    renderContacts() {
      if (!this.contactsEl) return;
      const g = window.game;
      const known = (g && g.knownContacts) ? [...g.knownContacts] : ['mother'];
      const CH = (window.Comms && window.Comms.CHARS) || {};
      const cur = (g && g.chatWith) || 'mother';
      this.contactsEl.innerHTML = known.map(k => {
        const nm = (CH[k] && CH[k].name) || k;
        return `<button class="m-contact${k === cur ? ' active' : ''}" data-ch="${esc(k)}"><span class="mc-av av-${esc(k)}">●</span><span class="mc-n">${esc(nm)}</span></button>`;
      }).join('');
      this.contactsEl.querySelectorAll('.m-contact').forEach(b => b.addEventListener('click', () => {
        window.game.exec('channel ' + b.dataset.ch);
        this.renderContacts(); this.setChannel(b.dataset.ch);
      }));
    },
    setChannel(k) {
      const CH = (window.Comms && window.Comms.CHARS) || {};
      if (this.chanEl) this.chanEl.textContent = '◉ ' + ((CH[k] && CH[k].name) || k);
    },
    notify() {
      const ic = document.querySelector('.desk-icon[data-app="messenger"] .di-badge');
      if (ic && (!window.WM || !WM.isOpen('messenger'))) { ic.hidden = false; ic.textContent = '●'; }
    },
    clearNotify() { const ic = document.querySelector('.desk-icon[data-app="messenger"] .di-badge'); if (ic) ic.hidden = true; },

    /* ---- 엔진 연동 ---- */
    renderStory(lvl, tag, onDone) {
      if (!this.threadEl) { if (onDone) onDone(); return; }
      this._reset();
      if (this.midEl) this.midEl.textContent = `${lvl.id} · ${lvl.tier}`;
      this.renderContacts();
      const msgs = [];
      const narr = (txt) => (txt || '').split('\n').forEach(raw => {
        const line = raw.replace(/\s+$/, ''); if (!line.trim()) return;
        let m;
        if ((m = line.match(/^0xMOTHER>\s?(.*)$/))) msgs.push({ kind: 'in', who: 'mother', name: '0xMOTHER', text: m[1] });
        else if ((m = line.match(/^WRAITH>\s?(.*)$/))) msgs.push({ kind: 'in', who: 'wraith', name: 'WRAITH', text: m[1] });
        else if ((m = line.match(/^ORACLE>\s?(.*)$/))) msgs.push({ kind: 'system', text: '⚠ ORACLE: ' + m[1] });
        else msgs.push({ kind: 'system', text: line.trim() });
      });
      if (lvl.interlude) narr(lvl.interlude);
      narr(lvl.brief);
      msgs.push({ kind: 'mission', text: lvl.objective });
      if (lvl.goal) msgs.push({ kind: 'goal', text: lvl.goal });
      if (lvl.incoming) {
        const inc = lvl.incoming;
        const nm = (window.Comms && window.Comms.CHARS[inc.from] && window.Comms.CHARS[inc.from].name) || inc.from;
        if (inc.head) msgs.push({ kind: 'system', text: inc.head });
        (inc.lines || []).forEach(l => msgs.push({ kind: 'in', who: inc.from, name: nm, text: l }));
        if (inc.foot) msgs.push({ kind: 'system', text: inc.foot });
      }
      this._enqueue(msgs, onDone);
    },
    appendStory(banner, successTxt) {
      if (!this.threadEl) return;
      const msgs = [{ kind: 'done', text: banner }];
      (successTxt || '').split('\n').forEach(raw => {
        const line = raw.trim(); if (!line) return;
        const m = line.match(/^0xMOTHER>\s?(.*)$/);
        msgs.push(m ? { kind: 'in', who: 'mother', name: '0xMOTHER', text: m[1] } : { kind: 'system', text: line });
      });
      this._enqueue(msgs);
    },
    msgrChat(playerText, reply) {
      if (!this.threadEl) return false;
      const msgs = [];
      if (playerText) msgs.push({ kind: 'out', text: playerText });
      const who = reply.cls === 'chat-wraith' ? 'wraith' : 'mother';
      (reply.lines || []).forEach(l => msgs.push({ kind: 'in', who, name: reply.name, text: l }));
      this._enqueue(msgs);
      return true;
    },

    /* ---- 타이핑 큐 ---- */
    _reset() {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      this._q = []; this._busy = false; this._done = null; this._active = null;
      if (this.threadEl) this.threadEl.innerHTML = '';
    },
    _enqueue(items, onDone) { this._q = (this._q || []).concat(items); if (onDone) this._done = onDone; this._pump(); },
    _scroll() { if (this.threadEl) this.threadEl.scrollTop = this.threadEl.scrollHeight; },
    _pump() {
      if (this._busy) return;
      const m = (this._q || []).shift();
      if (!m) { if (this._done) { const fn = this._done; this._done = null; fn(); } return; }
      this._busy = true;
      this._render(m, () => { this._busy = false; this._pump(); });
    },
    _flush() {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      if (this._active) { this._active.textContent = this._activeText || ''; this._active = null; }
      this._busy = false;
      const q = this._q || []; this._q = [];
      const a = this.animate; this.animate = false;
      q.forEach(m => this._render(m, () => {}));
      this.animate = a; this._scroll();
      if (this._done) { const fn = this._done; this._done = null; fn(); }
    },
    _pace(done) { if (!this._anim()) return done(); this._timer = setTimeout(done, 220); },
    _anim() { return window.term ? window.term.animate !== false : true; },
    _render(m, done) {
      const body = this.threadEl; if (!body) return done();
      if (m.kind === 'system' || m.kind === 'done') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-system${m.kind === 'done' ? ' complete' : ''}">${esc(m.text)}</div>`);
        this._scroll(); return this._pace(done);
      }
      if (m.kind === 'mission') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-mission"><span class="mm-tag">▶ MISSION</span><div class="mm-text">${esc(m.text)}</div></div>`);
        this._scroll(); return this._pace(done);
      }
      if (m.kind === 'goal') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-goal"><div class="mg-head">🎯 상세 목표</div><div class="mg-text">${esc(m.text)}</div></div>`);
        this._scroll(); return this._pace(done);
      }
      if (m.kind === 'out') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-out"><div class="bubble">${esc(m.text)}</div></div>`);
        this._scroll(); return this._pace(done);
      }
      const wrap = document.createElement('div');
      wrap.className = 'msg msg-in' + (m.who === 'wraith' ? ' msg-wraith' : '');
      wrap.innerHTML = `<div class="msg-from">◉ ${esc(m.name || '0xMOTHER')}</div><div class="bubble"></div>`;
      body.appendChild(wrap);
      const bubble = wrap.querySelector('.bubble');
      const text = m.text || '';
      if (!this._anim() || !text) { bubble.textContent = text; this._scroll(); return done(); }
      this._active = bubble; this._activeText = text;
      bubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      this._scroll();
      this._timer = setTimeout(() => {
        bubble.textContent = ''; let i = 0;
        const step = () => {
          i = Math.min(text.length, i + 2);
          bubble.textContent = text.slice(0, i);
          this._scroll();
          if (window.term && i % 6 === 0) window.term._blip(860 + (i % 3) * 40, 0.006, 0.02);
          if (i < text.length) this._timer = setTimeout(step, 26);
          else { this._active = null; done(); }
        };
        step();
      }, 320);
    }
  };

  window.Messenger = Messenger;
  if (window.WM) WM.register('messenger', {
    title: '메신저', icon: '📨', w: 560, h: 520, x: 70, y: 60, minW: 360, minH: 300,
    onMount: (b) => Messenger.mount(b), onFocus: () => { Messenger.focus(); Messenger.clearNotify(); }
  });
})();
