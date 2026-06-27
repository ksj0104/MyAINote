# 시각 학습 모드 (Visual Academy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 텍스트 전용 학습(Academy)을 3분할 전체화면 시각 코스로 교체 — 명령을 카테고리 순서로 하나씩, 설명→애니메이션 시각화→실습 게이팅으로 순차 학습.

**Architecture:** 엔진(`game.exec`/판정)은 무변경. 학습 로직을 두 층으로 분리 — (1) **헤드리스 안전 데이터/순수함수 층**(`js/modes.js`의 `Academy`: 패밀리 매핑·학습순서·게이팅 판정, playtest가 로드)과 (2) **브라우저 전용 DOM 층**(`js/apps/academy.js`의 `AcademyUI` + `js/os/academy-viz.js`의 `AcademyViz`, playtest 미로드). `Academy.enter`는 `window.AcademyUI`가 있으면 시각 오버레이로 위임, 없으면(playtest) 기존 텍스트 샌드박스로 폴백. 실습 콘솔 입력은 전부 기존 `game.exec`로 수렴 → playtest 105 회귀 무영향.

**Tech Stack:** 순수 정적 — Vanilla JS(IIFE 모듈, `window.*` 전역), CSS keyframe + SVG 애니메이션, localStorage 저장. 빌드 없음. 헤드리스 검증 `node playtest.js`(vm), DOM 검증 Playwright MCP 스모크.

## Global Constraints

- 엔진 파일 무변경: `js/commands.js`·`js/levels.js`·`js/wargames.js`·`js/comms.js`·`js/filesystem.js` 수정 금지.
- `js/game.js`는 academyDone 저장/복원 2줄만 수정. `exec`/`checkLevel`/판정 경로 불변.
- `js/modes.js`의 `Academy.learn`/`lessons`/`handle` 시그니처·동작 유지(playtest 의존). `Academy.enter`는 항상 샌드박스 상태(FS/user/cwd/readFiles)를 먼저 셋업(playtest "Academy file commands run without error" 의존).
- `Academy.enter`는 `window.AcademyUI` 미존재 시(=playtest) 기존 텍스트 경로로 동작. DOM 직접 의존 금지(있으면 가드).
- 시각 스타일 고정: 픽셀/CRT 네온, 폰트 `VT323`, 기존 CSS 테마 토큰(`var(--signal)`, `var(--void)`, `var(--ok)`, `var(--alert)`, `var(--steel-dim)`, `var(--story)`, `var(--label)`, `var(--label-dim)`, `var(--signal-soft)`) 재사용.
- 오버레이 토글은 코드랩 패턴 미러: `body[data-overlay="academy"]` + `#academy { display:flex }`. `term.hideOverlays()`가 `#academy`도 닫음.
- 각 작업 후 `node playtest.js` 가 **0 failed**(기존 105 + 신규분 전부 PASS).
- 커밋 메시지 푸터: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

- `js/modes.js` (수정) — `Academy`에 `VIZ_FAMILY`·`order`·`categories`·`familyOf`·`demoFor`·`isPractice` 추가, `enter` 위임 분기. 헤드리스 안전.
- `js/game.js` (수정) — `academyDone` 저장/복원만.
- `js/apps/academy.js` (신규) — `window.AcademyUI`: 오버레이 컨트롤러(사이드바·레슨·콘솔·게이팅·진도·네비).
- `js/os/academy-viz.js` (신규) — `window.AcademyViz`: `render(family, command, stageEl)` 6패밀리 렌더러.
- `index.html` (수정) — `#academy` 마크업 + 신규 스크립트 2개 로드.
- `css/style.css` (수정) — `#academy`/`.acad-*` 레이아웃 + 패밀리 keyframe.
- `js/os/shell.js` (수정) — `term.showAcademy()` 추가, `hideOverlays()`에 `#academy` 포함.
- `playtest.js` (수정) — 데이터/게이팅/persist 헤드리스 검사 추가.

---

## Task 1: 학습 데이터 + 순수 게이팅 함수 (modes.js, 헤드리스)

**Files:**
- Modify: `js/modes.js` (CATEGORIES 상수 영역과 Academy 객체)
- Test: `playtest.js` (학습 데이터 검사 블록 추가, 약 line 140 부근)

**Interfaces:**
- Produces (window.Academy 에 부착, playtest·AcademyUI 가 소비):
  - `Academy.VIZ_FAMILY: { [command]: 'fs'|'net'|'crypto'|'crack'|'wifi' }`
  - `Academy.familyOf(cmd: string): 'fs'|'net'|'crypto'|'crack'|'wifi'|'light'`
  - `Academy.order: string[]` — 학습 순서(CATEGORIES 평탄화, COMMANDS 존재분만)
  - `Academy.categories: [string, string[]][]` — 사이드바 그룹
  - `Academy.demoFor(cmd: string): string` — 데모용 대표 명령 문자열
  - `Academy.isPractice(raw: string, target: string): boolean`

- [ ] **Step 1: 실패 테스트 작성** — `playtest.js`의 `// ---------- 학습: 전 명령 learn 커버 ----------` 블록(약 line 137) 바로 아래에 추가:

```javascript
// ---------- 시각 학습: 데이터/게이팅 ----------
const A = win.Academy;
ok('Academy.order 는 비어있지 않고 모두 COMMANDS 에 존재',
  Array.isArray(A.order) && A.order.length > 0 && A.order.every(c => win.COMMANDS[c]),
  'order=' + (A.order && A.order.length));
ok('Academy.order 에 중복 없음', new Set(A.order).size === A.order.length);
ok('order 의 모든 명령이 familyOf 로 패밀리를 가짐', A.order.every(c => typeof A.familyOf(c) === 'string'));
ok('familyOf 매핑 검증',
  A.familyOf('nmap')==='net' && A.familyOf('find')==='fs' && A.familyOf('xor')==='crypto'
  && A.familyOf('hydra')==='crack' && A.familyOf('aircrack-ng')==='wifi' && A.familyOf('whoami')==='light');
ok('Academy.categories 는 [name,cmds][] 이고 cmds 는 COMMANDS 부분집합',
  Array.isArray(A.categories) && A.categories.length > 0 && A.categories.every(([n, cs]) => typeof n === 'string' && cs.every(c => win.COMMANDS[c])));
ok('isPractice: 첫 토큰 일치 판정',
  A.isPractice('nmap 10.0.0.0/24','nmap')===true && A.isPractice('ls -la','nmap')===false && A.isPractice('  ','ls')===false);
ok('demoFor: EXAMPLES 주석 제거', A.demoFor('ls').indexOf('#')===-1 && A.demoFor('ls').startsWith('ls'));
ok('demoFor: EXAMPLES 없으면 명령 자체', A.demoFor('pwd')==='pwd');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node playtest.js`
Expected: FAIL — `win.Academy.order` 등이 undefined.

- [ ] **Step 3: 최소 구현** — `js/modes.js`에서 `const CATEGORIES = [...]` 정의 **다음 줄**에 추가:

```javascript
  // 명령 → 시각화 패밀리 (5 정교; 그 외는 familyOf 가 'light' 폴백)
  const VIZ_FAMILY = {
    ls:'fs', cd:'fs', pwd:'fs', cat:'fs', echo:'fs', grep:'fs', find:'fs',
    mkdir:'fs', touch:'fs', cp:'fs', mv:'fs', rm:'fs',
    ifconfig:'net', ping:'net', nmap:'net', netstat:'net', arp:'net', route:'net',
    ssh:'net', scp:'net', wget:'net', curl:'net', exit:'net', disconnect:'net',
    base64:'crypto', rot13:'crypto', caesar:'crypto', xor:'crypto', vigenere:'crypto',
    md5sum:'crypto', strings:'crypto', xxd:'crypto',
    hydra:'crack', john:'crack', hashcat:'crack', dump:'crack',
    'airmon-ng':'wifi', 'airodump-ng':'wifi', 'aireplay-ng':'wifi', 'aircrack-ng':'wifi'
  };
```

그리고 `const Academy = {` 객체 안 `enter` 메서드 **앞**에 멤버 추가:

```javascript
    get order() {
      const C = window.COMMANDS || {};
      const seen = new Set(), out = [];
      for (const [, cmds] of CATEGORIES) for (const c of cmds) {
        if (!seen.has(c) && C[c]) { seen.add(c); out.push(c); }
      }
      return out;
    },
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
```

> `order`/`categories` 는 getter 라 COMMANDS 로드 후 평가. `VIZ_FAMILY` 는 객체에도 부착해 playtest 직접 접근 가능.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node playtest.js`
Expected: PASS — 신규 8개 포함 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add js/modes.js playtest.js
git commit -m "feat(academy): 시각 학습 데이터·게이팅 순수함수 추가"
```

---

## Task 2: academyDone 진도 저장/복원 (game.js, 헤드리스)

**Files:**
- Modify: `js/game.js` (`save()` 약 line 30, `start()` 약 line 70)
- Test: `playtest.js` (persist 검사 추가)

**Interfaces:**
- Produces: `game.academyDone: Set<string>` — 완료한 학습 명령. save 시 직렬화, start 시 복원.

- [ ] **Step 1: 실패 테스트 작성** — `playtest.js` Task1 검사 블록 아래에 추가:

```javascript
// ---------- 시각 학습: 진도 저장/복원 ----------
game.academyDone = new Set(['ls', 'cd']);
game.save();
const savedRaw = JSON.parse(win.localStorage.getItem('terminal_breach_save_v1'));
ok('save() 가 academyDone 을 직렬화', Array.isArray(savedRaw.academy) && savedRaw.academy.includes('ls') && savedRaw.academy.includes('cd'));
game.start();
ok('start() 가 academyDone 을 Set 으로 복원', game.academyDone instanceof Set && game.academyDone.has('ls'));
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node playtest.js`
Expected: FAIL — `savedRaw.academy` 가 undefined.

- [ ] **Step 3: 최소 구현**

`js/game.js`의 `save()` 안 `localStorage.setItem` 객체에 `academy` 키 추가:

```javascript
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          levelIndex: this.scenarioIndex || 0, theme: this.theme,
          wargame: [...(this.wargameSolved || [])], codelab: [...(this.codelabSolved || [])],
          academy: [...(this.academyDone || [])]
        }));
```

`js/game.js`의 `start()` 에서 `this.codelabSolved = ...` 다음 줄에 추가:

```javascript
      this.academyDone = new Set(saved && saved.academy || []);
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node playtest.js`
Expected: PASS — 신규 2건 포함 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add js/game.js playtest.js
git commit -m "feat(academy): academyDone 진도 localStorage 저장/복원"
```

---

## Task 3: Academy.enter 시각 위임 분기 (modes.js, 헤드리스)

**Files:**
- Modify: `js/modes.js` (`Academy.enter`)
- Test: `playtest.js` (위임/폴백 검사)

**Interfaces:**
- Consumes: `window.AcademyUI.open(game)` (Task 6 정의; 미존재 가능)
- Produces: `Academy.enter(game)` — 샌드박스 셋업 후, `window.AcademyUI` 있으면 `AcademyUI.open(game)` 호출, 없으면 기존 텍스트 출력.

- [ ] **Step 1: 실패 테스트 작성** — `playtest.js`에 추가:

```javascript
// ---------- 시각 학습: enter 위임/폴백 ----------
win.Academy.enter(game);
ok('AcademyUI 없을 때 enter 는 샌드박스를 셋업(폴백)', game.user === 'student' && game.cwd === '/home/student' && !!game.fs);
let opened = null;
win.AcademyUI = { open: (g) => { opened = g; } };
win.Academy.enter(game);
ok('AcademyUI 있을 때 enter 는 AcademyUI.open 으로 위임', opened === game);
ok('위임해도 샌드박스 상태는 여전히 셋업됨', game.user === 'student' && !!game.fs);
delete win.AcademyUI;
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node playtest.js`
Expected: FAIL — `opened` 가 null.

- [ ] **Step 3: 최소 구현** — `js/modes.js`의 `Academy.enter(game)` 메서드 **맨 끝**(마지막 `window.term.setMission(...)` 줄 다음, 메서드 닫는 `},` 전)에 추가:

```javascript
      // 브라우저: 시각 학습 오버레이로 위임. 샌드박스 상태는 위에서 이미 셋업됨.
      if (window.AcademyUI && typeof window.AcademyUI.open === 'function') {
        window.AcademyUI.open(game);
      }
```

> `window.term.*` 호출은 그대로 둔다 — 시각 경로에선 오버레이가 그 위를 덮으므로 무해, 헤드리스에선 Proxy 스텁이 흡수.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node playtest.js`
Expected: PASS — 신규 3건 포함 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add js/modes.js playtest.js
git commit -m "feat(academy): enter 에서 AcademyUI 존재 시 시각 오버레이로 위임(폴백 유지)"
```

---

## Task 4: 오버레이 스캐폴드 — 마크업·스크립트·기본 CSS·셸 배선 (DOM)

**Files:**
- Modify: `index.html` (`#codelab` div 다음에 `#academy` 추가; 스크립트 2개 로드)
- Modify: `css/style.css` (파일 끝에 `#academy` 레이아웃 블록 추가)
- Modify: `js/os/shell.js` (`term.showAcademy` 추가, `hideOverlays` 에 `#academy` 포함)

**Interfaces:**
- Produces:
  - DOM id: `#academy`, `#acad-side`, `#acad-cmd`, `#acad-desc`, `#acad-stage`, `#acad-out`, `#acad-input`, `#acad-prog`, `#acad-next`, `#acad-prompt`
  - `term.showAcademy()` — `#academy` 표시 + `body[data-overlay="academy"]`
  - `term.hideOverlays()` — `#academy` 도 숨김

- [ ] **Step 1: index.html 마크업 추가** — `#codelab` div가 닫히는 `</div>`(line 99 부근, `#desktop` 닫히기 전) 다음에 삽입:

```html
      <!-- 시각 학습 오버레이 (ACADEMY) -->
      <div id="academy">
        <div class="acad-head">
          <span class="acad-title">◈ ACADEMY</span>
          <span id="acad-prog" class="acad-prog">0 / 0</span>
          <button class="hud-btn" onclick="window.game.showMenu()">✕ 메뉴</button>
        </div>
        <div class="acad-body">
          <nav id="acad-side" class="acad-side"></nav>
          <section class="acad-main">
            <div class="acad-explain">
              <span id="acad-cmd" class="acad-cmd">--</span>
              <span id="acad-desc" class="acad-desc"></span>
            </div>
            <div id="acad-stage" class="acad-stage"></div>
            <div class="acad-console">
              <div id="acad-out" class="acad-out"></div>
              <div class="acad-cmdline">
                <span id="acad-prompt" class="acad-prompt">student@academy:~$</span>
                <input id="acad-input" class="acad-input" type="text" autocomplete="off"
                       autocapitalize="off" autocorrect="off" spellcheck="false"
                       placeholder="여기에 명령을 직접 입력하고 Enter…" />
                <button id="acad-next" class="acad-next" hidden>다음 ▶</button>
              </div>
            </div>
          </section>
        </div>
      </div>
```

- [ ] **Step 2: index.html 스크립트 로드 추가** — `<script src="js/apps/browser.js"></script>` 다음 줄(shell.js 로드 전)에 추가:

```html
  <script src="js/os/academy-viz.js"></script>
  <script src="js/apps/academy.js"></script>
```

- [ ] **Step 3: shell.js 배선** — `js/os/shell.js`의 `term` 객체에서 `hideOverlays` 를 교체하고 `showAcademy` 추가(기존 `showCodelab` 줄 옆):

```javascript
    hideOverlays() {
      Desktop.hideModals();
      const cl = $('#codelab'); if (cl) cl.style.display = 'none';
      const ac = $('#academy'); if (ac) ac.style.display = 'none';
      document.body.removeAttribute('data-overlay');
    },
    showCodelab() { const cl = $('#codelab'); if (cl) cl.style.display = 'flex'; document.body.setAttribute('data-overlay', 'codelab'); },
    showAcademy() { const ac = $('#academy'); if (ac) ac.style.display = 'flex'; document.body.setAttribute('data-overlay', 'academy'); },
```

- [ ] **Step 4: css/style.css 레이아웃 추가** — 파일 끝에 추가:

```css
/* ░░ 시각 학습 오버레이 (ACADEMY) ░░ */
#academy {
  display: none; position: fixed; inset: 0; z-index: 100000;
  background: var(--void); flex-direction: column;
}
.acad-head {
  display: flex; align-items: center; gap: 14px;
  padding: 8px 14px; border-bottom: 1px solid var(--steel-dim);
  font-family: 'Chakra Petch'; color: var(--signal);
}
.acad-title { font-weight: 700; letter-spacing: 1px; }
.acad-prog { margin-left: auto; font-family: 'VT323', monospace; color: var(--label); }
.acad-body { flex: 1; display: flex; min-height: 0; }
.acad-side {
  width: 210px; border-right: 1px solid var(--steel-dim); padding: 10px;
  overflow-y: auto; font-family: 'VT323', monospace; font-size: 16px;
}
.acad-side .acad-cat { color: var(--label-dim); margin: 8px 0 2px; }
.acad-side .acad-li {
  display: block; width: 100%; text-align: left; background: none; border: none;
  color: var(--label); padding: 2px 8px; cursor: pointer; font: inherit;
}
.acad-side .acad-li.done { color: var(--ok); }
.acad-side .acad-li.current { color: var(--signal); border-left: 2px solid var(--signal); }
.acad-side .acad-li.locked { color: var(--label-dim); cursor: not-allowed; }
.acad-main { flex: 1; display: flex; flex-direction: column; min-width: 0; padding: 12px; gap: 10px; }
.acad-explain { display: flex; align-items: baseline; gap: 10px; }
.acad-cmd { font-family: 'Chakra Petch'; font-weight: 700; font-size: 20px; color: var(--signal); }
.acad-desc { font-family: 'VT323', monospace; font-size: 17px; color: var(--story); }
.acad-stage {
  flex: 1; min-height: 0; border: 1px solid var(--signal);
  background: radial-gradient(circle at 50% 40%, #0c2030, #060a14);
  border-radius: 6px; overflow: hidden; position: relative;
  font-family: 'VT323', monospace; color: var(--signal);
}
.acad-console { display: flex; flex-direction: column; gap: 6px; }
.acad-out {
  height: 96px; overflow-y: auto; background: #000; border: 1px solid var(--steel-dim);
  padding: 6px 8px; font-family: 'VT323', monospace; font-size: 15px;
  color: var(--label); white-space: pre-wrap;
}
.acad-cmdline { display: flex; align-items: center; gap: 8px; }
.acad-prompt { font-family: 'VT323', monospace; color: var(--ok); white-space: nowrap; }
.acad-input {
  flex: 1; background: #000; border: 1px solid var(--steel-dim); color: var(--signal-soft);
  font-family: 'VT323', monospace; font-size: 16px; padding: 6px 8px;
}
.acad-next {
  background: var(--signal); color: var(--void); border: none; padding: 7px 16px;
  cursor: pointer; font-family: 'Chakra Petch'; font-weight: 700; letter-spacing: 1px;
}
.acad-out .echo { color: var(--label-dim); }
.acad-out .ok { color: var(--ok); }
body[data-overlay="academy"] #window-layer,
body[data-overlay="academy"] #mission-widget,
body[data-overlay="academy"] #desk-icons { visibility: hidden; }
```

- [ ] **Step 5: 헤드리스 회귀 + 수동 표시 확인**

Run: `node playtest.js`
Expected: PASS (DOM 변경 무영향).

브라우저(`python -m http.server 8000`): 콘솔에서 `window.term.showAcademy()` → `#academy` 빈 3분할 오버레이가 뜨고 데스크톱이 가려짐. 콘솔 에러 0.

- [ ] **Step 6: 커밋**

```bash
git add index.html css/style.css js/os/shell.js
git commit -m "feat(academy): 시각 학습 오버레이 스캐폴드(마크업·CSS·셸 배선)"
```

---

## Task 5: 시각화 렌더러 AcademyViz (academy-viz.js + 패밀리 keyframe)

**Files:**
- Create: `js/os/academy-viz.js`
- Modify: `css/style.css` (패밀리 애니메이션 keyframe 추가)

**Interfaces:**
- Produces: `window.AcademyViz.render(family: string, command: string, stageEl: HTMLElement): void` — `stageEl.innerHTML` 을 패밀리 장면으로 채우고 애니메이션 (재)재생. `family` ∈ {fs,net,crypto,crack,wifi,light}.

- [ ] **Step 1: academy-viz.js 작성** — 신규 파일 전체:

```javascript
/* ============================================================
 * academy-viz.js — 학습 무대 시각화 렌더러 (AcademyViz)
 * render(family, command, stageEl): 패밀리별 애니메이션 장면을 그린다.
 * 순수 DOM/CSS. 게임 로직과 무관(학습 연출 전용).
 * ============================================================ */
(function () {
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const FS = (cmd) => `
    <div class="vz vz-fs">
      <div class="vz-cap">$ ${esc(cmd)}</div>
      <div class="vz-tree">
        <div class="vz-row dir s1">/ <b>etc/</b></div>
        <div class="vz-row s2">├─ passwd</div>
        <div class="vz-row match s3">├─ ssl/server.key <i>◄ 일치</i></div>
        <div class="vz-row dir s4">/ <b>home/student/</b></div>
        <div class="vz-row s5">├─ welcome.txt</div>
        <div class="vz-row dir s6">├─ .ssh/</div>
        <div class="vz-row match s7">│&nbsp;&nbsp;└─ id_rsa.key <i>◄ 일치</i></div>
        <div class="vz-row s8">└─ notes.md</div>
      </div>
      <div class="vz-leg">커서가 트리를 훑고, 조건에 맞는 노드가 켜진다</div>
    </div>`;

  const NET = (cmd) => `
    <div class="vz vz-net">
      <div class="vz-cap">$ ${esc(cmd)}</div>
      <div class="vz-topo">
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <line class="ln" x1="22%" y1="28%" x2="50%" y2="62%"/>
          <line class="ln" x1="50%" y1="62%" x2="82%" y2="32%"/>
          <line class="ln" x1="50%" y1="62%" x2="63%" y2="80%"/>
        </svg>
        <div class="vz-sweep"></div>
        <div class="vz-host h1"><div class="bx">▣</div><div class="pt">22 ssh</div><div class="ip">.5</div></div>
        <div class="vz-host h2"><div class="bx">▣</div><div class="pt">80 http</div><div class="ip">.12</div></div>
        <div class="vz-host h3"><div class="bx">▣</div><div class="pt">3306</div><div class="ip">.50</div></div>
        <div class="vz-host h4"><div class="bx">▣</div><div class="pt">&nbsp;</div><div class="ip">.77</div></div>
      </div>
      <div class="vz-leg">스캔 라인이 훑으면 살아있는 호스트·열린 포트가 켜진다</div>
    </div>`;

  const CRYPTO = (cmd) => {
    const cipher = ['s','y','n','t','{','x','y','z','}'];
    const plain  = ['f','l','a','g','{','m','n','o','}'];
    const cells = cipher.map((c, i) =>
      `<span class="vz-byte" style="animation-delay:${(i * 0.18).toFixed(2)}s">` +
      `<span class="b-from">${esc(c)}</span><span class="b-to">${esc(plain[i])}</span></span>`).join('');
    return `
    <div class="vz vz-crypto">
      <div class="vz-cap">$ ${esc(cmd)}</div>
      <div class="vz-bytes">${cells}</div>
      <div class="vz-leg">입력이 키와 결합되어 한 글자씩 평문으로 변환된다</div>
    </div>`;
  };

  const CRACK = (cmd) => {
    const words = ['123456','password','letmein','dragon','qwerty','hunter2','admin','s3cr3t!','trustno1','monkey'];
    const rows = words.map((w, i) =>
      `<div class="vz-word${i === 7 ? ' hit' : ''}" style="animation-delay:${(i * 0.12).toFixed(2)}s">${esc(w)}${i === 7 ? ' <i>◄ 일치!</i>' : ''}</div>`).join('');
    return `
    <div class="vz vz-crack">
      <div class="vz-cap">$ ${esc(cmd)}</div>
      <div class="vz-stream">${rows}</div>
      <div class="vz-leg">워드리스트가 흐르다 일치하는 비밀번호에서 멈춘다</div>
    </div>`;
  };

  const WIFI = (cmd) => `
    <div class="vz vz-wifi">
      <div class="vz-cap">$ ${esc(cmd)}</div>
      <div class="vz-air">
        <div class="vz-ap">📡 AP<br><small>HELIOS-CORP</small></div>
        <div class="vz-pkt p1"></div><div class="vz-pkt p2"></div><div class="vz-pkt p3"></div>
        <div class="vz-cli">💻 client</div>
      </div>
      <div class="vz-hs">WPA handshake <b>captured</b> ▰▰▰▰▱ crack…</div>
      <div class="vz-leg">AP↔클라이언트 핸드셰이크를 캡처해 키를 크랙한다</div>
    </div>`;

  const LIGHT = (cmd) => `
    <div class="vz vz-light">
      <div class="vz-cap">$ ${esc(cmd)}</div>
      <div class="vz-badge">실행 결과가 콘솔에 출력됩니다</div>
      <div class="vz-leg">이 명령은 상태/정보를 바꾸거나 출력한다 — 아래 콘솔에서 직접 확인</div>
    </div>`;

  const RENDERERS = { fs: FS, net: NET, crypto: CRYPTO, crack: CRACK, wifi: WIFI, light: LIGHT };

  window.AcademyViz = {
    render(family, command, stageEl) {
      if (!stageEl) return;
      const fn = RENDERERS[family] || LIGHT;
      stageEl.innerHTML = fn(command || '');
      // 리플로우를 강제해 CSS 애니메이션을 처음부터 재생
      stageEl.classList.remove('playing');
      void stageEl.offsetWidth;
      stageEl.classList.add('playing');
    }
  };
})();
```

- [ ] **Step 2: 패밀리 keyframe CSS 추가** — `css/style.css` 파일 끝(Task4 블록 다음)에 추가:

```css
/* ░░ ACADEMY 무대 애니메이션 ░░ */
.acad-stage .vz { padding: 10px 12px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; }
.acad-stage .vz-cap { color: var(--ok); font-size: 15px; }
.acad-stage .vz-leg { margin-top: auto; font-size: 13px; color: var(--label-dim); }

/* 파일시스템 */
.vz-tree { font-size: 16px; line-height: 1.5; }
.vz-row { opacity: .5; padding: 0 4px; border-radius: 3px; }
.vz-row b { color: var(--signal); }
.vz-row.match i { color: #ffd166; font-style: normal; }
.playing .vz-row { animation: vzScan 5.5s linear infinite; }
.playing .vz-row.match { animation: vzScan 5.5s linear infinite, vzMatch 5.5s ease-in-out infinite; }
.vz-row.s1{animation-delay:0s}.vz-row.s2{animation-delay:.35s}.vz-row.s3{animation-delay:.7s}
.vz-row.s4{animation-delay:1.05s}.vz-row.s5{animation-delay:1.4s}.vz-row.s6{animation-delay:1.75s}
.vz-row.s7{animation-delay:2.1s}.vz-row.s8{animation-delay:2.45s}
@keyframes vzScan { 0%,6%{opacity:.5;background:transparent} 9%,13%{opacity:1;background:#16304a} 16%,100%{opacity:.7;background:transparent} }
@keyframes vzMatch { 0%,40%{box-shadow:none} 50%,92%{box-shadow:0 0 10px var(--signal);background:#0c2433} 100%{box-shadow:none} }

/* 네트워크 */
.vz-topo { position: relative; flex: 1; }
.vz-topo svg { position: absolute; inset: 0; }
.vz-topo .ln { stroke: var(--signal); stroke-width: 1; opacity: .25; stroke-dasharray: 3 3; }
.vz-sweep { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,var(--signal),transparent); box-shadow: 0 0 10px var(--signal); }
.playing .vz-sweep { animation: vzSweep 4s ease-in-out infinite; }
@keyframes vzSweep { 0%{top:6%} 50%{top:90%} 100%{top:6%} }
.vz-host { position: absolute; width: 52px; text-align: center; opacity: .5; }
.vz-host .bx { width: 26px; height: 26px; margin: 0 auto; border: 1px solid var(--signal); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--void); background: var(--signal); box-shadow: 0 0 8px var(--signal); }
.vz-host .pt { font-size: 10px; color: #ffd166; height: 11px; }
.vz-host .ip { font-size: 11px; color: var(--label); }
.playing .vz-host { animation: vzPop 4s ease-out infinite; }
.vz-host.h1{left:10%;top:16%;animation-delay:.6s}.vz-host.h2{left:38%;top:50%;animation-delay:1.3s}
.vz-host.h3{left:70%;top:18%;animation-delay:2s}.vz-host.h4{left:55%;top:74%;animation-delay:2.6s}
@keyframes vzPop { 0%,10%{opacity:.3} 18%{transform:scale(1.25)} 25%,100%{opacity:1;transform:scale(1)} }

/* 암호 */
.vz-bytes { display: flex; flex-wrap: wrap; gap: 6px; font-size: 22px; }
.vz-byte { position: relative; display: inline-block; width: 22px; height: 30px; }
.vz-byte .b-from, .vz-byte .b-to { position: absolute; left: 0; right: 0; text-align: center; }
.vz-byte .b-from { color: var(--label-dim); }
.vz-byte .b-to { color: var(--signal); opacity: 0; }
.playing .vz-byte .b-from { animation: vzFromOut 2.5s ease-in-out infinite; }
.playing .vz-byte .b-to { animation: vzToIn 2.5s ease-in-out infinite; }
@keyframes vzFromOut { 0%,20%{opacity:1} 45%,100%{opacity:0} }
@keyframes vzToIn { 0%,25%{opacity:0;transform:translateY(-6px)} 50%,100%{opacity:1;transform:translateY(0)} }

/* 크래킹 */
.vz-stream { flex: 1; overflow: hidden; font-size: 16px; line-height: 1.6; }
.vz-word { opacity: .35; color: var(--label); }
.vz-word.hit { color: var(--ok); } .vz-word.hit i { color: #ffd166; font-style: normal; }
.playing .vz-word { animation: vzWord 3s ease-in-out infinite; }
.playing .vz-word.hit { animation: vzWordHit 3s ease-in-out infinite; }
@keyframes vzWord { 0%{opacity:.15} 50%{opacity:.6} 100%{opacity:.15} }
@keyframes vzWordHit { 0%,60%{opacity:.3} 72%,100%{opacity:1;text-shadow:0 0 8px var(--ok)} }

/* 무선 */
.vz-air { position: relative; flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; }
.vz-ap, .vz-cli { text-align: center; color: var(--signal); font-size: 14px; }
.vz-pkt { position: absolute; top: 50%; width: 8px; height: 8px; border-radius: 50%; background: #ffd166; box-shadow: 0 0 8px #ffd166; }
.playing .vz-pkt { animation: vzPkt 1.6s linear infinite; }
.vz-pkt.p1{animation-delay:0s}.vz-pkt.p2{animation-delay:.5s}.vz-pkt.p3{animation-delay:1s}
@keyframes vzPkt { 0%{left:18%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{left:82%;opacity:0} }
.vz-hs { color: var(--ok); font-size: 14px; } .vz-hs b { color: var(--signal); }

/* 라이트 */
.vz-badge { color: var(--signal); font-size: 18px; padding: 14px 0; }
```

- [ ] **Step 3: 헤드리스 회귀 + 수동 시각 확인**

Run: `node playtest.js`
Expected: PASS (academy-viz.js 는 playtest 미로드).

브라우저: `window.term.showAcademy()` 후 콘솔에서
`window.AcademyViz.render('net','nmap 10.0.0.0/24', document.getElementById('acad-stage'))` → 토폴로지 스캔 재생. `'fs'`,`'crypto'`,`'crack'`,`'wifi'`,`'light'` 도 각각 확인. 콘솔 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add js/os/academy-viz.js css/style.css
git commit -m "feat(academy): 6패밀리 시각화 렌더러 + CSS 애니메이션"
```

---

## Task 6: 학습 컨트롤러 AcademyUI (academy.js)

**Files:**
- Create: `js/apps/academy.js`

**Interfaces:**
- Consumes: `Academy.order`, `Academy.categories`, `Academy.familyOf`, `Academy.demoFor`, `Academy.isPractice`, `window.COMMANDS`, `game.exec`, `game.academyDone`, `game.save`, `AcademyViz.render`, `term.showAcademy`.
- Produces: `window.AcademyUI.open(game)`, `window.AcademyUI.go(cmd)`, `window.AcademyUI.next()`.

- [ ] **Step 1: academy.js 작성** — 신규 파일 전체:

```javascript
/* ============================================================
 * academy.js — 시각 학습 컨트롤러 (AcademyUI)
 * 3분할 오버레이: 커리큘럼 사이드바 · 시각화 무대 · 실습 콘솔.
 * 실습(명령 직접 입력)을 통과하면 다음 명령 잠금 해제.
 * 입력은 전부 game.exec 로 수렴(엔진 무변경).
 * ============================================================ */
(function () {
  const $ = s => document.querySelector(s);
  const A = () => window.Academy;

  const UI = {
    game: null,
    cur: null,        // 현재 학습 중인 명령
    _bound: false,

    open(game) {
      this.game = game;
      if (window.term && window.term.showAcademy) window.term.showAcademy();
      this._bindOnce();
      const order = A().order;
      const done = game.academyDone || new Set();
      this.cur = order.find(c => !done.has(c)) || order[0];
      this.renderSidebar();
      this.renderLesson();
      this._clearConsole();
      const inp = $('#acad-input'); if (inp) setTimeout(() => inp.focus(), 0);
    },

    // 진입 가능 최대 인덱스 = 앞에서부터 연속 완료한 개수(그 다음 하나까지 해제)
    _maxUnlockedIndex() {
      const order = A().order, done = this.game.academyDone || new Set();
      let i = 0;
      while (i < order.length && done.has(order[i])) i++;
      return i;
    },

    renderSidebar() {
      const side = $('#acad-side'); if (!side) return;
      const order = A().order, done = this.game.academyDone || new Set();
      const maxIdx = this._maxUnlockedIndex();
      const idxOf = c => order.indexOf(c);
      let html = '';
      for (const [name, cmds] of A().categories) {
        html += `<div class="acad-cat">▸ ${name}</div>`;
        for (const c of cmds) {
          const di = idxOf(c);
          const isDone = done.has(c), isCur = c === this.cur, locked = di > maxIdx;
          const cls = isCur ? 'current' : isDone ? 'done' : locked ? 'locked' : '';
          const mark = isDone ? '✔' : isCur ? '▶' : locked ? '🔒' : '○';
          html += `<button class="acad-li ${cls}" data-cmd="${c}"${locked ? ' disabled' : ''}>${mark} ${c}</button>`;
        }
      }
      side.innerHTML = html;
      side.querySelectorAll('.acad-li').forEach(b => b.addEventListener('click', () => {
        if (!b.disabled) this.go(b.dataset.cmd);
      }));
      const prog = $('#acad-prog'); if (prog) prog.textContent = `${done.size} / ${order.length}`;
    },

    renderLesson() {
      const c = this.cur; if (!c) return;
      const cmdEl = $('#acad-cmd'), descEl = $('#acad-desc');
      const meta = (window.COMMANDS || {})[c] || {};
      if (cmdEl) cmdEl.textContent = c;
      if (descEl) descEl.textContent = meta.desc || '';
      const stage = $('#acad-stage');
      if (stage && window.AcademyViz) window.AcademyViz.render(A().familyOf(c), A().demoFor(c), stage);
      const nextBtn = $('#acad-next');
      if (nextBtn) nextBtn.hidden = !(this.game.academyDone && this.game.academyDone.has(c));
      const prompt = $('#acad-prompt');
      if (prompt) prompt.textContent = `${this.game.user || 'student'}@${this.game.host || 'academy'}:~$`;
    },

    go(cmd) {
      if (!A().order.includes(cmd)) return;
      this.cur = cmd;
      this.renderSidebar();
      this.renderLesson();
      const inp = $('#acad-input'); if (inp) inp.focus();
    },

    next() {
      const order = A().order, i = order.indexOf(this.cur);
      if (i >= 0 && i + 1 < order.length) this.go(order[i + 1]);
    },

    _clearConsole() { const o = $('#acad-out'); if (o) o.innerHTML = ''; },
    _print(text, cls) {
      const o = $('#acad-out'); if (!o) return;
      String(text == null ? '' : text).split('\n').forEach(line => {
        const d = document.createElement('div');
        d.className = 'acad-line' + (cls ? ' ' + cls : '');
        d.textContent = line;
        o.appendChild(d);
      });
      o.scrollTop = o.scrollHeight;
    },

    _submit() {
      const inp = $('#acad-input'); if (!inp) return;
      const raw = inp.value; inp.value = '';
      if (!raw.trim()) return;
      this._print(`${this.game.user || 'student'}@${this.game.host || 'academy'}:~$ ${raw}`, 'echo');
      let out = '';
      try { out = this.game.exec(raw); } catch (e) { out = 'err: ' + e.message; }
      if (out) this._print(out);
      // 실습 무대 리플레이: 입력 명령의 패밀리로 무대 재생
      const first = raw.trim().split(/\s+/)[0].toLowerCase();
      const stage = $('#acad-stage');
      if (stage && window.AcademyViz && (window.COMMANDS || {})[first]) {
        window.AcademyViz.render(A().familyOf(first), raw.trim(), stage);
      }
      // 게이팅: 현재 학습 명령을 직접 쳤으면 완료 처리
      if (A().isPractice(raw, this.cur) && !(this.game.academyDone && this.game.academyDone.has(this.cur))) {
        this.game.academyDone = this.game.academyDone || new Set();
        this.game.academyDone.add(this.cur);
        if (this.game.save) this.game.save();
        this._print(`  ✔ '${this.cur}' 실습 완료 — 다음 명령이 열렸습니다.`, 'ok');
        this.renderSidebar();
        const nextBtn = $('#acad-next'); if (nextBtn) nextBtn.hidden = false;
      }
      inp.focus();
    },

    _bindOnce() {
      if (this._bound) return; this._bound = true;
      const inp = $('#acad-input');
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this._submit(); } });
      const nextBtn = $('#acad-next');
      if (nextBtn) nextBtn.addEventListener('click', () => this.next());
    }
  };

  window.AcademyUI = UI;
})();
```

- [ ] **Step 2: 헤드리스 회귀 확인**

Run: `node playtest.js`
Expected: PASS — academy.js 는 playtest 미로드. 전부 PASS.

- [ ] **Step 3: Playwright 스모크(수동, MCP)** — 로컬 서버(`python -m http.server 8000`) 후:
  1. `browser_navigate` → `http://localhost:8000`, 부팅 스킵(키), 새 게임으로 데스크톱 진입.
  2. 콘솔에서 `window.game.enterAcademy()` (또는 그 외 모드 모달의 학습 버튼).
  3. `#academy` 오버레이가 뜨고 사이드바 첫 항목 `▶ ls`(current), 뒤 명령 잠금(🔒) 확인.
  4. `acad-input` 에 `ls` 입력+Enter → 무대 fs 애니메이션 재생, "✔ 'ls' 실습 완료" 출력, 사이드바 `ls`=✔, 다음 명령 해제.
  5. 잠긴 명령 클릭 → 진입 안 됨. `browser_console_messages` 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add js/apps/academy.js
git commit -m "feat(academy): 시각 학습 컨트롤러 AcademyUI(사이드바·콘솔·실습 게이팅)"
```

---

## Task 7: 통합 검증 & 마감

**Files:** (검증 전용 — 코드 변경 없음. 발견된 버그는 해당 파일에서 수정 후 재검증)

- [ ] **Step 1: 전체 헤드리스 회귀**

Run: `node playtest.js`
Expected: `✅ ALL CHECKS PASS` — 기존 105 + 신규(약 13)건 전부 PASS, 0 failed.

- [ ] **Step 2: Playwright 풀 스모크(수동, MCP)** — 로컬 서버에서:
  1. 부팅 → 런처 → 새 게임 → 미션 1개(`ls`)를 터미널로 클리어(엔진 본편 회귀 확인).
  2. `menu` → 그 외 모드 → 학습 진입 → ls→cd→pwd 순서로 3개 실습 통과·잠금 해제.
  3. 무대 애니메이션이 fs/net/crypto 명령에서 각각 다르게 재생.
  4. 학습 도중 `✕ 메뉴` → 메뉴 복귀 → 다시 학습 진입 시 진도(✔) 유지(localStorage) 확인.
  5. `browser_console_messages` 콘솔 에러 0.

- [ ] **Step 3: 스펙 대조 자가검토** — `docs/superpowers/specs/2026-06-27-visual-academy-design.md` §4~§8 각 항목 구현 확인. 누락 시 수정.

- [ ] **Step 4: 최종 커밋(미커밋분 있을 시)**

```bash
git add -A
git commit -m "test(academy): 통합 스모크 검증 및 마감"
```

---

## Self-Review (작성자 체크)

- **스펙 커버리지:** §3 진입(Task3) · §4 레이아웃(Task4) · §5 패밀리(Task1 매핑+Task5 렌더) · §6 게이팅(Task1 isPractice+Task6) · §7 파일구조(Task1~6) · §8 데이터모델(Task1·2) · §9 테스트(각 Task+Task7) · §10 스타일(Task4·5). 누락 없음.
- **플레이스홀더:** 모든 Step 에 실제 코드/명령/기대출력 포함. "적절히 처리" 류 없음.
- **타입 일관성:** `Academy.order`/`categories`/`familyOf`/`demoFor`/`isPractice`(Task1 정의) ↔ `AcademyUI`(Task6 소비) 일치. `AcademyViz.render(family,command,stageEl)`(Task5) ↔ AcademyUI 호출 일치. `term.showAcademy`/`hideOverlays`(Task4) ↔ AcademyUI/엔진 호출 일치. `game.academyDone:Set`(Task2) ↔ 사용처 일치.
