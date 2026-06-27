/* ============================================================
 * shell.js — NULLSEC OS 셸 컨트롤러
 * window.term: 게임 엔진이 호출하는 UI 표면 전부 구현(앱/데스크톱으로 라우팅).
 * 부팅 · 런처 · 미션위젯 · 작업표시줄 · 시작메뉴 · 메뉴모달 · 엔딩 · 부트스트랩.
 * ============================================================ */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const T = () => window.TerminalApp;
  const M = () => window.Messenger;

  /* ---------- 사운드 ---------- */
  const SOUND = {
    on: true, ctx: null,
    blip(freq, dur, vol) {
      if (!this.on) return;
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = this.ctx.createOscillator(), gain = this.ctx.createGain();
        o.type = 'square'; o.frequency.value = freq; gain.gain.value = vol || 0.05;
        o.connect(gain); gain.connect(this.ctx.destination); o.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + (dur || 0.05));
        o.stop(this.ctx.currentTime + (dur || 0.05));
      } catch (e) {}
    }
  };

  /* ---------- 부팅 ---------- */
  const Boot = {
    run(done) {
      document.body.setAttribute('data-screen', 'boot');
      const log = $('#boot-log'); if (!log) { done && done(); return; }
      log.textContent = '';
      const lines = [
        'NULLSEC OS — SECURE BOOT v3.7', '',
        '[ OK ] mounting /dev/breach0',
        '[ OK ] initializing crypto module',
        '[ OK ] establishing onion circuit ......',
        '[ OK ] spoofing MAC de:ad:be:ef:00:42',
        '[ OK ] connection anonymized', '',
        '  ████████╗██████╗ ██████╗ ███████╗ █████╗  ██████╗██╗  ██╗',
        '  ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║',
        '     ██║   ██████╔╝██████╔╝█████╗  ███████║██║     ███████║',
        '     ██║   ██╔══██╗██╔══██╗██╔══╝  ██╔══██║██║     ██╔══██║',
        '     ██║   ██████╔╝██║  ██║███████╗██║  ██║╚██████╗██║  ██║',
        '     ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝', '',
        '   NULLSEC OS 준비 완료. 데스크톱을 불러옵니다…', ''
      ];
      let i = 0;
      const tick = () => {
        if (i < lines.length) {
          log.textContent += lines[i] + '\n';
          SOUND.blip(440 + i * 16, 0.02, 0.02);
          i++; setTimeout(tick, i < 8 ? 150 : 60);
        } else {
          log.textContent += '\n   ▶  아무 키나 누르거나 클릭하면 시작합니다  ◀\n';
          let go = false; let timer = null;
          const fire = () => {
            if (go) return; go = true; clearTimeout(timer);
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('click', onClick, true);
            SOUND.blip(660, 0.04); done && done();
          };
          const onKey = (e) => { e.preventDefault(); e.stopPropagation(); fire(); };
          const onClick = () => fire();
          document.addEventListener('keydown', onKey, true);
          document.addEventListener('click', onClick, true);
          timer = setTimeout(fire, 8000);
        }
      };
      tick();
    }
  };

  /* ---------- 데스크톱 (런처/위젯/모달/엔딩/워게임) ---------- */
  const Desktop = {
    _mw: null,

    showLauncher(game) {
      this.hideModals();
      const scenIdx = (game && game.scenarioIndex) || 0;
      const total = (window.LEVELS || []).length;
      const acts = $('#launcher-actions');
      if (acts) {
        const btns = [
          { a: 'newgame', t: '▶ 새 게임', d: '처음부터 (S1.01)' },
          { a: 'continue', t: '⏵ 이어하기', d: scenIdx > 0 ? `${scenIdx + 1}/${total} 미션부터` : '저장 없음', dim: scenIdx <= 0 },
          { a: 'missions', t: '🗂 미션 선택', d: '지난 미션 복습' },
          { a: 'modes', t: '🧩 그 외 모드', d: '학습·코드랩·워게임' }
        ];
        acts.innerHTML = btns.map(b => `<button class="launch-btn${b.dim ? ' dim' : ''}" data-a="${b.a}"><span class="lb-t">${b.t}</span><span class="lb-d">${esc(b.d)}</span></button>`).join('');
        acts.querySelectorAll('.launch-btn').forEach(b => b.addEventListener('click', () => { SOUND.blip(660, 0.03); window.game.menuSelect(b.dataset.a); }));
      }
      const lc = $('#launcher'); if (lc) lc.hidden = false;
    },

    showModes(game) {
      const solvedW = (game && game.wargameSolved && game.wargameSolved.size) || 0;
      const solvedC = (game && game.codelabSolved && game.codelabSolved.size) || 0;
      this.openModal('🧩 그 외 모드', [
        { a: 'academy', t: '🎓 학습 (ACADEMY)', d: '명령어 튜토리얼 + 샌드박스' },
        { a: 'codelab', t: `💻 코드랩 (CODE LAB)`, d: `JS 암호 해독 — ${solvedC}/4` },
        { a: 'wargame', t: `🚩 워게임 (WARGAME)`, d: `CTF 챌린지 — ${solvedW}/6` },
        { a: 'back', t: '◀ 뒤로', d: '세션 런처로' }
      ]);
    },
    showMissionSelect(game) {
      const scenIdx = (game && game.scenarioIndex) || 0;
      const levels = window.LEVELS || [];
      const rows = levels.map((lvl, i) => {
        const cleared = i < scenIdx, current = i === scenIdx, locked = i > scenIdx;
        return { a: locked ? 'locked' : 'mission:' + i, t: `${cleared ? '✔' : current ? '▶' : '🔒'} ${lvl.id}  ${lvl.title}`, d: `${lvl.tier}`, dim: locked };
      });
      rows.push({ a: 'back', t: '◀ 뒤로', d: '세션 런처로' });
      this.openModal(`🗂 미션 선택 — 클리어 ${scenIdx}/${levels.length}`, rows, true);
    },
    openModal(title, items, compact) {
      this.hideModals();
      $('#modal-title').textContent = title;
      const box = $('#modal-body');
      box.className = 'modal-body' + (compact ? ' compact' : '');
      box.innerHTML = items.map(it => `<button class="modal-item${it.dim ? ' dim' : ''}" data-a="${esc(it.a)}"><span class="mi-t">${esc(it.t)}</span><span class="mi-d">${esc(it.d || '')}</span></button>`).join('');
      box.querySelectorAll('.modal-item').forEach(b => b.addEventListener('click', () => {
        SOUND.blip(660, 0.03);
        const a = b.dataset.a;
        if (a.indexOf('mission:') === 0) window.game.selectMission(parseInt(a.slice(8), 10));
        else window.game.menuSelect(a);
      }));
      $('#modal-host').hidden = false;
    },
    hideModals() {
      ['#launcher', '#modal-host', '#ending-screen'].forEach(s => { const e = $(s); if (e) e.hidden = true; });
    },

    showWargame(game) {
      if (window.WM) WM.open('terminal');
      const t = T(); if (!t) return;
      t.clear();
      const solved = (game && game.wargameSolved) || new Set();
      let score = 0;
      t.println('  🚩 WARGAME ARENA — CTF 챌린지', 'logo'); t.println('', '');
      (window.WARGAMES || []).forEach((w, i) => {
        const done = solved.has(w.id); if (done) score += (w.points || 0);
        t.println(`   ${done ? '✔' : '○'} [${i + 1}] ${w.id}  ${w.title}  [${w.tier} · ${w.cat} · ${w.points}pt]`, done ? 'success' : 'objective');
      });
      t.println('', ''); t.println(`  점수: ${score}pt · 해결 ${solved.size}/${(window.WARGAMES || []).length}`, 'story');
      t.println('  입력: 번호(예: 1) 또는 `play W3` · `menu` 메인', 'dim');
    },

    setMission(lvl, n, total) { this._mw = { lvl, n, total }; this.renderWidget(); },
    renderWidget() {
      const g = window.game;
      // 시나리오 중엔 현재 레벨로 최신화
      if (g && g.appMode === 'scenario') {
        const set = g.activeSet || window.LEVELS; const lvl = set && set[g.levelIndex];
        if (lvl) this._mw = { lvl, n: (g.levelIndex || 0) + 1, total: (window.LEVELS || []).length };
      }
      const mw = this._mw; if (!mw || !mw.lvl) return;
      const lvl = mw.lvl;
      const setTxt = (id, v) => { const e = $(id); if (e) e.textContent = v; };
      setTxt('#mw-id', lvl.id || '--');
      setTxt('#mw-title', lvl.title || '');
      setTxt('#mw-obj', lvl.objective || '');
      setTxt('#mw-prog-text', `${mw.n || 0} / ${mw.total || 0}`);
      const fill = $('#mw-fill'); if (fill && mw.total) fill.style.width = Math.round((mw.n / mw.total) * 100) + '%';
      const st = (g && g.stance) || { creed: 0, ghost: 0 };
      setTxt('#mw-stance', st.creed > st.ghost ? `신념 ${st.creed}` : st.ghost > st.creed ? `효율 ${st.ghost}` : '중립');
    },

    showEnding() {
      this.hideModals();
      const st = (window.game && window.game.stance) || { creed: 0, ghost: 0 };
      let head, dlg;
      if (st.ghost > st.creed) {
        head = ['▓▓▓  G H O S T   P R O T O C O L  ▓▓▓', '흔적도 이름도 없이 — 넌 기계 속 유령이 됐다.'];
        dlg = ['WRAITH> 깨끗하군. 0xMOTHER의 명단은 재가 됐고, 행방도 묘연해.', 'WRAITH> 넌 이제 양심의 무게도 없는 유령이야. …환영한다.'];
      } else if (st.creed > st.ghost) {
        head = ['★★★  T H E   L O Y A L   B L A D E  ★★★', '정도를 지켰다 — 불이 꺼지며, 진실이 송출된다.'];
        dlg = ['0xMOTHER> 넌 날 믿었지. 난 잡혀가겠지만, 진실은 남아.', '0xMOTHER> 전 세계가 HELIOS의 범죄를 본다. 우리가 해냈어.'];
      } else {
        head = ['◈◈◈  T H E   T H I R D   P A T H  ◈◈◈', '어느 쪽도 따르지 않은 — 너 자신의 길.'];
        dlg = ['0xMOTHER> …네가 우릴 능가했군. 도시는 끄지 않고, 증거만 흘렸어.', 'WRAITH> 흥미롭네. 다음엔 내 편이 되어줘.'];
      }
      const art = [
        '═══════════════════════════════════════════', ...head,
        '═══════════════════════════════════════════',
        `성향: 신념 ${st.creed} · 효율 ${st.ghost}`, '', ...dlg, '',
        '당신이 익힌 것:',
        '  · 정찰·OSINT (dig, nmap, curl, grep)',
        '  · 웹 취약점 (SQLi, LFI, 업로드·웹쉘)',
        '  · 권한상승·포렌식 (find -perm, strings, john, steghide)',
        '  · 무선·피벗·안티포렌식 (aircrack-ng, ssh -L, sed, touch -t)', '',
        '— 진짜 시스템은 허락 없이 건드리지 마세요. 윤리는 해커의 무기다. —'
      ];
      const body = $('#ending-body'); if (body) body.textContent = '';
      $('#ending-screen').hidden = false;
      art.forEach((l, i) => setTimeout(() => { if (body) body.textContent += l + '\n'; SOUND.blip(523 + i * 10, 0.03, 0.03); }, i * 80));
    }
  };

  /* ---------- term: 엔진 UI 표면 ---------- */
  const term = {
    animate: true,
    // 터미널 패스스루
    println(t, c) { const a = T(); if (a) a.println(t, c); },
    printBlock(t, c) { const a = T(); if (a) a.printBlock(t, c); },
    typeln(t, c) { const a = T(); if (a) a.println(t, c); },
    typeBlock(t, c) { const a = T(); if (a) a.printBlock(t, c); },
    clear() { const a = T(); if (a) a.clear(); },
    flashClear() { const a = T(); if (a) a.flashClear(); },
    promptString() { const a = T(); return a ? a.promptString() : '$'; },
    updatePrompt() { const a = T(); if (a) a.updatePrompt(); },
    skipTyping() { const m = M(); if (m) m._flush(); },
    _blip(f, d, v) { SOUND.blip(f, d, v); },

    // 메신저
    renderStory(lvl, tag, onDone) {
      if (window.WM) { WM.openBg('terminal'); WM.open('messenger'); }
      const m = M(); if (m) { m.clearNotify(); m.renderStory(lvl, tag, onDone); } else if (onDone) onDone();
    },
    appendStory(b, s) { const m = M(); if (m) m.appendStory(b, s); },
    msgrChat(p, r) { const m = M(); if (!m) return false; if (window.WM) WM.open('messenger'); return m.msgrChat(p, r); },
    lockTerminal() { const a = T(); if (a) { a.clear(); a.println('📨 0xMOTHER 접선 중 — 메신저(📨)를 확인하라.', 'dim'); } },
    unlockTerminal() { const a = T(); if (a) a.println('[ 준비 완료 ] 터미널·브라우저로 작전을 수행하라.', 'success'); },

    // 데스크톱/미션
    setMission(lvl, n, total) { Desktop.setMission(lvl, n, total); },
    setMode(mode) {
      document.body.setAttribute('data-mode', mode || 'terminal');
      const g = window.game;
      if (g && g.appMode && g.appMode !== 'menu' && window.WM) {
        if (g.appMode === 'scenario') WM.openBg('terminal');
        else WM.open('terminal');
      }
      this.afterExec();
    },
    renderPanels() { this.afterExec(); },
    afterExec() {
      // GUI 툴(브라우저 로그인/업로드 등)은 exec(.., isSub=true) 로 출력만 받으므로 checkLevel 이 안 돈다 → 여기서 보강.
      // (cleared 가드로 터미널 명령의 중복 검사도 안전)
      if (window.game && window.game.checkLevel) window.game.checkLevel();
      Desktop.renderWidget(); const a = T(); if (a) a.updatePrompt();
      if (window.Browser) Browser.refresh(); if (window.Messenger) Messenger.renderContacts();
    },
    hideOverlays() { Desktop.hideModals(); const cl = $('#codelab'); if (cl) cl.style.display = 'none'; document.body.removeAttribute('data-overlay'); },
    showCodelab() { const cl = $('#codelab'); if (cl) cl.style.display = 'flex'; document.body.setAttribute('data-overlay', 'codelab'); },
    bootSequence(done) { Boot.run(done); },
    showMenu(game) { Desktop.showLauncher(game); },
    showModesMenu(game) { Desktop.showModes(game); },
    showMissionSelect(game) { Desktop.showMissionSelect(game); },
    showWargameBoard(game) { Desktop.showWargame(game); },
    showEnding() { Desktop.showEnding(); },
    closeModal() { Desktop.hideModals(); if (window.game) window.game.showMenu(); }
  };

  /* ---------- 데스크톱 배선 ---------- */
  function wireDesktop() {
    document.querySelectorAll('.desk-icon').forEach(b => b.addEventListener('click', () => { if (window.WM) WM.open(b.dataset.app); }));

    const startBtn = $('#start-btn'), startMenu = $('#start-menu');
    if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); startMenu.hidden = !startMenu.hidden; });
    document.addEventListener('click', (e) => { if (startMenu && !startMenu.hidden && !e.target.closest('#start-menu') && !e.target.closest('#start-btn')) startMenu.hidden = true; });
    document.querySelectorAll('#start-menu .sm-item').forEach(b => b.addEventListener('click', () => {
      startMenu.hidden = true;
      const g = window.game; if (!g) return;
      switch (b.dataset.act) {
        case 'launcher': g.showMenu(); break;
        case 'missions': g.showMissionSelect(); break;
        case 'modes': g.showModesMenu(); break;
        case 'intel': if (window.WM) WM.open('terminal'); { const o = g.exec('intel'); if (o) term.printBlock(o); } break;
        case 'theme': { const ts = ['cyan', 'green', 'amber']; const cur = g.theme || 'cyan'; g.setTheme(ts[(ts.indexOf(cur) + 1) % ts.length]); } break;
        case 'restart': { const o = g.exec('restart'); if (o) term.printBlock(o); } break;
      }
    }));

    const snd = $('#sound-toggle');
    if (snd) snd.addEventListener('click', () => { SOUND.on = !SOUND.on; snd.textContent = SOUND.on ? '♪' : '♪̶'; snd.classList.toggle('off', !SOUND.on); });

    // 미션 위젯 제출
    const mwIn = $('#mw-input'), mwSend = $('#mw-send');
    const submit = () => { const v = (mwIn.value || '').trim(); if (!v) return; mwIn.value = ''; if (window.WM) WM.openBg('terminal'); const o = window.game.exec('submit ' + v); if (o) term.printBlock(o); term.afterExec(); };
    if (mwSend) mwSend.addEventListener('click', submit);
    if (mwIn) mwIn.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  function startClock() {
    const c = $('#clock'); if (!c) return;
    const upd = () => { const d = new Date(); c.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    upd(); setInterval(upd, 15000);
  }

  function init() {
    if (window.WM) { WM.ensure('terminal'); WM.ensure('messenger'); WM.ensure('browser'); }
    wireDesktop();
    startClock();
    window.term = term;
    if (T()) T().updatePrompt();
    if (window.game && window.game.start) window.game.start();
  }
  if (document.readyState !== 'loading') init();
  else window.addEventListener('DOMContentLoaded', init);
})();
