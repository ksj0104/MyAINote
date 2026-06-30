/* ============================================================
 * room.js — TRACE//CALL 방(씬) 레이어 (window.Room)
 * 장소마다 픽셀아트 방을 캔버스로 그리고, 오브젝트 위에 클릭 핫스팟을 얹는다.
 *   🖥 컴퓨터 → 기존 해킹 데스크톱(터미널/브라우저)으로 진입
 *   📱 핸드폰 → 문자/알림        🧑 동료 → 대화
 *   🚪 문   → 밖으로 나가 이동할 장소 선택(잠금/해금은 Trace 판정)
 * 장소 환경/조사/해금 로직은 Trace 가 갖고, 이 파일은 픽셀 표현·이동 허브다.
 * ============================================================ */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const W = 200, H = 120, SC = 5; // 논리 해상도 200x120, 5배 확대 → 1000x600

  // 표준 오브젝트 핫스팟(논리 좌표, 캔버스 폴백 씬용). 장소별 objects 와 교집합만 클릭 가능.
  const HOT = {
    computer: { x: 34, y: 38, w: 44, h: 34, label: '🖥 컴퓨터' },
    phone: { x: 95, y: 73, w: 14, h: 20, label: '📱 핸드폰' },
    npc: { x: 118, y: 44, w: 26, h: 48, label: '🧑 동료' },
    door: { x: 165, y: 42, w: 30, h: 64, label: '🚪 문' }
  };
  // 배경 이미지(픽셀아트 에셋)가 있는 장소. 이미지 위 핫스팟은 % 좌표.
  // (다른 장소도 imgs/bg_<id>.png 를 넣고 IMG_HOT 에 좌표를 추가하면 자동 사용됨)
  const BG = { home: 'imgs/bg_lofi.png' };
  const IMG_HOT = {
    home: { computer: { left: 53, top: 45, width: 30, height: 26, label: '🖥 컴퓨터' } }
  };

  // 픽셀 그리기 도우미 (ctx 는 이미 SC 배 스케일됨 → 논리 좌표로 그린다)
  function P(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function character(ctx, x, y, hair, shirt, skin) {
    skin = skin || '#e9c6a0';
    P(ctx, x + 3, y - 2, 10, 4, hair);     // 머리카락
    P(ctx, x + 4, y + 1, 8, 7, skin);      // 얼굴
    P(ctx, x + 2, y + 8, 12, 15, shirt);   // 몸통
    P(ctx, x + 3, y + 23, 4, 9, '#222732');// 다리
    P(ctx, x + 9, y + 23, 4, 9, '#222732');
  }
  function monitor(ctx, on, screen) {
    P(ctx, 36, 38, 42, 28, '#05080c');               // 베젤
    P(ctx, 39, 41, 36, 22, on ? screen : '#0c1116'); // 화면
    if (on) { for (let i = 0; i < 5; i++) P(ctx, 41, 43 + i * 4, 32, 1, 'rgba(255,255,255,0.10)'); P(ctx, 41, 44, 16, 2, 'rgba(255,255,255,0.5)'); }
    P(ctx, 54, 66, 6, 4, '#0a0e12'); P(ctx, 48, 70, 18, 2, '#0a0e12'); // 스탠드
  }
  function desk(ctx, c) { P(ctx, 26, 72, 96, 5, c); P(ctx, 30, 77, 4, 14, c); P(ctx, 114, 77, 4, 14, c); }
  function phone(ctx, accent) { P(ctx, 97, 75, 10, 16, '#10151c'); P(ctx, 98, 77, 8, 11, accent); P(ctx, 100, 89, 4, 1, '#3a414c'); }
  function doorPx(ctx, c) { P(ctx, 166, 44, 26, 60, c); P(ctx, 168, 46, 22, 56, 'rgba(0,0,0,0.25)'); P(ctx, 186, 72, 3, 4, '#e8d27a'); }

  // 장소별 씬 그리기
  const SCENES = {
    home(ctx) {
      P(ctx, 0, 0, W, 84, '#102031'); P(ctx, 0, 84, W, 36, '#0c1722'); P(ctx, 0, 82, W, 2, '#1d3346');
      P(ctx, 14, 12, 42, 30, '#0a1626'); P(ctx, 14, 12, 42, 2, '#284a64'); P(ctx, 34, 12, 2, 30, '#284a64'); // 창
      P(ctx, 44, 16, 7, 7, '#dfe9ff');                                   // 달
      P(ctx, 150, 14, 34, 6, '#2a3340'); P(ctx, 156, 20, 3, 5, '#2a3340'); P(ctx, 176, 20, 3, 5, '#2a3340'); // 선반
      desk(ctx, '#3a2a1e'); monitor(ctx, true, '#0b3a44'); phone(ctx, '#3fe0ea');
      P(ctx, 84, 66, 6, 6, '#caa'); P(ctx, 85, 64, 4, 2, '#fff');        // 커피
      doorPx(ctx, '#4a3422');
      character(ctx, 122, 46, '#15161a', '#2f6f7a');                     // 한지우
    },
    neighbor(ctx) {
      P(ctx, 0, 0, W, 84, '#241d16'); P(ctx, 0, 84, W, 36, '#190f08'); P(ctx, 0, 82, W, 2, '#3a2c1d');
      P(ctx, 16, 12, 18, 14, '#1a120b'); P(ctx, 16, 12, 18, 2, '#5a4631'); // 액자
      P(ctx, 150, 10, 14, 14, '#2a2018'); P(ctx, 156, 12, 2, 8, '#caa'); // 괘종시계
      desk(ctx, '#4a3522'); monitor(ctx, true, '#123');
      phone(ctx, '#6fe07a'); doorPx(ctx, '#3a2a1a');
      character(ctx, 122, 46, '#d6d6d6', '#5a4a38', '#e3c0a0');           // 박 노인
    },
    den(ctx) {
      P(ctx, 0, 0, W, 84, '#0e1418'); P(ctx, 0, 84, W, 36, '#0a0e12'); P(ctx, 0, 82, W, 2, '#16252b');
      // 운영 PC 3대
      for (let i = 0; i < 3; i++) { const x = 30 + i * 26; P(ctx, x, 50, 18, 13, '#05080c'); P(ctx, x + 2, 52, 14, 9, '#0a2e34'); P(ctx, x + 6, 64, 6, 3, '#0a0e12'); }
      // 헤드셋(점) + 대본 더미
      for (let i = 0; i < 4; i++) P(ctx, 32 + i * 26, 47, 6, 3, '#3a414c');
      desk(ctx, '#23262c'); P(ctx, 96, 74, 16, 10, '#1a1d22');           // 노트북(네 장비)
      P(ctx, 98, 76, 12, 6, '#0a2e34'); P(ctx, 95, 84, 18, 2, '#1a1d22');
      doorPx(ctx, '#2a2f36');
    },
    helios(ctx) {
      P(ctx, 0, 0, W, 70, '#0a0f1a'); P(ctx, 0, 70, W, 50, '#10151c'); P(ctx, 0, 68, W, 2, '#1a2230'); // 밤하늘/아스팔트
      for (let i = 0; i < 30; i++) P(ctx, (i * 53) % W, (i * 17) % 60, 1, 1, '#33405a');               // 별
      P(ctx, 120, 18, 46, 52, '#141b27');                                                              // 사옥
      for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) P(ctx, 124 + c * 10, 22 + r * 8, 5, 4, (r + c) % 3 ? '#26344a' : '#3fe0ea');
      P(ctx, 30, 74, 70, 22, '#1a2230'); P(ctx, 34, 70, 12, 6, '#0a0e12'); P(ctx, 86, 70, 12, 6, '#0a0e12'); // 차
      P(ctx, 50, 78, 16, 10, '#10151c'); P(ctx, 52, 80, 12, 6, '#0a2e34');                               // 노트북
      P(ctx, 48, 38, 30, 22, '#05080c'); P(ctx, 51, 41, 24, 16, '#0b3a44');                              // 컴퓨터(차 앞유리 HUD 느낌)
      doorPx(ctx, '#222a36');
    }
  };

  const ROOMS = {
    home: { objects: ['computer', 'phone', 'npc', 'door'],
      npc: { icon: '🧑', name: '한지우', lines: ['한지우: 선배, 이거 사적으로 파면 선 넘는 거 알죠.', '한지우: …그래도 도울게요. 합법 라인은 제가 봐줄 테니, 증거는 *원본·해시*까지 챙겨요.', '한지우: 스크린샷은 증거가 안 돼요. 법정에서 살아남는 건 원본이에요.'] },
      phone: ['엄마: 서진아, 아빠가 이상한 전화를 받았어. 괜찮은 거지?', '엄마: 반찬 보냈다. 끼니 거르지 마라.', '(부재중) 아빠 — 7통'] },
    neighbor: { objects: ['computer', 'phone', 'npc', 'door'],
      npc: { icon: '👴', name: '박 노인', lines: ['박 노인: 검찰이라더라고… 내가 늙어서 당했지 뭐.', '박 노인: 폰이고 컴퓨터고 맘대로 보게. 그 놈들 좀 잡아주게.'] },
      phone: ['박 노인 딸: 아버지 그 링크 절대 누르지 마세요!!', '[안내] 보호조치 안내문 (case SILVER-Q3)'] },
    den: { objects: ['computer', 'door'], npc: null, phone: null },
    helios: { objects: ['computer', 'door'], npc: null, phone: null }
  };

  const G = () => window.game;
  const T = () => window.Trace;
  const L = id => (T() && T().LOCATIONS[id]) || {};

  const Room = {
    ROOMS, SCENES,
    _mounted: false,

    mount() {
      if (this._mounted) return;
      const host = document.querySelector('#screen') || document.body;
      const el = document.createElement('div');
      el.id = 'room';
      el.innerHTML =
        '<div class="room-head"><span id="room-title" class="room-title">◈ ROOM</span>' +
        '<span id="room-sub" class="room-sub"></span>' +
        '<button class="hud-btn" id="room-menu">✕ 메뉴</button></div>' +
        '<div id="room-stage" class="room-stage"><canvas id="room-canvas" width="' + (W * SC) + '" height="' + (H * SC) + '" class="room-canvas"></canvas><div id="room-actions" class="room-actions"></div></div>' +
        '<div id="room-panel" class="room-panel"></div>';
      host.appendChild(el);
      const menuBtn = document.getElementById('room-menu');
      if (menuBtn) menuBtn.addEventListener('click', () => { this.hide(); if (G()) { G().appMode = 'menu'; G().showMenu(); } });
      const ret = document.createElement('button');
      ret.id = 'room-return'; ret.className = 'room-return'; ret.textContent = '🚪 방으로'; ret.hidden = true;
      ret.addEventListener('click', () => { ret.hidden = true; this.enter(G().traceLoc, {}); });
      host.appendChild(ret);
      this.el = el; this.returnBtn = ret;
      this._mounted = true;
    },

    show() { this.mount(); if (this.el) this.el.style.display = 'flex'; document.body.setAttribute('data-overlay', 'room'); },
    hide() { if (this.el) this.el.style.display = 'none'; if (document.body.getAttribute && document.body.getAttribute('data-overlay') === 'room') document.body.removeAttribute('data-overlay'); },

    enter(id, opts) {
      opts = opts || {};
      this.mount();
      const g = G(); if (!g) return;
      g.traceLoc = id;
      const loc = L(id);
      this.show();
      if (this.returnBtn) this.returnBtn.hidden = true;
      const title = document.getElementById('room-title'), sub = document.getElementById('room-sub');
      if (title) title.textContent = `${loc.icon || ''} ${loc.name || id}`;
      if (sub) sub.textContent = loc.where || '';
      this.renderScene(id);
      const panel = document.getElementById('room-panel');
      if (panel) {
        const cleared = T().isCleared(g, id), obj = T().objectiveAt(g, id);
        panel.innerHTML = '<div class="room-say">' +
          (opts.travel ? esc(`🚗 ${loc.name}에 도착했다.`) + '<br>' : '') +
          (cleared ? '이 장소는 정리됐다. 🚪 문으로 다음 장소로 갈 수 있다.'
                   : '🖥 컴퓨터를 눌러 조사하라' + (obj ? ' — 지금 목표: ' + esc(obj) : '') + '.') +
          '</div>';
      }
    },

    renderScene(id) {
      const r = ROOMS[id] || { objects: ['computer', 'door'] };
      const cv = document.getElementById('room-canvas');
      const ctx = cv && cv.getContext && cv.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W * SC, H * SC);
        ctx.imageSmoothingEnabled = false; ctx.scale(SC, SC);
        (SCENES[id] || SCENES.home)(ctx);
      }
      // 핫스팟(클릭 가능한 오브젝트) 배치
      const stage = document.getElementById('room-stage'); if (!stage) return;
      stage.querySelectorAll('.room-hot').forEach(b => b.remove());
      const objs = (r.objects || []).filter(o => o !== 'npc' || r.npc).filter(o => o !== 'phone' || r.phone);
      objs.forEach(o => {
        const h = HOT[o]; if (!h) return;
        const b = document.createElement('button');
        b.className = 'room-hot';
        b.style.left = (h.x / W * 100) + '%'; b.style.top = (h.y / H * 100) + '%';
        b.style.width = (h.w / W * 100) + '%'; b.style.height = (h.h / H * 100) + '%';
        const label = (o === 'npc' && r.npc) ? r.npc.icon + ' ' + r.npc.name : h.label;
        b.innerHTML = '<span class="hot-label">' + esc(label) + '</span>';
        b.addEventListener('click', () => this.use(o, id, r));
        stage.appendChild(b);
      });
    },

    use(obj, id, r) {
      if (obj === 'computer') return this.useComputer(id);
      if (obj === 'phone') return this.usePhone(r);
      if (obj === 'npc') return this.talkNpc(r);
      if (obj === 'door') return this.useDoor(id);
    },

    useComputer(id) {
      this.hide();
      if (window.WM) WM.open('terminal');
      T().openComputer(G(), {});
      if (this.returnBtn) this.returnBtn.hidden = false;
    },

    usePhone(r) {
      const panel = document.getElementById('room-panel'); if (!panel) return;
      const msgs = (r.phone || ['(새 메시지 없음)']);
      panel.innerHTML = '<div class="room-phone"><div class="rp-top">📱 핸드폰 · 메시지</div>' +
        msgs.map(m => `<div class="rp-msg">${esc(m)}</div>`).join('') +
        '<div class="rp-foot">단서는 컴퓨터로 직접 분석하라.</div></div>';
    },

    talkNpc(r) {
      const panel = document.getElementById('room-panel'); if (!panel || !r.npc) return;
      const g = G();
      g._npcLine = (g._npcLine || 0) % r.npc.lines.length;
      const line = r.npc.lines[g._npcLine]; g._npcLine++;
      panel.innerHTML = `<div class="room-say"><b>${esc(r.npc.icon + ' ' + r.npc.name)}</b><br>${esc(line)}<br><span class="rp-foot">(${esc(r.npc.name)} 을(를) 다시 누르면 계속)</span></div>`;
    },

    useDoor(id) {
      const panel = document.getElementById('room-panel'); if (!panel) return;
      const g = G(), unlocked = new Set(T().unlockedList(g));
      const rows = T().ORDER.map(lid => {
        const loc = L(lid), here = lid === g.traceLoc, cleared = T().isCleared(g, lid), open = unlocked.has(lid);
        const tag = here ? '지금 여기' : cleared ? '정리 완료' : open ? '이동 가능' : '잠김';
        const cls = here ? 'here' : open ? (cleared ? 'done' : 'open') : 'locked';
        const dis = (!open || here) ? ' disabled' : '';
        return `<button class="room-go ${cls}" data-go="${lid}"${dis}>${loc.icon} ${esc(loc.name)} — ${tag}</button>`;
      }).join('');
      panel.innerHTML = `<div class="room-map"><div class="rp-top">🚪 밖으로 — 어디로 갈까?</div>${rows}</div>`;
      panel.querySelectorAll('.room-go').forEach(b => b.addEventListener('click', () => { if (!b.disabled) this.travel(b.dataset.go); }));
    },

    travel(id) {
      const g = G();
      if (!new Set(T().unlockedList(g)).has(id)) return;
      T().setLoc(g, id);
      this.enter(id, { travel: true });
    }
  };

  window.Room = Room;
})();
