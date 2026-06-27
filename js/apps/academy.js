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
      const i = A().order.indexOf(cmd);
      if (i < 0 || i > this._maxUnlockedIndex()) return; // 잠긴 명령은 진입 불가
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
