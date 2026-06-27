/* ============================================================
 * wargames.js — 워게임(CTF) 챌린지 셋
 * 레벨과 동일 구조 + points/category. 모두 flag 를 submit 하면 클리어.
 * ============================================================ */
(function () {
  const { FileSystem, dir, file } = window.FS;
  function home(children) {
    return new FileSystem(dir('/', 'rwxr-xr-x', 'root', {
      home: dir('home', 'rwxr-xr-x', 'root', { guest: dir('guest', 'rwxr-xr-x', 'guest', children || {}) }),
      etc: dir('etc', 'rwxr-xr-x', 'root', { hostname: file('hostname', 'ctf-arena', 'rw-r--r--', 'root') }),
      tmp: dir('tmp', 'rwxrwxrwx', 'root', {}), root: dir('root', 'rwx------', 'root', {})
    }));
  }
  function host(name, ip, ports, opts) { return Object.assign({ name, ip, ports }, opts || {}); }

  const WARGAMES = [
    {
      id: 'W1', tier: 'EASY', cat: 'Crypto', points: 100, title: 'ROT 미궁',
      brief: '아레나에 입장한 걸 환영한다, 도전자.\n첫 관문은 가장 오래된 치환 암호. cipher.txt 를 풀어라.',
      objective: 'cipher.txt 의 ROT13 암호를 풀어 flag 를 submit 하라.',
      hints: ['`cat cipher.txt`', '`rot13 cipher.txt`', '나온 flag{...} 를 submit'],
      setup(g) {
        const enc = 'flag{rot13_is_a_classic}'.replace(/[a-zA-Z]/g, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); });
        g.fs = home({ 'cipher.txt': file('cipher.txt', enc, 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'ctf-arena';
      },
      check(g) { return g.submitted.has('flag{rot13_is_a_classic}'); },
      success: '첫 깃발 획득. 몸 좀 풀었나?'
    },
    {
      id: 'W2', tier: 'EASY', cat: 'Web', points: 150, title: '쿠키 도둑',
      brief: '웹 세션 쿠키가 통째로 새어나왔다. 보통 base64로 인코딩되지.',
      objective: 'cookie.txt 의 base64 세션값을 디코딩해 안의 flag 를 submit 하라.',
      hints: ['`cat cookie.txt`', '`base64 -d cookie.txt`', 'flag 를 submit'],
      setup(g) {
        const enc = btoa('session=flag{base64_cookies_are_not_safe}');
        g.fs = home({ 'cookie.txt': file('cookie.txt', enc, 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'ctf-arena';
      },
      check(g) { return g.submitted.has('flag{base64_cookies_are_not_safe}'); },
      success: '세션 탈취 성공. 웹은 늘 쿠키가 약점이다.'
    },
    {
      id: 'W3', tier: 'MEDIUM', cat: 'Forensics', points: 200, title: '삭제된 흔적',
      brief: '수상한 바이너리 dump.bin 을 입수했다. 쓰레기 바이트 속에 사람이 읽을 문자열이 숨어 있다.',
      objective: 'dump.bin 에서 사람이 읽을 수 있는 문자열을 추출해 flag 를 찾고 submit 하라.',
      hints: ['`strings dump.bin`', '4글자 이상 ASCII 문자열만 뽑힌다', 'flag{...} 를 submit'],
      setup(g) {
        const junk = '\x00\x01\x7f\x03ELF\x02\x00\x11';
        const blob = junk + 'libc.so.6' + '\x00\x00' + 'GCC: (build)' + '\x00\x05' + 'flag{strings_reveal_secrets}' + '\x00\x09' + 'malloc';
        g.fs = home({ 'dump.bin': file('dump.bin', blob, 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'ctf-arena';
      },
      check(g) { return g.submitted.has('flag{strings_reveal_secrets}'); },
      success: '삭제는 환상이다. 디스크는 모든 걸 기억한다.'
    },
    {
      id: 'W4', tier: 'MEDIUM', cat: 'Crypto', points: 250, title: 'XOR 금고',
      brief: '금고는 단일 바이트 XOR로 잠겨 있다. 키 메모가 함께 유출됐다.',
      objective: 'vault.hex 를 key.txt 의 키로 XOR 복호화해 flag 를 submit 하라.',
      hints: ['`cat key.txt` 로 키 확인', '`cat vault.hex` 는 16진수', '`xor vault.hex <키>` → flag submit'],
      setup(g) {
        const pt = 'flag{xor_vault_unlocked}'; const key = 'arena';
        let hex = '';
        for (let i = 0; i < pt.length; i++) hex += (pt.charCodeAt(i) ^ key.charCodeAt(i % key.length)).toString(16).padStart(2, '0');
        g.fs = home({ 'vault.hex': file('vault.hex', hex, 'rw-r--r--', 'guest'), 'key.txt': file('key.txt', 'key=arena', 'rw-r--r--', 'guest') });
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'ctf-arena';
      },
      check(g) { return g.submitted.has('flag{xor_vault_unlocked}'); },
      success: '금고 개방. XOR은 키 앞에선 무력하다.'
    },
    {
      id: 'W5', tier: 'MEDIUM', cat: 'Network', points: 200, title: '열린 문',
      brief: '대상 서버 10.0.0.5 가 무언가를 호스팅한다. 포트를 열어보고 응답을 읽어라.',
      objective: '10.0.0.5 를 nmap 으로 스캔하고 웹 포트에 curl 로 접속해 flag 를 submit 하라.',
      hints: ['`nmap 10.0.0.5`', '`curl http://10.0.0.5`', '응답 본문의 flag 를 submit'],
      setup(g) {
        g.fs = home({}); g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'ctf-arena'; g.ip = '10.0.0.9';
        g.network = [host('target', '10.0.0.5', [{ port: 80, service: 'http', version: 'nginx 1.18' }])];
        g.web = { 'http://10.0.0.5': '<html><body><!-- debug: flag{curl_the_hidden_endpoint} --></body></html>', 'http://10.0.0.5/': '<html><body><!-- debug: flag{curl_the_hidden_endpoint} --></body></html>' };
      },
      check(g) { return g.submitted.has('flag{curl_the_hidden_endpoint}'); },
      success: '열린 포트는 초대장이다. 응답 속에 답이 있었다.'
    },
    {
      id: 'W6', tier: 'HARD', cat: 'Privesc', points: 300, title: '그림자 권한',
      brief: '최종 관문. guest 로는 /root 안을 볼 수 없다. 하지만 누군가 sudo 를 열어뒀지.',
      objective: 'sudo 로 /root/flag.txt 를 읽어 flag 를 submit 하라.',
      hints: ['`cat /root/flag.txt` 는 거부된다', '`sudo cat /root/flag.txt`', 'flag 를 submit'],
      setup(g) {
        g.cwd = '/home/guest'; g.user = 'guest'; g.host = 'ctf-arena'; g.sudoAllowed = true;
        g.fs = home({});
        g.fs.root.children.root.children['flag.txt'] = file('flag.txt', 'flag{sudo_was_too_generous}', 'rw-------', 'root');
      },
      check(g) { return g.submitted.has('flag{sudo_was_too_generous}'); },
      success: '루트의 비밀을 손에 넣었다. 아레나 정복 — 넌 진짜다.'
    }
  ];

  window.WARGAMES = WARGAMES;
})();
