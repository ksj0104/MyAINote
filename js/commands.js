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
// 각 명령의 옵션/인자 상세. [토큰, 설명]. ★ = 이 시뮬레이터에서 실제 동작하는 핵심 옵션,
// 그 외는 실제 유닉스 기준 개념 설명(학습용). man/learn 출력에 그대로 표시된다.
const OPTS = {
  help: [['(인자 없음)', '등록된 모든 명령을 정렬해 5열로 나열한다']],
  man: [['<cmd>', '매뉴얼을 볼 명령 이름'], ['(예) man grep', 'grep 의 사용법·옵션을 본다']],
  pwd: [['(인자 없음)', '현재 작업 디렉터리(print working directory)의 절대경로 출력']],
  ls: [
    ['-l', '★ 권한·소유자·크기·날짜까지 상세(long) 표시'],
    ['-a', '★ 점(.)으로 시작하는 숨김 파일까지 표시(all)'],
    ['-la / -al', '★ 두 옵션을 합쳐서 사용(상세 + 숨김)'],
    ['-h', '크기를 사람이 읽기 쉬운 단위(K/M/G)로 (-l과 함께)'],
    ['-R', '하위 디렉터리까지 재귀적으로 나열'],
    ['-t', '수정 시간 순 정렬(최신 먼저)'],
    ['-S', '파일 크기 순 정렬'],
    ['-r', '정렬을 역순으로'],
    ['[path]', '나열할 경로(생략 시 현재 디렉터리)']
  ],
  cd: [['<path>', '이동할 경로'], ['~', '홈 디렉터리(/home/<user>)'], ['..', '상위 디렉터리'], ['.', '현재 디렉터리'], ['-', '직전 디렉터리로 토글']],
  cat: [['<file...>', '내용을 출력할 파일(여러 개면 순서대로 이어 출력)'], ['-n', '각 줄 앞에 줄 번호를 붙여 출력']],
  echo: [['<text>', '출력할 문자열(앞뒤 따옴표는 제거됨)'], ['> <file>', '★ 출력을 파일에 덮어쓰기(리다이렉션)'], ['>> <file>', '★ 출력을 파일 끝에 추가'], ['-n', '끝에 줄바꿈을 넣지 않음']],
  grep: [
    ['<pattern>', '★ 찾을 문자열 또는 정규식(regex)'],
    ['<file>', '★ 검색 대상 파일(-r과 함께면 디렉터리)'],
    ['-i', '★ 대소문자 무시(ignore-case)'],
    ['-r / -R', '★ 디렉터리를 재귀(recursive) 검색, 결과에 파일명 표시'],
    ['-o', '★ 매칭된 *부분만* 출력(only-matching)'],
    ['-E', '★ 확장 정규식 사용(+, ?, | 등). egrep 과 동일'],
    ['-n', '매칭된 줄의 줄 번호를 함께 표시(line-number)'],
    ['-v', '패턴과 *일치하지 않는* 줄만 출력(invert)'],
    ['-c', '매칭된 줄의 개수만 출력(count)'],
    ['-l', '매칭이 있는 파일 이름만 출력(files-with-matches)'],
    ['-w', '단어 단위로 정확히 일치(word)'],
    ['-A/-B/-C <N>', '매칭 줄의 뒤(After)/앞(Before)/양쪽(Context) N줄도 함께']
  ],
  find: [
    ['[path]', '★ 탐색을 시작할 경로(생략 시 현재)'],
    ['-name <pat>', '★ 이름 패턴(*, ? 와일드카드). 대소문자 구분'],
    ['-iname <pat>', '이름 패턴(대소문자 무시)'],
    ['-perm <mode>', '★ 권한으로 검색. -4000 = SUID 비트 설정된 것'],
    ['-type <f|d>', '종류로 필터(f=파일, d=디렉터리)'],
    ['-size <n>', '크기로 필터(예: +1M = 1MB 초과)'],
    ['-mtime <n>', '수정 시각으로 필터(일 단위)'],
    ['-exec <cmd> {} \\;', '찾은 각 항목에 명령 실행({}=경로 치환)'],
    ['2>/dev/null', '권한 거부 오류 메시지를 버림(자주 함께 씀)']
  ],
  chmod: [
    ['<octal> <file>', '★ 8진수 권한(r=4,w=2,x=1 합). 예: 644, 755, 600'],
    ['+x / -x', '★ 실행 권한 추가/제거(기호 모드)'],
    ['+r / +w', '읽기/쓰기 권한 추가'],
    ['u/g/o/a', '대상: u=소유자 g=그룹 o=기타 a=전체. 예: chmod u+x'],
    ['-R', '디렉터리 내부까지 재귀 적용'],
    ['<file>', '권한을 바꿀 대상 파일/디렉터리']
  ],
  whoami: [['(인자 없음)', '현재 로그인 사용자명 출력']],
  id: [['(인자 없음)', 'uid/gid/소속 그룹 정보 출력'], ['-u', '숫자 uid만'], ['-un', '사용자 이름만']],
  su: [['[user]', '전환할 사용자(기본 root)'], ['-', '대상 사용자의 환경까지 로드(로그인 셸)'], ['[password]', '대상 비밀번호(게임에선 인자로 직접 입력)']],
  sudo: [['<cmd>', 'root 권한으로 실행할 명령(sudo 허용 시)'], ['-l', '현재 사용자가 sudo로 쓸 수 있는 명령 목록'], ['-u <user>', '지정 사용자 권한으로 실행']],
  passwd: [['(시뮬)', '이 시뮬레이터에선 비밀번호를 바꿀 수 없음']],
  base64: [['<text|file>', '★ 대상 문자열 또는 파일'], ['-d', '★ 디코딩(decode). 없으면 인코딩(encode)'], ['-w <N>', '출력을 N자마다 줄바꿈(-w 0 = 줄바꿈 없음)']],
  strings: [['<file>', '★ 출력할 파일'], ['-n <N>', '최소 길이 N자 이상인 ASCII 문자열만(기본 4)'], ['-t x', '각 문자열의 파일 내 오프셋도 표시']],
  xxd: [['<file>', '★ 16진수+ASCII로 덤프할 파일'], ['-l <len>', '앞에서 len 바이트만'], ['-s <off>', 'off 바이트부터 시작'], ['-p', '순수 16진수만(plain)']],
  head: [['[file]', '★ 대상 파일(생략 시 표준입력)'], ['-n <N>', '★ 앞에서 N줄 출력(기본 10)'], ['-c <N>', '앞에서 N바이트 출력']],
  tail: [['[file]', '★ 대상 파일(생략 시 표준입력)'], ['-n <N>', '★ 뒤에서 N줄 출력(기본 10)'], ['-c <N>', '뒤에서 N바이트'], ['-f', '파일에 추가되는 내용을 실시간 추적(follow)']],
  wc: [['[file]', '★ 대상 파일(생략 시 표준입력)'], ['-l', '★ 줄 수(lines)'], ['-w', '★ 단어 수(words)'], ['-c', '★ 바이트 수'], ['-m', '문자 수']],
  sort: [['[file]', '★ 대상 파일(생략 시 표준입력)'], ['-n', '숫자로 정렬(numeric)'], ['-r', '역순(reverse)'], ['-u', '중복 제거(unique)'], ['-k <N>', 'N번째 필드 기준 정렬']],
  uniq: [['[file]', '★ 연속 중복 줄 제거(생략 시 표준입력)'], ['-c', '각 줄의 반복 횟수도 표시'], ['-d', '중복된 줄만 출력']],
  ps: [['(인자 없음)', '★ 실행 중 프로세스 목록(PID/USER/COMMAND)'], ['aux', '모든 사용자의 모든 프로세스 상세(BSD 형식)'], ['-ef', '모든 프로세스 + 부모 PID(System V 형식)']],
  uname: [['-a', '★ 커널·호스트·아키텍처 전체 정보(all)'], ['-r', '커널 릴리스 버전만'], ['-s', '커널 이름만']],
  clear: [['(인자 없음)', '화면(출력 영역)을 비운다']],
  history: [['(인자 없음)', '입력했던 명령 히스토리 출력']],
  ifconfig: [['(인자 없음)', 'eth0 인터페이스/IP/MAC 정보'], ['<iface>', '특정 인터페이스만 표시']],
  ping: [['<host>', '★ 응답을 확인할 호스트 IP 또는 이름'], ['-c <N>', 'N번만 보내고 종료(count)']],
  nmap: [
    ['<host>', '★ 단일 대상 IP/이름'],
    ['<subnet>', '★ 대역 스캔(예: 10.0.0.0/24) — 살아있는 호스트 전체'],
    ['-sV', '★ 서비스 버전까지 탐지(version detection)'],
    ['-p <ports>', '특정 포트만(예: -p 22,80 / -p- 전체)'],
    ['-sS', 'SYN(스텔스) 스캔 — 흔적이 적음'],
    ['-Pn', '핑 생략하고 바로 포트 스캔(방화벽 대비)'],
    ['-O', '운영체제(OS) 추정'],
    ['-A', '공격적: 버전+OS+스크립트 한꺼번에'],
    ['-T4', '스캔 속도(0=느림~5=빠름)']
  ],
  netstat: [['-tlnp', '★ TCP/리슨/숫자/프로그램(연결·리슨 포트 목록)'], ['-a', '모든 소켓(연결+리슨)'], ['-t/-u', 'TCP / UDP 만'], ['-l', '리슨(LISTEN) 중인 것만'], ['-n', '이름 대신 숫자로'], ['-p', '소켓을 연 프로그램/PID']],
  ssh: [
    ['<user>@<host>', '★ 접속할 계정@호스트'],
    ['[password]', '★ 비밀번호(게임에선 명령 뒤 인자로 입력)'],
    ['-L <l>:<h>:<r>', '★ 로컬 포트 포워딩(터널). 내 l 포트 → 원격 h:r'],
    ['-p <port>', '접속 포트 지정(기본 22)'],
    ['-i <keyfile>', '비밀번호 대신 개인키 파일로 인증'],
    ['-D <port>', '동적(SOCKS) 프록시 터널'],
    ['-N', '명령 실행 없이 터널만 유지']
  ],
  john: [['<hashfile>', '★ 크랙할 해시 파일'], ['--wordlist=<f>', '★ 사용할 사전 파일(예: rockyou.txt)'], ['--show', '이미 크랙된 결과 다시 표시'], ['--format=<t>', '해시 종류 지정(md5/sha 등)']],
  exit: [['(인자 없음)', '원격 접속을 종료하고 이전 호스트로 복귀']],
  disconnect: [['(인자 없음)', '현재 원격 접속을 종료']],
  submit: [['<flag>', '★ 제출할 플래그/정답. flag{...} 전체 또는 안쪽만 가능']],
  save: [['[슬롯]', '저장 슬롯 이름(기본 quick)']],
  load: [['[슬롯]', '불러올 저장 슬롯 이름(기본 quick)']],
  saves: [['(인자 없음)', '저장된 슬롯 목록 표시']],
  mkdir: [['<dir>', '★ 생성할 디렉터리 경로'], ['-p', '중간 경로까지 한꺼번에 생성(부모 포함)']],
  touch: [['<file>', '★ 빈 파일 생성(있으면 수정시각 갱신)'], ['-t <stamp>', '★ 수정 시각을 지정(YYYYMMDDhhmm) — 타임스톰핑']],
  rm: [['<path>', '★ 삭제할 파일/디렉터리(여러 개 가능)'], ['-r', '★ 디렉터리를 재귀적으로 삭제(recursive)'], ['-f', '★ 확인 없이 강제 삭제(force)'], ['-rf', '★ 폴더 통째로 강제 삭제(주의)'], ['-i', '삭제 전 하나씩 확인']],
  cp: [['<src> <dst>', '★ 원본 → 대상으로 복사'], ['-r', '디렉터리 통째로 복사(재귀)'], ['-p', '권한·시간 등 속성 보존']],
  mv: [['<src> <dst>', '★ 이동 또는 이름 변경'], ['-f', '대상이 있어도 덮어쓰기']],
  scp: [['<src> <dst>', '★ 원격↔로컬 복사(user@host:/path 형식)'], ['-r', '디렉터리 통째로 전송'], ['-P <port>', '접속 포트 지정(대문자 P)'], ['-i <key>', '개인키로 인증']],
  export: [['KEY=VAL', '★ 환경변수 설정(따옴표 제거)'], ['(인자 없음)', '설정된 환경변수 목록']],
  env: [['(인자 없음)', '환경변수 전체 목록']],
  top: [['(인자 없음)', 'CPU/메모리 사용량과 프로세스 표시(시뮬)']],
  kill: [['<pid>', '★ 종료할 프로세스 PID'], ['-9 <pid>', '강제 종료(SIGKILL) — 무시 못 함'], ['-l', '시그널 목록']],
  df: [['-h', '★ 사람이 읽기 쉬운 단위로 디스크 사용량'], ['(인자 없음)', '블록 단위로 표시']],
  free: [['-h', '★ 사람이 읽기 쉬운 단위로 메모리 사용량'], ['-m', 'MB 단위']],
  uptime: [['(인자 없음)', '시스템 가동 시간·접속자·부하 평균']],
  date: [['(인자 없음)', '현재 시각 출력'], ['+<format>', '형식 지정(예: +%Y-%m-%d)']],
  arp: [['-a', '★ ARP 테이블(IP↔MAC) 전체 표시'], ['-n', '이름 해석 없이 숫자로']],
  route: [['-n', '★ 라우팅 테이블을 숫자로 표시'], ['(인자 없음)', '이름까지 해석해 표시']],
  wget: [['<url>', '★ 다운로드할 URL'], ['-O <file>', '저장할 파일명 지정'], ['-q', '진행 메시지 숨김(quiet)'], ['-r', '링크 따라 재귀 다운로드']],
  curl: [
    ['<url>', '★ 요청할 URL(응답 본문 출력)'],
    ['-s', '진행률·에러 표시 없이 조용히(silent)'],
    ['-X <METHOD>', '★ HTTP 메서드 지정(GET/POST/PUT/DELETE)'],
    ['-F <field>', '★ 폼 데이터/파일 업로드(multipart). 예: -F file=@shell.php'],
    ['-d <data>', 'POST 본문 데이터 전송(application/x-www-form-urlencoded)'],
    ['-H <header>', '요청 헤더 추가(예: -H "Cookie: SESSION=...")'],
    ['-o <file>', '응답을 파일로 저장(소문자 o)'],
    ['-O', '원격 파일명 그대로 저장(대문자 O)'],
    ['-L', '리다이렉션(3xx)을 따라감(location)'],
    ['-I', '본문 없이 응답 헤더만(HEAD)'],
    ['-i', '응답 헤더 + 본문 함께'],
    ['-k', '인증서 검증 무시(insecure)'],
    ['-A <ua>', 'User-Agent 위장']
  ],
  rot13: [['<text|file>', '★ ROT13 변환할 문자열/파일(자기역함수)']],
  caesar: [['<shift>', '★ 시프트 양(0~25)'], ['<text|file>', '★ 복호화할 문자열/파일']],
  xor: [['<hex|file>', '★ XOR할 16진수 문자열 또는 파일'], ['<key>', '★ XOR 키(반복 적용)']],
  vigenere: [['<key>', '★ 비제네르 키워드'], ['<text|file>', '★ 복호화할 문자열/파일']],
  md5sum: [['<file>', '★ 해시(지문)를 계산할 파일']],
  hydra: [
    ['<host>', '★ 대상 호스트'],
    ['<service>', '★ 서비스(ssh/ftp/http)'],
    ['<wordlist>', '★ 대입할 비밀번호 사전 파일'],
    ['-l <user>', '단일 사용자명 지정(소문자 l)'],
    ['-L <file>', '사용자명 목록 파일(대문자 L)'],
    ['-p <pass>', '단일 비밀번호'],
    ['-P <file>', '비밀번호 사전 파일(대문자 P)'],
    ['-t <N>', '동시 시도 수(스레드)']
  ],
  hashcat: [['<hash|file>', '★ 크랙할 단일 해시 또는 해시 파일'], ['-m <type>', '해시 종류 번호(0=MD5, 1000=NTLM …)'], ['-a <N>', '공격 모드(0=사전, 3=무차별)'], ['(시뮬)', '게임에선 -m/-a 무시하고 사전 대조만 수행']],
  dump: [['<대상>', '★ 추출할 DB/메모리 키(예: users)']],
  'airmon-ng': [['start <iface>', '★ 인터페이스를 모니터 모드로(→ <iface>mon)'], ['stop <iface>', '모니터 모드 해제'], ['check kill', '간섭 프로세스 종료(실제 환경)']],
  'airodump-ng': [['<iface>', '★ 스캔할 모니터 인터페이스(예: wlan0mon)'], ['-c <ch>', '특정 채널만 청취'], ['--bssid <MAC>', '특정 AP만 집중'], ['-w <prefix>', '캡처를 파일로 저장']],
  'aireplay-ng': [
    ['-0 <n> / --deauth <n>', '★ 보낼 인증해제(deauth) 패킷 수'],
    ['-a <BSSID>', '★ 대상 AP의 BSSID(MAC)'],
    ['<iface>', '★ 모니터 인터페이스(클라이언트 붙은 AP라야 핸드셰이크 캡처)'],
    ['-c <client>', '특정 클라이언트만 끊기']
  ],
  'aircrack-ng': [['<capfile>', '★ 캡처 파일(예: capture-01.cap, 핸드셰이크 필요)'], ['-w <wordlist>', '★ 대입할 비밀번호 사전 파일'], ['-b <BSSID>', '크랙할 대상 AP 지정']],
  chat: [['<말>', '★ 현재 채널 상대에게 보낼 말(키워드 분석 응답)']],
  reply: [['<말>', 'chat 과 동일 — 현재 채널에 답장']],
  say: [['<말>', 'chat 과 동일 — 현재 채널에 말하기']],
  channel: [['<이름>', '★ 전환할 채널(mother/wraith 등). 없으면 현재+목록']],
  contacts: [['(인자 없음)', '알려진 연락처 목록과 현재 채널 표시']],
  dig: [['<domain>', '★ 조회할 도메인'], ['axfr', '★ 존 트랜스퍼 시도(설정 오류 시 전체 레코드 노출)'], ['@<ns>', '★ 질의할 네임서버 지정'], ['+short', '핵심 응답만 간결히'], ['-t <type>', '레코드 종류(A/MX/NS/TXT)']],
  ftp: [['<host>', '★ 접속할 FTP 호스트(hydra로 찾은 자격 사용)']],
  login: [['<user>', '★ 사용자명'], ['<payload>', "★ SQLi 페이로드(예: ' OR '1'='1' -- / ' UNION SELECT ...)"]],
  tcpdump: [['-r <pcap>', '★ 읽을 캡처 파일(read)'], ['[필터]', '★ 포함 문자열 필터(예: Cookie)'], ['-w <file>', '캡처를 파일로 저장(write)'], ['-n', '이름 해석 없이 숫자로'], ['-i <iface>', '청취할 인터페이스']],
  nc: [['-lvnp <port>', '★ 리버스 셸 리스너 대기(listen/verbose/numeric/port)'], ['-l', '리슨 모드(연결을 기다림)'], ['-v', '상세 출력(verbose)'], ['-n', '이름 해석 없이 숫자'], ['-p <port>', '포트 지정'], ['<host> <port>', '대상에 직접 연결(클라이언트)']],
  file: [
    ['<file>', '★ 형식을 식별할 파일(확장자가 아니라 내용으로 판단)'],
    ['(결과) ASCII text', '사람이 읽는 텍스트 → cat 으로 열기'],
    ['(결과) ~ compressed data', 'bzip2/gzip/tar 등 압축 → bunzip2/gunzip/tar 로 해제'],
    ['-i', '실제 유닉스: MIME 타입으로 출력(text/plain 등)'],
    ['-b', '실제 유닉스: 파일명 없이 형식만 출력(brief)']
  ],
  bunzip2: [['<file.bz2>', '★ bzip2 한 겹 해제'], ['-k', '원본 유지(keep)']],
  gunzip: [['<file.gz>', '★ gzip 한 겹 해제'], ['-k', '원본 유지(keep)']],
  tar: [
    ['-xvf <file.tar>', '★ tar 해제(eXtract+Verbose+File)'],
    ['-x', '추출(extract)'], ['-c', '생성(create)'], ['-t', '내용 목록 보기(list)'],
    ['-v', '처리 과정 표시(verbose)'], ['-f <file>', '대상 아카이브 파일 지정'],
    ['-z', 'gzip 함께(.tar.gz)'], ['-j', 'bzip2 함께(.tar.bz2)']
  ],
  steghide: [['extract -sf <img>', '★ 이미지에 숨겨진 데이터 추출(stego file)'], ['embed -cf <img> -ef <f>', '커버 이미지에 파일 은닉(embed)'], ['-p <pass>', '암호 지정'], ['info <img>', '숨김 데이터 정보']],
  mount: [['<dev> <dir>', '★ 디스크를 디렉터리에 연결(컨테이너 탈출용 호스트 디스크)'], ['(인자 없음)', '현재 마운트된 목록']],
  chroot: [['<dir>', '★ 루트 디렉터리를 전환(컨테이너 탈출 마무리)']],
  sed: [['-i', '★ 파일을 직접(in-place) 편집'], ["'/패턴/d'", '★ 패턴이 든 줄 삭제(delete)'], ["'s/A/B/'", '★ A를 B로 치환(substitute). g 붙이면 모든 일치'], ['-n', '자동 출력 끄기(p와 함께 특정 줄만)'], ['<file>', '★ 대상 파일']],
  systemctl: [['poweroff', '★ 코어 전원 차단(엔딩 트리거)'], ['-f', '강제(force)'], ['status <svc>', '서비스 상태'], ['start/stop <svc>', '서비스 시작/중지'], ['restart <svc>', '재시작']],
  zip2john: [['<file.zip>', '★ 암호 zip의 해시를 추출(이후 john으로 크랙)']]
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
    for (const [tok, d] of opts) out += `\n    ${pad(tok, 20)} ${d}`;
    out += `\n    ${'-'.repeat(20)}`;
    out += `\n    ${pad('★', 20)} 이 시뮬레이터에서 동작 · 그 외는 실제 유닉스 기준 설명`;
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
  const flags = args.filter(a => a.startsWith('-')).join('');   // -rf, -fr, -r -f 모두 인식
  const recursive = flags.includes('r');
  const targets = args.filter(a => !a.startsWith('-'));
  if (!targets[0]) return 'usage: rm [-rf] <path>';
  const out = [];
  for (const tgt of targets) {
    const abs = game.fs.resolve(tgt, game.cwd);
    const node = game.fs.getNode(abs);
    if (!node) { out.push(`rm: ${tgt}: No such file or directory`); continue; }
    if (node.type === 'dir' && !recursive) { out.push(`rm: ${tgt}: is a directory`); continue; }
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
  const page = game.web && (game.web[url] || game.web[args[0]]);
  if (page != null) { game.visited = game.visited || new Set(); game.visited.add(url); return page; }
  return `curl: (6) Could not resolve host: ${url}`;
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
/* ---- 작은 SQL WHERE 평가기 (하드코딩 패턴 매칭이 아니라 실제로 참/거짓을 계산) ---- */
function sqlTokenize(s) {
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {                 // 문자열 리터럴
      const q = c; let j = i + 1, str = '';
      while (j < s.length && s[j] !== q) { str += s[j]; j++; }
      if (j >= s.length) return null;             // 따옴표 안 맞음 → 구문오류(주입 실패)
      t.push({ k: 'val', v: str }); i = j + 1; continue;
    }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; t.push({ k: 'val', v: s.slice(i, j) }); i = j; continue; }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i; while (j < s.length && /[a-zA-Z0-9_.]/.test(s[j])) j++;
      const w = s.slice(i, j), u = w.toUpperCase();
      if (u === 'AND' || u === 'OR' || u === 'NOT') t.push({ k: u });
      else if (u === 'TRUE') t.push({ k: 'val', v: '1' });
      else if (u === 'FALSE') t.push({ k: 'val', v: '0' });
      else t.push({ k: 'col', v: w });            // 컬럼 식별자
      i = j; continue;
    }
    if (c === '(') { t.push({ k: '(' }); i++; continue; }
    if (c === ')') { t.push({ k: ')' }); i++; continue; }
    if (c === '=') { t.push({ k: 'op', v: '=' }); i += (s[i + 1] === '=' ? 2 : 1); continue; }
    if (c === '!' && s[i + 1] === '=') { t.push({ k: 'op', v: '!=' }); i += 2; continue; }
    if (c === '<' && s[i + 1] === '>') { t.push({ k: 'op', v: '!=' }); i += 2; continue; }
    return null;                                   // 알 수 없는 문자 → 구문오류
  }
  return t;
}
// 한 행(row)에 대해 토큰을 재귀하강 평가 → boolean
function sqlEvalRow(toks, row) {
  let p = 0;
  const peek = () => toks[p], eat = () => toks[p++];
  const colVal = (name) => { const key = String(name).split('.').pop().toLowerCase(); return key in row ? row[key] : null; };
  function operand() { const t = peek(); if (!t) return null; if (t.k === 'val') { eat(); return t.v; } if (t.k === 'col') { eat(); return colVal(t.v); } return null; }
  function primary() {
    const t = peek(); if (!t) return false;
    if (t.k === '(') { eat(); const v = orExpr(); if (peek() && peek().k === ')') eat(); return v; }
    const a = operand();
    if (peek() && peek().k === 'op') { const op = eat().v; const b = operand(); if (a == null || b == null) return false; return op === '=' ? String(a) === String(b) : String(a) !== String(b); }
    if (a == null) return false; return /^[0-9.]+$/.test(String(a)) ? parseFloat(a) !== 0 : false;
  }
  function notExpr() { if (peek() && peek().k === 'NOT') { eat(); return !notExpr(); } return primary(); }
  function andExpr() { let v = notExpr(); while (peek() && peek().k === 'AND') { eat(); v = notExpr() && v; } return v; }
  function orExpr() { let v = andExpr(); while (peek() && peek().k === 'OR') { eat(); v = orExpr_term() || v; } return v; }
  function orExpr_term() { return andExpr(); }
  return orExpr();
}
reg('login', '로그인(SQLi 연습용)', 'login <user> "<payload>"', ({ game, raw }) => {
  // user = 첫 토큰, payload = 그 뒤 원문 전체(작은따옴표는 SQL 주입 문법이므로 보존,
  // 셸 스타일 큰따옴표 한 겹만 벗긴다)
  const m = (raw || '').match(/^\s*login\s+(\S+)\s*([\s\S]*)$/i);
  const user = m ? m[1] : '';
  let payload = m ? m[2].trim() : '';
  const dq = payload.match(/^"([\s\S]*)"$/); if (dq) payload = dq[1];
  if (!user && !payload) return 'usage: login <user> "<payload>"   (예: login admin "\' OR \'1\'=\'1\' --")';

  // 앱이 사용자 입력을 그대로 끼워 만든 *취약한* 쿼리(이스케이프 없음)
  let query = `SELECT * FROM users WHERE username='${user}' AND password='${payload}'`;
  const execd = query.replace(/(--|#).*$/, '');       // SQL 주석(-- 또는 #) 이후 잘라냄
  const shown = '[SQL] ' + execd.trim();

  // UNION 기반 덤프
  if (/union\s+select/i.test(execd)) {
    game.sqlDumped = true;
    const data = (game.dumps && game.dumps.users) || 'id | user | password\n 1 | admin | $1$aa$adminhash99';
    return `${shown}\n[DB] UNION 결과로 users 테이블이 노출된다:\n` + data;
  }

  // WHERE 절을 실제로 평가
  const whereStr = execd.replace(/^.*?\bwhere\b/i, '').trim();
  const toks = sqlTokenize(whereStr);
  if (!toks) return `${shown}\n[SQL ERROR] 따옴표가 안 맞아 쿼리가 깨졌다 — 주입 실패.`;
  const rows = [{ username: 'admin', password: '$1$aa$adminhash99' }, { username: 'jkim', password: '$1$bb$kimhash01' }];
  let ok = false;
  try { for (const r of rows) { if (sqlEvalRow(toks, r)) { ok = true; break; } } }
  catch (e) { return `${shown}\n[SQL ERROR] 쿼리 평가 실패: ${e.message}`; }
  if (ok) { game.sqliAuth = true; return `${shown}\n[AUTH] WHERE 절이 참(TRUE)으로 평가됨 → 인증 우회 성공! 관리 세션 획득.`; }
  return `${shown}\n[AUTH] WHERE 절이 거짓(FALSE) → 로그인 실패. (항상 참이 되는 조건을 주입하라)`;
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
reg('sed', '스트림 편집(시뮬)', "sed -i '/패턴/d' <file>  ·  sed -i 's/A/B/g' <file>", ({ args, game, raw }) => {
  const inplace = args.includes('-i');
  const file = args[args.length - 1];
  const abs = game.fs.resolve(file, game.cwd);
  const n = game.fs.getNode(abs);
  if (!n || n.type !== 'file') return `sed: ${file}: 없음`;
  // 치환: s/A/B/[g]
  const sub = raw.match(/s\/((?:\\.|[^/])*)\/((?:\\.|[^/])*)\/(g?)/);
  if (sub) {
    let re;
    try { re = new RegExp(sub[1], sub[3] ? 'g' : ''); } catch (e) { return `sed: 잘못된 정규식: ${sub[1]}`; }
    const result = n.content.split('\n').map(l => l.replace(re, sub[2])).join('\n');
    if (inplace) { n.content = result; return ''; }
    return result;
  }
  // 삭제: /패턴/d
  const m = raw.match(/\/([^/]+)\/d/);
  if (!m) return "sed: 표현식이 필요하다 (예: sed -i '/10.0.0.42/d' file  또는  sed -i 's/A/B/g' file)";
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
