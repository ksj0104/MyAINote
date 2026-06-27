/* ============================================================
 * commands.js — 유닉스 명령어 인터프리터 (시뮬레이션)
 * 각 명령은 run(ctx) 형태. ctx = { args, game, raw }
 * 반환값은 출력 문자열(여러 줄은 \n). 빈 문자열이면 출력 없음.
 * ============================================================ */

const COMMANDS = {};

function reg(name, desc, usage, run) {
  COMMANDS[name] = { name, desc, usage, run };
}

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }
// 진행바 (해커 시뮬 연출): bar(100) → [▓▓▓▓▓▓▓▓▓▓] 100%
function bar(pct, width) { width = width || 20; const n = Math.round(pct / 100 * width); return '[' + '▓'.repeat(n) + '░'.repeat(width - n) + '] ' + pct + '%'; }

/* 명령별 옵션/인자 상세 설명 — [토큰, 설명] 목록. man / learn 에서 OPTIONS 섹션으로 렌더 */
const OPTS = {
  help: [['(인자 없음)', '등록된 모든 명령을 정렬해 5열로 나열한다']],
  man: [['<cmd>', '매뉴얼을 볼 명령 이름']],
  pwd: [['(인자 없음)', '현재 작업 디렉터리의 절대경로를 출력']],
  ls: [['-l', '권한·소유자·크기까지 상세(long) 표시'], ['-a', '점(.)으로 시작하는 숨김 파일까지 표시'], ['[path]', '나열할 경로(생략 시 현재 디렉터리)']],
  cd: [['<path>', '이동할 경로'], ['~', '홈 디렉터리(/home/<user>)'], ['..', '상위 디렉터리'], ['.', '현재 디렉터리']],
  cat: [['<file...>', '내용을 출력할 파일(여러 개 가능, 순서대로 이어 출력)']],
  echo: [['<text>', '출력할 문자열(앞뒤 따옴표는 제거됨)'], ['> <file>', '출력을 파일에 덮어쓰기(리다이렉션)'], ['>> <file>', '출력을 파일 끝에 추가']],
  grep: [['-i', '대소문자 무시'], ['-r', '디렉터리를 재귀 검색(결과에 파일명 표시)'], ['<pattern>', '찾을 문자열 또는 정규식'], ['<file>', '검색 대상 파일(또는 -r과 함께 디렉터리)']],
  find: [['[path]', '탐색을 시작할 경로(생략 시 현재)'], ['-name <pat>', '이름 패턴(*, ? 와일드카드 가능)']],
  chmod: [['<octal>', '3자리 8진수 권한(r=4,w=2,x=1 합). 예: 644, 755'], ['<file>', '권한을 바꿀 대상']],
  whoami: [['(인자 없음)', '현재 로그인 사용자명 출력']],
  id: [['(인자 없음)', 'uid/gid/그룹 정보 출력']],
  su: [['[user]', '전환할 사용자(기본 root)'], ['[password]', '대상 비밀번호(게임에선 인자로 직접 입력)']],
  sudo: [['<cmd>', 'root 권한으로 실행할 명령(sudo 허용 시스템에서만)']],
  passwd: [['(시뮬)', '이 시뮬레이터에선 비밀번호를 바꿀 수 없음']],
  base64: [['-d', '디코딩(없으면 인코딩)'], ['<text|file>', '대상 문자열 또는 파일']],
  strings: [['<file>', '4글자 이상 ASCII 문자열만 추출할 파일']],
  xxd: [['<file>', '16진수+ASCII로 덤프할 파일(최대 256바이트)']],
  head: [['-n <N>', '앞에서 N줄 출력(기본 10줄)'], ['[file]', '대상 파일. 생략하면 표준입력']],
  tail: [['-n <N>', '뒤에서 N줄 출력(기본 10줄)'], ['[file]', '대상 파일. 생략하면 표준입력']],
  wc: [['-l', '줄 수'], ['-w', '단어 수'], ['-c', '바이트/문자 수'], ['[file]', '대상 파일. 생략하면 표준입력']],
  sort: [['[file]', '대상 파일. 생략하면 표준입력']],
  uniq: [['[file]', '연속 중복 줄 제거. 생략하면 표준입력']],
  ps: [['(인자 없음)', '실행 중 프로세스 목록(PID/USER/COMMAND)']],
  uname: [['-a', '커널·호스트·아키텍처 전체 정보']],
  clear: [['(인자 없음)', '화면(출력 영역)을 비운다']],
  history: [['(인자 없음)', '입력했던 명령 히스토리 출력']],
  ifconfig: [['(인자 없음)', 'eth0 인터페이스/IP/MAC 정보']],
  ping: [['<host>', '응답을 확인할 호스트 IP 또는 이름']],
  nmap: [['-sV', '서비스 버전까지 탐지(version detection)'], ['<host>', '단일 대상 IP/이름'], ['<subnet>', '대역 스캔(예: 10.0.0.0/24) — 살아있는 호스트 전체']],
  netstat: [['-tlnp', 'TCP/리슨/숫자/프로그램 표시(연결·리슨 포트 목록)']],
  ssh: [['<user>@<host>', '접속할 계정@호스트'], ['[password]', '비밀번호(게임에선 명령 뒤에 인자로 입력)']],
  john: [['<hashfile>', '크랙할 해시가 담긴 파일(사전 공격)']],
  exit: [['(인자 없음)', '원격 접속을 종료하고 이전 호스트로 복귀']],
  disconnect: [['(인자 없음)', '현재 원격 접속을 종료']],
  submit: [['<flag>', '제출할 플래그/정답. flag{...} 전체 또는 안쪽만 가능']],
  save: [['[슬롯]', '저장 슬롯 이름(기본 quick)']],
  load: [['[슬롯]', '불러올 저장 슬롯 이름(기본 quick)']],
  saves: [['(인자 없음)', '저장된 슬롯 목록 표시']],
  mkdir: [['<dir>', '생성할 디렉터리 경로']],
  touch: [['<file>', '생성할 빈 파일(이미 있으면 변화 없음)']],
  rm: [['-r', '디렉터리를 재귀적으로 삭제'], ['<path>', '삭제할 파일/디렉터리(여러 개 가능)']],
  cp: [['<src>', '원본 파일'], ['<dst>', '복사 대상 경로(디렉터리면 그 안에 복사)']],
  mv: [['<src>', '원본 파일'], ['<dst>', '이동/이름변경 대상 경로']],
  scp: [['<src>', '원격/로컬 원본(user@host:/path 형식의 경로부만 사용)'], ['<dst>', '저장 위치(탈취로 기록됨)']],
  export: [['KEY=VAL', '환경변수 설정(따옴표 제거)']],
  env: [['(인자 없음)', '환경변수 전체 목록']],
  top: [['(인자 없음)', 'CPU/메모리 사용량과 함께 프로세스 표시(시뮬)']],
  kill: [['<pid>', '종료할 프로세스 PID']],
  df: [['-h', '사람이 읽기 쉬운 단위로 디스크 사용량']],
  free: [['-h', '사람이 읽기 쉬운 단위로 메모리 사용량']],
  uptime: [['(인자 없음)', '시스템 가동 시간·부하 평균']],
  date: [['(인자 없음)', '현재 시각 출력']],
  arp: [['-a', 'ARP 테이블(IP↔MAC) 전체 표시']],
  route: [['-n', '라우팅 테이블을 숫자(이름해석 없이)로 표시']],
  wget: [['<url>', '다운로드할 URL(시뮬: 응답을 받아 저장)']],
  curl: [['<url>', '요청할 URL(시뮬: 응답 본문 출력)']],
  rot13: [['<text|file>', 'ROT13 변환할 문자열/파일(자기역함수)']],
  caesar: [['<shift>', '시프트 양(0~25)'], ['<text|file>', '복호화할 문자열/파일']],
  xor: [['<hex|file>', 'XOR할 16진수 문자열 또는 파일'], ['<key>', 'XOR 키(반복 적용)']],
  vigenere: [['<key>', '비제네르 키워드'], ['<text|file>', '복호화할 문자열/파일']],
  md5sum: [['<file>', '해시(지문)를 계산할 파일']],
  hydra: [['<host>', '대상 호스트'], ['<service>', '서비스(ssh/ftp/http)'], ['<wordlist>', '대입할 비밀번호 사전 파일']],
  hashcat: [['<hash|file>', '크랙할 단일 해시 또는 해시 파일'], ['-m/-a', '(시뮬) 모드/공격 플래그는 무시되고 사전 대조만 수행']],
  dump: [['<대상>', '추출할 DB/메모리 키(예: users)']],
  'airmon-ng': [['start <iface>', '인터페이스를 모니터 모드로 전환(→ <iface>mon)'], ['stop <iface>', '모니터 모드 해제']],
  'airodump-ng': [['<iface>', '스캔할 모니터 인터페이스(예: wlan0mon). 모니터 모드 필요']],
  'aireplay-ng': [['--deauth <n>', '보낼 인증해제(deauth) 패킷 수'], ['-a <BSSID>', '대상 AP의 BSSID(MAC)'], ['<iface>', '모니터 인터페이스. 클라이언트가 붙은 AP라야 핸드셰이크 캡처']],
  'aircrack-ng': [['-w <wordlist>', '대입할 비밀번호 사전 파일'], ['<capfile>', '캡처 파일(예: capture-01.cap). 핸드셰이크 필요']],
  chat: [['<말>', '현재 채널 상대에게 보낼 말(키워드 분석으로 응답)']],
  reply: [['<말>', 'chat 과 동일 — 현재 채널에 답장']],
  say: [['<말>', 'chat 과 동일 — 현재 채널에 말하기']],
  channel: [['<이름>', '전환할 채널(mother/wraith 등). 인자 없으면 현재+목록 표시']],
  contacts: [['(인자 없음)', '알려진 연락처 목록과 현재 채널 표시']],
  dig: [['axfr', '존 트랜스퍼 시도(설정 오류 시 전체 레코드 노출)'], ['<domain>', '조회할 도메인'], ['@<ns>', '질의할 네임서버']],
  ftp: [['<host>', '접속할 FTP 호스트(hydra로 찾은 자격 사용)']],
  login: [['<user>', '사용자명'], ['<payload>', "SQLi 페이로드(예: ' OR '1'='1' -- / ' UNION SELECT ...)"]],
  tcpdump: [['-r <pcap>', '읽을 캡처 파일'], ['[필터]', '포함 문자열 필터(예: Cookie)']],
  nc: [['-lvnp <port>', '리버스 셸 리스너 대기(listen/verbose/numeric/port)']],
  file: [['<file>', '파일 형식 식별(압축 종류 등)']],
  bunzip2: [['<file.bz2>', 'bzip2 한 겹 해제']],
  gunzip: [['<file.gz>', 'gzip 한 겹 해제']],
  tar: [['-xvf <file.tar>', 'tar 아카이브 해제']],
  steghide: [['extract -sf <img>', '이미지에 숨겨진 데이터 추출'], ['info <img>', '숨김 데이터 정보']],
  mount: [['<dev> <dir>', '디스크 마운트(컨테이너 탈출용 호스트 디스크)']],
  chroot: [['<dir>', '루트 디렉터리 전환(컨테이너 탈출 마무리)']],
  sed: [['-i', '파일을 직접(in-place) 편집'], ["'/패턴/d'", '패턴이 든 줄 삭제'], ['<file>', '대상 파일']],
  systemctl: [['poweroff', '코어 전원 차단(엔딩 트리거)'], ['status', '상태 표시']],
  zip2john: [['<file.zip>', '암호 zip의 해시를 추출(이후 john으로 크랙)']]
};

/* ---------- 파일 탐색 ---------- */
reg('help', '사용 가능한 명령 목록', 'help', ({ game }) => {
  const names = Object.keys(COMMANDS).sort();
  let out = 'available commands (type `man <cmd>` for detail):\n';
  for (let i = 0; i < names.length; i += 5) {
    out += '  ' + names.slice(i, i + 5).map(n => pad(n, 12)).join('') + '\n';
  }
  out += '\ngame commands: objective, hint, levels, restart, theme';
  return out;
});

reg('man', '명령어 매뉴얼', 'man <cmd>', ({ args }) => {
  const c = COMMANDS[args[0]];
  if (!c) return `man: no manual entry for ${args[0] || ''}`;
  let out = `NAME\n    ${c.name} - ${c.desc}\n\nUSAGE\n    ${c.usage}`;
  const opts = OPTS[c.name];
  if (opts && opts.length) {
    out += '\n\nOPTIONS';
    for (const [tok, d] of opts) out += `\n    ${pad(tok, 16)} ${d}`;
  }
  return out;
});

reg('pwd', '현재 경로 출력', 'pwd', ({ game }) => game.cwd);

reg('ls', '디렉터리 목록', 'ls [-l|-a] [path]', ({ args, game }) => {
  const flags = args.filter(a => a.startsWith('-')).join('');
  const targets = args.filter(a => !a.startsWith('-'));
  const path = targets[0] || '.';
  const abs = game.fs.resolve(path, game.cwd);
  const node = game.fs.getNode(abs);
  if (!node) return `ls: cannot access '${path}': No such file or directory`;
  if (node.type === 'file') return node.name;
  let entries = Object.values(node.children);
  if (!flags.includes('a')) entries = entries.filter(e => !e.name.startsWith('.'));
  entries.sort((a, b) => a.name.localeCompare(b.name));
  if (flags.includes('l')) {
    let out = `total ${entries.length}`;
    for (const e of entries) {
      const t = e.type === 'dir' ? 'd' : '-';
      const sz = e.type === 'file' ? (e.content || '').length : 4096;
      const nm = e.type === 'dir' ? e.name + '/' : e.name;
      out += `\n${t}${e.perms}  ${pad(e.owner, 8)} ${pad(sz, 6)} ${nm}`;
    }
    return out;
  }
  return entries.map(e => e.type === 'dir' ? e.name + '/' : e.name).join('  ') || '';
});

reg('cd', '디렉터리 이동', 'cd <path>', ({ args, game }) => {
  const abs = game.fs.resolve(args[0] || '~', game.cwd);
  const node = game.fs.getNode(abs);
  if (!node) return `cd: ${args[0]}: No such file or directory`;
  if (node.type !== 'dir') return `cd: ${args[0]}: Not a directory`;
  if (!game.fs.canExec(node, game.user)) return `cd: ${args[0]}: Permission denied`;
  game.cwd = abs === '' ? '/' : abs;
  return '';
});

reg('cat', '파일 내용 출력', 'cat <file>', ({ args, game, stdin }) => {
  if (!args[0]) return stdin || 'cat: missing file operand';
  const out = [];
  for (const a of args) {
    const abs = game.fs.resolve(a, game.cwd);
    const node = game.fs.getNode(abs);
    if (!node) { out.push(`cat: ${a}: No such file or directory`); continue; }
    if (node.type === 'dir') { out.push(`cat: ${a}: Is a directory`); continue; }
    if (!game.fs.canRead(node, game.user)) { out.push(`cat: ${a}: Permission denied`); continue; }
    game.readFiles.add(abs);
    out.push(node.content);
  }
  return out.join('\n');
});

reg('echo', '문자열 출력', 'echo <text>', ({ args }) => args.join(' ').replace(/^["']|["']$/g, ''));

reg('grep', '패턴 검색', 'grep <pattern> <file>', ({ args, game, stdin }) => {
  const flags = args.filter(a => a.startsWith('-')).join('');
  const rest = args.filter(a => !a.startsWith('-'));
  const pattern = (rest[0] || '').replace(/^["']|["']$/g, '');
  const fileArg = rest[1];
  if (!pattern) return 'usage: grep [-i|-r] <pattern> <file>';
  const re = new RegExp(pattern, (flags.includes('i') ? 'i' : '') + (flags.includes('o') ? 'g' : ''));
  const matchInFile = (node, label) => {
    if (!game.fs.canRead(node, game.user)) return [];
    game.readFiles.add(label);
    const ls = (node.content || '').split('\n');
    if (flags.includes('o')) { const r = []; ls.forEach(l => { const mm = l.match(re); if (mm) r.push.apply(r, mm); }); return r; }
    return ls.filter(l => re.test(l)).map(l => flags.includes('r') ? `${label}: ${l}` : l);
  };
  if (!fileArg && stdin != null && stdin !== '') {
    const ls = String(stdin).split('\n');
    if (flags.includes('o')) { const r = []; ls.forEach(l => { const mm = l.match(re); if (mm) r.push.apply(r, mm); }); return r.join('\n'); }
    return ls.filter(l => re.test(l)).join('\n');
  }
  if (!fileArg) return 'usage: grep [-i|-r] <pattern> <file>';
  const abs = game.fs.resolve(fileArg, game.cwd);
  const node = game.fs.getNode(abs);
  if (!node) return `grep: ${fileArg}: No such file or directory`;
  if (node.type === 'file') return matchInFile(node, abs).join('\n');
  // 디렉터리 + -r: 재귀 검색
  if (!flags.includes('r')) return `grep: ${fileArg}: Is a directory`;
  let res = [];
  const walk = (d, p) => {
    for (const e of Object.values(d.children)) {
      const ep = p + '/' + e.name;
      if (e.type === 'file') res = res.concat(matchInFile(e, ep));
      else walk(e, ep);
    }
  };
  walk(node, abs);
  return res.join('\n');
});

reg('find', '파일 검색', 'find [path] -name <pat> | -perm -4000', ({ args, game }) => {
  if (args.includes('-perm')) { game.suidSearched = true; return (game.suidFiles || []).join('\n'); }  // SUID 탐색
  let start = '.', name = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-name') { name = (args[i + 1] || '').replace(/["']/g, ''); i++; }
    else if (!args[i].startsWith('-')) start = args[i];
  }
  const abs = game.fs.resolve(start, game.cwd);
  const node = game.fs.getNode(abs);
  if (!node) return `find: '${start}': No such file or directory`;
  const re = name ? new RegExp('^' + name.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$') : null;
  const res = [];
  const walk = (n, p) => {
    if (!re || re.test(n.name) || (p === abs && !name)) {
      if (!re || re.test(n.name)) res.push(p);
    }
    if (n.type === 'dir') for (const e of Object.values(n.children)) walk(e, p + '/' + e.name);
  };
  walk(node, abs);
  return res.join('\n');
});

reg('chmod', '권한 변경', 'chmod <octal> <file>', ({ args, game }) => {
  const mode = args[0], target = args[1];
  if (!mode || !target) return 'usage: chmod <octal> <file>';
  const abs = game.fs.resolve(target, game.cwd);
  const node = game.fs.getNode(abs);
  if (!node) return `chmod: cannot access '${target}': No such file or directory`;
  if (game.user !== 'root' && node.owner !== game.user) return `chmod: changing permissions of '${target}': Operation not permitted`;
  if (/^[0-7]{3}$/.test(mode)) { node.perms = window.FS.octalToPerms(mode); return ''; }
  const sym = mode.match(/^[ugoa]*([+-])([rwx]+)$/);   // 기호 모드(예: +x)
  if (sym) {
    const op = sym[1]; const p = node.perms.split('');
    const idx = { r: [0, 3, 6], w: [1, 4, 7], x: [2, 5, 8] };
    for (const ch of sym[2]) for (const i of idx[ch]) p[i] = op === '+' ? ch : '-';
    node.perms = p.join(''); return '';
  }
  return 'chmod: invalid mode (예: 755 또는 +x)';
});

/* ---------- 사용자/권한 ---------- */
reg('whoami', '현재 사용자', 'whoami', ({ game }) => game.user);
reg('id', '사용자 정보', 'id', ({ game }) =>
  game.user === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1000(guest) gid=1000(guest) groups=1000(guest)');

reg('su', '사용자 전환', 'su [user] [password]', ({ args, game }) => {
  const target = args[0] || 'root';
  const pw = game.passwords && game.passwords[target];
  if (!pw) return `su: user ${target} does not exist`;
  const given = args[1];
  if (!given) return `Password: (이 게임에서는 'su ${target} <password>' 형식으로 입력하세요)`;
  if (given === pw) { game.user = target; return ''; }
  return 'su: Authentication failure';
});

reg('sudo', '관리자 권한 실행', 'sudo <cmd>', ({ args, game, raw }) => {
  if (!game.sudoAllowed) return `[sudo] password for ${game.user}: \nSorry, user ${game.user} may not run sudo on ${game.host}.`;
  if (!args.length) return 'usage: sudo <command>';
  // sudo로 root 권한 일시 실행
  const prevUser = game.user;
  game.user = 'root';
  const sub = raw.replace(/^\s*sudo\s+/, '');
  const res = game.exec(sub, true);
  game.user = prevUser;
  return res;
});

reg('passwd', '비밀번호(시뮬)', 'passwd', () => 'passwd: 이 시뮬레이터에서는 비밀번호를 변경할 수 없습니다.');

/* ---------- 인코딩/분석 ---------- */
reg('base64', 'base64 인코딩/디코딩', 'base64 [-d] <text|file>', ({ args, game, stdin }) => {
  const dec = args.includes('-d');
  const rest = args.filter(a => a !== '-d');
  let data = rest.length ? rest.join(' ') : (stdin || '');
  const abs = game.fs.resolve(data, game.cwd);
  const node = game.fs.getNode(abs);
  if (node && node.type === 'file') data = node.content;
  try {
    return dec ? decodeURIComponent(escape(atob(data.trim()))) : btoa(unescape(encodeURIComponent(data)));
  } catch (e) { return 'base64: invalid input'; }
});

reg('strings', '바이너리 내 문자열 추출(시뮬)', 'strings <file>', ({ args, game }) => {
  const abs = game.fs.resolve(args[0] || '', game.cwd);
  const node = game.fs.getNode(abs);
  if (!node || node.type !== 'file') return `strings: '${args[0]}': No such file`;
  game.readFiles.add(abs);
  return (node.content.match(/[\x20-\x7e]{4,}/g) || []).join('\n');
});

reg('xxd', '16진수 덤프(시뮬)', 'xxd <file>', ({ args, game }) => {
  const abs = game.fs.resolve(args[0] || '', game.cwd);
  const node = game.fs.getNode(abs);
  if (!node || node.type !== 'file') return `xxd: '${args[0]}': No such file`;
  game.readFiles.add(abs);
  const bytes = node.content.slice(0, 256);
  let out = '';
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = chunk.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    out += `${i.toString(16).padStart(8, '0')}: ${pad(hex, 48)} ${chunk.replace(/[^\x20-\x7e]/g, '.')}\n`;
  }
  return out.trim();
});

function readTextInput(args, game, stdin, label) {
  const fileArg = (args || []).filter(a => !a.startsWith('-'))[0];
  if (!fileArg) return { text: stdin || '', name: '' };
  const abs = game.fs.resolve(fileArg, game.cwd);
  const node = game.fs.getNode(abs);
  if (!node || node.type !== 'file') return { err: `${label}: cannot open '${fileArg}' for reading: No such file or directory` };
  if (!game.fs.canRead(node, game.user)) return { err: `${label}: ${fileArg}: Permission denied` };
  game.readFiles && game.readFiles.add(abs);
  return { text: node.content || '', name: fileArg };
}

function nArg(args, def) {
  const i = args.indexOf('-n');
  if (i >= 0 && /^\d+$/.test(args[i + 1] || '')) return parseInt(args[i + 1], 10);
  const short = args.find(a => /^-\d+$/.test(a));
  return short ? parseInt(short.slice(1), 10) : def;
}

reg('head', '앞부분 출력', 'head [-n N] [file]', ({ args, game, stdin }) => {
  const src = readTextInput(args.filter((a, i) => !(a === '-n' || args[i - 1] === '-n' || /^-\d+$/.test(a))), game, stdin, 'head');
  if (src.err) return src.err;
  return src.text.split('\n').slice(0, nArg(args, 10)).join('\n');
});

reg('tail', '끝부분 출력', 'tail [-n N] [file]', ({ args, game, stdin }) => {
  const src = readTextInput(args.filter((a, i) => !(a === '-n' || args[i - 1] === '-n' || /^-\d+$/.test(a))), game, stdin, 'tail');
  if (src.err) return src.err;
  const n = nArg(args, 10);
  return src.text.split('\n').slice(-n).join('\n');
});

reg('wc', '줄/단어/문자 수 계산', 'wc [-l|-w|-c] [file]', ({ args, game, stdin }) => {
  const src = readTextInput(args, game, stdin, 'wc');
  if (src.err) return src.err;
  const text = src.text;
  const flags = args.filter(a => a.startsWith('-')).join('');
  const counts = [];
  const wantAny = flags.includes('l') || flags.includes('w') || flags.includes('c');
  if (!wantAny || flags.includes('l')) counts.push(String(text ? text.split('\n').length : 0).padStart(7));
  if (!wantAny || flags.includes('w')) counts.push(String((text.trim().match(/\S+/g) || []).length).padStart(7));
  if (!wantAny || flags.includes('c')) counts.push(String(text.length).padStart(7));
  return counts.join('') + (src.name ? ' ' + src.name : '');
});

reg('sort', '줄 정렬', 'sort [file]', ({ args, game, stdin }) => {
  const src = readTextInput(args, game, stdin, 'sort');
  if (src.err) return src.err;
  return src.text.split('\n').sort((a, b) => a.localeCompare(b)).join('\n');
});

reg('uniq', '연속 중복 줄 제거', 'uniq [file]', ({ args, game, stdin }) => {
  const src = readTextInput(args, game, stdin, 'uniq');
  if (src.err) return src.err;
  const out = [];
  for (const line of src.text.split('\n')) if (!out.length || out[out.length - 1] !== line) out.push(line);
  return out.join('\n');
});

/* ---------- 프로세스/시스템 ---------- */
reg('ps', '프로세스 목록', 'ps', ({ game }) => {
  const procs = game.processes || [{ pid: 1, user: 'root', cmd: '/sbin/init' }];
  let out = '  PID USER     COMMAND';
  for (const p of procs) out += `\n${pad(p.pid, 5)} ${pad(p.user, 8)} ${p.cmd}`;
  return out;
});

reg('uname', '시스템 정보', 'uname [-a]', ({ game }) =>
  'Linux ' + game.host + ' 5.15.0-breach #1 SMP x86_64 GNU/Linux');

reg('clear', '화면 지우기', 'clear', ({ game }) => { game.clearScreen(); return ''; });
reg('history', '명령 히스토리', 'history', ({ game }) =>
  game.history.map((h, i) => `${pad(i + 1, 4)}  ${h}`).join('\n'));

/* ---------- 네트워크 ---------- */
reg('ifconfig', '네트워크 인터페이스', 'ifconfig', ({ game }) =>
  `eth0: flags=4163<UP>  mtu 1500\n      inet ${game.ip || '10.0.0.42'}  netmask 255.255.255.0\n      ether de:ad:be:ef:00:42`);

reg('ping', '호스트 응답 확인', 'ping <host>', ({ args, game }) => {
  const host = args[0];
  if (!host) return 'usage: ping <host>';
  const target = (game.network || []).find(h => h.ip === host || h.name === host);
  if (!target) return `ping: ${host}: Name or service not known`;
  game.pinged = game.pinged || new Set(); game.pinged.add(host);
  return `PING ${host}: 56 data bytes\n64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.42 ms\n64 bytes from ${host}: icmp_seq=2 ttl=64 time=0.38 ms\n--- ${host} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;
});

reg('nmap', '포트 스캔(시뮬)', 'nmap <host>', ({ args, game }) => {
  const host = args.filter(a => !a.startsWith('-'))[0];
  if (!host) return 'usage: nmap [-sV] <host|subnet>';
  game.scanned = game.scanned || new Set();
  // 서브넷 스캔
  if (host.includes('/')) {
    let out = `Starting Nmap scan on ${host}\n`;
    for (const h of (game.network || [])) {
      game.scanned.add(h.ip);
      out += `\nNmap scan report for ${h.name} (${h.ip})\nHost is up (0.0010s latency).`;
      out += '\n' + h.ports.map(p => `${pad(p.port + '/tcp', 10)} open   ${p.service}`).join('\n');
    }
    return out + '\n\nNmap done: ' + (game.network || []).length + ' hosts up';
  }
  const target = (game.network || []).find(h => h.ip === host || h.name === host);
  if (!target) return `nmap: Failed to resolve "${host}"`;
  game.scanned.add(target.ip);
  let out = `Starting Nmap scan on ${target.name} (${target.ip})\nHost is up (0.0010s latency).\n\nPORT       STATE  SERVICE`;
  for (const p of target.ports) {
    out += `\n${pad(p.port + '/tcp', 10)} open   ${p.service}` + (args.includes('-sV') && p.version ? `  ${p.version}` : '');
  }
  return out + `\n\nNmap done -- 1 IP address (1 host up) scanned`;
});

reg('netstat', '네트워크 연결 상태', 'netstat [-tlnp]', ({ game }) => {
  const conns = game.connections || [{ proto: 'tcp', local: '0.0.0.0:22', state: 'LISTEN', prog: 'sshd' }];
  let out = 'Proto Local Address          State       Program';
  for (const c of conns) out += `\n${pad(c.proto, 5)} ${pad(c.local, 22)} ${pad(c.state, 11)} ${c.prog || ''}`;
  return out;
});

reg('ssh', '원격 접속(시뮬)', 'ssh [-L l:h:p] <user>@<host> [password]', ({ args, game }) => {
  const spec = args.find(a => /@/.test(a)) || args[0] || '';
  const hasL = args.includes('-L');
  const m = spec.match(/^([^@]+)@(.+)$/);
  if (!m) return 'usage: ssh user@host <password>';
  const [, user, host] = m;
  const passIdx = args.indexOf(spec) + 1;
  const target = (game.network || []).find(h => h.ip === host || h.name === host);
  if (!target) return `ssh: connect to host ${host}: No route to host`;
  const sshd = target.ports.find(p => p.port === 22);
  if (!sshd) return `ssh: connect to host ${host} port 22: Connection refused`;
  const password = args[passIdx];
  const creds = target.creds || {};
  if (!password) return `${user}@${host}'s password: (게임에서는 'ssh ${user}@${host} <password>' 형식으로 입력)`;
  if (creds[user] && creds[user] === password) {
    game.connect && game.connect(target, user);
    game.onSshSuccess && game.onSshSuccess(target, user);
    if (hasL) { game.tunnelOpen = true; const fw = (target.tunnel || {}); for (const k in fw) { game.web = game.web || {}; game.web[k] = fw[k]; } }
    return [
      `[*] establishing encrypted tunnel → ${host} ...` + (hasL ? '  (포트 포워딩 활성)' : ''),
      `    handshake   ${bar(100)}  OK`,
      `    auth ${user} ${bar(100)}  OK`,
      `╔══════════════════════════════════════════════╗`,
      `║  ⚡ CONNECTION ESTABLISHED                     `,
      `║  ${user}@${target.name} (${host})`,
      `╚══════════════════════════════════════════════╝`,
      `  ${target.name} 의 셸을 장악했다. (exit 로 연결 종료)`
    ].join('\n');
  }
  return 'Permission denied (publickey,password).';
});

reg('john', '비밀번호 크래킹(시뮬)', 'john <hashfile>', ({ args, game }) => {
  const abs = game.fs.resolve(args[0] || '', game.cwd);
  const node = game.fs.getNode(abs);
  if (!node || node.type !== 'file') return `john: file '${args[0]}' not found`;
  game.readFiles.add(abs);
  const cracked = game.crackable || {};
  const lines = node.content.split('\n').filter(Boolean);
  let out = 'Loaded ' + lines.length + ' password hash(es)\n[CRACK] ' + bar(100) + '  (dictionary: rockyou.txt)\n';
  let any = false;
  for (const l of lines) {
    const hash = l.includes(':') ? l.split(':').pop().trim() : l.trim();
    if (cracked[hash]) { out += `${cracked[hash]}  (${l.split(':')[0] || '?'})\n`; any = true; game.cracked = game.cracked || new Set(); game.cracked.add(cracked[hash]); }
  }
  return out + (any ? 'Session completed' : 'No passwords cracked (guesses: 100000)');
});

reg('exit', '원격 접속 종료', 'exit', ({ game }) => {
  if (game.disconnect && game.connStack && game.connStack.length) { return game.disconnect(); }
  return 'logout';
});
reg('disconnect', '원격 접속 종료', 'disconnect', ({ game }) => {
  if (game.disconnect && game.connStack && game.connStack.length) { return game.disconnect(); }
  return 'not connected to any remote host';
});

/* ---------- 게임 전용 ---------- */
reg('submit', '플래그 제출', 'submit <flag>', ({ args, game }) => {
  const flag = args.join(' ').trim();
  if (!flag) return 'usage: submit <답>   (예: submit flag{...} — 중괄호 안쪽만 넣어도 됩니다)';
  game.lastSubmit = flag;
  game.submitted = game.submitted || new Set();
  game.submitted.add(flag);
  // 관대한 제출: flag{xxx} ↔ xxx 양쪽 형태를 모두 등록
  const m = flag.match(/^flag\{(.*)\}$/i);
  if (m) game.submitted.add(m[1]);                 // 전체를 넣으면 안쪽도 인정
  else game.submitted.add('flag{' + flag + '}');   // 안쪽만 넣으면 전체형도 인정
  return `[*] 제출됨: ${flag}`;
});

/* ============================================================
 *  v2 확장: 저장/불러오기 · 파일조작 · 시스템 · 암호 · 브루트
 * ============================================================ */

/* ---------- 저장/불러오기 (유닉스 명령) ---------- */
reg('save', '진행 상황 저장', 'save [슬롯]', ({ args, game }) => game.saveSlot(args[0] || 'quick'));
reg('load', '저장 불러오기', 'load [슬롯]', ({ args, game }) => game.loadSlot(args[0] || 'quick'));
reg('saves', '저장 슬롯 목록', 'saves', ({ game }) => game.listSaves());

/* ---------- 파일 조작 (실제 PC 흉내) ---------- */
reg('mkdir', '디렉터리 생성', 'mkdir <dir>', ({ args, game }) => {
  if (!args[0]) return 'usage: mkdir <dir>';
  const r = game.fs.makeNode(game.fs.resolve(args[0], game.cwd), 'dir', game.user);
  return r.err ? `mkdir: ${args[0]}: ${r.err}` : '';
});
reg('touch', '파일 생성 / 시간 변경', 'touch [-t YYYYMMDDhhmm] <file>', ({ args, game }) => {
  const ti = args.indexOf('-t');
  const ts = ti >= 0 ? args[ti + 1] : null;
  const file = args.filter(a => !a.startsWith('-') && a !== ts)[0];
  if (!file) return 'usage: touch [-t YYYYMMDDhhmm] <file>';
  const abs = game.fs.resolve(file, game.cwd);
  let node = game.fs.getNode(abs);
  if (!node) { const r = game.fs.makeNode(abs, 'file', game.user); if (r.err) return `touch: ${file}: ${r.err}`; node = r.node; }
  if (ts) { node.mtime = ts; game.timestomped = file; }   // 타임스톰핑
  return '';
});
reg('zip2john', 'zip 해시 추출(시뮬)', 'zip2john <file.zip>', ({ args, game }) => {
  const abs = game.fs.resolve(args[0] || '', game.cwd);
  const n = game.fs.getNode(abs);
  if (!n || n.type !== 'file') return `zip2john: ${args[0]}: 없음`;
  return `${args[0]}:${n.ziphash || ('$zip2$*0*' + (args[0] || 'data'))}`;
});
reg('rm', '파일/디렉터리 삭제', 'rm [-r] <path>', ({ args, game }) => {
  const targets = args.filter(a => !a.startsWith('-'));
  if (!targets[0]) return 'usage: rm [-r] <path>';
  const out = [];
  for (const tgt of targets) {
    const abs = game.fs.resolve(tgt, game.cwd);
    const node = game.fs.getNode(abs);
    if (!node) { out.push(`rm: ${tgt}: No such file or directory`); continue; }
    if (node.type === 'dir' && !args.includes('-r')) { out.push(`rm: ${tgt}: is a directory`); continue; }
    const r = game.fs.remove(abs, game.user);
    if (r.err) out.push(`rm: ${tgt}: ${r.err}`);
  }
  return out.join('\n');
});
function copyMove(args, game, isMove, label) {
  const rest = args.filter(a => !a.startsWith('-'));
  const src = rest[0], dst = rest[1];
  if (!src || !dst) return `usage: ${label} <src> <dst>`;
  const sAbs = game.fs.resolve(src, game.cwd);
  const sNode = game.fs.getNode(sAbs);
  if (!sNode) return `${label}: ${src}: No such file or directory`;
  if (sNode.type === 'dir') return `${label}: ${src}: 디렉터리는 미지원 (파일만)`;
  if (!game.fs.canRead(sNode, game.user)) return `${label}: ${src}: Permission denied`;
  let dAbs = game.fs.resolve(dst, game.cwd);
  const dNode = game.fs.getNode(dAbs);
  if (dNode && dNode.type === 'dir') dAbs = dAbs + '/' + game.fs.basename(sAbs);
  const r = game.fs.writePath(dAbs, sNode.content, { append: false, user: game.user });
  if (r.err) return `${label}: ${dst}: ${r.err}`;
  if (isMove) game.fs.remove(sAbs, game.user);
  return '';
}
reg('cp', '파일 복사', 'cp <src> <dst>', ({ args, game }) => copyMove(args, game, false, 'cp'));
reg('mv', '파일 이동/이름변경', 'mv <src> <dst>', ({ args, game }) => copyMove(args, game, true, 'mv'));
reg('scp', '원격 파일 복사(탈취)', 'scp <src> <dst>', ({ args, game }) => {
  // user@host:/path 형식은 경로만 사용 (현재 접속 맥락 기준)
  const norm = args.map(a => a.replace(/^[^@]*@[^:]*:/, '').replace(/^[^:]*:/, ''));
  const res = copyMove(norm, game, false, 'scp');
  if (res === '') {
    const dst = norm.filter(a => !a.startsWith('-'))[1];
    game.exfiltrated = game.exfiltrated || new Set();
    game.exfiltrated.add(game.fs.basename(game.fs.resolve(dst, game.cwd)));
    return `[*] 전송 완료: ${args[0]} -> ${args[1]}`;
  }
  return res;
});

/* ---------- 시스템 (실제 PC 흉내) ---------- */
reg('export', '환경변수 설정', 'export KEY=VAL', ({ args, game }) => {
  game.env = game.env || {};
  for (const a of args) { const m = a.match(/^([^=]+)=(.*)$/); if (m) game.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  return '';
});
reg('env', '환경변수 목록', 'env', ({ game }) => {
  const base = { USER: game.user, HOME: '/home/' + game.user, HOST: game.host, PWD: game.cwd, SHELL: '/bin/breachsh', PATH: '/usr/bin:/bin:/sbin' };
  const all = Object.assign(base, game.env || {});
  return Object.entries(all).map(([k, v]) => `${k}=${v}`).join('\n');
});
reg('top', '실시간 프로세스(시뮬)', 'top', ({ game }) => {
  const procs = game.processes || [{ pid: 1, user: 'root', cmd: '/sbin/init' }];
  let out = 'top - load average: 0.08, 0.03, 0.01\nTasks: ' + procs.length + ' total\n  PID USER     %CPU %MEM COMMAND';
  for (const p of procs) out += `\n${pad(p.pid, 5)} ${pad(p.user, 8)} ${pad((p.cpu || 0.3).toFixed(1), 4)} ${pad((p.mem || 1.2).toFixed(1), 4)} ${p.cmd}`;
  return out;
});
reg('kill', '프로세스 종료(시뮬)', 'kill <pid>', ({ args, game }) => {
  const pid = +args[args.length - 1];
  game.processes = (game.processes || []).filter(p => p.pid !== pid);
  game.killed = game.killed || new Set(); game.killed.add(pid);
  return '';
});
reg('df', '디스크 사용량', 'df -h', () => 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/breach0     40G   12G   26G  32% /\ntmpfs           2.0G     0  2.0G   0% /tmp');
reg('free', '메모리 사용량', 'free -h', () => '              total        used        free\nMem:           7.7Gi       2.1Gi       5.6Gi\nSwap:          2.0Gi          0B       2.0Gi');
reg('uptime', '가동 시간', 'uptime', () => ' up 13 days,  4:20,  1 user,  load average: 0.08, 0.03, 0.01');
reg('date', '현재 시각', 'date', () => new Date().toString());
reg('arp', 'ARP 테이블', 'arp -a', ({ game }) => (game.network || []).map(h => `${h.name} (${h.ip}) at de:ad:be:ef:${(h.ip.split('.').pop() | 0).toString(16).padStart(2, '0')}:01 [ether] on eth0`).join('\n') || 'no entries');
reg('route', '라우팅 테이블', 'route -n', ({ game }) => `Kernel IP routing table\nDestination     Gateway         Flags\n0.0.0.0         ${(game.ip || '10.0.0.1').replace(/\.\d+$/, '.1')}   UG\n${(game.ip || '10.0.0.42').replace(/\.\d+$/, '.0')}      0.0.0.0         U`);
reg('wget', '파일 다운로드(시뮬)', 'wget <url>', ({ args, game }) => {
  if (!args[0]) return 'usage: wget <url>';
  const data = (game.web && game.web[args[0]]) || '404 Not Found';
  return `--  ${args[0]}\nHTTP request sent... 200 OK\nSaved.\n${data}`;
});
reg('curl', 'HTTP 요청(시뮬)', 'curl <url>', ({ args, game }) => {
  const rest = args.filter(a => !a.startsWith('-') && a !== 'POST');
  const url = rest.find(a => /^https?:\/\/|^localhost|^\//.test(a)) || rest[rest.length - 1] || '';
  if (!url) return 'usage: curl <url>';
  // 파일 업로드 (-X POST -F file=@...)
  if (args.includes('POST') || args.some(a => a.startsWith('-F'))) {
    if (game.uploadEndpoint && url.indexOf(game.uploadEndpoint) !== -1) { game.uploaded = true; return '[*] 200 OK — 파일 업로드 성공 (uploads/ 에 저장됨). 이제 백도어를 깨워라.'; }
    return '[*] 업로드 대상이 아니다';
  }
  // LFI (?file=../../../etc/passwd)
  const lfi = url.match(/[?&]file=([^&\s]+)/);
  if (lfi) {
    const p = '/' + decodeURIComponent(lfi[1]).replace(/^(\.\.\/|\.\/|\/)+/, '');
    if (game.remoteFiles && Object.prototype.hasOwnProperty.call(game.remoteFiles, p)) {
      game.lfiRead = p;
      return game.remoteFiles[p];
    }
    const n = game.fs.getNode(p);
    if (n && n.type === 'file') { game.lfiRead = p; game.readFiles && game.readFiles.add(p); return n.content; }
    return `[!] file not found: ${p}`;
  }
  // 웹쉘 트리거 → 리버스 셸
  if (game.webshellUrl && url.indexOf(game.webshellUrl) !== -1) {
    if (!game.ncListening) return '[*] 백도어 호출됨 — 받을 리스너가 없다 (nc -lvnp 먼저).';
    const t = game.reverseTarget;
    if (t) { game.connect && game.connect(t, t.shellUser || 'www-data'); game.onSshSuccess && game.onSshSuccess(t, 'www-data'); }
    return '[*] 백도어 실행 → 리버스 셸 연결 성립! HELIOS 내부망 거점 확보.';
  }
  return (game.web && (game.web[url] || game.web[args[0]])) || `curl: (6) Could not resolve host: ${url}`;
});

/* ---------- 암호화/복호화 ---------- */
function rot13(s) { return s.replace(/[a-zA-Z]/g, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); }); }
function readArg(game, a) { const n = game.fs.getNode(game.fs.resolve(a || '', game.cwd)); if (n && n.type === 'file') { game.readFiles.add(game.fs.resolve(a, game.cwd)); return n.content.trim(); } return a; }
reg('rot13', 'ROT13 변환', 'rot13 <text|file>', ({ args, game }) => rot13(readArg(game, args.join(' '))));
reg('caesar', '카이사르 시프트 복호화', 'caesar <shift> <text|file>', ({ args, game }) => {
  const shift = ((parseInt(args[0], 10) || 0) % 26 + 26) % 26;
  const text = readArg(game, args.slice(1).join(' '));
  return text.replace(/[a-zA-Z]/g, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + (26 - shift)) % 26 + b); });
});
reg('xor', 'XOR 복호화 (hex/문자열, 키)', 'xor <hex|file> <key>', ({ args, game }) => {
  const raw = readArg(game, args[0]);
  const key = args[1] || '';
  if (!key) return 'usage: xor <hexOrFile> <key>';
  let bytes;
  if (/^[0-9a-fA-F\s]+$/.test(raw) && raw.replace(/\s/g, '').length % 2 === 0) {
    bytes = raw.replace(/\s/g, '').match(/.{2}/g).map(h => parseInt(h, 16));
  } else { bytes = raw.split('').map(c => c.charCodeAt(0)); }
  return bytes.map((b, i) => String.fromCharCode(b ^ key.charCodeAt(i % key.length))).join('');
});
reg('vigenere', '비제네르 복호화', 'vigenere <key> <text|file>', ({ args, game }) => {
  const key = (args[0] || '').toLowerCase();
  const text = readArg(game, args.slice(1).join(' '));
  if (!key) return 'usage: vigenere <key> <text>';
  let ki = 0;
  return text.replace(/[a-zA-Z]/g, c => {
    const b = c <= 'Z' ? 65 : 97;
    const k = key.charCodeAt(ki % key.length) - 97; ki++;
    return String.fromCharCode((c.charCodeAt(0) - b + (26 - k)) % 26 + b);
  });
});
reg('md5sum', 'MD5 해시(시뮬)', 'md5sum <file>', ({ args, game }) => {
  const n = game.fs.getNode(game.fs.resolve(args[0] || '', game.cwd));
  if (!n || n.type !== 'file') return `md5sum: ${args[0]}: No such file`;
  let h = 0; for (const ch of n.content) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(16).padStart(8, '0').repeat(4) + '  ' + args[0];
});

/* ---------- 무차별대입 / 암호추출 ---------- */
reg('hydra', '무차별 대입 공격(시뮬)', 'hydra <host> <service> <wordlist>', ({ args, game }) => {
  const rest = args.filter(a => !a.startsWith('-'));
  const host = rest[0], service = rest[1] || 'ssh', wl = rest[2];
  if (!host || !wl) return 'usage: hydra <host> <ssh|ftp|http> <wordlist.txt>';
  const target = (game.network || []).find(h => h.ip === host || h.name === host);
  if (!target) return `hydra: could not resolve ${host}`;
  const wlNode = game.fs.getNode(game.fs.resolve(wl, game.cwd));
  if (!wlNode || wlNode.type !== 'file') return `hydra: could not open wordlist ${wl}`;
  const words = wlNode.content.split('\n').map(s => s.trim()).filter(Boolean);
  const creds = target.creds || {};
  let found = null;
  for (const u of Object.keys(creds)) { for (const w of words) { if (creds[u] === w) { found = { u, w }; break; } } if (found) break; }
  game.hydraFound = game.hydraFound || {};
  let out = `Hydra v9.5 starting\n[DATA] attacking ${service}://${host} (${words.length} passwords)\n[BRUTE] ${bar(100)}\n`;
  if (found) { game.hydraFound[target.ip] = found; out += `[${service}] host: ${host}   login: ${found.u}   password: ${found.w}\n1 of 1 target successfully completed, 1 valid password found`; }
  else out += '0 valid passwords found — 워드리스트를 확인하라';
  return out;
});
reg('hashcat', '해시 크래킹(시뮬)', 'hashcat <hash|file>', ({ args, game }) => {
  const cand = args.filter(a => !a.startsWith('-')).pop() || '';
  const node = game.fs.getNode(game.fs.resolve(cand, game.cwd));
  const hashes = node && node.type === 'file' ? node.content.split('\n').map(s => s.trim()).filter(Boolean) : [cand];
  const table = game.crackable || {};
  game.cracked = game.cracked || new Set();
  let out = 'hashcat (v6.2) starting...\n[GPU] ' + bar(100) + '  9842.1 kH/s\n', any = false;
  for (const line of hashes) {
    const h = line.includes(':') ? line.split(':').pop() : line;
    if (table[h]) { out += `${h}:${table[h]}\n`; game.cracked.add(table[h]); any = true; }
  }
  return out + (any ? 'Status: Cracked' : 'Status: Exhausted (no match)');
});
reg('dump', 'DB/메모리 자격증명 추출(시뮬)', 'dump <대상>', ({ args, game }) => {
  const key = args[0] || '';
  const data = (game.dumps && (game.dumps[key] || game.dumps['*']));
  if (!data) return `dump: '${key}' 대상을 찾을 수 없다 (가능: ${Object.keys(game.dumps || {}).join(', ') || '없음'})`;
  game.dumped = game.dumped || new Set(); game.dumped.add(key);
  return data;
});

/* ---------- 무선(WiFi) — aircrack-ng 스위트 (시뮬) ---------- */
reg('airmon-ng', '무선 모니터 모드 전환(시뮬)', 'airmon-ng start <iface>', ({ args, game }) => {
  if (args[0] === 'start') {
    const ifc = args[1] || 'wlan0';
    game.monitorMode = true; game.monIface = ifc + 'mon';
    return `PHY     Interface   Driver   Chipset\nphy0    ${ifc}       ath9k    Atheros AR9271\n\n  (mac80211 monitor mode vif enabled for [phy0]${ifc} on [phy0]${game.monIface})\n  ${ifc} 가 모니터 모드로 전환됨 → ${game.monIface}`;
  }
  if (args[0] === 'stop') { game.monitorMode = false; return 'monitor mode disabled'; }
  return 'PHY     Interface   Driver   Chipset\nphy0    wlan0       ath9k    Atheros AR9271\n\nusage: airmon-ng start wlan0';
});

reg('airodump-ng', '주변 AP/클라이언트 스캔(시뮬)', 'airodump-ng <iface>', ({ args, game }) => {
  if (!game.monitorMode) return 'airodump-ng: 인터페이스가 모니터 모드가 아니다. 먼저 `airmon-ng start wlan0`.';
  const nets = game.wifi || [];
  if (!nets.length) return ' (주변에 잡히는 AP가 없다)';
  game.wifiScanned = true;
  let out = ' CH  ENC    PWR  #Data  CLIENTS  BSSID               ESSID';
  for (const w of nets) {
    out += `\n ${pad(w.ch, 3)} ${pad(w.enc, 6)} ${pad(-(38 + (w.ch * 3) % 25), 4)} ${pad((w.ch * 17) % 300, 6)} ${pad(w.clients || 0, 8)} ${w.bssid}   ${w.essid}`;
  }
  out += '\n\n[*] 클라이언트(CLIENTS)가 붙은 WPA2 AP가 핸드셰이크 캡처에 유리하다.';
  return out;
});

reg('aireplay-ng', '패킷 주입/deauth(시뮬)', 'aireplay-ng --deauth <n> -a <BSSID> <iface>', ({ args, game }) => {
  if (!game.monitorMode) return 'aireplay-ng: 모니터 모드가 필요하다. `airmon-ng start wlan0`.';
  if (!game.wifiScanned) return 'aireplay-ng: 먼저 `airodump-ng` 로 대상을 스캔하라.';
  const bi = args.indexOf('-a');
  const bssid = bi >= 0 ? args[bi + 1] : null;
  if ((!args.includes('--deauth') && !args.includes('-0')) || !bssid) return 'usage: aireplay-ng --deauth 10 -a <BSSID> wlan0mon';
  const ap = (game.wifi || []).find(w => w.bssid.toLowerCase() === String(bssid).toLowerCase());
  if (!ap) return `aireplay-ng: BSSID ${bssid} 를 찾을 수 없다 (airodump 목록을 확인).`;
  if (!ap.clients) return `aireplay-ng: ${ap.essid} 에 붙은 클라이언트가 없다 — 흔들 대상이 없으니 핸드셰이크도 없다.`;
  game.handshake = ap.bssid;
  return [
    `[*] sending 64 directed DeAuth (code 7) to ${ap.essid} (${ap.bssid})`,
    `    ${bar(100)}  ${ap.clients} client(s) kicked`,
    `[*] 클라이언트 재접속 감지 → WPA handshake 캡처 성공!`,
    `    saved: capture-01.cap    이제 \`aircrack-ng\` 로 깬다.`
  ].join('\n');
});

reg('aircrack-ng', 'WPA/WEP 키 크래킹(시뮬)', 'aircrack-ng -w <wordlist> <capfile>', ({ args, game }) => {
  if (!game.handshake) return 'aircrack-ng: 캡처된 핸드셰이크가 없다. `aireplay-ng --deauth` 로 먼저 잡아라.';
  const wi = args.indexOf('-w');
  const wl = wi >= 0 ? args[wi + 1] : null;
  if (!wl) return 'usage: aircrack-ng -w wordlist.txt capture-01.cap';
  const node = game.fs.getNode(game.fs.resolve(wl, game.cwd));
  if (!node || node.type !== 'file') return `aircrack-ng: wordlist '${wl}' 를 열 수 없다.`;
  game.readFiles.add(game.fs.resolve(wl, game.cwd));
  const words = node.content.split('\n').map(s => s.trim()).filter(Boolean);
  const ap = (game.wifi || []).find(w => w.bssid === game.handshake);
  const found = ap && ap.key && words.includes(ap.key) ? ap.key : null;
  let out = `Aircrack-ng 1.7\n\n  [00:00:01] ${words.length} keys tested  ${bar(100)}\n\n`;
  if (found) {
    game.wifiCracked = game.wifiCracked || new Set(); game.wifiCracked.add(found);
    out += `  KEY FOUND! [ ${found} ]\n\n  ${ap.essid} 의 WPA 키 확보. \`submit ${found}\` 하라.`;
  } else {
    out += '  KEY NOT FOUND — 워드리스트에 키가 없다. 더 나은 사전이 필요하다.';
  }
  return out;
});

/* ============================================================
 *  v3 확장: NEW_MISSIONS 시나리오용 시뮬 명령 (파이프 미사용 — 파일/플래그 기반)
 * ============================================================ */

// DNS 정찰 (존 트랜스퍼)
reg('dig', 'DNS 조회(시뮬)', 'dig [axfr] <domain> [@ns]', ({ args, game }) => {
  const z = game.dns;
  if (!z) return ';; connection timed out; no servers could be reached';
  const axfr = args.includes('axfr');
  let out = `; <<>> DiG <<>> ${args.join(' ')}\n\n;; ANSWER SECTION:`;
  ((axfr && z.axfr) ? z.axfr : (z.records || [])).forEach(r => out += `\n${r}`);
  if (axfr) { game.dnsZoneXfer = true; out += '\n\n;; AXFR transfer complete — 서버가 존 트랜스퍼를 허용함(설정 오류!)'; }
  return out;
});

// FTP 접속 (hydra로 찾은 자격 사용)
reg('ftp', 'FTP 접속(시뮬)', 'ftp <host>', ({ args, game }) => {
  const host = (args[0] || '').replace(/^ftp:\/\//, '');
  const target = (game.network || []).find(h => h.ip === host || h.name === host);
  if (!target) return `ftp: ${host}: Name or service not known`;
  const found = game.hydraFound && game.hydraFound[target.ip];
  if (!found) return `ftp: ${host} 로그인 실패. 먼저 hydra 로 자격증명을 알아내라.`;
  game.connect && game.connect(target, found.u);
  game.onSshSuccess && game.onSshSuccess(target, found.u);
  return `Connected to ${host}.\n230 Login successful. (${found.u})\n  ${target.name} 의 FTP 셸을 장악했다. (exit 로 종료)`;
});

// SQL 인젝션: 인증 우회 + UNION 덤프
reg('login', '로그인(SQLi 연습용)', 'login <user> <payload>', ({ game, raw }) => {
  const payload = (raw || '').toLowerCase();   // 따옴표 보존 위해 원문 사용
  if (/union\s+select/.test(payload)) {
    game.sqlDumped = true;
    const data = (game.dumps && game.dumps.users) || 'id | user | password\n 1 | admin | $1$aa$adminhash99';
    return '[DB] UNION 쿼리 실행 — users 테이블이 화면으로 새어나온다:\n' + data;
  }
  if (/'\s*or\s*'?1'?\s*=\s*'?1|\bor\s+1\s*=\s*1/.test(payload)) {
    game.sqliAuth = true;
    return "[AUTH] 쿼리가 항상 참(' OR '1'='1')이 됐다 → 인증 우회 성공! 관리 세션 획득.";
  }
  return '[AUTH] 로그인 실패. (인증을 *논리*로 뚫어라 — 항상 참이 되는 조건을 주입)';
});

// 패킷 캡처 분석 (자체 필터 — 파이프 없이)
reg('tcpdump', '패킷 캡처 분석(시뮬)', 'tcpdump -r <pcap> [필터]', ({ args, game }) => {
  const ri = args.indexOf('-r');
  const file = ri >= 0 ? args[ri + 1] : args[0];
  const node = game.fs.getNode(game.fs.resolve(file || '', game.cwd));
  if (!node || node.type !== 'file') return `tcpdump: ${file}: 캡처 파일을 열 수 없다`;
  game.readFiles.add(game.fs.resolve(file, game.cwd));
  const filter = args.slice(ri + 2).join(' ').replace(/["']/g, '');
  const lines = node.content.split('\n');
  const shown = filter ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : lines;
  game.sniffed = true;
  return `reading from file ${file}\n` + shown.join('\n');
});

// 리버스 셸 리스너
reg('nc', 'netcat 리스너(시뮬)', 'nc -lvnp <port>', ({ args, game }) => {
  if (args.includes('-l') || args.join('').includes('l')) {
    game.ncListening = true;
    const port = (args.find(a => /^\d+$/.test(a))) || '4444';
    return `listening on [any] ${port} ...\n(다른 곳에서 백도어를 깨워 콜백을 유도하라)`;
  }
  return 'usage: nc -lvnp <port>';
});

// SUID 탐색은 find -perm 으로 (find 확장에서 처리)

// 압축 해제 체인
reg('file', '파일 형식 식별(시뮬)', 'file <file>', ({ args, game }) => {
  const n = game.fs.getNode(game.fs.resolve(args[0] || '', game.cwd));
  if (!n || n.type !== 'file') return `file: ${args[0]}: 없음`;
  const a = n.archive;
  const map = { bz2: 'bzip2 compressed data', gz: 'gzip compressed data', tar: 'POSIX tar archive', zip: 'Zip archive data' };
  return `${args[0]}: ${a ? (map[a] || a) : 'ASCII text'}`;
});
function unwrap(kind) {
  return ({ args, game }) => {
    const fileArg = args.filter(x => !x.startsWith('-')).pop() || '';
    const abs = game.fs.resolve(fileArg, game.cwd);
    const n = game.fs.getNode(abs);
    if (!n || n.type !== 'file') return `${kind}: ${fileArg}: 없음`;
    if (n.next) { // 한 겹 벗기기
      const parent = game.fs.getParent(abs);
      const nm = n.next.name;
      parent.children[nm] = n.next;
      delete parent.children[game.fs.basename(abs)];
      game.unwrapped = (game.unwrapped || 0) + 1;
      return `${kind}: ${fileArg} → ${nm} (한 겹 해제)`;
    }
    return `${kind}: ${fileArg}: 더 벗길 게 없다`;
  };
}
reg('bunzip2', 'bzip2 해제(시뮬)', 'bunzip2 <file.bz2>', unwrap('bunzip2'));
reg('gunzip', 'gzip 해제(시뮬)', 'gunzip <file.gz>', unwrap('gunzip'));
reg('tar', 'tar 해제(시뮬)', 'tar -xvf <file.tar>', unwrap('tar'));

// 스테가노그래피 추출
reg('steghide', '스테가노 추출(시뮬)', 'steghide extract -sf <image>', ({ args, game }) => {
  const sf = args.indexOf('-sf');
  const img = sf >= 0 ? args[sf + 1] : args[args.length - 1];
  const abs = game.fs.resolve(img || '', game.cwd);
  const n = game.fs.getNode(abs);
  if (!n || n.type !== 'file') return `steghide: ${img}: 없음`;
  if (args[0] === 'info') return `"${img}":\n  embedded file "hidden.txt": ${(n.stego || '').length} bytes`;
  if (!n.stego) return 'steghide: 숨겨진 데이터를 찾을 수 없다';
  const parent = game.fs.getParent(abs);
  parent.children['hidden.txt'] = window.FS.file('hidden.txt', n.stego, 'rw-r--r--', game.user);
  game.stegoExtracted = true;
  return `wrote extracted data to "hidden.txt".`;
});

// 컨테이너 탈출
reg('mount', '디스크 마운트(시뮬)', 'mount <dev> <dir>', ({ args, game }) => {
  if (!game.dockerTrap) return 'mount: only root can do that (또는 마운트할 게 없다)';
  game.mounted = true;
  return `mount: ${args[0] || '/dev/sda1'} → ${args[1] || '/mnt'} (호스트 디스크가 보인다!)`;
});
reg('chroot', '루트 전환(시뮬)', 'chroot <dir>', ({ args, game }) => {
  if (!game.mounted) return 'chroot: 먼저 호스트 디스크를 mount 하라';
  game.dockerEscaped = true;
  game.host = (game.host || 'core') + '-host';
  window.term && window.term.updatePrompt && window.term.updatePrompt();
  return '[*] 호스트 파일시스템으로 chroot — 컨테이너 함정을 탈출했다. 넌 이제 진짜 호스트 위에 있다.';
});

// 로그 세탁 / 시간 조작
reg('sed', '스트림 편집(시뮬)', "sed -i '/패턴/d' <file>", ({ args, game, raw }) => {
  const inplace = args.includes('-i');
  const m = raw.match(/\/([^/]+)\/d/);
  const file = args[args.length - 1];
  const abs = game.fs.resolve(file, game.cwd);
  const n = game.fs.getNode(abs);
  if (!n || n.type !== 'file') return `sed: ${file}: 없음`;
  if (!m) return "sed: 표현식이 필요하다 (예: sed -i '/10.0.0.42/d' file)";
  const pat = m[1];
  const kept = n.content.split('\n').filter(l => !l.includes(pat));
  if (inplace) { n.content = kept.join('\n'); game.logScrubbed = pat; return ''; }
  return kept.join('\n');
});
reg('systemctl', '서비스 제어(시뮬)', 'systemctl <poweroff|status>', ({ args, game }) => {
  if (args[0] === 'poweroff' || args.includes('poweroff')) { game.poweredOff = true; return '[*] 코어 전원 차단 신호 전송… 도시의 불이 깜빡인다.'; }
  return 'systemctl: usage: systemctl poweroff';
});

if (typeof window !== 'undefined') {
  window.COMMANDS = COMMANDS;
  window.COMMAND_OPTS = OPTS;
}
