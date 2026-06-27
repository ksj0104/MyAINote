/* ============================================================
 * browser.js — 브라우저 앱 (웹 미션)
 * 주소창 이동 = curl 실행 후 페이지 렌더. 로그인/업로드는 폼.
 * 모든 동작은 엔진 명령(curl/login)으로 수렴 → 검증 로직 동일. window.Browser.
 * ============================================================ */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const attr = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

  const Browser = {
    mount(body) {
      body.classList.add('browser-app');
      body.innerHTML =
        `<div class="b-bar">` +
        `<button class="b-nav" id="b-back" title="뒤로">◀</button>` +
        `<button class="b-nav" id="b-reload" title="새로고침">⟳</button>` +
        `<input id="b-url" class="b-url" type="text" autocomplete="off" spellcheck="false" placeholder="http://help.helios.corp/..." />` +
        `<button id="b-go" class="b-go">이동</button></div>` +
        `<div class="b-marks" id="b-marks"></div>` +
        `<div class="b-page" id="b-page"></div>`;
      this.urlEl = body.querySelector('#b-url');
      this.pageEl = body.querySelector('#b-page');
      this.marksEl = body.querySelector('#b-marks');
      this.hist = [];
      body.querySelector('#b-go').addEventListener('click', () => this.go(this.urlEl.value));
      body.querySelector('#b-reload').addEventListener('click', () => this.go(this.urlEl.value, true));
      body.querySelector('#b-back').addEventListener('click', () => { this.hist.pop(); const u = this.hist[this.hist.length - 1]; if (u) this.go(u, true); });
      this.urlEl.addEventListener('keydown', e => { if (e.key === 'Enter') this.go(this.urlEl.value); });
      this.refresh();
      this.home();
    },
    focus() { const i = document.getElementById('b-url'); if (i) setTimeout(() => i.focus(), 0); },

    refresh() {
      if (!this.marksEl) return;
      const marks = this._bookmarks();
      this.marksEl.innerHTML = marks.map(u => `<button class="b-mark" data-u="${attr(u)}">${esc(u.replace(/^https?:\/\//, ''))}</button>`).join('');
      this.marksEl.querySelectorAll('.b-mark').forEach(b => b.addEventListener('click', () => this.go(b.dataset.u)));
    },
    _bookmarks() {
      const g = window.game || {};
      const set = new Set();
      Object.keys(g.web || {}).forEach(u => set.add(u));
      const host = 'http://help.helios.corp';
      set.add(host + '/robots.txt');
      set.add(host + '/admin_portal');
      set.add(host + '/download?file=../../../../etc/passwd');
      set.add(host + '/upload');
      return [...set];
    },
    home() {
      if (!this.pageEl) return;
      this.pageEl.innerHTML =
        `<div class="b-home"><div class="b-logo">🌐 HELIOS&nbsp;NET</div>` +
        `<div class="b-hint">주소창에 URL을 입력하거나 위 북마크를 클릭하세요.<br>예) <b>http://help.helios.corp/robots.txt</b></div></div>`;
    },
    go(url, noPush) {
      url = (url || '').trim(); if (!url) return;
      if (!/^[a-z]+:\/\//i.test(url)) url = 'http://' + url;
      if (this.urlEl) this.urlEl.value = url;
      if (!noPush) this.hist.push(url);
      this._render(url);
      if (window.term) window.term.afterExec();
    },
    _render(url) {
      const g = window.game, page = this.pageEl; if (!page || !g) return;
      const lower = url.toLowerCase();
      if (/upload/.test(lower)) return this._uploadPage(url);
      if (/(admin|portal|login)/.test(lower) && !/robots|\.txt|\?file=/.test(lower)) return this._loginPage(url);
      let out = '';
      try { out = g.exec('curl ' + url, true) || ''; } catch (e) { out = ''; }
      if (!out) out = (g.web || {})[url] || '페이지를 찾을 수 없습니다 (연결 실패).';
      page.innerHTML = `<div class="b-doc"><div class="b-doc-url">${esc(url)}</div><pre class="b-pre">${esc(out)}</pre></div>`;
    },
    _loginPage(url) {
      this.pageEl.innerHTML =
        `<div class="b-doc"><div class="b-doc-url">${esc(url)}</div>` +
        `<div class="b-login"><div class="bl-title">🔒 HELIOS 관리자 포털</div>` +
        `<label>아이디</label><input id="bl-user" class="bl-in" type="text" value="admin" />` +
        `<label>비밀번호</label><input id="bl-pass" class="bl-in" type="text" placeholder="비밀번호 / ' OR '1'='1' --" />` +
        `<button id="bl-go" class="bl-btn">로그인 ▶</button>` +
        `<div class="b-hint">입력값이 SQL 인증 쿼리에 그대로 들어갑니다. (UNION SELECT 가능)</div>` +
        `<pre id="bl-out" class="b-pre"></pre></div></div>`;
      const run = () => {
        const u = (document.getElementById('bl-user').value || 'admin').trim();
        const p = document.getElementById('bl-pass').value || '';
        const out = window.game.exec('login ' + u + ' "' + p + '"', true) || '';
        document.getElementById('bl-out').textContent = out;
        if (window.term) window.term.afterExec();
      };
      document.getElementById('bl-go').addEventListener('click', run);
      document.getElementById('bl-pass').addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    },
    _uploadPage(url) {
      this.pageEl.innerHTML =
        `<div class="b-doc"><div class="b-doc-url">${esc(url)}</div>` +
        `<div class="b-login"><div class="bl-title">📤 이미지 업로드</div>` +
        `<label>파일 선택</label><select id="bl-file" class="bl-in"></select>` +
        `<button id="bl-up" class="bl-btn">업로드 ▶</button>` +
        `<div class="b-hint">서버가 파일 확장자를 제대로 검증하지 않습니다.</div>` +
        `<pre id="bl-out" class="b-pre"></pre></div></div>`;
      const g = window.game, node = g.fs && g.fs.getNode(g.cwd);
      const files = node && node.type === 'dir' ? Object.values(node.children).filter(c => c.type === 'file').map(c => c.name) : [];
      const sel = document.getElementById('bl-file');
      sel.innerHTML = (files.length ? files : ['shell.php']).map(f => `<option>${esc(f)}</option>`).join('');
      document.getElementById('bl-up').addEventListener('click', () => {
        const out = window.game.exec('curl -X POST -F file=@' + sel.value + ' ' + url, true) || '';
        document.getElementById('bl-out').textContent = out || '업로드 완료 (200 OK)';
        if (window.term) window.term.afterExec();
      });
    }
  };

  window.Browser = Browser;
  if (window.WM) WM.register('browser', {
    title: '브라우저', icon: '🌐', w: 760, h: 520, x: 200, y: 90, minW: 420, minH: 300,
    onMount: (b) => Browser.mount(b), onFocus: () => Browser.focus()
  });
})();
