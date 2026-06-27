/* ============================================================
 * game.js — 게임 엔진: 모드 라우팅/진행/저장/명령 실행/원격접속
 *  appMode: menu | academy | scenario | codelab | wargame
 * ============================================================ */
(function () {
  const { FileSystem, dir, file } = window.FS;
  const SAVE_KEY = 'terminal_breach_save_v1';

  class Game {
    constructor() { this.reset(); }

    reset() {
      this.cwd = '/home/guest';
      this.user = 'guest';
      this.host = 'nullsec-node';
      this.history = [];
      this.connStack = [];
      this.theme = 'cyan';
      this.appMode = 'menu';
      this.activeSet = null;        // 현재 레벨 셋 (시나리오=LEVELS, 워게임=WARGAMES)
      this.challengeLoaded = false; // 워게임에서 챌린지 진입 여부
      this.knownContacts = new Set(['mother']); // 대화 가능한 접선 상대
      this.chatWith = 'mother';                 // 현재 채널
      this.menuScreen = 'main';                 // 메뉴 화면: main(타이틀) | modes(그 외 모드) | missions(미션 선택)
      this.replay = false;                      // 지난 미션 복습 중인지 (true면 진행도 미변경)
      this.stance = { creed: 0, ghost: 0 };     // 성향: 0xMOTHER(신념) ↔ WRAITH(효율). 엔딩 분기.
    }

    /* ---------- 저장/복원 ---------- */
    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          levelIndex: this.scenarioIndex || 0, theme: this.theme,
          wargame: [...(this.wargameSolved || [])], codelab: [...(this.codelabSolved || [])]
        }));
      } catch (e) {}
    }
    load() {
      try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; }
      catch (e) { return null; }
    }

    _slots() { try { return JSON.parse(localStorage.getItem('terminal_breach_slots') || '{}'); } catch (e) { return {}; } }
    _writeSlots(s) { try { localStorage.setItem('terminal_breach_slots', JSON.stringify(s)); } catch (e) {} }
    saveSlot(name) {
      const set = this.activeSet || window.LEVELS;
      const lvl = set[this.levelIndex];
      const slots = this._slots();
      slots[name] = { levelIndex: this.levelIndex, levelId: lvl ? lvl.id : '?', mode: this.appMode, theme: this.theme, at: new Date().toLocaleString() };
      this._writeSlots(slots);
      return `[*] 저장됨 → 슬롯 '${name}' (${slots[name].levelId} · ${slots[name].at})`;
    }
    loadSlot(name) {
      const s = this._slots()[name];
      if (!s) return `load: 슬롯 '${name}' 없음. \`saves\`로 목록 확인.`;
      if (s.theme) this.setTheme(s.theme);
      window.term.println(`[*] 슬롯 '${name}' 불러오는 중...`, 'objective');
      this.enterScenario(s.levelIndex || 0);
      return '';
    }
    listSaves() {
      const slots = this._slots(); const keys = Object.keys(slots);
      if (!keys.length) return '저장된 슬롯이 없다. `save <이름>` 으로 저장하라.';
      let out = '저장 슬롯:';
      for (const k of keys) out += `\n  ${k.padEnd(12)} ${slots[k].levelId || '?'}  ${slots[k].at || ''}`;
      return out;
    }

    /* ---------- 시작 / 메뉴 ---------- */
    start() {
      const saved = this.load();
      if (saved && saved.theme) this.setTheme(saved.theme);
      this.scenarioIndex = saved && Number.isInteger(saved.levelIndex) ? saved.levelIndex : 0;
      this.wargameSolved = new Set(saved && saved.wargame || []);
      this.codelabSolved = new Set(saved && saved.codelab || []);
      window.term.bootSequence(() => this.showMenu());
    }

    // 메인 타이틀 화면 (새 게임 / 이어하기 / 미션 선택 / 그 외 모드)
    showMenu() {
      this.appMode = 'menu';
      this.menuScreen = 'main';
      this.challengeLoaded = false;
      this.activeSet = null;
      this.replay = false;
      document.body.setAttribute('data-screen', 'menu');
      window.term.setMode('terminal');
      window.term.showMenu(this);
    }

    // '그 외 모드' 서브메뉴 화면 (학습 / 코드랩 / 워게임)
    showModesMenu() {
      this.appMode = 'menu';
      this.menuScreen = 'modes';
      this.challengeLoaded = false;
      this.activeSet = null;
      this.replay = false;
      document.body.setAttribute('data-screen', 'menu');
      window.term.setMode('terminal');
      window.term.showModesMenu(this);
    }

    // 미션 선택 화면 (지난 미션 다시풀기)
    showMissionSelect() {
      this.appMode = 'menu';
      this.menuScreen = 'missions';
      this.challengeLoaded = false;
      this.activeSet = null;
      this.replay = false;
      document.body.setAttribute('data-screen', 'menu');
      window.term.setMode('terminal');
      window.term.showMissionSelect(this);
    }

    /* ---------- 메뉴 입력 라우팅 (타이틀/서브메뉴/미션선택) ---------- */
    menuInput(key) {
      if (this.menuScreen === 'modes') return this.modesMenuInput(key);
      if (this.menuScreen === 'missions') return this.missionsMenuInput(key);
      return this.mainMenuInput(key);
    }
    mainMenuInput(key) {
      if (key === '' || key === '1' || key === 'new' || key === 'newgame' || key === 'n' || key === '새게임') return this.menuSelect('newgame');
      if (key === '2' || key === 'continue' || key === 'cont' || key === 'c' || key === 'load' || key === '이어하기' || key === '계속') return this.menuSelect('continue');
      if (key === '3' || key === 'missions' || key === 'select' || key === '미션' || key === '복습' || key === '미션선택') return this.menuSelect('missions');
      if (key === '4' || key === 'modes' || key === 'more' || key === 'm' || key === '더보기' || key === '그외' || key === '훈련소') return this.menuSelect('modes');
      return '입력: 1 새 게임 · 2 이어하기 · 3 미션 선택 · 4 그 외 모드';
    }
    modesMenuInput(key) {
      if (key === '1' || key === 'academy' || key === '학습') return this.menuSelect('academy');
      if (key === '2' || key === 'codelab' || key === '코드랩') return this.menuSelect('codelab');
      if (key === '3' || key === 'wargame' || key === '워게임') return this.menuSelect('wargame');
      if (key === '0' || key === 'back' || key === 'b' || key === '뒤로' || key === 'menu') return this.menuSelect('back');
      return '입력: 1 학습 · 2 코드랩 · 3 워게임 · 0 뒤로';
    }
    missionsMenuInput(key) {
      if (key === '0' || key === 'back' || key === 'b' || key === '뒤로' || key === 'menu') return this.menuSelect('back');
      const n = parseInt(key, 10);
      if (!isNaN(n) && n >= 1 && n <= window.LEVELS.length) return this.selectMission(n - 1);
      return '미션 번호(1~' + window.LEVELS.length + ') 또는 0 뒤로';
    }
    // 카드 클릭/키보드 공통 액션 디스패처
    menuSelect(action) {
      switch (action) {
        case 'newgame': return this.newGame();
        case 'continue': return this.continueGame();
        case 'missions': this.showMissionSelect(); return '';
        case 'modes': this.showModesMenu(); return '';
        case 'academy': return this.enterAcademy();
        case 'codelab': return this.enterCodelab();
        case 'wargame': return this.enterWargame();
        case 'back': this.showMenu(); return '';
        case 'locked': return '🔒 아직 잠긴 미션이다. 순서대로 클리어하면 열린다.';
      }
      if (action && action.indexOf('mission:') === 0) return this.selectMission(parseInt(action.slice(8), 10));
      return '';
    }
    // 미션 선택 → 진입 (과거 미션은 복습 모드)
    selectMission(index) {
      const set = window.LEVELS;
      if (!Number.isInteger(index) || index < 0 || index >= set.length) return '';
      if (index > (this.scenarioIndex || 0)) return '🔒 아직 잠긴 미션이다. 순서대로 클리어하면 열린다.';
      this.replay = index < (this.scenarioIndex || 0);
      this.appMode = 'scenario';
      this.activeSet = set;
      this.challengeLoaded = false;
      window.term.hideOverlays();
      window.term.clear();
      this.loadLevel(index);
      return '';
    }
    // 타이틀에서 빈 Enter 의 기본 동작: 진행 기록 있으면 이어하기, 없으면 새 게임
    menuDefault() {
      if (this.menuScreen === 'modes' || this.menuScreen === 'missions') { this.showMenu(); return; }
      if (this.scenarioIndex && this.scenarioIndex > 0) this.continueGame(); else this.newGame();
    }
    newGame() { this.replay = false; this.scenarioIndex = 0; this.save(); return this.enterScenario(0); }
    continueGame() { this.replay = false; return this.enterScenario(this.scenarioIndex || 0); }

    enterAcademy() { this.appMode = 'academy'; this.activeSet = null; document.body.setAttribute('data-screen', 'play'); window.Academy.enter(this); return ''; }
    enterCodelab() { this.appMode = 'codelab'; this.activeSet = null; window.CodeLab.enter(this); return ''; }

    enterScenario(index) {
      this.appMode = 'scenario';
      this.activeSet = window.LEVELS;
      this.challengeLoaded = false;
      this.replay = false;
      window.term.hideOverlays();
      const idx = Number.isInteger(index) ? index : (this.scenarioIndex || 0);
      window.term.clear();
      this.loadLevel(idx);
      return '';
    }

    enterWargame() {
      this.appMode = 'wargame';
      this.activeSet = window.WARGAMES;
      this.challengeLoaded = false;
      document.body.setAttribute('data-screen', 'menu');
      window.term.hideOverlays();
      window.term.setMode('terminal');
      window.term.showWargameBoard(this);
      return '';
    }

    /* ---------- 레벨/챌린지 로딩 (공통) ---------- */
    _resetRun() {
      this.cleared = false;
      this.readFiles = new Set(); this.submitted = new Set(); this.scanned = new Set();
      this.pinged = new Set(); this.cracked = new Set();
      this.connStack = []; this.network = []; this.passwords = {}; this.crackable = {};
      this.sudoAllowed = false; this.sshOk = false; this.pivotReached = false; this.onSshSuccess = null;
      this.env = {}; this.processes = null; this.hydraFound = {}; this.dumps = {}; this.web = {};
      this.exfiltrated = new Set(); this.dumped = new Set(); this.killed = new Set();
      this.wifi = []; this.monitorMode = false; this.monIface = null; this.wifiScanned = false;
      this.handshake = null; this.wifiCracked = new Set();
      // NEW_MISSIONS 시나리오용 상태
      this.ranScripts = new Set(); this.dns = null; this.suidFiles = []; this.dockerTrap = false;
      this.dnsZoneXfer = false; this.sqliAuth = false; this.sqlDumped = false; this.sniffed = false;
      this.uploaded = false; this.ncListening = false; this.suidSearched = false; this.unwrapped = 0;
      this.stegoExtracted = false; this.mounted = false; this.dockerEscaped = false; this.tunnelOpen = false;
      this.logScrubbed = null; this.timestomped = null; this.poweredOff = false; this.lfiRead = null;
      this.uploadEndpoint = null; this.webshellUrl = null; this.reverseTarget = null;
      this.user = 'guest'; this.host = 'nullsec-node'; this.cwd = '/home/guest';
      this.fs = new FileSystem(dir('/'));
    }

    _printBrief(lvl, tag) {
      const t = window.term;
      const mode = lvl.mode || ({ '기초': 'terminal', '중급': 'recon', '고급': 'os', '실전': 'os' }[lvl.tier] || 'terminal');
      document.body.setAttribute('data-screen', 'play');
      t.setMode(mode);
      // 접선 상대 등록은 게임 로직(렌더와 무관하게 보장)
      if (lvl.incoming && window.Comms) window.Comms.register(this, lvl.incoming.from);
      this.updateMission(lvl);
      // 미션 전환: 터미널 초기화 + 잠금 → 보안 채널로 브리핑 순차 전송 → 다 뜨면 터미널 활성화
      if (t.lockTerminal) t.lockTerminal();
      t.renderStory(lvl, tag, () => { if (t.unlockTerminal) t.unlockTerminal(); });
    }

    loadLevel(index) {
      const set = this.activeSet || window.LEVELS;
      if (index >= set.length) { this.showEnding(); return; }
      this.levelIndex = index;
      // 복습(replay)일 때는 실제 진행도(scenarioIndex)를 건드리지 않는다
      if (!this.replay) { this.scenarioIndex = index; }
      this._resetRun();
      set[index].setup(this);
      if (!this.replay) this.save();
      this._printBrief(set[index], this.replay ? 'REPLAY' : 'MISSION');
    }

    // 워게임: 특정 챌린지 진입
    loadChallenge(index) {
      const set = this.activeSet || window.WARGAMES;
      if (index < 0 || index >= set.length) return;
      this.levelIndex = index;
      this.challengeLoaded = true;
      this._resetRun();
      set[index].setup(this);
      window.term.clear();
      this._printBrief(set[index], 'CTF');
    }

    updateMission(lvl) {
      const set = this.activeSet || window.LEVELS;
      lvl = lvl || set[this.levelIndex];
      window.term.setMission(lvl, this.levelIndex + 1, set.length);
    }

    advance() {
      if (this.appMode === 'wargame') { this.enterWargame(); return; }
      this.loadLevel(this.levelIndex + 1);
    }

    // 단계 포기: 공략(힌트 전체)을 보여주고 넘어간다
    giveUp() {
      const inScenario = this.appMode === 'scenario';
      const inWargame = this.appMode === 'wargame' && this.challengeLoaded;
      if (!inScenario && !inWargame) return '지금은 포기할 단계가 없다. (시나리오/워게임 진행 중에만 가능)';
      if (this.cleared) return '';
      const lvl = (this.activeSet || window.LEVELS)[this.levelIndex];
      const t = window.term;
      this.cleared = true; // 이후 자동판정 중복 방지
      t.println('');
      t.println('  ✗ ─────────── 단계 포기 (GIVE UP) ─────────── ✗', 'danger');
      t.println(`  ${lvl.id} · ${lvl.title} 의 공략을 공개한다:`, 'objective');
      (lvl.hints || []).forEach((h, i) => t.typeln(`   ${i + 1}. ${h}`, 'story'));
      t.println('');
      if (inWargame) {
        t.println('  → 점수 없이 보드로 돌아갑니다. 다음에 다시 도전하라.', 'dim');
        setTimeout(() => { this.challengeLoaded = false; this.enterWargame(); }, 2000);
      } else if (this.replay) {
        t.println('  → 미션 선택으로 돌아갑니다.', 'dim');
        setTimeout(() => { this.replay = false; this.showMissionSelect(); }, 2000);
      } else {
        t.println('  → 다음 미션으로 넘어갑니다.', 'dim');
        setTimeout(() => this.loadLevel(this.levelIndex + 1), 2000);
      }
      return '';
    }

    /* ---------- 원격 접속(피벗) ---------- */
    connect(target, user) {
      this.connStack.push({ fs: this.fs, cwd: this.cwd, user: this.user, host: this.host, crackable: this.crackable, passwords: this.passwords, readFiles: this.readFiles });
      let rfs;
      if (target.buildFs) rfs = target.buildFs();
      else {
        const homeChildren = target.fs || {};
        rfs = new FileSystem(dir('/', 'rwxr-xr-x', 'root', {
          home: dir('home', 'rwxr-xr-x', 'root', { [user]: dir(user, 'rwxr-xr-x', user, homeChildren) }),
          etc: dir('etc', 'rwxr-xr-x', 'root', {}), root: dir('root', 'rwx------', 'root', {})
        }));
      }
      this.fs = rfs; this.cwd = '/home/' + user; this.user = user; this.host = target.name;
      this.crackable = target.crackable || {}; this.passwords = target.passwords || {};
      window.term.updatePrompt();
    }
    disconnect() {
      const prev = this.connStack.pop();
      if (!prev) return 'logout';
      this.fs = prev.fs; this.cwd = prev.cwd; this.user = prev.user; this.host = prev.host;
      this.crackable = prev.crackable; this.passwords = prev.passwords;
      window.term.updatePrompt();
      return `[*] ${this.host} 로 복귀.`;
    }

    /* ---------- 명령 실행 ---------- */
    exec(raw, isSub, stdin) {
      raw = (raw || '').trim();
      if (!raw) return '';
      if (!isSub) this.history.push(raw);
      const lower = raw.toLowerCase();

      // 전역: 메뉴 복귀
      if (lower === 'menu') { this.showMenu(); return ''; }

      // 모드별 라우팅
      if (!isSub) {
        if (this.appMode === 'menu') return this.menuInput(lower.split(/\s+/)[0]);
        if (this.appMode === 'wargame' && !this.challengeLoaded) return window.Modes.wargameBoardInput(raw, this);
        if (this.appMode === 'academy') {
          const r = window.Academy.handle(raw, this);
          if (r !== null && r !== undefined) return r;   // null이면 아래로 떨어져 샌드박스에서 실행
        }
      }

      const pipeParts = this.splitTopLevel(raw, '|');
      if (pipeParts.length > 1) {
        let pipe = stdin || '';
        for (const part of pipeParts) pipe = this.exec(part.trim(), true, pipe);
        if (!isSub) this.checkLevel();
        return pipe == null ? '' : String(pipe);
      }

      // 게임 메타 명령 (시나리오/워게임/아카데미 공통)
      if (lower === 'objective') { const l = (this.activeSet || window.LEVELS)[this.levelIndex]; return l ? '▶ 목표: ' + l.objective : '진행 중인 미션이 없다.'; }
      if (lower === 'intel' || lower === 'story' || lower === 'dossier' || lower === '정보' || lower === '브리핑') return this.cmdIntel();
      if (lower === 'hint') return this.nextHint();
      if (lower === 'levels' || lower === 'board') return this.appMode === 'wargame' ? (window.term.showWargameBoard(this), '') : this.levelList();
      if (lower === 'giveup' || lower === 'surrender' || lower === '포기' || (lower === 'skip' && !window.DEBUG)) return this.giveUp();
      if (lower === 'skip' && window.DEBUG) { this.markCleared(); return '[debug] skipped'; }
      if (lower === 'restart' && this.appMode === 'scenario') { this.scenarioIndex = 0; this.save(); this.loadLevel(0); return '[*] 시나리오 진행을 초기화했습니다.'; }
      if (lower.startsWith('theme')) return this.cmdTheme(raw.split(/\s+/)[1]);
      if (lower.startsWith('anim')) {
        const v = raw.split(/\s+/)[1];
        if (v === 'off') { window.term.animate = false; return '[*] 타자기 효과 OFF'; }
        if (v === 'on') { window.term.animate = true; return '[*] 타자기 효과 ON'; }
        return 'usage: anim <on|off>  (현재: ' + (window.term.animate ? 'on' : 'off') + ')';
      }

      let tokens = this.tokenize(raw);
      let redirect = null;
      const ri = tokens.findIndex(t => t === '>' || t === '>>');
      if (ri !== -1) {
        const target = tokens[ri + 1];
        if (!target) return 'syntax error near `>` (대상 파일 필요)';
        redirect = { append: tokens[ri] === '>>', path: target };
        tokens = tokens.slice(0, ri);
      }
      const name = tokens[0];
      const args = this.expandGlobs(tokens.slice(1));
      const cmd = window.COMMANDS[name];
      let out;
      if (!cmd) {
        // ./script 실행 시뮬 (경로 형태면 파일 실행 시도)
        const sn = /[/]/.test(name) ? this.fs.getNode(this.fs.resolve(name, this.cwd)) : null;
        if (sn && sn.type === 'file') {
          if (!this.fs.canExec(sn, this.user)) out = `${name}: Permission denied`;
          else { this.ranScripts = this.ranScripts || new Set(); this.ranScripts.add(this.fs.basename(name)); out = sn.content; }
        } else out = `${name}: command not found  (\`help\` 로 명령 목록 확인)`;
      }
      else { try { out = cmd.run({ args, game: this, raw, stdin: stdin || '' }); } catch (e) { out = `${name}: 실행 오류: ${e.message}`; } }

      if (redirect) {
        const abs = this.fs.resolve(redirect.path, this.cwd);
        const content = (out == null ? '' : String(out)) + '\n';
        const res = this.fs.writePath(abs, content, { append: redirect.append, user: this.user });
        out = res.err ? `${name}: ${redirect.path}: ${res.err}` : '';
      }

      if (!isSub) this.checkLevel();
      return out == null ? '' : out;
    }

    tokenize(s) {
      const out = [];
      let cur = '', quote = null, esc = false;
      for (const ch of String(s)) {
        if (esc) { cur += ch; esc = false; continue; }
        if (ch === '\\' && quote !== "'") { esc = true; continue; }
        if (quote) {
          if (ch === quote) quote = null;
          else cur += ch;
          continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (/\s/.test(ch)) {
          if (cur !== '') { out.push(cur); cur = ''; }
          continue;
        }
        cur += ch;
      }
      if (cur !== '') out.push(cur);
      return out;
    }

    splitTopLevel(s, sep) {
      const parts = [];
      let cur = '', quote = null, esc = false;
      for (const ch of String(s)) {
        if (esc) { cur += ch; esc = false; continue; }
        if (ch === '\\' && quote !== "'") { cur += ch; esc = true; continue; }
        if (quote) {
          if (ch === quote) quote = null;
          cur += ch;
          continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
        if (ch === sep) { parts.push(cur); cur = ''; continue; }
        cur += ch;
      }
      parts.push(cur);
      return parts.filter(p => p.trim() !== '');
    }

    expandGlobs(args) {
      const expanded = [];
      for (const a of args) {
        if (!/[*?[]/.test(a) || /^[a-z]+:\/\//i.test(a)) { expanded.push(a); continue; }
        const matches = this.glob(a);
        expanded.push.apply(expanded, matches.length ? matches : [a]);
      }
      return expanded;
    }

    glob(pattern) {
      const fs = this.fs;
      if (!fs) return [];
      let p = pattern;
      if (p === '~' || p.startsWith('~/') || /^~[^/]+/.test(p)) p = fs.resolve(p, this.cwd);
      const parts = (p.startsWith('/') ? p : this.cwd + '/' + p).split('/');
      const norm = [];
      for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') norm.pop();
        else norm.push(part);
      }
      const globRe = (s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
      const walk = (node, idx, abs) => {
        if (!node) return [];
        if (idx >= norm.length) return [abs || '/'];
        const seg = norm[idx];
        if (node.type !== 'dir') return [];
        if (!/[*?[]/.test(seg)) {
          const child = node.children[seg];
          return walk(child, idx + 1, (abs === '/' ? '' : abs) + '/' + seg);
        }
        const re = new RegExp('^' + globRe(seg) + '$');
        let out = [];
        for (const name of Object.keys(node.children).sort()) {
          if (!seg.startsWith('.') && name.startsWith('.')) continue;
          if (re.test(name)) out = out.concat(walk(node.children[name], idx + 1, (abs === '/' ? '' : abs) + '/' + name));
        }
        return out;
      };
      return walk(fs.root, 0, '/');
    }

    checkLevel() {
      if (this.cleared) return;
      if (this.appMode !== 'scenario' && !(this.appMode === 'wargame' && this.challengeLoaded)) return;
      const lvl = (this.activeSet || window.LEVELS)[this.levelIndex];
      if (!lvl) return;
      let ok = false;
      try { ok = lvl.check(this); } catch (e) { ok = false; }
      if (ok) this.markCleared();
    }

    markCleared() {
      this.cleared = true;
      const set = this.activeSet || window.LEVELS;
      const lvl = set[this.levelIndex];
      const t = window.term;
      const isWar = this.appMode === 'wargame';
      const isReplay = this.replay && !isWar;
      // 분기 미션: 클리어 시 성향(STANCE)을 1회 가산
      if (!isWar && !isReplay && lvl && typeof lvl.stance === 'function') {
        try { const s = lvl.stance(this); if (s && this.stance && this.stance[s] != null) this.stance[s]++; } catch (e) {}
      }
      if (isWar) {
        this.wargameSolved = this.wargameSolved || new Set();
        this.wargameSolved.add(lvl.id);
        this.save();
      }
      setTimeout(() => {
        const banner = isWar ? `★ ─── FLAG CAPTURED  (+${lvl.points || 100}pts) ─── ★`
          : isReplay ? '✔ ─── 복습 완료 (REPLAY CLEAR) ─── ✔'
          : '✔ ─── MISSION COMPLETE ─── ✔';
        t.appendStory(banner, lvl.success);                    // 완료/디브리핑 → 위쪽 스토리 창
        t.println('  ' + banner, 'success');                   // 터미널에도 짧게 표시
        if (lvl.success) String(lvl.success).split('\n').forEach(l => t.typeln ? t.typeln('  ' + l, 'story') : t.println('  ' + l, 'story'));
        t.println('');
        t.println('  ▶ 아무 키나 누르면 계속합니다', 'objective');
        t.flashClear();
        this.waitForContinue(() => {
          this.challengeLoaded = false;
          if (isReplay) { this.replay = false; this.showMissionSelect(); }
          else this.advance();
        });
      }, 250);
    }

    waitForContinue(done) {
      if (typeof document === 'undefined' || !document.addEventListener) { done(); return; }
      let finished = false;
      const input = document.getElementById && document.getElementById('cmd-input');
      const go = (e) => {
        if (finished) return;
        finished = true;
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('click', onClick, true);
        if (input) input.removeEventListener('keydown', onKey, true);
        done();
      };
      const onKey = (e) => go(e);
      const onClick = (e) => go(e);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('click', onClick, true);
      if (input) input.addEventListener('keydown', onKey, true);
    }

    /* ---------- 힌트/목록/테마 ---------- */
    nextHint() {
      const lvl = (this.activeSet || window.LEVELS)[this.levelIndex];
      if (!lvl || !lvl.hints) return '지금은 힌트가 없다.';
      this._hintIdx = this._hintIdx || {};
      let i = this._hintIdx[lvl.id] || 0;
      if (i >= lvl.hints.length) return '더 이상 힌트가 없다. 직접 해봐라.';
      this._hintIdx[lvl.id] = i + 1;
      return `💡 힌트 ${i + 1}/${lvl.hints.length}: ${lvl.hints[i]}`;
    }

    // 정보 브리핑(INTEL): 현재 목표 + 전체 작전 그림으로 몰입/길잡이
    cmdIntel() {
      const L = window.LEVELS, total = L.length;
      const inScenario = this.appMode === 'scenario' && Number.isInteger(this.levelIndex) && L[this.levelIndex];
      if (!inScenario && this.appMode !== 'scenario') {
        // 시나리오 밖에서는 요약만
        const prog = this.scenarioIndex || 0;
        return [
          '╔══════════ INTEL DOSSIER ══════════╗',
          '  작전: NULLSEC vs HELIOS — 도시를 쥔 사슬을 끊는다.',
          `  스토리 진행: ${prog}/${total} 미션 클리어`,
          '  → 메뉴에서 [이어하기]로 작전을 계속하라.',
          '╚════════════════════════════════════╝'
        ].join('\n');
      }
      const cur = this.levelIndex;
      const lvl = L[cur];
      const progress = this.scenarioIndex || 0;
      const act = lvl.tier === '실전' ? 'ACT II · 그림자 전쟁' : 'ACT I · 코어를 향하여';
      const coreDown = progress > 12 || cur > 12;
      const rank = coreDown ? '요원' : '신입';
      let threat, tbar;
      if (cur < 9) { threat = 'DORMANT'; tbar = '░░░░░'; }
      else if (cur < 13) { threat = 'RISING '; tbar = '███░░'; }
      else { threat = 'HIGH   '; tbar = '█████'; }
      const wraith = this.knownContacts && this.knownContacts.has('wraith');
      const out = [
        '╔══════════ INTEL DOSSIER ══════════╗',
        '  작전: NULLSEC vs HELIOS — 도시를 쥔 사슬을 끊는다.',
        `  단계: ${act}   ·   미션 ${cur + 1}/${total}`,
        '',
        '  ▶ 현재 목표:',
        '    ' + lvl.objective,
        '',
        '  ── 세력 현황 ──',
        `  ◉ NULLSEC   너 — ${rank}, 0xMOTHER의 제자`,
        `  ◆ HELIOS    메가코프 · 표적${coreDown ? ' (코어 함락됨)' : ''}`,
        `  ⚠ ORACLE    HELIOS 방어 AI · 경계도 [${tbar}] ${threat}`,
        `  ☇ WRAITH    ${wraith ? '접선됨 — 정체불명의 제3자 (`channel wraith`)' : '— 미접촉'}`,
        `  ⚖ STANCE    신념 ${'◆'.repeat(this.stance.creed) || '·'}  /  효율 ${'◇'.repeat(this.stance.ghost) || '·'}` +
          (this.stance.creed > this.stance.ghost ? '  → 정도(0xMOTHER)' : this.stance.ghost > this.stance.creed ? '  → 지름길(WRAITH)' : '  → 균형'),
        '',
        '  ── 행적 ──'
      ];
      const from = Math.max(0, cur - 2), to = Math.min(total - 1, cur + 1);
      for (let i = from; i <= to; i++) {
        const mk = i === cur ? '▶' : (i < progress ? '✔' : '·');
        out.push(`  ${mk} ${L[i].id} [${L[i].tier}] ${L[i].title}`);
      }
      out.push('╚════════════════════════════════════╝');
      out.push('  (`objective` 목표 · `hint` 힌트 · `chat` 0xMOTHER)');
      return out.join('\n');
    }

    levelList() {
      const set = this.activeSet || window.LEVELS;
      let out = '진행 상황:\n';
      set.forEach((l, i) => {
        const mark = i < this.levelIndex ? '✔' : i === this.levelIndex ? '▶' : '·';
        out += `  ${mark} ${l.id} [${l.tier}] ${l.title}\n`;
      });
      return out.trim();
    }

    cmdTheme(name) {
      const themes = ['amber', 'green', 'cyan'];
      if (!themes.includes(name)) return 'usage: theme <amber|green|cyan>';
      this.setTheme(name); this.save();
      return `[*] 테마: ${name}`;
    }
    setTheme(name) { this.theme = name; document.body.setAttribute('data-theme', name); }

    clearScreen() { window.term.clear(); }

    showEnding() { window.term.showEnding(this); }
  }

  window.game = new Game();
})();
