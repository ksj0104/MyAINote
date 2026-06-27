/* ============================================================
 * comms.js — 코믹스(COMMS): 동료/접선 해커와의 실시간 대화 시스템
 *  chat <말>      현재 채널의 상대와 대화
 *  channel <이름> 채널 전환 (mother / wraith ...)
 *  contacts       알려진 연락처
 * 캐릭터마다 인격(말투/세계관)이 다르고, 키워드 의도를 분석해 응답한다.
 * 막히면 현재 미션 목표를 인-캐릭터로 알려주는 맥락형 도움도 제공.
 * ============================================================ */
(function () {
  function choose(game, arr) {
    if (!arr || !arr.length) return '';
    if (arr.length === 1) return arr[0];
    game._chatSeq = (game._chatSeq || 0) + 1;
    return arr[game._chatSeq % arr.length];
  }

  // 현재 미션 목표/힌트를 인-캐릭터로 풀어주는 맥락형 도움
  function ctxHelp(game, voice) {
    const set = game.activeSet || window.LEVELS || [];
    const lvl = set[game.levelIndex];
    if (!lvl || !lvl.objective) return voice.noMission;
    const out = [choose(game, voice.intro)];
    out.push('▶ ' + lvl.objective);
    if (lvl.hints && lvl.hints[0]) out.push('첫 단추 — ' + lvl.hints[0]);
    out.push(choose(game, voice.outro));
    return out;
  }

  const CHARS = {
    mother: {
      name: '0xMOTHER', cls: 'chat-mother',
      intents: [
        { re: /(안녕|하이|헬로|hi|hello|ㅎㅇ|반가|여보세|있어|듣고)/, pick: [
          '신입. 채널은 늘 열려 있다. 무슨 일이냐?',
          '여기 있다. 손이 굳었으면 말해.',
          '말해. 듣고 있다.' ] },
        { re: /(누구|정체|넌 ?뭐|당신 ?누구|who ?are ?you|뭐하는)/, pick: [
          '난 0xMOTHER. 네 핸들러이자, 네가 죽지 않게 막는 사람이다.',
          '이름은 중요치 않아. 내가 네 눈과 귀라는 것만 기억해.' ] },
        { re: /(왜|이유|목적|명분|why|뭐 ?때문|정의|옳)/, pick: [
          '왜? 정보가 권력이고, 그 권력이 한 손에 쥐어졌으니까. 우린 그 손가락을 편다.',
          '거대기업은 진실을 금고에 가둔다. 우린 자물쇠공일 뿐이야 — 도둑이 아니라.' ] },
        { re: /(무서|겁|못 ?하겠|자신 ?없|불안|떨려|두려|쫄|긴장)/, pick: [
          '무섭다고? 좋아. 겁이 너를 살아남게 한다. 겁 없는 놈이 먼저 잡혀.',
          '손이 떨리면 떨리는 대로 쳐. 완벽한 타이밍 같은 건 없어.',
          '숨을 골라. 난 어디 안 간다.' ] },
        { re: /(준비|가자|하자|간다|ㄱㄱ|시작|레디|ready|할게|해보|가 ?보)/, pick: [
          '그 눈빛이다. 가라 — 내가 뒤를 본다.',
          '좋아. 화면만 믿어. 손은 네가, 판단은 둘이서.' ] },
        { re: /(오라클|oracle)/, pick: [
          'ORACLE. HELIOS의 사냥개 AI다. 네 버릇을 학습하고 되갚지. 같은 수를 두 번 쓰지 마.',
          'ORACLE은 지치지 않아. 그러니 우린 빨라야 한다. 들어가고, 지우고, 나온다.' ] },
        { re: /(헬리오스|helios)/, pick: [
          'HELIOS. 도시의 전력과 데이터를 쥔 메가코프. 우리의 끝이자 시작이지.' ] },
        { re: /(널섹|nullsec|조직|우리 ?팀|동료)/, pick: [
          'NULLSEC은 이름 없는 자들의 둥지다. 우린 영웅이 아니야 — 그저 눈 뜬 자들이지.' ] },
        { re: /(내 ?이름|코드명|날 ?뭐라|뭐라고 ?불러|내 ?코드)/, pick: [
          '아직 이름은 없다. 코어를 뚫는 날, 네 손으로 짓게 될 거야.',
          '신입. 그게 지금 네 이름이야. 마음에 안 들면 — 실력으로 바꿔.' ] },
        { re: /(레이스|wraith|그자|그 ?사람|다크|dark|흑군)/, pick: [
          'WRAITH... 그 채널은 받지 마라. 공짜 정보엔 늘 갈고리가 숨어 있다.',
          '그자를 믿지 마. 그렇다고 무시도 하지 마. 듣되, 따르진 마라.' ] },
        { re: /(고마|감사|thx|thanks|ㄱㅅ|sorry|미안)/, pick: [
          '고마워할 시간에 한 줄 더 쳐. 그게 보답이다.',
          '됐다. 살아서 다음 미션에서 보자.' ] },
        { re: /(힌트|도와|막막|모르겠|어떻게|다음|모름|어디|hint|help|뭐 ?해|뭐해야|막혔|어렵)/,
          fn: (g) => ctxHelp(g, {
            intro: ['막막하냐? 숨 쉬고, 지금 할 일만 봐라:', '길을 잃었군. 좌표를 다시 주지:'],
            outro: ['천천히. 한 번에 한 줄.', '`hint` 를 치면 더 잘게 쪼개주마.'],
            noMission: '지금은 진행 중인 미션이 없다. 메뉴에서 시나리오를 골라라.' }) }
      ],
      fallback: [
        '……계속해. 듣고 있다.',
        '말은 짧게, 손은 빠르게. 무슨 뜻이냐?',
        '그건 나중에. 지금은 눈앞의 셸에 집중해.',
        '흥미롭군. 하지만 화면은 거짓말을 안 해 — 거기서 답을 찾아.' ]
    },
    wraith: {
      name: 'WRAITH', cls: 'chat-wraith',
      intents: [
        { re: /(안녕|하이|헬로|hi|hello|ㅎㅇ|반가|있어|듣고)/, pick: [
          'connection traced. ...인사는 약점이다.',
          '거기 있군. 0xMOTHER는 이 채널을 모른다. 그렇게 두지.' ] },
        { re: /(누구|정체|넌 ?뭐|who|뭐하는)/, pick: [
          'wraith. 우린 이름을 갖지 않아 — 이름은 흔적이 되니까.',
          '난 네가 아직 못 본 판의 일부다. 그거면 충분해.' ] },
        { re: /(왜|이유|목적|why|원하|뭘 ?원|뭘 ?바라|바라는)/, pick: [
          '네 멘토는 절반만 보여준다. 난 나머지 절반을 판다.',
          '원하는 것? 너와 같다 — HELIOS의 끝. 방법이 다를 뿐이지.' ] },
        { re: /(오라클|oracle)/, pick: [
          'oracle은 개다. 주인을 물도록 가르치면 그만이야. ...방법은 내가 안다.',
          'oracle을 두려워 마. 두려움이 네 패턴이 되면, 그게 널 잡는 미끼가 된다.' ] },
        { re: /(0xmother|mother|마더|멘토|그 ?여자|널섹|nullsec)/, pick: [
          '0xMOTHER는 신념가지. 신념은... 사람을 눈멀게 해. 너는 눈을 떠라.',
          '그 여자는 널 아끼지. 그래서 위험하다 — 아끼는 자는 진실을 숨기거든.' ] },
        { re: /(믿|신뢰|trust|진짜|함정|속이|배신)/, pick: [
          '날 믿지 마. 믿음은 사치야. 검증해 — 늘.',
          '함정? 당연히 의심해야지. 그 의심이 너를 오래 살린다.' ] },
        { re: /(힌트|도와|막막|모르겠|어떻게|hint|help|뭐 ?해|막혔)/, pick: [
          '답은 늘 로그 안에 있다. 사람들은 지우는 걸 잊지.',
          '막혔으면 한 발 물러서서 — 무엇이 "안" 보이는지를 봐라.',
          '0xMOTHER에게 물어. 그게 네 길이야. 난 그저... 지켜본다.' ] },
        { re: /(가|꺼져|닥쳐|싫|관심 ?없|안 ?믿|필요 ?없)/, pick: [
          '...그래. 하지만 채널은 닫지 않는다. 네가 다시 찾을 테니.',
          '거절. 기록해두지. 마음이 바뀌면 — 넌 길을 안다.' ] }
      ],
      fallback: [
        '...',
        '말은 신호다. 신호는 추적된다. 짧게.',
        '흥미롭군. 하지만 아직은 아니야.',
        '계속 쳐. 난 인내심이 길다.' ]
    }
  };

  const ALIAS = { mother: 'mother', '0xmother': 'mother', mom: 'mother', wraith: 'wraith', dark: 'wraith' };

  // 순수 함수: 입력 → { name, cls, lines } (UI 비의존 — 테스트 가능)
  function compose(game, text, who) {
    game.knownContacts = game.knownContacts || new Set(['mother']);
    who = who || game.chatWith || 'mother';
    const ch = CHARS[who] || CHARS.mother;
    const t = (text || '').trim().toLowerCase();
    let content;
    if (!t) {
      content = who === 'wraith'
        ? '...말해라. 시간은 우리 편이 아니다.'
        : '무슨 일이냐? (예: `chat 무서워`, `chat 다음 뭐해`, `chat 넌 누구야`)';
    } else {
      let hit = null;
      for (const it of ch.intents) { if (it.re.test(t)) { hit = it; break; } }
      content = hit ? (hit.fn ? hit.fn(game, text) : choose(game, hit.pick)) : choose(game, ch.fallback);
    }
    const lines = Array.isArray(content) ? content : String(content).split('\n');
    return { name: ch.name, cls: ch.cls, lines };
  }

  const Comms = {
    compose, CHARS,
    // 실제 게임: term 으로 한 줄씩 흘려 출력(대화가 들어오는 느낌). 반환은 빈 문자열.
    talk(game, text) {
      const r = compose(game, text);
      const term = window.term;
      // 메신저 패널이 열려 있으면 거기에(메신저로 소통), 아니면 터미널로 폴백
      if (term.msgrChat && term.msgrChat((text || '').trim(), r)) return '';
      r.lines.forEach((l, i) => term.typeln((i === 0 ? `‹${r.name}› ` : '         ') + l, r.cls));
      return '';
    },
    channel(game, name) {
      game.knownContacts = game.knownContacts || new Set(['mother']);
      if (!name) {
        const cur = CHARS[game.chatWith || 'mother'].name;
        const list = [...game.knownContacts].map(k => (CHARS[k] ? CHARS[k].name : k)).join(', ');
        return `현재 채널: ${cur}\n알려진 연락처: ${list}\n사용: channel <이름>  (예: channel mother)`;
      }
      const who = ALIAS[name.toLowerCase().replace(/[^a-z0-9]/g, '')];
      if (!who || !CHARS[who]) return `channel: '${name}' 채널을 찾을 수 없다. \`contacts\` 로 확인.`;
      if (!game.knownContacts.has(who)) return `channel: '${CHARS[who].name}' 와는 아직 연결된 적이 없다.`;
      game.chatWith = who;
      return `[*] 채널 전환 → ${CHARS[who].name}.  \`chat <말>\` 로 대화하라.`;
    },
    contacts(game) {
      game.knownContacts = game.knownContacts || new Set(['mother']);
      let out = '◈ 연락처 (channel <이름> 으로 전환):';
      for (const k of game.knownContacts) {
        const c = CHARS[k];
        out += `\n   · ${c ? c.name : k}${(game.chatWith || 'mother') === k ? '   ← 현재 채널' : ''}`;
      }
      out += '\n대화: chat <말>   (예: chat 다음에 뭐해)';
      return out;
    },
    // 스토리 이벤트가 새 접선 상대를 등록할 때 호출
    register(game, who) {
      game.knownContacts = game.knownContacts || new Set(['mother']);
      if (CHARS[who]) game.knownContacts.add(who);
    }
  };

  // 명령 등록 (commands.js 가 먼저 로드되어 window.COMMANDS 존재)
  const C = window.COMMANDS;
  if (C) {
    const chatRun = ({ args, game }) => window.Comms.talk(game, args.join(' '));
    C.chat = { name: 'chat', desc: '동료/접선 해커와 실시간 대화', usage: 'chat <말>', run: chatRun };
    C.reply = { name: 'reply', desc: '현재 채널에 답장', usage: 'reply <말>', run: chatRun };
    C.say = { name: 'say', desc: '현재 채널에 말하기', usage: 'say <말>', run: chatRun };
    C.channel = { name: 'channel', desc: '대화 채널 전환', usage: 'channel <이름>', run: ({ args, game }) => window.Comms.channel(game, args[0]) };
    C.contacts = { name: 'contacts', desc: '알려진 연락처 목록', usage: 'contacts', run: ({ game }) => window.Comms.contacts(game) };
  }

  window.Comms = Comms;
})();
