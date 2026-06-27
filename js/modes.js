/* ============================================================
 * modes.js — 메뉴 라우팅 · 학습(Academy) · 코드랩(CodeLab) · 워게임 보드
 * ============================================================ */
(function () {
  const { FileSystem, dir, file } = window.FS;

  /* =====================================================
   *  Modes — 메뉴/워게임 보드 입력 처리
   * ===================================================== */
  const Modes = {
    wargameBoardInput(raw, game) {
      const t = raw.trim().toLowerCase();
      if (t === 'help' || t === 'board') { window.term.showWargameBoard(game); return ''; }
      let idx = -1;
      const set = window.WARGAMES;
      if (/^\d+$/.test(t)) idx = parseInt(t, 10) - 1;
      else {
        const m = t.match(/^(?:play\s+)?(w\d+)$/);
        if (m) idx = set.findIndex(w => w.id.toLowerCase() === m[1]);
      }
      if (idx >= 0 && idx < set.length) { game.loadChallenge(idx); return ''; }
      return '챌린지를 선택하세요: 번호(예: 1) 또는 `play W3`. (`menu` 로 메뉴)';
    }
  };

  /* =====================================================
   *  Academy — 모든 명령어 학습
   * ===================================================== */
  // 카테고리 분류 (학습 커리큘럼)
  const CATEGORIES = [
    ['탐색·파일', ['ls', 'cd', 'pwd', 'cat', 'echo', 'grep', 'find', 'mkdir', 'touch', 'cp', 'mv', 'rm']],
    ['권한·사용자', ['whoami', 'id', 'chmod', 'su', 'sudo', 'passwd']],
    ['시스템', ['ps', 'top', 'kill', 'uname', 'env', 'export', 'df', 'free', 'uptime', 'date', 'history', 'clear', 'man', 'help']],
    ['네트워크', ['ifconfig', 'ping', 'nmap', 'netstat', 'arp', 'route', 'ssh', 'scp', 'wget', 'curl', 'exit', 'disconnect']],
    ['암호·인코딩', ['base64', 'rot13', 'caesar', 'xor', 'vigenere', 'md5sum', 'strings', 'xxd']],
    ['공격·크래킹', ['hydra', 'john', 'hashcat', 'dump']],
    ['무선(WiFi)', ['airmon-ng', 'airodump-ng', 'aireplay-ng', 'aircrack-ng']],
    ['교신·대화', ['chat', 'reply', 'say', 'channel', 'contacts']],
    ['게임·진행', ['submit', 'save', 'load', 'saves']]
  ];

  // 명령 → 시각화 패밀리 (5 정교; 그 외는 familyOf 가 'light' 폴백)
  const VIZ_FAMILY = {
    ls: 'fs', cd: 'fs', pwd: 'fs', cat: 'fs', echo: 'fs', grep: 'fs', find: 'fs',
    mkdir: 'fs', touch: 'fs', cp: 'fs', mv: 'fs', rm: 'fs',
    ifconfig: 'net', ping: 'net', nmap: 'net', netstat: 'net', arp: 'net', route: 'net',
    ssh: 'net', scp: 'net', wget: 'net', curl: 'net', exit: 'net', disconnect: 'net',
    base64: 'crypto', rot13: 'crypto', caesar: 'crypto', xor: 'crypto', vigenere: 'crypto',
    md5sum: 'crypto', strings: 'crypto', xxd: 'crypto',
    hydra: 'crack', john: 'crack', hashcat: 'crack', dump: 'crack',
    'airmon-ng': 'wifi', 'airodump-ng': 'wifi', 'aireplay-ng': 'wifi', 'aircrack-ng': 'wifi'
  };

  // 명령별 학습 예제 (없으면 usage로 대체)
  const EXAMPLES = {
    ls: 'ls -la /etc        # 숨김파일·권한까지 상세히',
    cd: 'cd ~/projects      # 홈 아래 projects 로 이동',
    cat: 'cat secret.txt    # 파일 내용 출력',
    grep: "grep -ri pass .  # 현재 폴더에서 'pass' 대소문자무시 재귀 검색",
    find: 'find / -name "*.key"   # 이름이 .key 로 끝나는 파일 찾기',
    chmod: 'chmod 644 file   # rw-r--r-- 권한 부여 (8진수)',
    sudo: 'sudo cat /etc/shadow   # 관리자 권한으로 실행',
    nmap: 'nmap -sV 10.0.0.0/24   # 대역 스캔 + 서비스 버전',
    ssh: 'ssh user@10.0.0.5 secretpw   # 원격 접속(게임에선 비번을 인자로)',
    scp: 'scp host:/etc/passwd loot.txt # 원격 파일 탈취',
    base64: 'base64 -d enc.txt  # base64 디코딩',
    rot13: 'rot13 cipher.txt   # ROT13 (자기역함수)',
    caesar: 'caesar 3 Khoor     # 시프트 3 복호화 → Hello',
    xor: 'xor data.hex key   # hex를 key로 XOR 복호화',
    vigenere: 'vigenere lemon ciphertext',
    hydra: 'hydra 10.0.0.5 ssh words.txt  # 워드리스트 무차별 대입',
    john: 'john hashes.txt    # 해시 사전 크래킹',
    hashcat: 'hashcat $1$ab$xyz # 단일 해시 크랙',
    dump: 'dump users         # DB/메모리 자격증명 추출',
    submit: 'submit flag{...}  # 찾은 플래그/정답 제출',
    save: 'save mygame        # 진행 저장',
    'echo': "echo hi > a.txt    # 리다이렉션: 출력을 파일로 (>>는 추가)"
  };

  // 명령별 상세 학습 자료 (설명·예제 여러 개·팁·관련명령)
  const DETAILS = {
    ls: { desc: '디렉터리 안의 파일/폴더를 나열한다. 가장 먼저, 가장 자주 쓰는 명령.', ex: ['ls', 'ls -a        # 숨김(.)파일까지', 'ls -l        # 권한·소유자·크기 상세', 'ls -la /etc  # 둘 다 + 특정 경로'], tip: '-a 는 .으로 시작하는 숨김파일을, -l 은 권한을 보여준다.', see: ['cd', 'cat', 'find'] },
    cd: { desc: '작업 디렉터리를 옮긴다. 경로는 절대(/etc) 또는 상대(../docs)로 지정.', ex: ['cd /var/log', 'cd ..        # 상위로', 'cd ~         # 홈으로', 'cd -         # (셸에선 직전 경로)'], tip: '~ 는 홈, .. 는 상위, . 은 현재. 이동 후 pwd 로 확인.', see: ['ls', 'pwd'] },
    pwd: { desc: '현재 작업 중인 절대 경로를 출력한다. 길을 잃었을 때.', ex: ['pwd'], see: ['cd', 'ls'] },
    cat: { desc: '파일 내용을 화면에 그대로 출력한다. 단서·설정·플래그 읽기의 기본.', ex: ['cat flag.txt', 'cat /etc/passwd', 'cat a.txt b.txt   # 여러 파일 연달아'], tip: '권한이 없으면 Permission denied — sudo 나 chmod 가 필요할 수 있다.', see: ['grep', 'strings', 'xxd'] },
    echo: { desc: '문자열을 출력한다. 리다이렉션과 함께 파일에 쓰기(공격: 백도어 삽입)에도 쓴다.', ex: ['echo hello', "echo 'data' > file.txt    # 새 파일로 저장", "echo 'line2' >> file.txt   # 뒤에 추가"], tip: '> 덮어쓰기, >> 추가. 권한 있는 위치에만 쓸 수 있다.', see: ['cat', 'cp'] },
    grep: { desc: '파일/디렉터리에서 패턴(문자열·정규식)과 일치하는 줄을 찾는다. 대량 로그·소스에서 단서 추출의 핵심.', ex: ['grep error app.log', 'grep -i password *.txt   # 대소문자 무시', 'grep -r flag ./src       # 디렉터리 재귀'], tip: '-i 대소문자무시, -r 재귀. 비번·키·flag 사냥에 필수.', see: ['find', 'cat', 'strings'] },
    find: { desc: '이름/조건으로 파일을 탐색한다. 어디 있는지 모를 때 트리 전체를 뒤진다.', ex: ['find / -name "*.key"', 'find . -name flag.txt', 'find /home -name "*.conf"'], tip: '-name 에 * 와일드카드 사용 가능. grep 과 짝으로 자주 쓴다.', see: ['grep', 'ls'] },
    mkdir: { desc: '새 디렉터리를 만든다.', ex: ['mkdir loot', 'mkdir /tmp/work'], see: ['touch', 'rm', 'cd'] },
    touch: { desc: '빈 파일을 만든다(또는 타임스탬프 갱신).', ex: ['touch notes.txt'], see: ['mkdir', 'echo', 'rm'] },
    cp: { desc: '파일을 복사한다. 원격에서 빼낸 데이터를 안전한 곳에 보관할 때.', ex: ['cp a.txt b.txt', 'cp secret.txt /tmp/'], see: ['mv', 'scp', 'rm'] },
    mv: { desc: '파일을 이동하거나 이름을 바꾼다.', ex: ['mv old.txt new.txt', 'mv file.txt /tmp/'], see: ['cp', 'rm'] },
    rm: { desc: '파일/디렉터리를 삭제한다. 흔적 제거에도. 되돌릴 수 없으니 주의.', ex: ['rm junk.txt', 'rm -r olddir   # 디렉터리째'], tip: '-r 은 디렉터리 재귀 삭제. 실수하면 복구 불가.', see: ['mv', 'mkdir'] },
    chmod: { desc: '파일 권한(rwx)을 8진수로 바꾼다. 잠긴 내 파일을 열거나 실행권한을 줄 때.', ex: ['chmod 644 file   # rw-r--r--', 'chmod 755 script # rwxr-xr-x', 'chmod 600 key    # rw-------'], tip: '각 자리=소유자/그룹/기타. r=4,w=2,x=1 의 합. 644=4+2/4/4.', see: ['ls', 'whoami'] },
    whoami: { desc: '현재 로그인한 사용자 이름을 출력한다. 권한 상승 성공 확인용.', ex: ['whoami'], tip: 'root 가 나오면 최고 권한. guest 면 제약이 있다.', see: ['id', 'su', 'sudo'] },
    id: { desc: '사용자의 uid/gid/그룹 정보를 보여준다.', ex: ['id'], see: ['whoami'] },
    sudo: { desc: '관리자(root) 권한으로 명령을 실행한다. 권한 상승의 대표적 통로.', ex: ['sudo cat /etc/shadow', 'sudo cat /root/flag.txt'], tip: 'sudo 가 허용된 시스템에서만 동작. 잘못된 sudo 설정은 큰 취약점.', see: ['su', 'whoami'] },
    su: { desc: '다른 사용자로 전환한다(기본 root). 비밀번호를 알아야 한다.', ex: ['su root god_mode_42   # 게임: 비번을 인자로'], tip: '크랙한 비번으로 root 가 되는 전형적 흐름: john → su.', see: ['sudo', 'john', 'whoami'] },
    ps: { desc: '실행 중인 프로세스 목록을 본다.', ex: ['ps'], see: ['top', 'kill'] },
    top: { desc: '프로세스를 CPU/메모리 사용량과 함께 실시간처럼 본다.', ex: ['top'], see: ['ps', 'kill'] },
    kill: { desc: 'PID로 프로세스를 종료한다.', ex: ['kill 1337'], see: ['ps', 'top'] },
    nmap: { desc: '대상 호스트/대역의 열린 포트와 서비스를 스캔한다. 모든 침투의 첫걸음, 정찰의 왕.', ex: ['nmap 10.0.0.5', 'nmap 10.0.0.0/24    # 대역 전체', 'nmap -sV 10.0.0.5   # 서비스 버전까지'], tip: '22=ssh, 80=http, 3306=mysql. -sV 로 버전을 알면 취약점을 찾는다.', see: ['ssh', 'netstat', 'ping'] },
    ssh: { desc: '원격 머신에 접속해 그 셸을 장악한다. 게임에선 비밀번호를 인자로 준다.', ex: ['ssh devops@10.0.0.50 Spring2019!', 'ssh root@10.0.0.10 Pr0dR00t!'], tip: '접속하면 그 머신의 파일시스템으로 전환된다. exit 로 빠져나온다.', see: ['scp', 'exit', 'nmap'] },
    scp: { desc: '원격↔로컬로 파일을 복사한다. 중요 코드/데이터를 빼돌릴 때(탈취).', ex: ['scp config.py loot.txt', 'scp host:/etc/passwd ./'], see: ['cp', 'ssh'] },
    netstat: { desc: '네트워크 연결과 리슨 중인 포트를 본다.', ex: ['netstat -tlnp'], see: ['nmap', 'ifconfig'] },
    ping: { desc: '호스트가 살아있는지 ICMP로 확인한다.', ex: ['ping 10.0.0.5'], see: ['nmap', 'ifconfig'] },
    ifconfig: { desc: '내 네트워크 인터페이스/IP를 본다.', ex: ['ifconfig'], see: ['netstat', 'route'] },
    base64: { desc: 'base64 인코딩/디코딩. 쿠키·토큰·설정에 흔히 쓰이는 위장. 암호화가 아니다.', ex: ['base64 -d cookie.txt    # 디코딩', 'base64 secret.txt        # 인코딩'], tip: '== 로 끝나면 base64일 확률이 높다. -d 가 디코딩.', see: ['rot13', 'xor', 'strings'] },
    rot13: { desc: '알파벳을 13칸 미는 시저 암호의 특수형. 자기 자신이 역함수(두 번 = 원본).', ex: ['rot13 cipher.txt'], tip: 'synt → flag 처럼 보이면 ROT13. caesar 의 shift=13 버전.', see: ['caesar', 'vigenere'] },
    caesar: { desc: '시저 암호: 알파벳을 일정 칸 시프트한 치환 암호. 시프트를 알면 역시프트로 복원.', ex: ['caesar 3 Khoor   # → Hello'], tip: '시프트를 모르면 0~25 전부 시도(브루트포스). 코드랩 1번 참고.', see: ['rot13', 'vigenere', 'xor'] },
    xor: { desc: '바이트를 키와 XOR해 복호화한다. 같은 키로 다시 XOR하면 원본. 단순하지만 흔한 암호화.', ex: ['xor vault.hex arena   # hex를 키로', 'xor data.bin mykey'], tip: '키만 알면 즉시 복원. 키를 모르면 단일바이트는 256개 전수조사(코드랩 2번).', see: ['base64', 'caesar', 'hashcat'] },
    vigenere: { desc: '키워드를 반복해 글자마다 다른 시프트를 적용하는 다중치환 암호.', ex: ['vigenere lemon ciphertext'], see: ['caesar', 'rot13'] },
    strings: { desc: '바이너리 속 사람이 읽을 수 있는 문자열만 추출한다. 포렌식·플래그 사냥의 단골.', ex: ['strings dump.bin', 'strings /usr/bin/app'], tip: '4글자 이상 ASCII만 뽑힌다. 숨은 flag·경로·키가 자주 나온다.', see: ['xxd', 'cat', 'grep'] },
    xxd: { desc: '파일을 16진수 + ASCII로 덤프한다. 바이트 단위 분석.', ex: ['xxd secret.bin'], see: ['strings', 'cat'] },
    md5sum: { desc: '파일의 해시(지문)를 계산한다. 무결성 확인·식별용.', ex: ['md5sum file.iso'], see: ['hashcat', 'john'] },
    hydra: { desc: '워드리스트로 로그인 비밀번호를 무차별 대입(brute force)한다. 약한 비번을 뚫는다.', ex: ['hydra 10.0.0.77 ssh wordlist.txt'], tip: '좋은 워드리스트가 성패를 가른다. 찾으면 ssh 로 바로 접속.', see: ['ssh', 'john', 'hashcat'] },
    john: { desc: '해시를 사전 공격으로 크랙한다(John the Ripper). /etc/shadow 등의 해시 → 평문 비번.', ex: ['john shadow.txt'], tip: '크랙한 비번으로 su root. shadow → john → su 가 정석 흐름.', see: ['hashcat', 'su', 'dump'] },
    hashcat: { desc: 'GPU 기반 고속 해시 크래커. 단일 해시나 해시 파일을 사전으로 깬다.', ex: ['hashcat $1$ab$xyz', 'hashcat hashes.txt'], see: ['john', 'dump'] },
    dump: { desc: 'DB/메모리에서 사용자·자격증명·해시를 추출한다. 추출 → 크랙의 출발점.', ex: ['dump users'], tip: '뽑은 해시를 hashcat/john 으로 넘기면 비번을 얻는다.', see: ['hashcat', 'john'] },
    submit: { desc: '찾은 플래그/정답을 제출해 단계를 클리어한다. flag{...} 전체 또는 안쪽만 넣어도 인정.', ex: ['submit flag{...}', 'submit 10.0.0.50   # 정답이 IP면 IP를'], see: ['objective', 'hint'] },
    save: { desc: '진행 상황을 명명된 슬롯에 저장한다.', ex: ['save mygame'], see: ['load', 'saves'] },
    load: { desc: '저장 슬롯을 불러와 그 지점부터 이어한다.', ex: ['load mygame'], see: ['save', 'saves'] },
    man: { desc: '명령어의 매뉴얼(이름·사용법)을 본다.', ex: ['man grep'], see: ['help', 'learn'] }
  };

  const Academy = {
    // 학습 순서: CATEGORIES 평탄화 → COMMANDS 에 존재하는 것만(실행 가능), 중복 제거
    get order() {
      const C = window.COMMANDS || {};
      const seen = new Set(), out = [];
      for (const [, cmds] of CATEGORIES) for (const c of cmds) {
        if (!seen.has(c) && C[c]) { seen.add(c); out.push(c); }
      }
      return out;
    },
    // 사이드바 그룹: [카테고리명, COMMANDS에 있는 명령들][]
    get categories() {
      const C = window.COMMANDS || {};
      return CATEGORIES.map(([name, cmds]) => [name, cmds.filter(c => C[c])]).filter(([, cs]) => cs.length);
    },
    VIZ_FAMILY,
    familyOf(cmd) { return VIZ_FAMILY[cmd] || 'light'; },
    demoFor(cmd) { const ex = EXAMPLES[cmd]; return ex ? ex.split('#')[0].trim() : cmd; },
    isPractice(raw, target) {
      const first = String(raw || '').trim().split(/\s+/)[0].toLowerCase();
      return !!first && first === String(target || '').toLowerCase();
    },

    enter(game) {
      // 자유 연습용 샌드박스
      game.user = 'student'; game.host = 'academy'; game.cwd = '/home/student';
      game.fs = new FileSystem(dir('/', 'rwxr-xr-x', 'root', {
        home: dir('home', 'rwxr-xr-x', 'root', { student: dir('student', 'rwxr-xr-x', 'student', {
          'welcome.txt': file('welcome.txt', '여긴 연습실이다. 무엇이든 시도해봐라. 부서지지 않는다.', 'rw-r--r--', 'student'),
          'practice.txt': file('practice.txt', 'grep 으로 나를 찾아봐: TRAINING-OK', 'rw-r--r--', 'student'),
          '.hidden': file('.hidden', '숨김파일도 ls -a 로 보인다.', 'rw-r--r--', 'student'),
          docs: dir('docs', 'rwxr-xr-x', 'student', { 'note.md': file('note.md', '# 메모\ncd/ls/cat 을 연습하자.', 'rw-r--r--', 'student') })
        }) }),
        etc: dir('etc', 'rwxr-xr-x', 'root', { hostname: file('hostname', 'academy', 'rw-r--r--', 'root') })
      }));
      game.connStack = []; game.network = []; game.env = {};
      // 명령어가 참조하는 상태 초기화 (cat/grep/strings 등은 game.readFiles.add 를 호출)
      game.readFiles = new Set(); game.submitted = new Set();
      window.term.hideOverlays();
      window.term.setMode('os');
      window.term.clear();
      const t = window.term;
      t.println('╔══════════════════════════════════════════════╗', 'frame');
      t.println('║   ACADEMY · 명령어 학습 연습실                 ║', 'frame');
      t.println('╚══════════════════════════════════════════════╝', 'frame');
      t.println('모든 명령을 자유롭게 연습할 수 있는 안전한 샌드박스다.', 'story');
      t.println('', '');
      t.println('  lessons          카테고리별 명령어 커리큘럼', 'objective');
      t.println('  learn <명령>     특정 명령 학습 (설명·사용법·예제)', 'objective');
      t.println('  learn all        모든 명령 요약', 'objective');
      t.println('  reset            연습실 초기화   ·   menu  메인 메뉴', 'objective');
      t.println('', '');
      t.println('그 외 모든 명령(ls, cat, grep, nmap, base64 ...)은 바로 실습된다.', 'dim');
      window.term.setMission({ id: 'ACADEMY', tier: '학습', title: '명령어 연습실', objective: 'lessons / learn <명령> 으로 학습하고 자유롭게 실습하라' }, 1, 1);
    },

    handle(raw, game) {
      const parts = raw.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      if (cmd === 'lessons') return this.lessons();
      if (cmd === 'learn') return this.learn(parts.slice(1).join(' ').trim());
      if (cmd === 'reset') { this.enter(game); return ''; }
      return null; // 일반 명령은 샌드박스에서 실행
    },

    lessons() {
      let out = '📚 학습 커리큘럼 — `learn <명령>` 으로 자세히 배운다\n';
      for (const [name, cmds] of CATEGORIES) {
        out += `\n  ▸ ${name}\n      ${cmds.join('  ')}`;
      }
      out += '\n\n  팁: `learn all` 로 전체 요약, `man <명령>` 도 사용 가능.';
      return out;
    },

    learn(name) {
      const C = window.COMMANDS;
      if (!name) return 'usage: learn <명령>   (예: learn grep)  ·  목록은 `lessons`';
      if (name === 'all') {
        let out = '전체 명령 요약:\n';
        Object.keys(C).sort().forEach(k => { out += `\n  ${k.padEnd(12)} ${C[k].desc}`; });
        return out;
      }
      const c = C[name];
      if (!c) return `learn: '${name}' 명령을 찾을 수 없다. \`lessons\` 로 목록을 보거나 \`learn all\``;
      const cat = (CATEGORIES.find(([, cmds]) => cmds.includes(name)) || ['기타'])[0];
      let out = `╭─ ${name} ─────────────────────────────\n`;
      out += `│ 분류 : ${cat}\n`;
      out += `│ 설명 : ${c.desc}\n`;
      out += `│ 사용 : ${c.usage}\n`;
      out += `│ 예제 : ${EXAMPLES[name] || c.usage}\n`;
      const opts = window.COMMAND_OPTS && window.COMMAND_OPTS[name];
      if (opts && opts.length) {
        out += `│ 옵션 :\n`;
        for (const [tok, d] of opts) out += `│    ${String(tok).padEnd(18)} ${d}\n`;
        out += `│    ${'─'.repeat(18)}\n`;
        out += `│    ★ = 이 시뮬레이터에서 동작 · 그 외는 실제 유닉스 기준 설명(학습용)\n`;
      }
      out += `╰───────────────────────────────────────\n`;
      out += `직접 해보기 → 연습실에서 \`${name}\` 를 입력해보라.`;
      return out;
    }
  };

  /* =====================================================
   *  CodeLab — JS 코드 작성으로 복호화/탈취
   * ===================================================== */
  const CHALLENGES = [
    {
      id: 'CL1', title: '카이사르 브루트포스', diff: 'EASY',
      desc: '시프트를 모르는 카이사르 암호문이 주어진다. 26가지를 모두 시도해 "flag" 로 시작하는 평문을 찾아 반환하라.',
      input: 'iodj{euxwh_irufh_zlqv}',           // 'flag{brute_force_wins}' shift +3
      expected: 'flag{brute_force_wins}',
      starter: 'function solve(cipher) {\n  for (let s = 0; s < 26; s++) {\n    const out = cipher.replace(/[a-z]/g, c =>\n      String.fromCharCode((c.charCodeAt(0) - 97 + s) % 26 + 97));\n    // TODO: out 이 "flag" 로 시작하면 out 을 반환하세요\n  }\n  return "TODO";\n}',
      _ref: 'function solve(cipher) {\n  for (let s = 0; s < 26; s++) {\n    const out = cipher.replace(/[a-z]/g, c =>\n      String.fromCharCode((c.charCodeAt(0) - 97 + s) % 26 + 97));\n    if (out.startsWith("flag")) return out;\n  }\n  return "not found";\n}'
    },
    {
      id: 'CL2', title: 'XOR 단일바이트 키 복구', diff: 'MEDIUM',
      desc: 'hex 문자열이 알 수 없는 1바이트 키로 XOR 되어 있다. 평문은 "flag{" 로 시작한다. 키(0~255)를 찾아 복호화한 평문을 반환하라.',
      input: '',                                   // set below
      expected: 'flag{single_byte_xor}',
      starter: 'function solve(hex) {\n  const bytes = hex.match(/.{2}/g).map(h => parseInt(h, 16));\n  for (let k = 0; k < 256; k++) {\n    // TODO: 각 바이트를 k 로 XOR 해 문자열을 만들고\n    //       "flag{" 로 시작하면 반환하세요\n  }\n  return "TODO";\n}',
      _ref: 'function solve(hex) {\n  const bytes = hex.match(/.{2}/g).map(h => parseInt(h, 16));\n  for (let k = 0; k < 256; k++) {\n    const out = bytes.map(b => String.fromCharCode(b ^ k)).join("");\n    if (out.startsWith("flag{")) return out;\n  }\n  return "not found";\n}'
    },
    {
      id: 'CL3', title: 'base64 3중 디코딩', diff: 'MEDIUM',
      desc: 'base64로 세 번 인코딩된 문자열이다. 세 번 디코딩하면 flag 가 나온다. (atob 함수 사용 가능)',
      input: '',                                   // set below
      expected: 'flag{nested_base64_layers}',
      starter: 'function solve(data) {\n  // atob(x) 가 제공됩니다. 세 번 디코딩해서 반환하세요.\n  return atob(data); // TODO: 한 번 더, 또 한 번 더\n}',
      _ref: 'function solve(data) {\n  return atob(atob(atob(data)));\n}'
    },
    {
      id: 'CL4', title: '역순 + ROT13', diff: 'HARD',
      desc: '원문을 뒤집은 뒤 ROT13 을 적용한 문자열이다. 역으로 ROT13 을 풀고 다시 뒤집어 원래 flag 를 복원하라.',
      input: '',                                   // set below
      expected: 'flag{reverse_then_rot13}',
      starter: 'function solve(s) {\n  const rot = t => t.replace(/[a-z]/g, c =>\n    String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97));\n  // TODO: rot 을 적용한 뒤 문자열을 뒤집어 반환하세요\n  return "TODO";\n}',
      _ref: 'function solve(s) {\n  const rot = t => t.replace(/[a-z]/g, c =>\n    String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97));\n  return rot(s).split("").reverse().join("");\n}'
    }
  ];
  // 입력값 동적 생성 (정답에서 역산)
  (function buildInputs() {
    // CL2: xor key 0x5a
    const pt2 = 'flag{single_byte_xor}'; let h = '';
    for (const ch of pt2) h += (ch.charCodeAt(0) ^ 0x5a).toString(16).padStart(2, '0');
    CHALLENGES[1].input = h;
    // CL3: base64 x3
    const enc = s => btoa(s);
    CHALLENGES[2].input = enc(enc(enc('flag{nested_base64_layers}')));
    // CL4: reverse then rot13
    const rot = t => t.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97));
    CHALLENGES[3].input = rot('flag{reverse_then_rot13}'.split('').reverse().join(''));
  })();

  const CodeLab = {
    enter(game) {
      this.game = game;
      this.idx = 0;
      window.term.showCodelab();
      this.render();
    },
    list() { return CHALLENGES; },
    current() { return CHALLENGES[this.idx]; },
    select(i) { if (i >= 0 && i < CHALLENGES.length) { this.idx = i; this.render(); } },

    render() {
      const c = this.current();
      const g = this.game;
      const solved = g.codelabSolved && g.codelabSolved.has(c.id);
      const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
      const setv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('cl-title', `${c.id} · ${c.title}  <span class="cl-diff">[${c.diff}]</span> ${solved ? '<span class="cl-solved">✔ SOLVED</span>' : ''}`);
      set('cl-desc', c.desc);
      set('cl-input', `입력값:\n${c.input}`);
      setv('cl-editor', c.starter);
      set('cl-output', '코드를 작성하고 [실행 ▶] 을 누르세요.');
      // 챌린지 목록
      const navHtml = CHALLENGES.map((ch, i) => {
        const sv = g.codelabSolved && g.codelabSolved.has(ch.id);
        return `<button class="cl-nav-item ${i === this.idx ? 'active' : ''} ${sv ? 'solved' : ''}" data-i="${i}">${sv ? '✔' : '○'} ${ch.id}</button>`;
      }).join('');
      set('cl-nav', navHtml);
      // 네비 버튼 바인딩
      document.querySelectorAll('.cl-nav-item').forEach(b => b.onclick = () => this.select(+b.dataset.i));
    },

    // 코드 실행 + 채점. 반환 {ok, output}
    run(code) {
      const c = this.current();
      let result;
      try {
        const fn = new Function('atob', 'btoa', code + '\n;return typeof solve === "function" ? solve : null;')(
          (typeof atob !== 'undefined' ? atob : x => Buffer.from(x, 'base64').toString('binary')),
          (typeof btoa !== 'undefined' ? btoa : x => Buffer.from(x, 'binary').toString('base64'))
        );
        if (!fn) return { ok: false, output: '오류: solve(input) 함수를 정의해야 합니다.' };
        result = fn(c.input);
      } catch (e) {
        return { ok: false, output: '실행 오류: ' + e.message };
      }
      const ok = String(result) === c.expected;
      if (ok && this.game) {
        this.game.codelabSolved = this.game.codelabSolved || new Set();
        this.game.codelabSolved.add(c.id);
        this.game.save();
      }
      return { ok, output: (ok ? '✔ 정답! ' : '✗ 불일치. ') + `반환값: "${result}"` + (ok ? '' : `\n기대값: "${c.expected}"`) };
    },

    runFromEditor() {
      const ed = document.getElementById('cl-editor');
      const res = this.run(ed ? ed.value : '');
      const out = document.getElementById('cl-output');
      if (out) { out.textContent = res.output; out.className = 'cl-output ' + (res.ok ? 'ok' : 'bad'); }
      if (res.ok) this.render();
    }
  };

  window.Modes = Modes;
  window.Academy = Academy;
  window.CodeLab = CodeLab;
})();
