/* ============================================================
 * terminal.js — 터미널 UI/입출력 레이어 (픽셀/CRT)
 * ============================================================ */
(function () {
  const $ = (s) => document.querySelector(s);

  class Terminal {
    constructor() {
      this.outEl = $('#output');
      this.inputEl = $('#cmd-input');
      this.promptEl = $('#prompt-label');
      this.screenEl = $('#screen');
      this.histIdx = -1;
      this.soundOn = true;
      this.audio = null;
      // 타자기 애니메이션 큐
      this.q = [];
      this.pumping = false;
      this.cur = null;
      this.animate = true;
      try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.animate = false; } catch (e) {}
      this.typeDelay = 9;     // ms / 틱
      this.charsPerTick = 2;  // 틱당 글자수
      this.maxTypeLen = 240;  // 너무 긴 줄은 즉시 출력
      this._bindInput();
      this._bindSound();
    }

    /* ---------- 출력 (큐 기반) ---------- */
    // type=true 이면 타자기 효과로, 아니면 즉시 출력. 순서는 항상 보존.
    println(text, cls, type) {
      this.q.push({ text: text == null ? '' : String(text), cls: cls || '', type: !!type });
      this._pump();
    }
    printBlock(text, cls, type) { String(text).split('\n').forEach(l => this.println(l, cls, type)); }
    // 타자기 출력 단축 메서드
    typeln(text, cls) { this.println(text, cls, true); }
    typeBlock(text, cls) { this.printBlock(text, cls, true); }

    _appendLine(cls) {
      const line = document.createElement('div');
      line.className = 'line' + (cls ? ' ' + cls : '');
      this.outEl.appendChild(line);
      return line;
    }

    _pump() {
      if (this.pumping) return;
      const job = this.q.shift();
      if (!job) return;
      this.pumping = true;
      const line = this._appendLine(job.cls);
      // 즉시 출력 조건
      if (!job.type || !this.animate || job.text.length > this.maxTypeLen) {
        line.textContent = job.text; this._scroll();
        this.pumping = false; this._pump();
        return;
      }
      // 타자기
      this.cur = { line, text: job.text, i: 0 };
      const step = () => {
        const c = this.cur; if (!c) return;
        c.i = Math.min(c.text.length, c.i + this.charsPerTick);
        c.line.textContent = c.text.slice(0, c.i);
        this._scroll();
        if (c.i % 6 === 0) this._blip(900 + (c.i % 4) * 60, 0.008, 0.025);
        if (c.i < c.text.length) { this._typeTimer = setTimeout(step, this.typeDelay); }
        else { this.cur = null; this.pumping = false; this._pump(); }
      };
      step();
    }

    // 진행 중인 타자 애니메이션을 즉시 완료 (입력 시 호출)
    skipTyping() {
      if (this._typeTimer) { clearTimeout(this._typeTimer); this._typeTimer = null; }
      if (this.cur) { this.cur.line.textContent = this.cur.text; this.cur = null; }
      this.pumping = false;
      // 남은 큐 즉시 출력
      while (this.q.length) {
        const job = this.q.shift();
        this._appendLine(job.cls).textContent = job.text;
      }
      this._scroll();
    }

    clear() {
      if (this._typeTimer) { clearTimeout(this._typeTimer); this._typeTimer = null; }
      this.q = []; this.cur = null; this.pumping = false;
      this.outEl.innerHTML = '';
    }

    flashClear() {
      this.screenEl.classList.add('flash');
      setTimeout(() => this.screenEl.classList.remove('flash'), 220);
    }

    _scroll() { this.screenEl.scrollTop = this.screenEl.scrollHeight; }

    /* ---------- 프롬프트 ---------- */
    promptString() {
      const g = window.game;
      let cwd = g.cwd;
      if (cwd === '/home/' + g.user || cwd === '/home/guest') cwd = '~';
      else if (cwd.startsWith('/home/' + g.user + '/')) cwd = '~' + cwd.slice(('/home/' + g.user).length);
      const sym = g.user === 'root' ? '#' : '$';
      return `${g.user}@${g.host}:${cwd}${sym}`;
    }
    updatePrompt() { this.promptEl.textContent = this.promptString(); }

    /* ---------- 미션 패널 ---------- */
    setMission(lvl, n, total) {
      $('#mission-id').textContent = `${lvl.id} · ${lvl.tier}`;
      $('#mission-title').textContent = lvl.title;
      $('#mission-objective').textContent = lvl.objective;
      $('#mission-progress').textContent = `${n} / ${total}`;
      const pct = Math.round(((n - 1) / total) * 100);
      $('#progress-fill').style.width = pct + '%';
    }

    /* ---------- 난이도별 화면 모드 + 라이브 패널 ---------- */
    setMode(mode) {
      this.mode = mode || 'terminal';
      document.body.setAttribute('data-mode', this.mode);
      this.renderPanels();
    }

    renderPanels() {
      const g = window.game;
      if (!g || !g.fs) return;

      // 상태바
      const sb = $('#status-bar');
      if (sb) {
        const depth = (g.connStack && g.connStack.length) || 0;
        const session = g.sessionLabel || (depth > 0 ? 'REMOTE SHELL' : 'LOCAL SHELL');
        const webTarget = g.targetLabel || Object.keys(g.web || {})[0] || '';
        const netTarget = (g.network && g.network[0]) ? `${g.network[0].name} (${g.network[0].ip})` : '';
        const target = webTarget || netTarget || 'LOCAL FS';
        const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        sb.innerHTML =
          `<span class="sb-item">SESSION <b>${esc(session)}</b></span>` +
          `<span class="sb-item">TARGET <b>${esc(target)}</b></span>` +
          `<span class="sb-item">USER <b>${esc(g.user)}</b></span>` +
          `<span class="sb-item">HOST <b>${esc(g.host)}</b></span>` +
          `<span class="sb-item">PWD <b>${esc(g.cwd)}</b></span>` +
          `<span class="sb-item">IP <b>${esc(g.ip || '10.0.0.42')}</b></span>` +
          `<span class="sb-item">HOPS <b>${depth}</b></span>`;
      }

      // 네트워크 맵 패널 (해커 시뮬 스타일)
      const tp = $('#targets-list');
      if (tp) {
        const hosts = g.network || [];
        let html = `<div class="netmap-you">◉ ${g.user}@${g.host}<div class="host-meta">${g.ip || '10.0.0.42'} · 내 노드</div></div>`;
        html += '<div class="netmap-link">│</div>';
        if (!hosts.length) {
          html += '<div class="panel-empty">발견된 호스트 없음<br>`nmap &lt;대역&gt;` 으로 스캔</div>';
        } else {
          hosts.forEach((h, i) => {
            const last = i === hosts.length - 1;
            const seen = g.scanned && g.scanned.has(h.ip);
            const owned = (g.connStack && g.connStack.some(c => c.host === h.name)) || g.host === h.name;
            const icon = owned ? '◆' : seen ? '▣' : '▢';
            const cls = owned ? 'host-owned' : seen ? 'host-seen' : 'host-hidden';
            const ports = seen ? h.ports.map(p => p.port).join(',') : '???';
            const tag = owned ? ' OWNED' : seen ? '' : ' (미탐색)';
            html += `<div class="netnode ${cls}"><span class="nm-branch">${last ? '└─' : '├─'}</span> ${icon} ${h.name}${tag}<div class="host-meta">　　${h.ip} · :${ports}</div></div>`;
          });
        }
        tp.innerHTML = html;
      }

      // 파일트리(현재 디렉터리) 패널
      const ft = $('#fstree-list');
      if (ft) {
        const node = g.fs.getNode(g.cwd);
        let items = '';
        if (node && node.type === 'dir') {
          const entries = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name));
          items = entries.map(e => {
            const ic = e.type === 'dir' ? '▸' : '·';
            const lock = (e.perms && e.perms[6] !== 'r' && e.owner !== g.user && g.user !== 'root') ? ' 🔒' : '';
            return `<div class="fst-item fst-${e.type}">${ic} ${e.name}${e.type === 'dir' ? '/' : ''}${lock}</div>`;
          }).join('');
        }
        ft.innerHTML = `<div class="fst-path">${g.cwd}</div>` + (items || '<div class="panel-empty">(빈 디렉터리)</div>');
      }

      this.renderTools();
    }

    /* ---------- 툴 독 (네트워크 / DB 인젝션 / 파일 / 설정) ---------- */
    selectTool(name) {
      this.activeTool = name;
      this._syncToolNav(name);
      this.renderTools(true);
      if (this.inputEl) this.inputEl.focus();
    }
    _syncToolNav(name) {
      document.body.setAttribute('data-tool', name);
      document.querySelectorAll('#nav-rail .nav-ico[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === name));
      const heads = { dashboard: '◈ 작전 대시보드', network: '◢ 네트워크 스캐너', database: '⛁ DB 인젝션', files: '▤ 파일 탐색기', settings: '⚙ 설정' };
      const h = $('#tool-head'); if (h) h.textContent = heads[name] || name;
    }
    // 툴 버튼 → 명령 실행(터미널에 직접 입력한 것과 동일 경로)
    runToolCmd(cmd) {
      const g = window.game;
      if (this.inputLocked || !cmd) return;
      this.println(this.promptString() + ' ' + cmd, 'cmd-echo');
      this._blip(660, 0.03);
      const out = g.exec(cmd);
      if (out) this.typeBlock(out);
      this.updatePrompt();
      this.renderPanels();
    }
    toolScan(flag) {
      const el = $('#net-target');
      const g = window.game;
      const target = (el && el.value.trim()) || (g.network && g.network[0] && (g.network[0].name || g.network[0].ip)) || '';
      if (!target) { this.printBlock('대상을 입력하세요 (호스트 또는 대역).', 'dim'); return; }
      this.runToolCmd('nmap ' + (flag ? flag + ' ' : '') + target);
    }
    toolSubmit() { const el = $('#tool-submit'); if (el && el.value.trim()) { const v = el.value.trim(); el.value = ''; this.runToolCmd('submit ' + v); } }
    toolInject() { const el = $('#db-payload'); const v = (el && el.value.trim()) || "' OR '1'='1' --"; this.runToolCmd('login admin "' + v + '"'); }
    toolPreset(kind) {
      if (kind === 'bypass') this.runToolCmd('login admin "\' OR \'1\'=\'1\' --"');
      else if (kind === 'union') this.runToolCmd('login admin "\' UNION SELECT null,user,pass FROM users --"');
    }
    toolFile(name, isDir) { this.runToolCmd((isDir ? 'cd ' : 'cat ') + name); }
    toggleSound() { const b = $('#sound-toggle'); if (b) b.click(); }

    renderTools(force) {
      const g = window.game;
      if (!g || !g.fs || document.body.getAttribute('data-screen') !== 'play') return;
      if (!document.body.getAttribute('data-tool')) this._syncToolNav('dashboard');
      const e = s => this._esc(s);
      const set = g.activeSet || window.LEVELS;
      const lvl = set && set[g.levelIndex];

      // 대시보드: 미션 목표 + 정답 제출 + 길잡이
      const dash = $('#tool-dashboard');
      if (dash) {
        dash.innerHTML =
          `<div class="tool-card"><div class="tc-k">현재 미션</div><div class="tc-v">${lvl ? e(lvl.id + ' · ' + lvl.title) : '—'}</div></div>` +
          `<div class="tool-card"><div class="tc-k">목표</div><div class="tc-v">${e(lvl ? lvl.objective : '—')}</div></div>` +
          `<div class="tool-section"><label class="tool-label">정답 제출 (submit)</label>` +
          `<div class="tool-row"><input id="tool-submit" class="tool-input" placeholder="찾은 값 입력 후 Enter" onkeydown="if(event.key==='Enter')window.term.toolSubmit()" /><button class="tool-btn" onclick="window.term.toolSubmit()">제출</button></div></div>` +
          `<div class="tool-section"><label class="tool-label">길잡이</label>` +
          `<button class="tool-btn ghost" onclick="window.term.runToolCmd('objective')">목표 다시 보기</button>` +
          `<button class="tool-btn ghost" onclick="window.term.runToolCmd('hint')">힌트 받기</button>` +
          `<button class="tool-btn ghost" onclick="window.term.runToolCmd('intel')">작전 정보 (intel)</button></div>`;
      }

      // 네트워크: 발견 호스트별 접속 동작
      const nt = $('#net-target');
      if (nt && !nt.value && g.network && g.network[0]) nt.value = g.network[0].name || g.network[0].ip || '';
      const na = $('#net-actions');
      if (na) {
        const hosts = (g.network || []).filter(h => g.scanned && g.scanned.has(h.ip));
        na.innerHTML = hosts.map(h => {
          const svc = (h.ports || []).map(p => p.service);
          const acts = [];
          if (svc.includes('http')) acts.push(`<button class="tool-btn ghost" onclick="window.term.runToolCmd('curl http://${e(h.name)}')">HTTP 요청 (curl)</button>`);
          if (svc.includes('ftp')) acts.push(`<button class="tool-btn ghost" onclick="window.term.runToolCmd('ftp ${e(h.ip)}')">FTP 접속</button>`);
          if (svc.includes('ssh')) acts.push(`<button class="tool-btn ghost" onclick="window.term.runToolCmd('ssh ${e(h.ip)}')">SSH 접속</button>`);
          return acts.length ? `<div class="net-act"><div class="net-host-h">▣ ${e(h.name)} · ${e(h.ip)}</div>${acts.join('')}</div>` : '';
        }).join('') || '<div class="tool-hint">스캔하면 접속 가능한 서비스가 여기 표시됩니다.</div>';
      }

      // 파일 탐색기: 현재 디렉터리 클릭 탐색/열람
      const fv = $('#tool-files');
      if (fv) {
        const node = g.fs.getNode(g.cwd);
        let rows = `<div class="tool-card"><div class="tc-k">현재 경로</div><div class="tc-v">${e(g.cwd)}</div></div>` +
          `<div class="tool-row"><button class="tool-btn ghost" onclick="window.term.runToolCmd('cd ..')">⬆ 상위 (cd ..)</button><button class="tool-btn ghost" onclick="window.term.runToolCmd('ls -a')">숨김 포함 (ls -a)</button></div>`;
        if (node && node.type === 'dir') {
          const entries = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name));
          rows += '<div class="tool-divider">항목 (클릭하여 열기)</div>';
          rows += entries.map(en => {
            const isDir = en.type === 'dir';
            const nm = String(en.name).replace(/['\\]/g, '\\$&');
            return `<div class="tfile ${isDir ? 'dir' : ''}" onclick="window.term.toolFile('${nm}', ${isDir})"><span class="tf-ic">${isDir ? '▸' : '·'}</span> ${e(en.name)}${isDir ? '/' : ''}</div>`;
          }).join('');
        }
        fv.innerHTML = rows;
      }

      // DB 인젝션 / 설정: 입력 보존 위해 비어있을 때(또는 force)만 렌더
      const db = $('#tool-database');
      if (db && (force || !db.innerHTML)) {
        db.innerHTML =
          `<div class="tool-card"><div class="tc-k">대상 로그인</div><div class="tc-v">admin @ /admin_portal</div></div>` +
          `<div class="tool-section"><label class="tool-label">프리셋 페이로드</label>` +
          `<button class="tool-btn ghost" onclick="window.term.toolPreset('bypass')">인증 우회 ( ' OR '1'='1' -- )</button>` +
          `<button class="tool-btn ghost" onclick="window.term.toolPreset('union')">테이블 덤프 (UNION SELECT)</button></div>` +
          `<div class="tool-section"><label class="tool-label">직접 페이로드 주입</label>` +
          `<textarea id="db-payload" class="tool-area" placeholder="' OR '1'='1' --"></textarea>` +
          `<button class="tool-btn wide" onclick="window.term.toolInject()">주입 실행 ▶</button>` +
          `<div class="tool-hint">입력값이 admin 계정 인증 쿼리에 그대로 주입됩니다.</div></div>`;
      }
      const sv = $('#tool-settings');
      if (sv && (force || !sv.innerHTML)) {
        sv.innerHTML =
          `<div class="tool-section"><label class="tool-label">화면 색상 테마</label>` +
          `<div class="tool-row"><button class="tool-btn ghost" onclick="window.game.setTheme('amber')">앰버</button><button class="tool-btn ghost" onclick="window.game.setTheme('green')">그린</button><button class="tool-btn ghost" onclick="window.game.setTheme('cyan')">시안</button></div></div>` +
          `<div class="tool-section"><label class="tool-label">사운드</label><button class="tool-btn ghost" onclick="window.term.toggleSound()">효과음 켜기 / 끄기</button></div>` +
          `<div class="tool-section"><label class="tool-label">작전</label>` +
          `<button class="tool-btn ghost" onclick="window.term.runToolCmd('levels')">진행 현황 (levels)</button>` +
          `<button class="tool-btn ghost" onclick="window.term.runToolCmd('restart')">처음부터 (restart)</button>` +
          `<button class="tool-btn ghost" onclick="window.game.showMenu()">메인 메뉴로</button></div>`;
      }
    }

    /* ---------- 입력 처리 ---------- */
    _bindInput() {
      this.inputEl.addEventListener('keydown', (e) => {
        const g = window.game;
        // 보안 채널이 미션을 전송하는 동안엔 터미널 잠금. Enter 로 남은 대화 즉시 표시(스킵).
        if (this.inputLocked) { e.preventDefault(); if (e.key === 'Enter') this._msgrFlush(); return; }
        // 메뉴 화면에서는 방향키로 선택 이동 + Enter 로 실행 (입력창이 비어있을 때)
        if (g.appMode === 'menu' && this.handleMenuKey(e)) return;
        if (e.key === 'Enter') {
          this.skipTyping();   // 진행 중인 타자 애니메이션 즉시 완료
          const raw = this.inputEl.value;
          this.println(this.promptString() + ' ' + raw, 'cmd-echo');
          this.inputEl.value = '';
          this.histIdx = -1;
          this._blip(660, 0.03);
          if (raw.trim()) {
            const out = g.exec(raw);
            if (out) this.typeBlock(out);   // 출력은 타자기 효과로
          }
          this.updatePrompt();
          this.renderPanels();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const h = g.history;
          if (!h.length) return;
          this.histIdx = this.histIdx < 0 ? h.length - 1 : Math.max(0, this.histIdx - 1);
          this.inputEl.value = h[this.histIdx];
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const h = g.history;
          if (this.histIdx < 0) return;
          this.histIdx++;
          if (this.histIdx >= h.length) { this.histIdx = -1; this.inputEl.value = ''; }
          else this.inputEl.value = h[this.histIdx];
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this._autocomplete();
        } else if (e.key.length === 1) {
          this._blip(1200, 0.012, 0.04);
        }
      });
      // 화면 아무데나 클릭하면 입력창 포커스
      this.screenEl.addEventListener('click', () => this.inputEl.focus());
      $('#terminal').addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') this.inputEl.focus();
      });
    }

    _autocomplete() {
      const val = this.inputEl.value;
      if (val.includes(' ')) return;
      const matches = Object.keys(window.COMMANDS).filter(c => c.startsWith(val));
      if (matches.length === 1) this.inputEl.value = matches[0] + ' ';
      else if (matches.length > 1) this.printBlock(matches.join('  '), 'dim');
    }

    /* ---------- 메뉴 방향키 네비게이션 ---------- */
    // 반환 true면 이벤트를 소비(기본 핸들러로 넘기지 않음)
    handleMenuKey(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); this.moveMenuSel(-1); return true; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); this.moveMenuSel(1); return true; }
      if (e.key === 'Enter' && !this.inputEl.value.trim()) {
        e.preventDefault();
        this.skipTyping();
        const action = (this.menuActions && this.menuActions[this.menuSel]) || null;
        if (!action) { window.game.menuDefault(); return true; }
        this.println(this.promptString() + ' ▶ ' + ((this.menuLabels && this.menuLabels[this.menuSel]) || action), 'cmd-echo');
        this._blip(660, 0.03);
        const out = window.game.menuSelect(action);
        if (out) this.typeBlock(out);
        this.updatePrompt();
        this.renderPanels();
        return true;
      }
      return false;
    }
    moveMenuSel(delta) {
      if (!this.menuActions || !this.menuActions.length) return;
      const n = this.menuActions.length;
      this.menuSel = ((this.menuSel + delta) % n + n) % n;
      this.highlightMenu();
      this._blip(1000, 0.02, 0.03);
    }
    highlightMenu() {
      const cards = document.querySelectorAll('#menu-cards .menu-card');
      cards.forEach((c, i) => c.classList.toggle('selected', i === this.menuSel));
      const sel = cards[this.menuSel];
      if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
    }

    /* ---------- 사운드 ---------- */
    _bindSound() {
      const btn = $('#sound-toggle');
      if (btn) btn.addEventListener('click', () => {
        this.soundOn = !this.soundOn;
        btn.textContent = this.soundOn ? '♪ SOUND: ON' : '♪ SOUND: OFF';
      });
    }
    _blip(freq, dur, vol) {
      if (!this.soundOn) return;
      try {
        if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
        const o = this.audio.createOscillator();
        const gain = this.audio.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        gain.gain.value = vol || 0.05;
        o.connect(gain); gain.connect(this.audio.destination);
        o.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audio.currentTime + (dur || 0.05));
        o.stop(this.audio.currentTime + (dur || 0.05));
      } catch (e) {}
    }

    /* ---------- 부팅 시퀀스 ---------- */
    bootSequence(done) {
      const lines = [
        'NULLSEC SECURE BOOT v3.7 ...',
        '[ OK ] mounting /dev/breach0',
        '[ OK ] initializing crypto module',
        '[ OK ] establishing onion circuit ......',
        '[ OK ] spoofing MAC address de:ad:be:ef:00:42',
        '[ OK ] connection anonymized',
        '',
        '  ████████╗███████╗██████╗ ███╗   ███╗',
        '  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║',
        '     ██║   █████╗  ██████╔╝██╔████╔██║   //BREACH',
        '     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║',
        '     ██║   ███████╗██║  ██║██║ ╚═╝ ██║',
        '     ╚═╝   ╚══════╝╚═╝     ╚═╝     ╚═╝',
        '',
        '   유닉스 명령으로 배우는 모의 해킹 — TERMINAL//BREACH',
        '   `help` 로 명령을, `objective` 로 목표를, `hint` 로 힌트를.',
        ''
      ];
      let i = 0;
      const tick = () => {
        if (i < lines.length) {
          this.println(lines[i], i >= 7 && i <= 12 ? 'logo' : 'boot');
          this._blip(440 + i * 20, 0.02, 0.02);
          i++;
          setTimeout(tick, i < 7 ? 160 : 70);
        } else {
          // 부팅 아트를 감상할 수 있도록, 키/클릭이 있을 때까지 대기 (안전망: 8초 후 자동 진행)
          setTimeout(() => this._promptContinue(done), 250);
        }
      };
      tick();
    }

    // 부팅 화면을 유지하다가 사용자가 키를 누르거나 화면을 클릭하면 다음 화면으로 진행
    _promptContinue(done) {
      this.println('', '');
      this.println('   ▶  아무 키나 누르거나 화면을 클릭하면 시작합니다  ◀', 'boot-continue');
      let proceeded = false;
      let timer = null;
      const go = () => {
        if (proceeded) return;
        proceeded = true;
        clearTimeout(timer);
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('click', onClick, true);
        this._blip(660, 0.04);
        done();
      };
      // capture 단계에서 가로채 첫 입력이 명령으로 새지 않도록 한다
      const onKey = (e) => { e.preventDefault(); e.stopPropagation(); go(); };
      const onClick = () => go();
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('click', onClick, true);
      timer = setTimeout(go, 8000);
    }

    /* ---------- 엔딩 ---------- */
    showEnding() {
      this.clear();
      const st = (window.game && window.game.stance) || { creed: 0, ghost: 0 };
      let head, dlg, ttl;
      if (st.ghost > st.creed) {
        ttl = 'GHOST PROTOCOL';
        head = ['   ▓▓▓  G H O S T   P R O T O C O L  ▓▓▓', '   흔적도 이름도 없이 — 넌 기계 속 유령이 됐다.'];
        dlg = [
          '   ☇ WRAITH> 깨끗하군. 0xMOTHER의 명단은 재가 됐고, 그녀의 행방도 묘연해.',
          '   ☇ WRAITH> 넌 이제 양심의 무게도 없는 유령이야. …환영한다.',
          '   ☇ WRAITH> 다음 사냥감은 네가 골라.'
        ];
      } else if (st.creed > st.ghost) {
        ttl = 'THE LOYAL BLADE';
        head = ['   ★★★  T H E   L O Y A L   B L A D E  ★★★', '   정도를 지켰다 — 불이 꺼지며, 진실이 송출된다.'];
        dlg = [
          '   0xMOTHER> 넌 날 믿었지. …난 잡혀가겠지만, 진실은 남아.',
          '   0xMOTHER> 전 세계가 HELIOS의 범죄를 본다. 우리가 해냈어.',
          '   0xMOTHER> 넌 더 이상 내 학생이 아니야. 잘 가라, 요원.'
        ];
      } else {
        ttl = 'THE THIRD PATH';
        head = ['   ◈◈◈  T H E   T H I R D   P A T H  ◈◈◈', '   어느 쪽도 따르지 않은 — 너 자신의 길.'];
        dlg = [
          '   0xMOTHER> …네가 우릴 능가했군. 도시는 끄지 않고, 증거만 흘렸어.',
          '   ☇ WRAITH> 흥미롭네. 다음엔 내 편이 되어줘.',
          '   [ ORACLE 신호 소실 · 열린 결말 — 진짜 전쟁은 이제부터다 ]'
        ];
      }
      const art = ['',
        '   ═══════════════════════════════════════════════',
        ...head,
        '   ═══════════════════════════════════════════════',
        `   성향: 신념 ${st.creed} · 효율 ${st.ghost}`,
        '', ...dlg, '',
        '   당신이 익힌 것:',
        '     · 정찰·OSINT (dig, nmap, curl, grep)',
        '     · 웹 취약점 (login/SQLi, LFI, 업로드·웹쉘)',
        '     · 권한상승·포렌식 (find -perm, strings, john, steghide)',
        '     · 무선·피벗·안티포렌식 (aircrack-ng, ssh -L, sed, touch -t)',
        '',
        '   `restart` 로 처음부터 — 다른 STANCE로 다른 결말을 보라.',
        '   — 진짜 시스템은 허락 없이 건드리지 마세요. 윤리는 해커의 무기다. —',
        ''
      ];
      this._endingTitle = ttl;
      art.forEach((l, idx) => setTimeout(() => { this.println(l, 'ending'); this._blip(523 + idx * 12, 0.03, 0.03); }, idx * 90));
      $('#mission-title').textContent = 'ALL CLEAR';
      $('#mission-objective').textContent = '축하합니다 — `menu` 로 다른 모드에 도전하세요.';
      $('#progress-fill').style.width = '100%';
      $('#mission-progress').textContent = 'DONE';
    }

    /* ---------- 스토리/미션 창 (위쪽 패널) ---------- */
    _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    // 미션 진입 시 메신저로 브리핑 전달 (0xMOTHER/WRAITH 메시지 + 미션 카드 + 타이핑)
    renderStory(lvl, tag, onDone) {
      const sp = $('#story-panel'); if (!sp) { if (onDone) onDone(); return; }
      this._msgrReset();
      const mid = $('#story-mid'); if (mid) mid.textContent = `${lvl.id} · ${lvl.tier}`;
      sp.classList.add('show');
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
      this._msgrEnqueue(msgs, onDone);
    }
    // 클리어 시 완료/디브리핑을 메신저에 덧붙임
    appendStory(banner, successTxt) {
      const sp = $('#story-panel'); if (!sp || !sp.classList.contains('show')) return;
      const msgs = [{ kind: 'done', text: banner }];
      (successTxt || '').split('\n').forEach(raw => {
        const line = raw.trim(); if (!line) return;
        const m = line.match(/^0xMOTHER>\s?(.*)$/);
        msgs.push(m ? { kind: 'in', who: 'mother', name: '0xMOTHER', text: m[1] } : { kind: 'system', text: line });
      });
      this._msgrEnqueue(msgs);
    }
    // chat: 메신저 패널이 열려 있으면 거기에 표시(true 반환), 아니면 false → 호출측 폴백
    msgrChat(playerText, reply) {
      const sp = $('#story-panel'); if (!sp || !sp.classList.contains('show')) return false;
      const msgs = [];
      if (playerText) msgs.push({ kind: 'out', text: playerText });
      const who = reply.cls === 'chat-wraith' ? 'wraith' : 'mother';
      (reply.lines || []).forEach(l => msgs.push({ kind: 'in', who, name: reply.name, text: l }));
      this._msgrEnqueue(msgs);
      return true;
    }
    /* ----- 메신저 큐 엔진 (순차 전송 + 타이핑) ----- */
    _msgrReset() {
      if (this._mqTimer) { clearTimeout(this._mqTimer); this._mqTimer = null; }
      this._mq = []; this._mqBusy = false; this._mqDone = null; this._activeBubble = null;
      const b = $('#story-body'); if (b) b.innerHTML = '';
    }
    _msgrEnqueue(items, onDone) {
      this._mq = (this._mq || []).concat(items);
      if (onDone) this._mqDone = onDone;
      this._msgrPump();
    }
    _msgrScroll() {
      const b = $('#story-body'); if (b) b.scrollTop = b.scrollHeight;   // 실제 스크롤 컨테이너
      const sp = $('#story-panel'); if (sp) sp.scrollTop = sp.scrollHeight;
    }
    _msgrPump() {
      if (this._mqBusy) return;
      const m = (this._mq || []).shift();
      if (!m) {                                   // 큐가 비면 = 모든 대화 전송 완료 → 드레인 콜백
        if (this._mqDone) { const fn = this._mqDone; this._mqDone = null; fn(); }
        return;
      }
      this._mqBusy = true;
      this._msgrRender(m, () => { this._mqBusy = false; this._msgrPump(); });
    }
    // 진행 중인 모든 대화를 즉시 끝까지 표시(Enter 스킵)
    _msgrFlush() {
      if (this._mqTimer) { clearTimeout(this._mqTimer); this._mqTimer = null; }
      if (this._activeBubble) { this._activeBubble.textContent = this._activeText || ''; this._activeBubble = null; }
      this._mqBusy = false;
      const q = this._mq || []; this._mq = [];
      const a = this.animate; this.animate = false;               // 즉시(동기) 렌더
      q.forEach(m => this._msgrRender(m, () => {}));
      this.animate = a;
      this._msgrScroll();
      if (this._mqDone) { const fn = this._mqDone; this._mqDone = null; fn(); }
    }
    // 미션 전환: 터미널 초기화 + 입력 잠금 (보안 채널 수신 동안)
    lockTerminal() {
      this.inputLocked = true;
      this.clear();
      if (this.inputEl) { this.inputEl.disabled = true; this.inputEl.placeholder = '◉ 보안 채널 수신 중…  (Enter: 건너뛰기)'; }
      const cb = document.getElementById('command-bar'); if (cb) cb.classList.add('locked');
    }
    // 미션을 벗어날 때(메뉴 복귀 등) 잠금·메신저 큐를 강제 해제 — 잠금이 메뉴까지 새는 것 방지
    _exitMissionLock() {
      this._msgrReset();                 // 진행 중이던 브리핑 큐/타이머/드레인 콜백 정지
      this.inputLocked = false;
      if (this.inputEl) { this.inputEl.disabled = false; this.inputEl.placeholder = '명령을 입력하고 Enter…'; }
      const cb = document.getElementById('command-bar'); if (cb) cb.classList.remove('locked');
    }
    // 보안 채널 전송 완료 → 터미널 활성화
    unlockTerminal() {
      this.inputLocked = false;
      if (this.inputEl) { this.inputEl.disabled = false; this.inputEl.placeholder = '명령을 입력하고 Enter…'; }
      const cb = document.getElementById('command-bar'); if (cb) cb.classList.remove('locked');
      this.println('[ 터미널 활성화 ] 위 STORY 창의 미션을 확인하고 명령을 입력하라.', 'success');
      if (this.inputEl) this.inputEl.focus();
    }
    // 비-타이핑 메시지도 한 박자씩 끊어 순차로 보이게(미션 전환 몰입)
    _pace(done) { if (!this.animate) return done(); this._mqTimer = setTimeout(done, 240); }
    _msgrRender(m, done) {
      const body = $('#story-body'); if (!body) return done();
      const e = (s) => this._esc(s);
      if (m.kind === 'system' || m.kind === 'done') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-system${m.kind === 'done' ? ' complete' : ''}">${e(m.text)}</div>`);
        this._msgrScroll(); return this._pace(done);
      }
      if (m.kind === 'mission') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-mission"><span class="mm-tag">▶ MISSION</span><div class="mm-text">${e(m.text)}</div></div>`);
        this._msgrScroll(); return this._pace(done);
      }
      if (m.kind === 'goal') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-goal"><div class="mg-head">🎯 상세 목표</div><div class="mg-text">${e(m.text)}</div></div>`);
        this._msgrScroll(); return this._pace(done);
      }
      if (m.kind === 'out') {
        body.insertAdjacentHTML('beforeend', `<div class="msg msg-out"><div class="bubble">${e(m.text)}</div></div>`);
        this._msgrScroll(); return this._pace(done);
      }
      // incoming (in / wraith): 타이핑 인디케이터 → 글자 타이핑
      const wrap = document.createElement('div');
      wrap.className = 'msg msg-in' + (m.who === 'wraith' ? ' msg-wraith' : '');
      wrap.innerHTML = `<div class="msg-from">◉ ${e(m.name || '0xMOTHER')}</div><div class="bubble"></div>`;
      body.appendChild(wrap);
      const bubble = wrap.querySelector('.bubble');
      const text = m.text || '';
      if (!this.animate || !text) { bubble.textContent = text; this._msgrScroll(); return done(); }
      this._activeBubble = bubble; this._activeText = text;   // 스킵(Enter) 시 즉시 완성용
      bubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      this._msgrScroll();
      this._mqTimer = setTimeout(() => {
        bubble.textContent = ''; let i = 0;
        const step = () => {
          i = Math.min(text.length, i + 2);   // 틱당 2글자(느리게)
          bubble.textContent = text.slice(0, i);
          this._msgrScroll();
          if (i % 6 === 0) this._blip(860 + (i % 3) * 40, 0.006, 0.02);
          if (i < text.length) this._mqTimer = setTimeout(step, 26);   // 26ms/틱
          else { this._activeBubble = null; done(); }
        };
        step();
      }, 360);                                  // 타이핑 인디케이터 좀 더 길게
    }
    hideStory() { const sp = $('#story-panel'); if (sp) sp.classList.remove('show'); }

    /* ---------- 메인 메뉴 ---------- */
    hideOverlays() {
      const o = $('#codelab'); if (o) o.style.display = 'none';
      const mc = $('#menu-cards'); if (mc) mc.style.display = 'none';
      this.hideStory();
      document.body.removeAttribute('data-overlay');
    }
    showCodelab() { const o = $('#codelab'); if (o) o.style.display = 'flex'; document.body.setAttribute('data-overlay', 'codelab'); }

    // 타이틀 히어로(로고/태그라인/상태칩) 갱신 + 하단 콘솔 부팅로그
    setHero(title, tagline, chips, log) {
      const t = $('#hero-title'); if (t) t.innerHTML = title;
      const tg = $('#hero-tagline'); if (tg) tg.textContent = tagline;
      const hs = $('#hero-status'); if (hs) hs.innerHTML = (chips || []).map(c => `<div class="chip${c.on ? ' on' : ''}">${c.t}</div>`).join('');
      (log || []).forEach(l => this.println(l, /^\[ ?>/.test(l) ? 'success' : 'dim'));
    }

    // 메인 타이틀 화면: 새 게임 / 이어하기 / 미션 선택 / 그 외 모드
    showMenu(game) {
      this.hideOverlays(); this._exitMissionLock(); this.setMode('terminal'); this.clear();
      const scenIdx = (game && game.scenarioIndex) || 0;
      const total = (window.LEVELS || []).length;
      const hasSave = scenIdx > 0;
      const st = (game && game.stance) || { creed: 0, ghost: 0 };
      const lean = st.creed > st.ghost ? '신념' : st.ghost > st.creed ? '효율' : '중립';
      this.setHero('TERMINAL<span class="hero-slash">//</span>BREACH',
        '거대기업이 모든 빛과 정보를 쥔 시대 — 너는 NULLSEC의 신입이다.',
        [{ t: hasSave ? `진행 <b>${scenIdx + 1}/${total}</b>` : `미션 <b>${total}</b>`, on: hasSave }, { t: `성향 <b>${lean}</b>` }, { t: 'NULLSEC//DECK · v1.0' }],
        ['[ OK ] NULLSEC deck online', '[ OK ] secure channel established', `[ OK ] ${total} missions loaded`, hasSave ? `[ >> ] 이어하기 가능 — ${scenIdx + 1}/${total} 미션` : '[ >> ] 새 작전 대기 중 — 시작하라']);
      this.renderMenuCards(game);
      this.setMission({ id: 'TITLE', tier: 'HOME', title: '메인 메뉴', objective: '↑/↓ 선택 · Enter 진입 · 1 새게임 2 이어하기 3 미션선택 4 그외모드' }, 1, 1);
    }

    // 미션 선택 화면 (지난 미션 다시풀기)
    showMissionSelect(game) {
      this.hideOverlays(); this._exitMissionLock(); this.setMode('terminal'); this.clear();
      const scenIdx = (game && game.scenarioIndex) || 0;
      const levels = window.LEVELS || [];
      this.setHero('MISSION <span class="hero-slash">·</span> SELECT', '클리어한 미션을 다시 풀기 — 복습은 진행도에 영향 없음.',
        [{ t: `클리어 <b>${scenIdx}/${levels.length}</b>`, on: scenIdx > 0 }, { t: '✔ 클리어' }, { t: '▶ 현재' }, { t: '🔒 잠김' }],
        ['[ >> ] ↑/↓·Enter 또는 번호로 선택 · [0] 뒤로']);
      this.renderMenuCards(game);
      this.setMission({ id: 'SELECT', tier: 'REPLAY', title: '미션 선택', objective: '지난 미션을 골라 다시 풀어보라 (↑/↓·Enter 또는 번호)' }, Math.min(scenIdx + 1, levels.length), levels.length);
    }

    // '그 외 모드' 서브메뉴: 학습 / 코드랩 / 워게임 / 뒤로
    showModesMenu(game) {
      this.hideOverlays(); this._exitMissionLock(); this.setMode('terminal'); this.clear();
      const solvedW = (game && game.wargameSolved && game.wargameSolved.size) || 0;
      const solvedC = (game && game.codelabSolved && game.codelabSolved.size) || 0;
      this.setHero('TRAINING', '스토리 외 훈련·도전 모드 — 골라서 진행하라.',
        [{ t: `코드랩 <b>${solvedC}/4</b>`, on: solvedC > 0 }, { t: `워게임 <b>${solvedW}/6</b>`, on: solvedW > 0 }],
        ['[ >> ] ↑/↓·Enter 또는 번호 · [0] 뒤로 · `menu` 메인']);
      this.renderMenuCards(game);
      this.setMission({ id: 'MODES', tier: 'TRAIN', title: '그 외 모드', objective: '1 학습 · 2 코드랩 · 3 워게임 · 0 뒤로' }, 1, 1);
    }

    renderMenuCards(game) {
      const wrap = $('#menu-cards');
      if (!wrap) return;
      const screen = (game && game.menuScreen) || 'main';
      const scenIdx = (game && game.scenarioIndex) || 0;
      const solvedW = (game && game.wargameSolved && game.wargameSolved.size) || 0;
      const solvedC = (game && game.codelabSolved && game.codelabSolved.size) || 0;
      let cards, defaultSel = 0, compact = false;
      if (screen === 'modes') {
        cards = [
          { a: 'academy', emo: '🎓', t: '학습', d: '명령어 튜토리얼' },
          { a: 'codelab', emo: '💻', t: '코드랩', d: solvedC ? `암호 코딩 ${solvedC}/4` : 'JS로 암호 복호화' },
          { a: 'wargame', emo: '🚩', t: '워게임', d: solvedW ? `CTF ${solvedW}/6` : 'CTF 챌린지' },
          { a: 'back', emo: '◀', t: '뒤로', d: '메인 메뉴로' }
        ];
      } else if (screen === 'missions') {
        compact = true;
        const levels = window.LEVELS || [];
        cards = levels.map((lvl, i) => {
          const cleared = i < scenIdx, current = i === scenIdx, locked = i > scenIdx;
          return { a: locked ? 'locked' : 'mission:' + i, emo: cleared ? '✔' : current ? '▶' : '🔒', t: lvl.id, d: lvl.title, dim: locked };
        });
        cards.push({ a: 'back', emo: '◀', t: '뒤로', d: '메인 메뉴' });
        defaultSel = Math.min(scenIdx, levels.length - 1);
      } else {
        cards = [
          { a: 'newgame', emo: '🎬', t: '새 게임', d: '처음부터 (L01)', primary: true },
          { a: 'continue', emo: '⏵', t: '이어하기', d: scenIdx ? `${scenIdx + 1}/${(window.LEVELS || []).length} 미션부터` : '저장 없음', dim: !scenIdx },
          { a: 'missions', emo: '🗂', t: '미션 선택', d: '지난 미션 복습' },
          { a: 'modes', emo: '🧩', t: '그 외 모드', d: '학습·코드랩·워게임' }
        ];
        defaultSel = scenIdx > 0 ? 1 : 0; // 진행 중이면 '이어하기'에 커서
      }
      wrap.innerHTML = cards.map(c => `<button class="menu-card${c.primary ? ' primary' : ''}${c.dim ? ' card-dim' : ''}" data-action="${c.a}"><div class="mc-emo">${c.emo}</div><div class="mc-t">${c.t}</div><div class="mc-d">${c.d}</div></button>`).join('');
      wrap.className = compact ? 'compact' : '';
      wrap.style.display = 'grid';
      // 방향키 네비게이션 상태
      this.menuActions = cards.map(c => c.a);
      this.menuLabels = cards.map(c => c.t);
      this.menuSel = Math.min(defaultSel, cards.length - 1);
      this.highlightMenu();
      wrap.querySelectorAll('.menu-card').forEach((b, i) => {
        b.onclick = () => {
          this.menuSel = i; this.highlightMenu();
          const out = window.game.menuSelect(b.dataset.action);
          if (out) this.typeBlock(out);
        };
      });
    }

    /* ---------- 워게임 보드 ---------- */
    showWargameBoard(game) {
      this.hideOverlays();
      this.setMode('terminal');
      this.clear();
      const solved = game.wargameSolved || new Set();
      let score = 0;
      window.WARGAMES.forEach(w => { if (solved.has(w.id)) score += (w.points || 100); });
      this.println('  🚩 WARGAME ARENA — CTF 챌린지', 'logo');
      this.println('', '');
      window.WARGAMES.forEach((w, i) => {
        const done = solved.has(w.id);
        this.println(`   ${done ? '✔' : '○'} [${i + 1}] ${w.id}  ${w.title.padEnd(16)} [${w.tier} · ${w.cat} · ${w.points}pt]`, done ? 'success' : 'objective');
      });
      this.println('', '');
      this.println(`  점수: ${score}pt  ·  해결: ${solved.size}/${window.WARGAMES.length}`, 'story');
      this.println('  입력: 번호(예: 1) 또는 `play W3`   ·   `menu` 메인 메뉴', 'dim');
      this.setMission({ id: 'WARGAME', tier: 'CTF', title: '워게임 아레나', objective: '챌린지를 선택하라 — 번호 또는 play W#' }, solved.size + (solved.size < window.WARGAMES.length ? 1 : 0) || 1, window.WARGAMES.length);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.term = new Terminal();
    window.term.updatePrompt();
    window.game.start();
    window.term.inputEl.focus();
  });
})();
