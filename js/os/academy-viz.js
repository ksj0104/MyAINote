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
    const cipher = ['s', 'y', 'n', 't', '{', 'x', 'y', 'z', '}'];
    const plain = ['f', 'l', 'a', 'g', '{', 'm', 'n', 'o', '}'];
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
    const words = ['123456', 'password', 'letmein', 'dragon', 'qwerty', 'hunter2', 'admin', 's3cr3t!', 'trustno1', 'monkey'];
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
