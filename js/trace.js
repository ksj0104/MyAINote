/* ============================================================
 * trace.js — TRACE//CALL 메인 스토리 (window.Trace)
 * "전화 한 통이 거대 기업의 심장으로 이어진다."
 * 윤서진(38, 10년차 화이트햇)이 부모를 노린 보이스피싱을 추적한다.
 *
 * ▷ 장소(맵) 기반: 집·이웃집·근거지·배후 회사를 오간다. (map / go <장소>)
 *   각 장소는 고유 환경(fs·web·network)을 가지며, 그곳의 조사 비트를 모두
 *   끝내면 연결된 장소가 열린다. 제출(submit)은 없다 — 읽고, 접속하고,
 *   정찰하는 *행동* 으로 이야기가 흐른다. (game.checkLevel → Trace.tick)
 *   진행도는 game.traceDone(완료 비트 id Set) + game.traceLoc 로 저장된다.
 * ============================================================ */
(function () {
  const { FileSystem, dir, file } = window.FS;
  const f = (name, content, perms) => file(name, content, perms || 'rw-r--r--', 'seojin');
  const d = (name, children) => dir(name, 'rwxr-xr-x', 'root', children || {});
  const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  // /home/<user> 에 children 을 둔 FS. extra(root) 로 트리 확장.
  function fsAt(user, children, extra) {
    const root = dir('/', 'rwxr-xr-x', 'root', {
      home: dir('home', 'rwxr-xr-x', 'root', { [user]: dir(user, 'rwxr-xr-x', user, children || {}) }),
      etc: dir('etc', 'rwxr-xr-x', 'root', { hostname: file('hostname', user + '-host', 'rw-r--r--', 'root') }),
      mnt: dir('mnt', 'rwxr-xr-x', 'root', {})
    });
    if (extra) extra(root);
    return new FileSystem(root);
  }
  const readAny = (g, re) => !!(g.readFiles && [...g.readFiles].some(p => re.test(p)));
  const didVisit = (g, target) => !!(g.visited && [...g.visited].some(u => norm(u) === norm(target)));
  const didScan = g => !!(g.scanned && g.scanned.size > 0);

  // ── 웹 콘텐츠 ──────────────────────────────────────────────
  const PHISH = 'http://kb-secure-check.com';
  const COLLECT = 'http://kb-secure-check.com/api/v2/collect';
  const PANEL = 'http://ops-panel.kr-relay.net';
  const STAGING = 'http://staging.helios.corp/.env';

  const FAKE_BANK = [
    '<!doctype html><html><head><title>KB국민은행 — 안전계좌 인증센터</title></head><body>',
    '  <h1>⚠ 고객님의 계좌가 범죄에 연루되어 보호조치되었습니다</h1>',
    '  <!-- 입력값은 안전조치 서버로 즉시 전송됩니다 -->',
    '  <form action="/api/v2/collect" method="post">',
    '    <input name="account"/><input name="password" type="password"/><input name="otp"/>',
    '    <button type="submit">안전조치 신청</button>',
    '  </form>',
    '  <!-- relay node: hx-route / build #4471 -->',
    '</body></html>'
  ].join('\n');
  const COLLECT_RESP = 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n' +
    '{"status":"ok","stored":true,"route":"HX-ROUTE","client":"HELIOS-AUTH-BRIDGE","campaign":"SILVER-Q3","ttl":300}';
  const PANEL_PAGE = [
    'HTTP/1.1 200 OK',
    '<html><title>OPS RELAY PANEL</title><body>',
    '  <h2>캠페인 운영 콘솔 (SILVER-Q3)</h2>',
    '  <table>',
    '    <tr><td>활성 오퍼레이터</td><td>11</td></tr>',
    '    <tr><td>콜백 게이트웨이</td><td>voip-gw 10.13.37.1</td></tr>',
    '    <tr><td>현장</td><td>구로구 ○○빌딩 4F (근거지)</td></tr>',
    '    <tr><td>명단 출처</td><td>partner-feed: HELIOS-CARE</td></tr>',
    '  </table>',
    '</body></html>'
  ].join('\n');
  const STAGING_ENV = [
    'HTTP/1.1 200 OK   (잘못 노출된 .env)',
    'APP=silvernet-scoring',
    'SILVERNET_API_KEY=sk_live_7f3a2b91c4',
    'SILVERNET_DB=postgres://scoring@db.helios.corp/silvernet',
    'EXPORT_PARTNER=helios-care',
    'BOARD_APPROVAL=BOD-2024-11',
    '# PROJECT SILVERNET — 내부 전용. 외부 노출 금지.'
  ].join('\n');
  // 집 ACT 추가 콘텐츠
  const CALL_REC = [
    '[통화 녹취 · 22:05 · 11분 03초]',
    '발신: "서울중앙지검 첨단범죄수사부 김수사관입니다."',
    '"선생님 명의 계좌가 대포통장으로 이용됐습니다. 구속 사안입니다."',
    '"지금 금융감독원 안전계좌로 자산을 옮기셔야 보호됩니다."',
    '"절대 가족·은행에 알리지 마세요. 수사 보안입니다."',
    '--- 대본 메타: campaign=SILVER-Q3 / relay=HX-ROUTE'
  ].join('\n');
  const INTEL_RESP = [
    'HTTP/1.1 200 OK   (kr-osint 도메인 조회)',
    'domain: kb-secure-check.com',
    'registrant: (privacy) NorthGate Registrar',
    'nameservers: ns1.hx-route.net, ns2.hx-route.net',
    'hosting: HELIOS-AUTH-BRIDGE relay cluster',
    'same-NS domains: nh-safe-confirm.com, woori-protect-now.com, kakao-bank-verify.net',
    '# 같은 인프라에서 사칭 도메인 수십 개가 돌아간다.'
  ].join('\n');
  const PASTE_RESP = [
    'HTTP/1.1 200 OK   (leak paste / raw)',
    '=== victims dump (partial) — campaign SILVER-Q3 ===',
    '윤O호,73,KB,loss=32,000,000',
    '박O수,76,NH,loss=18,500,000',
    '김O자,71,KB,loss=on-going',
    'source: partner-feed HELIOS-CARE  ·  scored-by SILVERNET',
    '# 무작위가 아니다. 명단이 있고, 아버지는 그 위에 있었다.'
  ].join('\n');
  const LEAD_RESP = [
    'HTTP/1.1 200 OK   (ops relay panel)',
    'campaign SILVER-Q3 — 운영 콘솔',
    'active operators: 11   ·   callback gateway: voip-gw 10.13.37.1',
    'site: 서울 구로구 ○○빌딩 4F  (현장 근거지)',
    'partner feed: HELIOS-CARE',
    '# 여기서 더는 못 캔다. 직접 가야 한다.'
  ].join('\n');
  const INTEL_URL = 'http://intel.kr-osint.net/kb-secure-check.com';
  const PASTE_URL = 'http://pasternal.io/raw/sv-q3';
  const LEAD_URL = 'http://ops-panel.kr-relay.net';

  // ── 장소(맵) ──────────────────────────────────────────────
  // 각 장소: { id,name,icon,where, conns:[id], setup(g), intro[], onCleared[], tasks:[{id,objective,hints[],openBrowser?,trigger(g),onClear[]}] }
  const LOCATIONS = {
    home: {
      id: 'home', name: '집', icon: '🏠', where: '서진의 집 · 노트북',
      conns: ['neighbor'],
      briefing: [
        { who: '', text: '[23:41]  부재중 7통.  마지막 메시지는 엄마.' },
        { who: '엄마', text: '서진아, 아빠가 이상한 전화를 받았어. 계좌가 범죄에 쓰였다고… 이거 괜찮은 거지?' },
        { who: '서진(생각)', text: '10년간 남의 시스템을 지켰다. 이번 침해는 티켓이 아니다.' },
        { who: '서진(생각)', text: '아버지 폰을 통째로 덤프했다. 침착하게 — 사건처럼 본다.' }
      ],
      intro: ['아버지 휴대폰 덤프를 노트북에 올렸다. 사건처럼 본다.'],
      sayCleared: [
        { who: '서진(생각)', text: '집에서 캘 수 있는 건 다 캤다. 미끼, 돈의 흐름, 인프라, 그리고 명단까지.' },
        { who: '한지우', text: '선배, 여기까지면 신고는 돼요. 근데 원본 없으면 다 묻혀요. 다음은… 발로 뛰는 거죠?' },
        { who: '서진(생각)', text: '이젠 나가야 한다. 같은 수법에 당한 옆집 박 노인부터.' }
      ],
      onCleared: ['집에서 할 수 있는 조사는 끝났다. 🗺 지도를 열어 밖으로 나가라.'],
      setup: g => {
        g.user = 'seojin'; g.host = 'seojin-pc'; g.cwd = '/home/seojin';
        g.fs = fsAt('seojin', {
          'sms.txt': f('sms.txt', [
            '[엄마] 서진아 잘 지내지? 반찬 보냈다',
            '[아빠] 병원 다녀왔다. 별일 없다',
            '[1588-0000] [Web발신] 고객님 계좌가 범죄에 연루되었습니다. 즉시 안전조치 → http://kb-secure-check.com',
            '[엄마] 아빠가 그 사이트 들어가서 뭐 입력했다는데… 괜찮은거지?',
            '[KB국민은행] 본 은행은 문자로 링크를 보내지 않습니다.'
          ].join('\n')),
          'call_log.txt': f('call_log.txt', '21:58 수신 1588-0000 (4분)\n22:05 수신 070-4xxx-9xxx (11분)\n22:31 발신 서진(부재중)'),
          'call_rec.txt': f('call_rec.txt', CALL_REC),
          'bank.csv': f('bank.csv', [
            '일시,구분,상대,금액,잔액',
            '06-28 22:20,이체,안전계좌(예금주 김민준),-32000000,1500000',
            '06-28 22:34,이체,안전계좌(예금주 김민준),-8000000,0',
            '# 안전계좌? 그런 건 없다. 대포통장이다.'
          ].join('\n')),
          'enc.cfg': f('enc.cfg', btoa('campaign=SILVER-Q3; partner=HELIOS-CARE; score_src=SILVERNET; relay=HX-ROUTE')),
          'evidence.tar': f('evidence.tar', 'ustar\x00sms.txt\x00call_rec.txt\x00bank.csv\x00enc.cfg\x00[원본 증거 묶음]'),
          'memo.txt': f('memo.txt', '아빠 말: "금융감독원이랑 검찰이라 했어. 보안이라 아무한테도 말하지 말라더라."')
        });
        g.web = { [PHISH]: FAKE_BANK, [PHISH + '/']: FAKE_BANK, [COLLECT]: COLLECT_RESP, [INTEL_URL]: INTEL_RESP, [PASTE_URL]: PASTE_RESP, [LEAD_URL]: LEAD_RESP };
      },
      tasks: [
        { id: 'h1', objective: '아버지를 움직인 미끼를 찾아라 — 그가 무엇을 보고, 어디에 입력했는지.',
          hints: ['사기는 늘 행동을 유도한다. 어느 메시지가 그를 "접속"하게 만들었나.', '정상 문자 사이에 은행을 사칭한 한 줄이 섞여 있다.', '수십 줄을 눈으로 훑지 마라 — http 로 시작하는 줄만 추려라.'],
          trigger: g => readAny(g, /sms\.txt$/),
          say: [{ who: '서진(생각)', text: '은행을 사칭한 도메인 하나. 아버지는 이 화면을 믿었다.' }, { who: '서진(생각)', text: '클릭한 사람의 눈이 아니라, 분석가의 눈으로 직접 본다.' }] },

        { id: 'h2', openBrowser: true, objective: '부모가 본 그 페이지를 직접 받아, 입력값이 어디로 흘러가는지 확인하라.',
          hints: ['렌더된 화면 말고 원본(마크업)을 봐라.', '입력 폼의 action 이 데이터를 보내는 수집 지점을 가리킨다.', '주석·빌드 번호까지 정돈돼 있다. 1회용 사기단의 손이 아니다.'],
          trigger: g => didVisit(g, PHISH),
          say: [{ who: '서진(생각)', text: '가짜 은행. 그런데 너무 깔끔해. 폼이 입력값을 어딘가로 흘려보낸다.' }] },

        { id: 'h3', openBrowser: true, objective: '입력값을 빨아들이는 수집 엔드포인트를 호출해, 누가 이 파이프라인을 쥐고 있는지 밝혀라.',
          hints: ['경로는 이미 봤다 — 가짜 페이지의 form action. 도메인에 그 경로를 붙여 호출하라.', '응답 JSON 에서 이 요청을 "누구의 것"으로 태깅하는 필드를 봐라.'],
          trigger: g => didVisit(g, COLLECT),
          say: [{ who: '서진(생각)', text: 'client: HELIOS-AUTH-BRIDGE. 가짜 은행 뒤에 진짜 이름이 떠올랐다 — HELIOS.' }, { who: '서진(생각)', text: '전화 한 통이, 사기단이 아니라 기업을 가리킨다.' }] },

        { id: 'h4', objective: '아버지가 받은 통화의 녹취를 분석해, 이게 즉흥인지 *대본*인지 판단하라.',
          hints: ['녹취 파일을 열어 읽어라.', '말투·순서가 정형화돼 있다면 — 누군가 써 준 스크립트다. 메타 줄을 놓치지 마라.'],
          trigger: g => readAny(g, /call_rec\.txt$/),
          say: [{ who: '서진(생각)', text: '검찰 사칭 → 겁주기 → "안전계좌" 유도. 토씨까지 대본이다.' }, { who: '서진(생각)', text: '메타에 또 그 이름 — SILVER-Q3. 캠페인 번호가 붙은 사기.' }] },

        { id: 'h5', objective: '돈이 어디로 빠져나갔는지 — 계좌 내역에서 송금 상대(대포통장)를 특정하라.',
          hints: ['거래 내역 파일에서 "이체" 줄을 추려라.', '"안전계좌"라는 건 없다. 예금주 이름이 곧 대포통장 명의자다.'],
          trigger: g => readAny(g, /bank\.csv$/),
          say: [{ who: '서진(생각)', text: '두 번에 걸쳐 4천만 원. 예금주 김민준 — 대포통장이다.' }, { who: '서진', text: '…아빠. 왜 나한테 먼저 전화 안 했어.' }] },

        { id: 'h6', objective: '페이지에서 캡처한 인코딩된 설정값을 해독해, 이 캠페인의 정체를 읽어라.',
          hints: ['== 로 끝나는 알아볼 수 없는 문자열은 보통 base64 다.', '디코딩하면 캠페인·파트너·점수 출처가 평문으로 드러난다.'],
          trigger: g => readAny(g, /enc\.cfg$/),
          say: [{ who: '서진(생각)', text: 'partner=HELIOS-CARE, score_src=SILVERNET. 점수로 사람을 고른다고?' }, { who: '서진(생각)', text: '보호 서비스가… 표적을 매긴다. 설마.' }] },

        { id: 'h7', openBrowser: true, objective: '피싱 도메인의 등록·호스팅 정보를 조회해, 이게 단일 사이트인지 인프라인지 확인하라.',
          hints: ['도메인 조회(intel) 서비스로 네임서버·호스팅을 본다.', '같은 네임서버를 쓰는 형제 도메인이 있다면, 한 곳이 수십 개를 돌린다는 뜻이다.'],
          trigger: g => didVisit(g, INTEL_URL),
          say: [{ who: '서진(생각)', text: '같은 NS(hx-route), 호스팅은 HELIOS-AUTH-BRIDGE. 사칭 도메인이 수십 개.' }, { who: '서진(생각)', text: '한 사이트가 아니다. *공장*이다.' }] },

        { id: 'h8', openBrowser: true, objective: '캠페인 ID 가 유출 자료에 나오는지 추적해, 피해자가 한 명인지 명단인지 확인하라.',
          hints: ['유출 덤프/포럼에 SILVER-Q3 가 박혀 있을 수 있다.', '같은 캠페인 ID 아래 여러 피해자가 묶여 있다면 — 무작위가 아니라 명단이다.'],
          trigger: g => didVisit(g, PASTE_URL),
          say: [{ who: '서진(생각)', text: '같은 캠페인 아래 피해자가 줄줄이. 출처는 partner-feed HELIOS-CARE.' }, { who: '서진(생각)', text: '아버지는 무작위로 걸린 게 아니다. 명단 위에 *선택*됐다.' }] },

        { id: 'h9', objective: '법정에서 살아남을 증거로 만들어라 — 원본 묶음의 무결성 해시를 떠라.',
          hints: ['동료의 조언: 스크린샷은 증거가 안 된다. 원본 + 해시.', '증거 묶음 파일의 해시(체크섬)를 떠 두면 나중에 위변조를 증명할 수 있다.'],
          trigger: g => readAny(g, /evidence\.tar$/),
          say: [{ who: '한지우', text: '좋아요, 그 해시가 원본 증거예요. 이제 그 누구도 "조작"이라 못 해요.' }, { who: '한지우', text: '근데 선배… 이 이상은 합법 라인 밖이에요. 알고 가는 거죠?' }] },

        { id: 'h10', openBrowser: true, objective: '수집 운영 콘솔을 끝까지 따라가, 이 조직이 *어디서* 굴러가는지 현장을 특정하라.',
          hints: ['수집 서버 뒤에는 사람이 굴리는 운영 콘솔이 있다.', '콘솔이 노출하는 현장 주소·게이트웨이가 다음 행선지다.'],
          trigger: g => didVisit(g, LEAD_URL),
          say: [{ who: '서진(생각)', text: '구로구 ○○빌딩 4F. 콜백 게이트웨이까지. 여기서 더는 못 캔다.' }, { who: '서진', text: '집에서 할 건 끝났어. …나가자.' }] }
      ]
    },

    neighbor: {
      id: 'neighbor', name: '이웃집', icon: '🏚', where: '같은 동 박 노인 댁',
      conns: ['den'],
      intro: [
        '박 노인 댁. 그도 같은 주에 "검찰" 전화를 받았다고 했다.',
        '동의를 받고 그의 낡은 폰과 PC를 들여다본다. 우연인지, 패턴인지.'
      ],
      onCleared: [
        '두 피해자, 같은 캠페인 ID(SILVER-Q3). 무작위가 아니다 — 명단이 있다.',
        '콜백 패널이 한 건물과 VOIP 게이트웨이를 가리킨다. 그 근거지로 간다.',
        '`go 근거지` 로 이동하라.'
      ],
      setup: g => {
        g.user = 'park'; g.host = 'park-pc'; g.cwd = '/home/park';
        g.fs = fsAt('park', {
          'park_sms.txt': f('park_sms.txt', [
            '[02-1xxx] [Web발신] 보호조치 안내. 본인확인: http://kb-secure-check.com',
            '[딸] 아버지 그거 절대 누르지 마세요',
            '# 보호조치 안내문 첨부: case SILVER-Q3'
          ].join('\n')),
          'guide.txt': f('guide.txt', '"안전계좌 보호조치 안내문"\ncampaign: SILVER-Q3\n관리 콘솔: http://ops-panel.kr-relay.net'),
          'history.txt': f('history.txt', 'http://kb-secure-check.com\nhttp://ops-panel.kr-relay.net')
        });
        g.web = { [PANEL]: PANEL_PAGE };
      },
      tasks: [
        {
          id: 'n1', objective: '박 노인의 사건과 부모의 사건을 잇는 공통점을 찾아라.',
          hints: ['두 사건의 문자/안내문을 나란히 두고 같은 토큰을 찾아라.', '캠페인 ID 같은 식별자가 두 피해자에게 똑같이 박혀 있다면, 누군가 둘을 같은 목록으로 다뤘다는 뜻이다.'],
          trigger: g => readAny(g, /(park_sms|guide)\.txt$/),
          onClear: ['', '같은 캠페인 ID — SILVER-Q3. 두 노인은 같은 명단 위에 있었다.']
        },
        {
          id: 'n2', openBrowser: true, objective: '그의 기록에 남은 사기 조직의 운영 흔적(콜백/관리 콘솔)을 추적하라.',
          hints: ['안내문과 브라우저 기록에 피싱 페이지가 아닌 *운영자* 쪽 주소가 섞여 있다.', '그 콘솔에 접속하면 조직이 어디서 굴러가는지 — 게이트웨이·현장·명단 출처가 드러난다.'],
          trigger: g => didVisit(g, PANEL),
          onClear: ['', '운영 콘솔이 현장 한 곳과 VOIP 게이트웨이를 노출한다.', '그리고 명단 출처: partner-feed HELIOS-CARE. 점점 가까워진다.']
        }
      ]
    },

    den: {
      id: 'den', name: '보이스피싱 근거지', icon: '☎', where: '구로구 ○○빌딩 4F',
      conns: ['helios'],
      intro: [
        '간판 없는 사무실. 헤드셋 수십 개, 대본, 노트북들.',
        '비어 있는 새벽 시간을 골랐다. 그들의 LAN 에 노트북을 물렸다.',
        '먼저 내부망에 무엇이 살아있는지부터 — 정찰 없이는 한 발도 못 뗀다.'
      ],
      onCleared: [
        '명단 헤더에 출처가 박혀 있다 — HELIOS CARE export.',
        '보호를 팔던 회사가, 같은 데이터로 표적을 만들었다.',
        '이제 본사다. `go 회사` 로 이동하라.'
      ],
      setup: g => {
        g.user = 'seojin'; g.host = 'breach-box'; g.cwd = '/home/seojin'; g.ip = '10.13.37.5';
        g.network = [
          { name: 'voip-gw', ip: '10.13.37.1', ports: [{ port: 5060, service: 'sip' }, { port: 22, service: 'ssh' }] },
          { name: 'ops-pc', ip: '10.13.37.20', ports: [{ port: 22, service: 'ssh' }, { port: 445, service: 'smb' }, { port: 3389, service: 'rdp' }] }
        ];
        g.scanned = new Set();
        g.fs = fsAt('seojin', {
          'README': f('README', '운영 PC 공유가 /mnt/ops 에 마운트됐다. 먼저 내부망을 정찰하라.')
        }, root => {
          root.children.mnt.children.ops = d('ops', {
            'operator_manual.txt': f('operator_manual.txt', '대본 v7\n1. "서울중앙지검 첨단범죄수사부입니다."\n2. 겁을 준 뒤 "안전계좌"로 유도\n3. 링크: kb-secure-check.com'),
            'victims.csv': f('victims.csv', '# export_source: HELIOS-CARE / SILVERNET v3\n# campaign: SILVER-Q3\nname,age,bank,score,call_prob\n윤O호,73,KB,0.92,high\n박O수,76,NH,0.88,high\n김O자,71,KB,0.85,high'),
            'voip_routes.conf': f('voip_routes.conf', 'route default -> hx-route\nclient = HELIOS-AUTH-BRIDGE\ngateway = 10.13.37.1')
          });
        });
        g.web = {};
      },
      tasks: [
        {
          id: 'd1', objective: '근거지 내부망을 정찰해 살아있는 호스트(운영 PC)를 찾아라.',
          hints: ['네가 물린 인터페이스가 곧 출발점이다. 내 IP 와 같은 대역을 훑어라.', '대역 전체를 스캔하면 어떤 포트가 열린 호스트가 떠오른다 — 운영 PC 는 보통 공유(445)나 원격(3389)이 열려 있다.'],
          trigger: didScan,
          onClear: ['', '운영 PC(10.13.37.20) 가 잡혔다. 공유 폴더 /mnt/ops 가 열려 있다.']
        },
        {
          id: 'd2', objective: '피해자 명단을 확보하고, 이 데이터가 *어디서* 왔는지 출처를 밝혀라.',
          hints: ['공유 폴더의 명단 파일을 열어라.', '명단 자체보다 파일 맨 위 헤더(주석)가 더 중요하다 — 데이터의 출처가 적혀 있다.'],
          trigger: g => readAny(g, /victims\.csv$/),
          onClear: ['', '명단 첫 줄: export_source: HELIOS-CARE / SILVERNET v3.', '명단의 첫 이름은 — 윤O호. 아버지다.']
        }
      ]
    },

    helios: {
      id: 'helios', name: 'HELIOS 본사', icon: '🏢', where: 'HELIOS GROUP · 외부 스테이징',
      conns: [],
      intro: [
        'HELIOS — 사기 방지·노인 금융보호를 파는 거대 기업.',
        '정문은 못 넘는다. 하지만 개발팀이 흘린 외부 스테이징 서버가 인터넷에 떠 있다.',
        '거기서부터 회사의 진짜 제품을 본다.'
      ],
      onCleared: [
        'PROJECT SILVERNET — 점수표는 노인을 "착취 가능성"으로 분류한다.',
        '보호 텔레메트리가 표적 정보가 됐다. 그리고 이건 이사회 승인(BOD-2024-11)을 받았다.',
        '점수표 어딘가에 부모의 이름이 있다. 보호를 팔며, 같은 데이터로 사냥했다.',
        '            ─ 여기까지가 지금 만들어진 길이다. (다음 ACT 곧 추가)'
      ],
      setup: g => {
        g.user = 'seojin'; g.host = 'seojin-pc'; g.cwd = '/home/seojin';
        g.fs = fsAt('seojin', {
          'silvernet_scoring.txt': f('silvernet_scoring.txt', [
            'PROJECT SILVERNET — target scoring model (CONFIDENTIAL)',
            'factors: age, liquidity, call_response_prob, child_contact_freq, ignores_warnings',
            'top targets (Q3): 윤O호(73) score 0.92 · 박O수(76) 0.88',
            'board_approval: BOD-2024-11 (approved)',
            'export_partner: relay vendors (SILVER-Q3)'
          ].join('\n'))
        });
        g.web = { [STAGING]: STAGING_ENV };
      },
      tasks: [
        {
          id: 'x1', openBrowser: true, objective: 'HELIOS 외부 스테이징에서 잘못 노출된 설정을 확보하라.',
          hints: ['공개 서버에는 늘 흘린 게 있다 — 설정 파일(.env) 같은.', '키와 DB 주소 사이에, 이 시스템의 *코드네임* 이 박혀 있다.'],
          trigger: g => didVisit(g, STAGING),
          onClear: ['', '노출된 .env — SILVERNET_API_KEY, board_approval, export_partner=helios-care.', 'PROJECT SILVERNET. 이게 회사의 진짜 제품이다.']
        },
        {
          id: 'x2', objective: 'SILVERNET 점수 모델을 찾아, 무엇을 점수화하는지 직접 확인하라.',
          hints: ['스테이징에서 끌어온 자료가 네 디스크에 있다.', '"무엇으로 노인을 점수 매기는가" — 그 요소 목록과 상위 표적 이름을 읽어라.'],
          trigger: g => readAny(g, /silvernet_scoring\.txt$/),
          onClear: ['', '점수 요소: 나이·유동성·콜 응답확률·자녀 연락빈도·경고 무시 이력.', '상위 표적 명단 맨 위 — 윤O호. 보호가 아니라, 조준이었다.']
        }
      ]
    }
  };
  const ORDER = ['home', 'neighbor', 'den', 'helios'];
  const ALIASES = {
    home: ['집', 'home', '우리집'],
    neighbor: ['이웃', '이웃집', '박', 'neighbor'],
    den: ['근거지', '사무실', 'den', '콜센터'],
    helios: ['회사', '본사', 'helios', '헬리오스', '기업']
  };

  // ── 진행 상태 헬퍼 ────────────────────────────────────────
  const locCleared = (g, id) => LOCATIONS[id].tasks.every(t => g.traceDone.has(t.id));
  function unlockedSet(g) {
    const u = new Set(['home']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of [...u]) if (locCleared(g, id)) for (const c of LOCATIONS[id].conns) if (!u.has(c)) { u.add(c); changed = true; }
    }
    return u;
  }
  const currentTask = (g, id) => LOCATIONS[id].tasks.find(t => !g.traceDone.has(t.id)) || null;

  const Trace = {
    LOCATIONS, ORDER,

    progress(game) {
      const done = game && game.traceDone instanceof Set ? game.traceDone : new Set(game && game.traceDone || []);
      const g = { traceDone: done };
      return { cleared: ORDER.filter(id => locCleared(g, id)).length, total: ORDER.length };
    },

    // 외부 노출 헬퍼 (Room 이 사용)
    unlockedList(game) { return [...unlockedSet(game)]; },
    isCleared(game, id) { return locCleared(game, id); },
    objectiveAt(game, id) { const t = currentTask(game, id); return t ? t.objective : null; },

    enter(game) {
      if (!(game.traceDone instanceof Set)) game.traceDone = new Set(Array.isArray(game.traceDone) ? game.traceDone : []);
      if (!game.traceLoc || !LOCATIONS[game.traceLoc]) game.traceLoc = 'home';
      game.traceSeen = game.traceSeen instanceof Set ? game.traceSeen : new Set();
      this.setLoc(game, game.traceLoc);
      this.present(game, { fresh: true });
    },

    // 환경만 셋업(렌더 없음) — 방을 보여주거나 컴퓨터를 켜기 전 상태 준비
    setLoc(game, id) {
      game.traceLoc = id;
      game.traceHintIdx = 0;
      game.connStack = []; game.env = {}; game.network = [];
      g_resetProbe(game);
      LOCATIONS[id].setup(game);
    },

    // 현재 위치 제시: 방(Room) 우선, 없으면 터미널(컴퓨터) 폴백
    present(game, opts) {
      opts = opts || {};
      if (window.Room && !opts.terminal) { window.Room.enter(game.traceLoc, opts); this.hud(game); return; }
      this.openComputer(game, opts);
    },

    // 컴퓨터 앞 — 터미널에 현장 헤더 + 현재 목표(실제 조사 화면)
    openComputer(game, opts) {
      opts = opts || {};
      const L = LOCATIONS[game.traceLoc], t = window.term;
      window.term.setMode('terminal');
      if (!opts.soft) t.clear();
      t.println(`💻  ${L.icon} ${L.name} — 컴퓨터`, 'frame');
      if (!(game.traceSeen instanceof Set)) game.traceSeen = new Set();
      const firstTime = !game.traceSeen.has(L.id);
      game.traceSeen.add(L.id);
      if (firstTime || opts.fresh) {
        if (window.Dialogue && L.briefing) window.Dialogue.say(L.briefing);
        else { t.println('', ''); (L.intro || []).forEach(line => t.println(line, 'story')); }
      }
      t.println('', '');
      this.renderTask(game, { soft: true });
      this.hud(game);
    },

    renderTask(game, opts) {
      opts = opts || {};
      const L = LOCATIONS[game.traceLoc], t = window.term;
      const task = currentTask(game, L.id);
      if (!task) {
        t.println('✔ 이 장소는 정리됐다. `map` 으로 다음 행선지를 확인하라.', 'success');
        return;
      }
      game.traceHintIdx = 0;
      t.println('목표: ' + task.objective, 'objective');
      t.println('  제출은 없다. 조사하라 — 읽고, 접속하고, 정찰하면 다음으로 흐른다.', 'dim');
      t.println('  map 지도 · go <장소> 이동 · hint 정보 · reset 현장 초기화 · menu 나가기', 'dim');
      if (task.openBrowser && window.WM) window.WM.open('browser');
    },

    hud(game) {
      const L = LOCATIONS[game.traceLoc];
      const task = currentTask(game, L.id);
      const idx = ORDER.indexOf(L.id);
      if (window.term && window.term.setMission) {
        window.term.setMission({ id: 'TRACE', tier: L.name, title: `${L.icon} ${L.name}`, objective: task ? task.objective : '정리 완료 — 다음 장소로' }, idx + 1, ORDER.length);
      }
    },

    // game.checkLevel() 이 trace 모드에서 매 행동마다 호출 → 현재 비트 트리거 판정/진행
    tick(game) {
      if (!(game.traceDone instanceof Set)) return;
      const L = LOCATIONS[game.traceLoc]; if (!L) return;
      let guard = 0;
      while (guard++ < 12) {
        const task = currentTask(game, L.id);
        if (!task) break;
        let fired = false;
        try { fired = !!(task.trigger && task.trigger(game)); } catch (e) { fired = false; }
        if (!fired) break;
        this.complete(game, L, task);
      }
    },

    complete(game, L, task) {
      const t = window.term;
      game.traceDone.add(task.id);
      if (game.save) game.save();
      if (window.Dialogue && task.say) window.Dialogue.say(task.say);
      else (task.onClear || []).forEach(line => t.println(line, 'story'));
      if (locCleared(game, L.id)) {
        if (window.Dialogue && L.sayCleared) window.Dialogue.say(L.sayCleared);
        else { t.println('', ''); (L.onCleared || []).forEach(line => t.println(line, 'success')); }
        this.hud(game);
      } else {
        t.println('', '');
        this.renderTask(game, { soft: true });
        this.hud(game);
      }
    },

    handle(raw, game) {
      const parts = raw.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      if (cmd === 'map' || cmd === '지도' || cmd === 'm') return this.map(game);
      if (cmd === 'go' || cmd === '이동' || cmd === 'travel' || cmd === 'goto') return this.travel(game, parts.slice(1).join(' '));
      if (cmd === 'where' || cmd === '현재' || cmd === 'whereami') return `현재 위치: ${LOCATIONS[game.traceLoc].icon} ${LOCATIONS[game.traceLoc].name} (${LOCATIONS[game.traceLoc].where})`;
      if (cmd === 'hint') return this.hint(game);
      if (cmd === 'reset') { this.setLoc(game, game.traceLoc); this.openComputer(game, { fresh: true }); return ''; }
      if (cmd === 'room' || cmd === '방') { this.present(game, {}); return ''; }
      if (cmd === 'submit') return '이 사건엔 정답 제출이 없다. 직접 조사하고, 이동하고, 접속하면 이야기가 이어진다. (`map` 으로 갈 곳 확인)';
      return null; // ls/cat/grep/curl/nmap … 은 샌드박스에서 실행 → 이후 tick 이 진행 판정
    },

    map(game) {
      const u = unlockedSet(game), cur = game.traceLoc;
      let out = `🗺  지도 — 현재: ${LOCATIONS[cur].icon} ${LOCATIONS[cur].name}`;
      ORDER.forEach((id, i) => {
        const L = LOCATIONS[id];
        const mark = id === cur ? '▶' : locCleared(game, id) ? '✔' : u.has(id) ? '○' : '🔒';
        const status = id === cur ? '지금 여기' : locCleared(game, id) ? '정리 완료' : u.has(id) ? '이동 가능' : '잠김';
        out += `\n  ${mark} ${i + 1}. ${L.icon} ${L.name}  —  ${status}`;
      });
      out += '\n\n  이동: `go <번호|이름>`   (예: go 2 · go 근거지)';
      return out;
    },

    resolve(query) {
      query = String(query || '').trim();
      if (!query) return null;
      const n = parseInt(query, 10);
      if (!isNaN(n) && n >= 1 && n <= ORDER.length) return ORDER[n - 1];
      const q = query.toLowerCase();
      if (LOCATIONS[q]) return q;
      // 별칭은 정확히 일치할 때만 (느슨한 부분일치는 '이웃집'⊃'집' 같은 오매칭을 일으킨다)
      const byAlias = ORDER.find(id => (ALIASES[id] || []).some(a => a.toLowerCase() === q));
      if (byAlias) return byAlias;
      return ORDER.find(id => LOCATIONS[id].name.includes(query) || LOCATIONS[id].name.toLowerCase().includes(q)) || null;
    },

    travel(game, query) {
      const id = this.resolve(query);
      if (!id) return `그런 장소가 없다. 문으로 나가 지도를 보라.`;
      if (!unlockedSet(game).has(id)) return `🔒 ${LOCATIONS[id].name} 은 아직 갈 수 없다. 지금 현장부터 마무리하라.`;
      this.setLoc(game, id);
      this.present(game, { travel: true });
      return '';
    },

    hint(game) {
      const L = LOCATIONS[game.traceLoc];
      const task = currentTask(game, L.id);
      if (!task) return '이 장소는 이미 정리됐다. `map` 으로 다음 행선지를 확인하라.';
      const hs = task.hints || [];
      const i = game.traceHintIdx || 0;
      if (i >= hs.length) return '정보가 더 없다. 가진 단서로 움직여라.';
      game.traceHintIdx = i + 1;
      return `💡 정보 ${i + 1}/${hs.length}: ${hs[i]}`;
    }
  };

  // probe 상태(scanned/visited/readFiles)는 장소마다 새로 — 단, readFiles 는 명령이 채운다
  function g_resetProbe(game) {
    game.readFiles = new Set(); game.submitted = new Set();
    game.visited = new Set(); game.scanned = new Set();
  }

  window.Trace = Trace;
})();
