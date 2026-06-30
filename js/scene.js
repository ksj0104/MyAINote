window.SceneManager = {
  currentLocation: 'house',
  locations: {
    'house': {
      name: '아지트 (Home Base)',
      bg: 'imgs/scene_room.png',
      hitboxes: [
        // x,y = 좌상단 기준 %, w,h = % 크기. scene_room.png(아지트) 의 실제 오브젝트 위치.
        { id: 'hb-computer', label: '🖥 컴퓨터 접속', x: 49, y: 40, w: 27, h: 26, action: 'os' },
        { id: 'hb-phone', label: '📱 스마트폰', x: 40, y: 57, w: 11, h: 10, action: 'messenger' },
        { id: 'hb-map', label: '🗺 지도 (외출)', x: 8, y: 14, w: 34, h: 27, action: 'map' }
      ]
    },
    'cafe': {
      name: '도심 카페 (HELIOS 본사 앞)',
      bg: 'imgs/bg_lofi.png', // 임시 이미지 (추후 전용 픽셀아트 생성 시 교체)
      hitboxes: [
        { id: 'hb-laptop', label: '노트북 열기', x: 45, y: 60, w: 20, h: 18, action: 'os' },
        { id: 'hb-map', label: '지도 (복귀)', x: 10, y: 20, w: 12, h: 15, action: 'map' }
      ]
    },
    'alley': {
      name: '어두운 뒷골목',
      bg: 'imgs/bg_lofi.png', // 임시 이미지
      hitboxes: [
        { id: 'hb-terminal', label: '휴대용 단말기', x: 50, y: 60, w: 15, h: 15, action: 'os' },
        { id: 'hb-map', label: '지도 (복귀)', x: 10, y: 20, w: 12, h: 15, action: 'map' }
      ]
    }
  },

  init() {
    this.renderScene();
    
    // OS에서 씬(방)으로 돌아오는 버튼을 작업표시줄에 추가
    this.addReturnButtonToOS();
  },

  renderScene() {
    const loc = this.locations[this.currentLocation];
    if (!loc) return;

    const container = document.getElementById('scene-container');
    container.innerHTML = `<img id="scene-bg" src="${loc.bg}" alt="${loc.name}">`;

    loc.hitboxes.forEach(hb => {
      const btn = document.createElement('button');
      btn.className = 'hitbox';
      btn.id = hb.id;
      btn.style.left = `${hb.x}%`;
      btn.style.top = `${hb.y}%`;
      btn.style.width = `${hb.w}%`;
      btn.style.height = `${hb.h}%`;
      btn.innerHTML = `<span>${hb.label}</span>`;
      btn.onclick = () => this.interact(hb.action);
      container.appendChild(btn);
    });
  },

  interact(action) {
    if (action === 'map') { this.openMap(); return; }
    // 컴퓨터/스마트폰 → OS 데스크톱 진입
    document.body.setAttribute('data-screen', 'os');
    const g = window.game;
    if (action === 'os') {
      // 컴퓨터로 해킹: 현재 사건(TRACE) 조사 화면을 터미널에 띄운다
      if (window.Trace && g) {
        g.appMode = 'trace';
        if (!(g.traceDone instanceof Set)) g.traceDone = new Set();
        if (!g.traceLoc || !window.Trace.LOCATIONS[g.traceLoc]) g.traceLoc = 'home';
        window.Trace.setLoc(g, g.traceLoc);
        window.Trace.openComputer(g, {}); // setMode('terminal') → 터미널 창 오픈 + 목표 출력
      } else if (window.WM && window.WM.open) {
        window.WM.open('terminal');
      }
    } else if (action === 'messenger') {
      if (window.WM && window.WM.open) window.WM.open('messenger');
    }
  },

  openMap() {
    const mapList = document.getElementById('map-locations');
    mapList.innerHTML = '';
    
    Object.keys(this.locations).forEach(key => {
      const loc = this.locations[key];
      const btn = document.createElement('div');
      btn.className = 'map-btn';
      btn.innerHTML = `<div class="map-title">${loc.name}</div><div class="map-desc">${key === this.currentLocation ? '(현재 위치)' : '이동하기'}</div>`;
      if (key !== this.currentLocation) {
        btn.onclick = () => {
          this.currentLocation = key;
          this.renderScene();
          document.getElementById('map-modal').hidden = true;
        };
      } else {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'default';
      }
      mapList.appendChild(btn);
    });
    
    document.getElementById('map-modal').hidden = false;
  },

  addReturnButtonToOS() {
    // OS 작업표시줄 우측에 방으로 돌아가는 버튼 추가
    const systray = document.getElementById('systray');
    if (systray) {
      const returnBtn = document.createElement('button');
      returnBtn.className = 'tray-btn';
      returnBtn.title = '방으로 돌아가기';
      returnBtn.innerHTML = '🏠';
      returnBtn.onclick = () => {
        document.body.setAttribute('data-screen', 'scene');
      };
      systray.insertBefore(returnBtn, systray.firstChild);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.SceneManager.init();
});
