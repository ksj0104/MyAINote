# TERMINAL//BREACH — 픽셀 해킹 학습 게임

유닉스 명령어를 **직접 타이핑**하며 기초부터 고급까지 단계별로 모의 해킹 목표를 푸는 웹 게임입니다.
스팀의 *Hacknet / Hacker Simulator* 스타일을 참고한 CRT 픽셀 터미널 분위기로 제작되었습니다.

> ⚠️ 모든 해킹은 **시뮬레이션**입니다. 실제 시스템을 대상으로 하지 않습니다. 게임에서 배운 기술은 반드시 허가된 환경(CTF, 자기 실습실 등)에서만 사용하세요.

## 실행 방법

별도 설치/빌드가 필요 없습니다. 정적 파일이라 브라우저로 바로 열면 됩니다.

```
# 가장 간단한 방법: index.html 더블클릭
# 또는 로컬 서버(권장 - 폰트/오디오 안정):
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## NULLSEC OS — 데스크톱 셸

접속하면 **가상 컴퓨터의 바탕화면(NULLSEC OS)** 이 부팅됩니다. 아무 키나 누르면 바탕화면 가운데에
**세션 런처**(새 게임 / 이어하기 / 미션 선택 / 그 외 모드)가 뜨고, 선택하면 데스크톱에서 작전이 시작됩니다.

미션은 바탕화면 아이콘으로 띄우는 **앱**으로 풉니다 — 창은 드래그·리사이즈·최소화·최대화·닫기가 되고,
하단 작업표시줄로 전환합니다.

| 앱 | 역할 |
|----|------|
| 📨 **메신저** | 0xMOTHER·WRAITH 와 교신. **미션 브리핑/디브리핑이 여기로 도착**(타이핑). `chat` 으로 대화 |
| 💻 **터미널** | 명령 콘솔(주력). 모든 유닉스/해킹 명령을 직접 타이핑 — 셸 미션을 여기서 해결 |
| 🌐 **브라우저** | 웹 미션용. 주소창 이동(=`curl`), **로그인 폼에 SQLi 입력**, 업로드 폼 등으로 웹 취약점 공략 |

- **미션 위젯**(바탕화면 우상단): 현재 미션 ID·목표·진행도(n/34)·STANCE 를 항상 표시 + **정답 제출(submit)** 입력칸.
- **시작 버튼**(작업표시줄 ◈): 세션 런처 · 미션 선택 · 그 외 모드 · 작전 정보(intel) · 테마 · 처음부터.
- 미션 클리어 후 **아무 키나 누르면** 다음 브리핑이 메신저로 도착합니다. 게임 중 언제든 `menu` 로 런처 복귀.

> 게임 엔진(명령 인터프리터·34미션·교신·판정·STANCE 분기)은 그대로이며, 셸만 데스크톱 OS로 재구성했습니다.
> 설계 문서: **[docs/superpowers/specs/2026-06-27-nullsec-os-desktop-design.md](docs/superpowers/specs/2026-06-27-nullsec-os-desktop-design.md)**

### 타이틀 메뉴

| # | 항목 | 동작 |
|---|------|------|
| 1 | 🎬 **새 게임** | 시나리오를 **처음부터**(L01) 시작 — 진행 기록을 초기화 |
| 2 | ⏵ **이어하기** | 저장된 지점부터 시나리오 **이어서** 진행 (`Enter` 기본값: 진행 기록 있으면 이어하기) |
| 3 | 🗂 **미션 선택** | 클리어한 **지난 미션을 다시 풀기**(복습). 복습은 실제 진행도에 영향 없음 |
| 4 | 🧩 **그 외 모드** | 학습 · 코드랩 · 워게임 서브메뉴 열기 |

> **미션 선택**: 34개 미션을 ✔클리어 / ▶현재 / 🔒잠김 으로 보여줍니다. 해제된 미션을 ↑/↓·Enter 또는 번호로 골라 다시 플레이하며, 복습을 클리어/포기하면 미션 선택 화면으로 돌아옵니다. 잠긴(아직 도달 못 한) 미션은 선택할 수 없습니다.

### 그 외 모드 (TRAINING 서브메뉴)

| # | 모드 | 내용 |
|---|------|------|
| 1 | 🎓 **학습 (ACADEMY)** | 모든 명령어(65개)를 `learn <명령>`/`lessons` 로 배우고, 안전한 샌드박스에서 자유 실습 |
| 2 | 💻 **코드랩 (CODE LAB)** | JS 코드를 직접 작성해 암호를 복호화/탈취 — `solve(input)` 을 완성하면 자동 채점 |
| 3 | 🚩 **워게임 (WARGAME)** | CTF 챌린지 6종(Crypto/Web/Forensics/Network/Privesc), 난이도·점수, flag 캡처 |
| 0 | ◀ **뒤로** | 타이틀 메뉴로 복귀 (`menu` 도 가능) |

> 메인 줄기는 **스토리(시나리오)** — 새 게임/이어하기로 따라가며 배우고, 더 연습하거나 도전하고 싶을 때 *그 외 모드*를 곁들인다.

## 교신(COMMS) — 해커들과 실시간 대화

스토리 진행 중 동료/접선 해커와 **직접 대화**할 수 있습니다.

- `chat <말>` — 현재 채널 상대와 대화. 키워드를 알아듣고 캐릭터 말투로 답하며, 막히면 현재 미션 목표를 인-캐릭터로 알려줍니다. (예: `chat 무서워`, `chat 다음 뭐해`, `chat 넌 누구야`)
- `channel <이름>` / `contacts` — 채널 전환 / 연락처 목록
- **0xMOTHER** (멘토) 가 기본 채널. **ACT II(L14)** 진입 시 수수께끼의 해커 **WRAITH** 가 추적 불가 채널로 침입해 연락처에 추가됩니다 — `channel wraith` 로 대화하면 0xMOTHER와는 전혀 다른 인격으로 응수합니다.

## 게임 방법

- 하단 프롬프트에 명령을 입력하고 **Enter**.
- `help` 명령 목록 · `man <명령>` 사용법 · `objective` 현재 목표 · `hint` 단계별 힌트
- `intel` (= `story`/`정보`) 작전 브리핑 — 현재 목표 + 큰 그림(작전 개요·ACT·세력 현황·ORACLE 경계도·행적). 길을 잃었을 때 길잡이.
- `chat <말>` 0xMOTHER(또는 접선 해커)와 실시간 대화 · `contacts` 연락처 · `channel <이름>` 채널 전환
- `levels` 진행 현황 · `theme <amber|green|cyan>` 화면 색상 · `restart` 처음부터
- **저장/불러오기**: `save <슬롯>` 으로 저장, `load <슬롯>` 으로 복원, `saves` 로 목록 — 전부 유닉스 명령처럼 입력합니다. (연속 진행은 자동저장도 됩니다)
- **↑/↓** — 메뉴 화면에선 항목 선택 이동(Enter 진입), 터미널에선 명령 히스토리 · **Tab** 자동완성

## 난이도별 화면 (실제 PC처럼 진화)

화면 가운데는 **위 = 스토리/미션 창**(막간극·브리핑·목표·디브리핑), **아래 = 터미널 창**(명령 입출력)으로 분리되어 있습니다. 스토리와 실제 작업이 섞이지 않아 "지금 뭘 해야 하는지"가 항상 위에 떠 있습니다.

단계가 올라갈수록 좌우 화면 구성도 달라집니다 (레벨 tier에 따라 `body[data-mode]` 자동 전환):

- **기초 (terminal)** — 순수 터미널. 명령어 자체에 집중.
- **중급 (recon)** — 우측에 **네트워크 타겟 패널**. nmap으로 발견한 호스트가 ▢→▣→◆(장악) 으로 표시.
- **고급·실전 (os)** — 좌측 **파일트리 사이드바** + 상단 **상태바**(user@host·PWD·접속 HOPS) + 타겟 패널까지 갖춘 "실제 운영체제" 같은 멀티패널 화면. 매 명령마다 실시간 갱신.

## 스토리

> 전체 서사 설계(로그라인·3막 구조·미션별 비트·ORACLE/WRAITH 아크)는 **[STORY.md](STORY.md)** 참고.

당신은 해커 집단 **NULLSEC** 의 신입. 멘토 **0xMOTHER** 의 지도 아래
기초 터미널 조작부터 메가코프 **HELIOS** 코어 장악까지 34개 미션(4 시리즈: 각성·침투·그림자전쟁·정전)을 수행하며
실제 펜테스트 워크플로(정찰 → 침투 → 권한상승 → 피벗)를 자연스럽게 익힙니다.

## 학습 커리큘럼 (34 미션 · 4 시리즈)

> 전체 미션·대사·풀이·분기 설계는 **[NEW_MISSIONS.md](NEW_MISSIONS.md)** 참고. (성향 STANCE 에 따라 엔딩 3종 분기)

| 단계 | 미션 | 배우는 것 |
|------|------|-----------|
| 기초 | 첫 접속 / 숨겨진 흔적 / 바늘 찾기 | `ls` `cd` `cat` `pwd` `ls -a` `grep` `find` |
| 기초 | 잠긴 문 / 암호문 | `chmod` 권한, `base64` 인코딩 |
| 중급 | 정찰 / 첫 침투 / 서비스 식별 | `nmap` `ssh` `nmap -sV` |
| 중급 | 침입자 추적 | `auth.log` 분석, `grep` 패턴 |
| 고급 | 권한 상승 / 해시 크래킹 | `sudo` `john` `su` |
| 고급 | 피벗 / 최종: HELIOS | 원격 접속 체인, `exit`, 루트 탈취 |
| 실전 | 워드리스트 브루트포스 | `hydra` 사전 대입 공격 |
| 실전 | 암호문 복호화 | `xor` `caesar` `rot13` `vigenere` |
| 실전 | 원격 DB 암호 추출 | `dump` → `hashcat` 해시 크랙 |
| 실전 | 원격 코드 탈취 | `find`/`grep` 소스 정찰, `scp` 탈취 |
| 실전 | 백도어 삽입 | `echo payload >> /etc/rc.local` (리다이렉션) |
| 실전 | **무선 거점** | `airmon-ng`→`airodump-ng`→`aireplay-ng`(deauth)→`aircrack-ng` WPA 핸드셰이크 크랙 |
| 실전 | 오퍼레이션 블랙아웃 | 정찰→브루트→침투→탈취 풀체인 보스 |

### 실제 PC 흉내 명령어 (후반 단계)

파일 조작 `mkdir touch cp mv rm` · 출력 리다이렉션 `>` `>>` · 시스템 `top df free env export kill arp route uptime` · 네트워크 `scp wget curl` · 암호 `rot13 caesar xor vigenere md5sum` · 공격 `hydra hashcat dump` · 무선 `airmon-ng airodump-ng aireplay-ng aircrack-ng`

## 구조

```
index.html          진입점 (스크립트 로드 순서 포함)
css/style.css       NULLSEC OS 스타일(창/아이콘/작업표시줄/위젯/앱) + 듀얼톤 토큰·CRT·3색 테마
js/filesystem.js    가상 유닉스 파일시스템 (트리·권한·경로해석·쓰기)
js/commands.js      명령어 인터프리터 89종 (ls,grep,nmap,ssh,xor,hydra,scp,head,wc ...)
js/levels.js        시나리오 34개 레벨(4시리즈) + STANCE 분기 + 클리어 판정
js/wargames.js      워게임 CTF 챌린지 6종 (점수·카테고리)
js/modes.js         메뉴 라우팅 · 학습(Academy) · 코드랩(CodeLab)
js/comms.js         교신(COMMS) — 0xMOTHER/WRAITH 대화 엔진 (chat/channel/contacts)
js/game.js          게임 엔진 (모드 라우팅/진행/저장/원격접속/명령실행/판정)
js/os/window-manager.js  창 매니저 — 드래그·리사이즈·포커스·최소화·작업표시줄
js/os/shell.js           셸 컨트롤러 window.term(엔진 UI 표면) + 부팅·런처·미션위젯·메뉴·엔딩
js/apps/terminal-app.js  터미널 앱 (명령 콘솔)
js/apps/messenger.js     메신저 앱 (브리핑/교신, 타이핑 큐)
js/apps/browser.js       브라우저 앱 (주소창·로그인폼·업로드 — 웹 미션)
```

## 검증

`node playtest`(개발용 하니스)로 **시나리오 34 · 워게임 6 · 코드랩 4 + 학습(89명령)·STANCE 분기·교신·메뉴·미션선택·셸 문법**이
모두 의도한 풀이로 클리어 가능함을 확인했습니다(총 **105 검사 PASS**).
추가로 실제 Chrome(headless)에서 34미션 처음~끝 풀플레이 + 엔딩까지 검증했습니다(콘솔 에러 0).

## 배포 (GitHub Pages — 외부 공개)

백엔드/빌드가 없는 **순수 정적 사이트**라 GitHub Pages에 그대로 올리면 누구나 접속 가능합니다.
저장(세이브)은 각자 브라우저 localStorage에 보관되므로 서버 DB가 필요 없습니다.

> 자산 경로가 전부 **상대경로**라 `https://<id>.github.io/<repo>/` 같은 하위 경로에서도 그대로 동작합니다.
> `.nojekyll` 파일을 포함해 GitHub Pages가 모든 파일을 가공 없이 서빙합니다.

**1) GitHub에 빈 저장소 생성** — github.com → New repository → 이름 예: `terminal-breach`
(README/.gitignore/라이선스 **추가하지 않음** — 빈 저장소로).

**2) 원격 연결 후 푸시** (로컬은 이미 `main` 브랜치로 커밋됨):

```bash
git remote add origin https://github.com/<id>/terminal-breach.git
git push -u origin main
```
> 첫 푸시 때 Windows Git Credential Manager가 브라우저 로그인 창을 띄웁니다. 로그인하면 끝.

**3) Pages 활성화** — 저장소 **Settings → Pages →** Source: **Deploy from a branch**,
Branch: **main** / **/(root)** → Save.

1~2분 뒤 `https://<id>.github.io/terminal-breach/` 에서 전 세계 누구나 플레이할 수 있습니다.

**이후 업데이트**: 코드 수정 → `git add -A && git commit -m "..." && git push` → 자동 재배포.
