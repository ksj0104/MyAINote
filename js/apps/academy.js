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
      this._print('ACADEMY TERMINAL READY', 'ok');
      this._print("왼쪽에서 명령을 골라 학습 · 명령을 직접 입력해 실습 · 'help' 로 상세 사용법", 'echo');
      const inp = $('#acad-input'); if (inp) setTimeout(() => inp.focus(), 0);
    },

    renderSidebar() {
      const side = $('#acad-side'); if (!side) return;
      const order = A().order, done = this.game.academyDone || new Set();
      let html = '';
      for (const [name, cmds] of A().categories) {
        html += `<div class="acad-cat">▸ ${name}</div>`;
        for (const c of cmds) {
          const isDone = done.has(c), isCur = c === this.cur;
          const cls = isCur ? 'current' : isDone ? 'done' : '';
          const mark = isDone ? '✔' : isCur ? '▶' : '○';
          html += `<button class="acad-li ${cls}" data-cmd="${c}">${mark} ${c}</button>`;
        }
      }
      side.innerHTML = html;
      side.querySelectorAll('.acad-li').forEach(b => b.addEventListener('click', () => this.go(b.dataset.cmd)));
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
      if (A().order.indexOf(cmd) < 0) return; // 알 수 없는 명령만 무시 (자유 선택)
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
      const first = raw.trim().split(/\s+/)[0].toLowerCase();
      // help / man / ? → 현재(또는 인자로 지정한) 명령의 자세한 사용법
      if (first === 'help' || first === 'man' || first === '?') {
        const arg = raw.trim().split(/\s+/)[1];
        const target = arg || this.cur;
        const txt = (window.Academy && window.Academy.learn) ? window.Academy.learn(target) : '';
        this._print(txt || '설명을 불러올 수 없습니다.');
        inp.focus();
        return;
      }
      let out = '';
      try { out = this.game.exec(raw); } catch (e) { out = 'err: ' + e.message; }
      if (out) this._print(out);
      // 실습 무대 리플레이: 입력 명령의 패밀리로 무대 재생
      const stage = $('#acad-stage');
      if (stage && window.AcademyViz && (window.COMMANDS || {})[first]) {
        window.AcademyViz.render(A().familyOf(first), raw.trim(), stage);
      }
      // 게이팅: 현재 학습 명령을 직접 쳤으면 완료 처리
      if (A().isPractice(raw, this.cur) && !(this.game.academyDone && this.game.academyDone.has(this.cur))) {
        this.game.academyDone = this.game.academyDone || new Set();
        this.game.academyDone.add(this.cur);
        if (this.game.save) this.game.save();
        this._print(`  ✔ '${this.cur}' 실습 완료`, 'ok');
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
