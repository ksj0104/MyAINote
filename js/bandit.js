/* ============================================================
 * bandit.js — 단계별 도전(BANDIT 풍)
 * 각 레벨에 비밀번호가 숨겨져 있다. ls/cat/find/grep/file/…
 * 명령으로 찾아내 `submit <비밀번호>` 하면 다음 레벨이 열린다.
 * 터미널에서 진행하며, 엔진(commands/game)은 그대로 사용한다.
 * 진행도는 game.banditMax(클리어한 레벨 수)로 저장된다.
 * ============================================================ */
(function () {
  const { FileSystem, dir, file } = window.FS;

  // /home/<user> 에 children 을 둔 샌드박스 FS. extra(root) 로 트리 확장(예: /root).
  function mkfs(user, children, extra) {
    const root = dir('/', 'rwxr-xr-x', 'root', {
      home: dir('home', 'rwxr-xr-x', 'root', { [user]: dir(user, 'rwxr-xr-x', user, children || {}) }),
      etc: dir('etc', 'rwxr-xr-x', 'root', { hostname: file('hostname', 'hill', 'rw-r--r--', 'root') })
    });
    if (extra) extra(root);
    return new FileSystem(root);
  }
  const f = (name, content, perms) => file(name, content, perms || 'rw-r--r--', 'root');
  const d = (name, children) => dir(name, 'rwxr-xr-x', 'root', children || {});

  // 각 레벨: { teach, objective, hints[], pass, sudo?, build(mk) → FileSystem }
  const LEVELS = [
    {
      teach: 'ls · cat — 파일 보고 읽기',
      objective: '홈에 있는 파일을 ls 로 확인하고, cat 으로 그 내용을 읽어라.',
      hints: ['`ls` 로 어떤 파일이 있는지 본다', '`cat readme` 로 파일 내용을 읽는다'],
      pass: 'KX7-orchid',
      build: mk => mk({ readme: f('readme', '환영한다.\n이 레벨의 비밀번호: KX7-orchid\n찾았으면 submit KX7-orchid') })
    },
    {
      teach: 'cd · 경로 — 하위 디렉터리',
      objective: '비밀번호는 vault 디렉터리 안 pass.txt 에 있다. cd 로 들어가거나 경로째 cat 하라.',
      hints: ['`ls` 에 vault/ 가 보인다', '`cd vault` 후 `ls`, 또는 `cat vault/pass.txt`'],
      pass: 'cd-9Tm2x',
      build: mk => mk({
        vault: d('vault', { 'pass.txt': f('pass.txt', '비밀번호: cd-9Tm2x') }),
        'note.txt': f('note.txt', '여긴 비어있다. 다른 곳을 봐라.')
      })
    },
    {
      teach: 'ls -a — 숨김 파일',
      objective: '비밀번호는 숨김 파일에 있다. 평범한 ls 로는 보이지 않는다.',
      hints: ['숨김 파일은 . 으로 시작한다', '`ls -a` 로 드러내고 `cat .secret`'],
      pass: 'dot-Hidden42',
      build: mk => mk({
        'readme.txt': f('readme.txt', '비번은 여기 없다. 숨겨진 곳을 찾아라.'),
        '.secret': f('.secret', '비밀번호: dot-Hidden42')
      })
    },
    {
      teach: '따옴표 — 공백이 든 파일명',
      objective: '이름에 공백이 있는 파일이 있다. 따옴표로 감싸야 cat 할 수 있다.',
      hints: ['`ls` 로 이름을 확인 — 공백이 보인다', '`cat "secret data.txt"` 처럼 따옴표로 감싼다'],
      pass: 'quote-Sp4ce',
      build: mk => mk({
        'secret data.txt': f('secret data.txt', '비밀번호: quote-Sp4ce'),
        'decoy.txt': f('decoy.txt', '여긴 미끼다.')
      })
    },
    {
      teach: 'find — 깊은 곳의 파일 찾기',
      objective: '비밀번호 파일 target.key 가 트리 깊숙이 있다. find 로 찾아 cat 하라.',
      hints: ['`find . -name target.key` 로 위치를 찾는다', '찾은 경로를 `cat <경로>` 한다'],
      pass: 'find-D33p',
      build: mk => mk({
        a: d('a', { b: d('b', { c: d('c', { 'target.key': f('target.key', '비밀번호: find-D33p') }) }) }),
        x: d('x', { 'junk.txt': f('junk.txt', '아니다.') })
      })
    },
    {
      teach: 'grep — 많은 줄에서 패턴 찾기',
      objective: 'data.log 수십 줄 중 비밀번호 한 줄이 숨어 있다. grep 으로 PASS 를 찾아라.',
      hints: ['`grep PASS data.log`', 'PASS= 뒤의 값이 비밀번호다'],
      pass: 'grep-N33dle',
      build: mk => {
        const lines = [];
        for (let i = 0; i < 60; i++) lines.push('log entry ' + i + ' ... ok');
        lines.splice(37, 0, 'PASS=grep-N33dle');
        return mk({ 'data.log': f('data.log', lines.join('\n')) });
      }
    },
    {
      teach: 'file — 진짜 형식 판별',
      objective: '세 파일 중 진짜 텍스트는 하나뿐이다. file 로 형식을 확인해 ASCII text 인 것을 cat 하라.',
      hints: ['`file blob1`, `file blob2`, `file notes` 로 각각 확인', 'ASCII text 인 파일에 비번이 있다'],
      pass: 'file-Tru3',
      build: mk => mk({
        blob1: Object.assign(f('blob1', 'bz2'), { archive: 'bz2' }),
        blob2: Object.assign(f('blob2', 'gz'), { archive: 'gz' }),
        notes: f('notes', '비밀번호: file-Tru3')
      })
    },
    {
      teach: 'grep -r — 디렉터리 전체 재귀 검색',
      objective: '어느 파일인지 모른다. grep -r 로 디렉터리 전체를 뒤져 KEY 를 찾아라.',
      hints: ['`grep -r KEY .`', '하위 폴더까지 재귀로 검색한다'],
      pass: 'recur-S34rch',
      build: mk => mk({
        logs: d('logs', {
          'a.txt': f('a.txt', 'nothing here'),
          sub: d('sub', { 'deep.txt': f('deep.txt', 'KEY=recur-S34rch') })
        }),
        'top.txt': f('top.txt', 'also nothing')
      })
    },
    {
      teach: 'base64 — 디코딩',
      objective: 'enc.txt 는 base64 로 인코딩돼 있다. 디코딩하면 비밀번호가 나온다.',
      hints: ['`cat enc.txt` 는 알아볼 수 없는 문자열', '`base64 -d enc.txt` 로 디코딩'],
      pass: 'base64-Cod3',
      build: mk => mk({ 'enc.txt': f('enc.txt', btoa('password: base64-Cod3')) })
    },
    {
      teach: 'strings — 바이너리 속 문자열',
      objective: 'blob.bin 은 바이너리다. strings 로 사람이 읽을 수 있는 문자열을 뽑아 비번을 찾아라.',
      hints: ['`strings blob.bin`', '4글자 이상 문자열만 추출된다 — 수상한 토큰을 submit'],
      pass: 'strings-R4w',
      build: mk => mk({ 'blob.bin': f('blob.bin', '\x00\x01ELF\x02\x00' + 'libc.so.6' + '\x00\x00' + 'strings-R4w' + '\x00\x07' + 'malloc') })
    },
    {
      teach: 'sudo — 권한 상승',
      objective: 'root 전용 파일 /root/flag.txt 는 cat 으로 거부된다. sudo 로 읽어라.',
      hints: ['`cat /root/flag.txt` 는 Permission denied', '`sudo cat /root/flag.txt`'],
      pass: 'sudo-R00t',
      sudo: true,
      build: mk => mk(
        { 'hint.txt': f('hint.txt', '/root/flag.txt 를 읽어야 한다. 권한이 필요하다.') },
        root => { root.children.root = dir('root', 'rwx------', 'root', { 'flag.txt': file('flag.txt', '비밀번호: sudo-R00t', 'rw-------', 'root') }); }
      )
    },
    {
      teach: 'file → bunzip2/tar/gunzip — 압축 해제',
      objective: 'package.bz2 를 file 로 확인하고, 압축을 한 겹씩 풀어라(bunzip2 → tar → gunzip → cat).',
      hints: ['`file package.bz2` 로 형식 확인', '`bunzip2 package.bz2` → `tar -xvf payload.tar` → `gunzip flag.txt.gz`', '마지막에 나온 텍스트 파일을 cat'],
      pass: 'unzip-L4y3r',
      build: mk => {
        const txt = f('flag.txt', '비밀번호: unzip-L4y3r');
        const gz = Object.assign(f('flag.txt.gz', 'gz'), { archive: 'gz', next: txt });
        const tar = Object.assign(f('payload.tar', 'tar'), { archive: 'tar', next: gz });
        const bz2 = Object.assign(f('package.bz2', 'bz2'), { archive: 'bz2', next: tar });
        return mk({ 'package.bz2': bz2 });
      }
    }
  ];

  const Bandit = {
    LEVELS,

    enter(game) {
      if (!Number.isInteger(game.banditMax)) game.banditMax = 0;
      const start = Math.min(game.banditMax, LEVELS.length - 1);
      this.load(game, start, false);
    },

    // 레벨 셋업 + 렌더. keep=true 면 터미널을 지우지 않고 이어서 출력(클리어 직후).
    load(game, idx, keep) {
      idx = Math.max(0, Math.min(idx, LEVELS.length - 1));
      const L = LEVELS[idx];
      const user = 'bandit' + (idx + 1);
      game.banditAt = idx;
      game.banditHintIdx = 0;
      game.user = user; game.host = 'hill'; game.cwd = '/home/' + user;
      game.connStack = []; game.network = []; game.env = {};
      game.readFiles = new Set(); game.submitted = new Set();
      game.sudoAllowed = !!L.sudo;
      game.fs = L.build((children, extra) => mkfs(user, children, extra));
      this.render(game, idx, keep);
    },

    render(game, idx, keep) {
      const L = LEVELS[idx], t = window.term;
      window.term.setMode('terminal');
      if (!keep) t.clear();
      t.println('━━━━━━  BANDIT · 단계별 도전  ━━━━━━', 'frame');
      t.println(`LEVEL ${idx + 1} / ${LEVELS.length}   ·   ${L.teach}`, 'objective');
      t.println('', '');
      t.println('목표: ' + L.objective, 'story');
      t.println('', '');
      t.println('  비밀번호를 찾으면 →  submit <비밀번호>', 'objective');
      t.println('  hint 힌트 · levels 진행도 · level <n> 이동 · reset 초기화 · menu 나가기', 'dim');
      if (window.term.setMission) {
        window.term.setMission({ id: 'BANDIT-' + (idx + 1), tier: '도전', title: `BANDIT L${idx + 1}/${LEVELS.length}`, objective: L.objective }, idx + 1, LEVELS.length);
      }
    },

    // 명령 가로채기. 문자열 반환=처리됨, null=일반 명령으로 샌드박스에서 실행.
    handle(raw, game) {
      const parts = raw.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const idx = game.banditAt || 0;
      const L = LEVELS[idx];
      if (cmd === 'levels' || cmd === 'map' || cmd === 'list') return this.listLevels(game);
      if (cmd === 'hint') return this.hint(game);
      if (cmd === 'level' || cmd === 'goto') return this.goto(game, parseInt(parts[1], 10));
      if (cmd === 'reset') { this.load(game, idx, false); return ''; }
      if (cmd === 'submit') {
        const ans = parts.slice(1).join(' ').trim();
        if (!ans) return 'usage: submit <비밀번호>';
        if (ans === L.pass) return this.solved(game, idx);
        return '✗ 틀렸다. 다시 찾아봐라.  (hint 로 힌트, reset 로 초기화)';
      }
      return null;
    },

    solved(game, idx) {
      const t = window.term;
      game.banditMax = Math.max(game.banditMax || 0, idx + 1);
      if (game.save) game.save();
      if (idx + 1 >= LEVELS.length) {
        t.println('', '');
        t.println('✔ 정답!', 'success');
        t.println('🏁 모든 레벨 클리어! 기초 명령을 모두 정복했다.', 'success');
        t.println('  levels 로 복습하거나 menu 로 나갈 수 있다.', 'dim');
        return '';
      }
      t.println('', '');
      t.println(`✔ 정답! LEVEL ${idx + 2} 가 열렸다 — 다음 단계로.`, 'success');
      this.load(game, idx + 1, true);
      return '';
    },

    listLevels(game) {
      const max = game.banditMax || 0, at = game.banditAt || 0;
      let out = `단계 진행도 — 클리어 ${Math.min(max, LEVELS.length)}/${LEVELS.length}`;
      LEVELS.forEach((L, i) => {
        const mark = i < max ? '✔' : i === at ? '▶' : i <= max ? '○' : '🔒';
        out += `\n  ${mark} ${String(i + 1).padStart(2)}. ${L.teach}`;
      });
      out += '\n\n  잠긴 레벨은 순서대로 풀면 열린다. `level <번호>` 로 이동.';
      return out;
    },

    goto(game, n) {
      if (isNaN(n) || n < 1 || n > LEVELS.length) return `usage: level <번호>  (1~${LEVELS.length})`;
      const target = n - 1;
      if (target > (game.banditMax || 0)) return `🔒 LEVEL ${n} 은 아직 잠겨 있다. 순서대로 풀어라.`;
      this.load(game, target, false);
      return '';
    },

    hint(game) {
      const L = LEVELS[game.banditAt || 0];
      const hs = L.hints || [];
      const i = game.banditHintIdx || 0;
      if (i >= hs.length) return '힌트가 더 없다. reset 로 처음부터 다시 볼 수 있다.';
      game.banditHintIdx = i + 1;
      return `💡 힌트 ${i + 1}/${hs.length}: ${hs[i]}`;
    }
  };

  window.Bandit = Bandit;
})();
