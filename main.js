import './style.css';

// =====================================================================
// STATE MANAGEMENT
// =====================================================================
const STATE = {
  ageGroup: 1,     // 0=5-7, 1=8-10, 2=11-14
  xp: 0,
  level: 1,
  combo: 0,
  bestCombo: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  masteredTables: new Set(),
  highestTable: 1,
  currentGame: null,
  tableProgress: {},  // { tableNum: {correct, wrong} }

  // Adaptive
  adaptSpeed: 1,       // 1 = normal, <1 = slower, >1 = faster
  adaptDifficulty: 0,  // 0 = normal, higher = harder
  recentResults: [],   // last 10 results (true/false)

  get accuracy() {
    if (this.totalAnswered === 0) return 0;
    return Math.round((this.totalCorrect / this.totalAnswered) * 100);
  },
  get xpForNextLevel() { return this.level * 120; },
  get xpProgress() { return Math.min(this.xp, this.xpForNextLevel); }
};

// Age configs
const AGE_CONFIG = [
  { emoji: '👶', label: '5–7', tableMin: 1, tableMax: 5, speed: 0.5, hints: true, objects: true },
  { emoji: '🧒', label: '8–10', tableMin: 2, tableMax: 15, speed: 1.0, hints: false, objects: false },
  { emoji: '🧑', label: '11–14', tableMin: 5, tableMax: 20, speed: 2.0, hints: false, objects: false }
];

const OBJECTS = ['⭐','🚀','🪐','🌙','☄️','🛸','🌟','💫','🌠','🔭'];

// =====================================================================
// BACKGROUND NUMBERS
// =====================================================================
function initBgNumbers() {
  const container = document.getElementById('bgNumbers');
  container.innerHTML = '';
  const nums = ['×','÷','+','=','1','2','3','4','5','6','7','8','9'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    el.className = 'bg-num';
    el.textContent = nums[Math.floor(Math.random() * nums.length)];
    const size = 30 + Math.random() * 80;
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      font-size: ${size}px;
      animation-duration: ${10 + Math.random() * 20}s;
      animation-delay: ${-Math.random() * 20}s;
    `;
    container.appendChild(el);
  }
}
initBgNumbers();

// =====================================================================
// SCREEN NAVIGATION
// =====================================================================
window.showScreen = function(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'dashboard-screen') updateDashboard();
  if (id === 'practice-screen') buildPracticeList();
  if (id === 'menu-screen') updateMenuHud();
}

window.selectAge = function(idx, el) {
  document.querySelectorAll('.age-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  STATE.ageGroup = idx;
}

window.goToMenu = function() {
  window.showScreen('menu-screen');
  updateMenuHud();
}

window.exitGame = function() {
  stopAllGameTimers();
  window.showScreen('menu-screen');
}

// =====================================================================
// HUD UPDATES
// =====================================================================
function updateMenuHud() {
  document.getElementById('menu-xp').textContent = STATE.xp + ' XP';
  document.getElementById('menu-level').textContent = STATE.level;
  document.getElementById('menu-acc').textContent = STATE.accuracy + '%';
  const pct = Math.min(100, (STATE.xp / STATE.xpForNextLevel) * 100);
  document.getElementById('menuXpBar').style.width = pct + '%';
}

// =====================================================================
// XP & LEVELING
// =====================================================================
function addXP(amount) {
  STATE.xp += amount;
  while (STATE.xp >= STATE.xpForNextLevel) {
    STATE.xp -= STATE.xpForNextLevel;
    STATE.level++;
    showLevelUp();
  }
  updateMenuHud();
}

function showLevelUp() {
  document.getElementById('newLevelNum').textContent = STATE.level;
  document.getElementById('levelUpText').innerHTML = `You reached Level <strong>${STATE.level}</strong>! 🎊`;
  document.getElementById('levelUpModal').classList.add('open');
  triggerConfetti();
}

window.closeModal = function(id) {
  document.getElementById(id).classList.remove('open');
}

// =====================================================================
// COMBO SYSTEM
// =====================================================================
function incrementCombo() {
  STATE.combo++;
  if (STATE.combo > STATE.bestCombo) STATE.bestCombo = STATE.combo;
  if (STATE.combo >= 3) {
    showComboBanner(STATE.combo);
  }
}

function resetCombo() { STATE.combo = 0; }

function showComboBanner(n) {
  const banner = document.getElementById('comboBanner');
  document.getElementById('comboNum').textContent = n;
  banner.classList.add('show');
  clearTimeout(banner._t);
  banner._t = setTimeout(() => banner.classList.remove('show'), 1800);
}

// =====================================================================
// FEEDBACK
// =====================================================================
function showFeedback(correct) {
  const msg = document.getElementById('feedbackMsg');
  msg.textContent = correct ? '✓' : '✗';
  msg.className = 'feedback-msg ' + (correct ? 'correct' : 'wrong') + ' pop';
  clearTimeout(msg._t);
  msg._t = setTimeout(() => msg.classList.remove('pop'), 500);
}

function showStarPop(x, y) {
  const el = document.createElement('div');
  el.className = 'star-pop';
  el.textContent = ['⭐','🌟','✨','💫'][Math.floor(Math.random() * 4)];
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function triggerConfetti() {
  const colors = ['#FF6B9D','#6C63FF','#FFC107','#00C896','#4FC3F7'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: -10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        transform: rotate(${Math.random()*360}deg);
        animation-duration: ${1.5 + Math.random()}s;
        animation-delay: ${Math.random() * 0.5}s;
        width: ${6 + Math.random() * 10}px;
        height: ${6 + Math.random() * 10}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }, i * 25);
  }
}

// =====================================================================
// ANSWER RECORDING & ADAPTIVE
// =====================================================================
function recordAnswer(tableNum, correct) {
  STATE.totalAnswered++;
  if (correct) {
    STATE.totalCorrect++;
    incrementCombo();
    // Track table progress
    if (!STATE.tableProgress[tableNum]) STATE.tableProgress[tableNum] = {correct:0,wrong:0};
    STATE.tableProgress[tableNum].correct++;
    if (STATE.tableProgress[tableNum].correct >= 8) {
      STATE.masteredTables.add(tableNum);
    }
    if (tableNum > STATE.highestTable) STATE.highestTable = tableNum;
  } else {
    resetCombo();
    if (!STATE.tableProgress[tableNum]) STATE.tableProgress[tableNum] = {correct:0,wrong:0};
    STATE.tableProgress[tableNum].wrong++;
  }

  // Adaptive
  STATE.recentResults.push(correct);
  if (STATE.recentResults.length > 10) STATE.recentResults.shift();
  const recent = STATE.recentResults;
  if (recent.length >= 5) {
    const acc = recent.filter(Boolean).length / recent.length;
    if (acc > 0.85) STATE.adaptSpeed = Math.min(2.5, STATE.adaptSpeed + 0.1);
    else if (acc < 0.5) STATE.adaptSpeed = Math.max(0.4, STATE.adaptSpeed - 0.15);
  }
}

// =====================================================================
// QUESTION GENERATION
// =====================================================================
function getTableRange() {
  const cfg = AGE_CONFIG[STATE.ageGroup];
  return { min: cfg.tableMin, max: cfg.tableMax };
}

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function generateQuestion() {
  const { min, max } = getTableRange();
  // Bias towards lower tables if struggling
  let hi = max;
  if (STATE.adaptSpeed < 0.8) hi = Math.min(max, min + Math.floor((max - min) * 0.5));
  else if (STATE.adaptSpeed > 1.5) hi = max;
  const a = randInt(min, hi);
  const maxB = STATE.ageGroup === 2 ? 12 : 10;
  const b = randInt(1, maxB);
  return { a, b, ans: a * b };
}

function generateWrongAnswers(correct, count) {
  const wrong = new Set();
  while (wrong.size < count) {
    const offset = randInt(-10, 10);
    if (offset !== 0) {
      const w = correct + offset;
      if (w > 0 && w !== correct) wrong.add(w);
    }
  }
  return [...wrong];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =====================================================================
// GAME LAUNCHER
// =====================================================================
let gameTimers = [];

function stopAllGameTimers() {
  gameTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
  gameTimers = [];
}

window.startGame = function(n) {
  stopAllGameTimers();
  STATE.currentGame = n;
  switch(n) {
    case 2: initGame2(); break;
    case 3: initGame3(); break;
    case 4: initGame4(); break;
    case 5: initGame5(); break;
    case 6: initGame6(); break;
    case 7: initGame7(); break;
  }
  window.showScreen('game' + n + '-screen');
}

// =====================================================================
// GAME 2: DRAG & MATCH BOARD
// =====================================================================
let g2 = { score: 0, xp: 0, total: 0, pairs: [], dragEl: null };

function initGame2() {
  g2.score = 0; g2.xp = 0;

  const count = STATE.ageGroup === 0 ? 4 : STATE.ageGroup === 1 ? 5 : 6;
  g2.total = count;
  g2.pairs = [];

  for (let i = 0; i < count; i++) {
    const q = generateQuestion();
    g2.pairs.push({ eq: q.a + ' × ' + q.b, ans: q.ans, table: q.a, id: i });
  }

  renderMatchGame();
  updateG2Hud();
}

function renderMatchGame() {
  const eqCol = document.getElementById('matchEquations');
  const ansCol = document.getElementById('matchAnswers');
  eqCol.innerHTML = ''; ansCol.innerHTML = '';

  // Left: equations as draggable sources, right: answer slots
  const shuffledAns = shuffle([...g2.pairs]);

  g2.pairs.forEach(p => {
    const div = document.createElement('div');
    div.className = 'match-item';
    div.textContent = p.eq;
    div.dataset.id = p.id;
    div.draggable = true;
    div.addEventListener('dragstart', e => {
      g2.dragEl = div;
      div.classList.add('dragging');
      e.dataTransfer.setData('text/plain', p.id);
    });
    div.addEventListener('dragend', () => div.classList.remove('dragging'));
    // Touch support
    div.addEventListener('touchstart', e => { g2.dragEl = div; div.style.opacity = '0.5'; }, {passive:true});
    eqCol.appendChild(div);
  });

  shuffledAns.forEach(p => {
    const slot = document.createElement('div');
    slot.className = 'match-slot';
    slot.textContent = p.ans;
    slot.dataset.ans = p.ans;
    slot.dataset.matched = 'false';
    slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('over'));
    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('over');
      const id = parseInt(e.dataTransfer.getData('text/plain'));
      const pair = g2.pairs.find(x => x.id === id);
      if (pair && pair.ans === parseInt(slot.dataset.ans)) {
        slot.classList.add('correct');
        slot.dataset.matched = 'true';
        // Mark source as matched
        const src = document.querySelector(`.match-item[data-id="${id}"]`);
        if (src) { src.style.opacity = '0.4'; src.draggable = false; }
        g2.score++;
        updateG2Hud();
      } else {
        slot.classList.add('wrong');
        setTimeout(() => slot.classList.remove('wrong'), 600);
      }
    });
    ansCol.appendChild(slot);
  });
}

window.checkMatchGame = function() {
  const slots = document.querySelectorAll('.match-slot');
  const matched = [...slots].filter(s => s.dataset.matched === 'true').length;
  const total = g2.total;
  recordAnswer(0, matched === total);

  const xpGain = matched * 20;
  addXP(xpGain);
  g2.xp += xpGain;
  showFeedback(matched === total);
  if (matched === total) {
    triggerConfetti();
    setTimeout(() => initGame2(), 1200);
  }
  updateG2Hud();
}

function updateG2Hud() {
  document.getElementById('g2-xp').textContent = g2.xp;
  document.getElementById('g2-score').textContent = g2.score + '/' + g2.total;
}

// =====================================================================
// GAME 3: VISUAL MULTIPLICATION BUILDER
// =====================================================================
let g3 = { score: 0, xp: 0, question: null };

function initGame3() {
  g3.score = 0; g3.xp = 0;
  nextG3Question();
  updateG3Hud();
}

function nextG3Question() {
  const q = generateQuestion();
  // Cap groups for visual clarity
  const a = Math.min(q.a, 8);
  const b = Math.min(q.b, 8);
  g3.question = { a, b, ans: a * b, tableNum: q.a };

  const icon = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
  document.getElementById('visualQuestion').textContent = a + ' groups of ' + b + ' = ?';

  // Build groups display
  const display = document.getElementById('groupsDisplay');
  display.innerHTML = '';
  for (let g = 0; g < a; g++) {
    const box = document.createElement('div');
    box.className = 'group-box';
    for (let i = 0; i < b; i++) {
      const obj = document.createElement('span');
      obj.className = 'obj-icon';
      obj.textContent = icon;
      obj.style.animationDelay = (g * b + i) * 0.04 + 's';
      box.appendChild(obj);
    }
    display.appendChild(box);
  }

  // Answer buttons
  const correct = a * b;
  const wrongs = generateWrongAnswers(correct, 3);
  const opts = shuffle([correct, ...wrongs]);
  const btns = document.getElementById('visualAnsBtns');
  btns.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'ans-btn normal';
    btn.textContent = opt;
    btn.onclick = () => checkG3(opt, btn);
    btns.appendChild(btn);
  });
}

function checkG3(val, btn) {
  const correct = val === g3.question.ans;
  recordAnswer(g3.question.tableNum, correct);
  showFeedback(correct);

  if (correct) {
    btn.className = 'ans-btn correct-ans';
    g3.score += 10;
    g3.xp += 15;
    addXP(15);
    showStarPop(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
    setTimeout(() => {
      if (document.getElementById('game3-screen').classList.contains('active')) nextG3Question();
    }, 800);
  } else {
    btn.className = 'ans-btn wrong-ans';
    setTimeout(() => btn.className = 'ans-btn normal', 600);
  }
  updateG3Hud();
}

function updateG3Hud() {
  document.getElementById('g3-xp').textContent = g3.xp;
  document.getElementById('g3-score').textContent = g3.score;
}

// =====================================================================
// GAME 4: SPEED TAP CHALLENGE
// =====================================================================
let g4 = { score: 0, xp: 0, timeLeft: 60, question: null, timer: null, questionTimer: null };

function initGame4() {
  g4.score = 0; g4.xp = 0;
  g4.timeLeft = STATE.ageGroup === 0 ? 90 : STATE.ageGroup === 1 ? 60 : 45;
  clearInterval(g4.timer); clearInterval(g4.questionTimer);
  updateG4Hud();
  newG4Question();

  g4.timer = setInterval(() => {
    g4.timeLeft--;
    document.getElementById('g4-time').textContent = g4.timeLeft + 's';
    const fill = document.getElementById('speedTimerFill');
    const maxTime = STATE.ageGroup === 0 ? 90 : STATE.ageGroup === 1 ? 60 : 45;
    const pct = (g4.timeLeft / maxTime) * 100;
    fill.style.width = pct + '%';
    fill.style.background = pct > 50 ? 'linear-gradient(90deg, var(--green), var(--accent))' : pct > 25 ? 'linear-gradient(90deg, var(--accent), var(--orange))' : 'linear-gradient(90deg, var(--red), var(--orange))';
    if (g4.timeLeft <= 0) endGame4();
  }, 1000);
  gameTimers.push(g4.timer);
}

function newG4Question() {
  const q = generateQuestion();
  g4.question = q;
  document.getElementById('speedQuestion').textContent = q.a + ' × ' + q.b + ' = ?';

  const wrongs = generateWrongAnswers(q.ans, 3);
  const opts = shuffle([q.ans, ...wrongs]);
  const container = document.getElementById('speedAnswers');
  container.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'speed-ans-btn';
    btn.textContent = opt;
    btn.onclick = () => checkG4(opt, btn);
    container.appendChild(btn);
  });
}

function checkG4(val, btn) {
  const correct = val === g4.question.ans;
  recordAnswer(g4.question.a, correct);
  showFeedback(correct);

  btn.className = 'speed-ans-btn ' + (correct ? 'correct' : 'wrong');
  if (correct) {
    g4.score += 10 + STATE.combo * 2;
    g4.xp += 12;
    addXP(12);
    showStarPop(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
  }
  updateG4Hud();
  setTimeout(() => {
    if (document.getElementById('game4-screen').classList.contains('active')) newG4Question();
  }, correct ? 400 : 600);
}

function endGame4() {
  clearInterval(g4.timer);
  document.getElementById('goScore').textContent = g4.score;
  document.getElementById('gameOverText').innerHTML = `You scored <strong>${g4.score} points</strong> in ${STATE.ageGroup === 0 ? 90 : STATE.ageGroup === 1 ? 60 : 45} seconds!`;
  document.getElementById('playAgainBtn').onclick = () => { window.closeModal('gameOverModal'); window.startGame(4); };
  document.getElementById('gameOverModal').classList.add('open');
}

function updateG4Hud() {
  document.getElementById('g4-xp').textContent = g4.xp;
  document.getElementById('g4-combo').textContent = STATE.combo;
  document.getElementById('g4-score').textContent = g4.score;
}

// =====================================================================
// GAME 5: MEMORY FLIP
// =====================================================================
let g5 = { xp: 0, pairs: 0, totalPairs: 0, flipped: [], matched: 0, waiting: false };

function initGame5() {
  g5.xp = 0; g5.flipped = []; g5.matched = 0; g5.waiting = false;
  const count = STATE.ageGroup === 0 ? 4 : STATE.ageGroup === 1 ? 6 : 8;
  g5.totalPairs = count;

  const pairs = [];
  for (let i = 0; i < count; i++) {
    const q = generateQuestion();
    const id = i;
    pairs.push({ text: q.a + '×' + q.b, match: id, type: 'eq', ans: q.ans, table: q.a });
    pairs.push({ text: String(q.ans), match: id, type: 'ans', ans: q.ans, table: q.a });
  }
  const shuffled = shuffle(pairs);

  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = '';
  const cols = count <= 4 ? 4 : count <= 6 ? 4 : 4;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  shuffled.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.match = p.match;
    card.dataset.type = p.type;
    card.dataset.idx = i;
    card.innerHTML = `
      <div class="mem-card-inner">
        <div class="mem-card-front">?</div>
        <div class="mem-card-back">${p.text}</div>
      </div>
    `;
    card.addEventListener('click', () => flipG5Card(card, p));
    grid.appendChild(card);
  });

  document.getElementById('g5-pairs').textContent = '0/' + g5.totalPairs;
  updateG5Hud();
}

function flipG5Card(card, data) {
  if (g5.waiting) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

  card.classList.add('flipped');
  g5.flipped.push({ card, data });

  if (g5.flipped.length === 2) {
    g5.waiting = true;
    const [a, b] = g5.flipped;
    const match = a.data.match === b.data.match && a.data.type !== b.data.type;

    setTimeout(() => {
      if (match) {
        a.card.classList.add('matched'); b.card.classList.add('matched');
        g5.matched++;
        g5.xp += 20;
        addXP(20);
        recordAnswer(a.data.table, true);
        showFeedback(true);
        document.getElementById('g5-pairs').textContent = g5.matched + '/' + g5.totalPairs;
        showStarPop(window.innerWidth/2, window.innerHeight/2);
        if (g5.matched === g5.totalPairs) {
          setTimeout(() => { triggerConfetti(); setTimeout(() => initGame5(), 1200); }, 400);
        }
      } else {
        a.card.classList.remove('flipped');
        b.card.classList.remove('flipped');
        recordAnswer(a.data.table, false);
        showFeedback(false);
      }
      g5.flipped = [];
      g5.waiting = false;
      updateG5Hud();
    }, 900);
  }
}

function updateG5Hud() {
  document.getElementById('g5-xp').textContent = g5.xp;
}

// =====================================================================
// GAME 6: TABLE RUNNER
// =====================================================================
let g6 = { xp: 0, dist: 0, question: null, running: true, speed: 0, obstacleX: 110, obsInterval: null };

function initGame6() {
  g6.xp = 0; g6.dist = 0; g6.running = true;
  g6.speed = 1 * STATE.adaptSpeed;
  g6.obstacleX = 110;

  clearInterval(g6.obsInterval);
  document.getElementById('runnerChar').style.animationPlayState = 'running';
  document.getElementById('runnerObstacle').style.display = 'none';

  newG6Question();

  g6.obsInterval = setInterval(() => {
    if (!document.getElementById('game6-screen').classList.contains('active')) {
      clearInterval(g6.obsInterval); return;
    }
    if (g6.running) {
      g6.dist += g6.speed;
      document.getElementById('g6-dist').textContent = Math.floor(g6.dist) + 'm';
    }
  }, 100);
  gameTimers.push(g6.obsInterval);
}

function newG6Question() {
  const q = generateQuestion();
  g6.question = q;
  document.getElementById('runnerQ').textContent = q.a + ' × ' + q.b + ' = ?';
  document.getElementById('runnerObstacle').textContent = '🚧 ' + q.a + '×' + q.b;
  document.getElementById('runnerObstacle').style.display = 'block';

  const wrongs = generateWrongAnswers(q.ans, STATE.ageGroup === 0 ? 2 : 3);
  const opts = shuffle([q.ans, ...wrongs]);
  const row = document.getElementById('runnerAns');
  row.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'runner-ans';
    btn.textContent = opt;
    btn.onclick = () => checkG6(opt, btn);
    row.appendChild(btn);
  });

  // Animate obstacle
  animateObstacle();
}

function animateObstacle() {
  const obs = document.getElementById('runnerObstacle');
  obs.style.right = '-100px';
  obs.style.transition = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      obs.style.transition = 'right ' + (4 / STATE.adaptSpeed) + 's linear';
      obs.style.right = '110%';
    });
  });
}

function checkG6(val, btn) {
  const correct = val === g6.question.ans;
  recordAnswer(g6.question.a, correct);
  showFeedback(correct);

  if (correct) {
    g6.xp += 15;
    addXP(15);
    showStarPop(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
    g6.running = true;
    g6.speed = Math.min(3, g6.speed + 0.1);
    document.getElementById('runnerChar').style.animationPlayState = 'running';
    document.getElementById('runnerChar').textContent = '👨🚀';
    document.getElementById('g6-xp').textContent = g6.xp;
    setTimeout(() => {
      if (document.getElementById('game6-screen').classList.contains('active')) newG6Question();
    }, 600);
  } else {
    g6.speed = Math.max(0.3, g6.speed - 0.2);
    document.getElementById('runnerChar').textContent = '😵';
    document.getElementById('runnerChar').classList.add('shake');
    setTimeout(() => {
      document.getElementById('runnerChar').classList.remove('shake');
      document.getElementById('runnerChar').textContent = '👨🚀';
    }, 500);
    document.getElementById('g6-xp').textContent = g6.xp;
  }
}

// =====================================================================
// GAME 7: GRID CHALLENGE
// =====================================================================
let g7 = { xp: 0, score: 0, tableNum: 1, selected: new Set(), correct: new Set() };

function initGame7() {
  g7.xp = 0; g7.score = 0;
  window.nextGridRound();
}

window.nextGridRound = function() {
  const { min, max } = getTableRange();
  g7.tableNum = randInt(min, max);
  g7.selected = new Set();
  g7.correct = new Set();

  document.getElementById('gridInstruction').textContent = '🔲 Select all multiples of ' + g7.tableNum;

  // Build 48 random numbers including multiples
  const multiples = new Set();
  for (let i = 1; i <= 12; i++) multiples.add(g7.tableNum * i);
  g7.correct = multiples;

  const allNums = [...multiples];
  const max2 = g7.tableNum <= 10 ? 120 : 300;
  while (allNums.length < 48) {
    const n = randInt(1, max2);
    if (!multiples.has(n) && !allNums.includes(n)) allNums.push(n);
  }
  shuffle(allNums);

  const grid = document.getElementById('numberGrid');
  grid.innerHTML = '';
  allNums.forEach(n => {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.textContent = n;
    cell.dataset.num = n;
    cell.onclick = () => toggleGridCell(cell, n);
    grid.appendChild(cell);
  });
  document.getElementById('g7-score').textContent = g7.score;
}

function toggleGridCell(cell, n) {
  if (g7.selected.has(n)) {
    g7.selected.delete(n);
    cell.classList.remove('selected');
  } else {
    g7.selected.add(n);
    cell.classList.add('selected');
  }
}

window.checkGrid = function() {
  let correct = 0, wrong = 0;
  document.querySelectorAll('.grid-cell').forEach(cell => {
    const n = parseInt(cell.dataset.num);
    const isMultiple = g7.correct.has(n);
    const isSelected = g7.selected.has(n);

    if (isMultiple && isSelected) { cell.classList.add('correct'); correct++; }
    else if (!isMultiple && isSelected) { cell.classList.add('wrong-sel'); wrong++; }
    else if (isMultiple && !isSelected) { cell.classList.add('revealed'); }
  });

  const totalMultiples = g7.correct.size;
  const accuracy = correct / totalMultiples;
  recordAnswer(g7.tableNum, accuracy >= 0.8);
  showFeedback(accuracy >= 0.8);

  if (accuracy >= 0.8) {
    const xpGain = correct * 5;
    g7.xp += xpGain;
    addXP(xpGain);
    g7.score += correct;
    if (accuracy === 1 && wrong === 0) {
      triggerConfetti();
      showStarPop(window.innerWidth/2, window.innerHeight/2);
    }
  }
  document.getElementById('g7-xp').textContent = g7.xp;
  document.getElementById('g7-score').textContent = g7.score;
}

// =====================================================================
// PRACTICE MODE
// =====================================================================
function buildPracticeList() {
  const { min, max } = getTableRange();
  const list = document.getElementById('practiceTableList');
  list.innerHTML = '';
  for (let i = min; i <= max; i++) {
    const btn = document.createElement('button');
    btn.className = 'practice-num-btn' + (STATE.masteredTables.has(i) ? ' mastered' : '');
    btn.textContent = i;
    btn.onclick = () => showPracticeTable(i);
    list.appendChild(btn);
  }
}

window.showPracticeTable = function(n) {
  document.getElementById('practiceSteps').style.display = 'block';
  document.getElementById('practiceTitle').textContent = '📘 Table of ' + n;
  const list = document.getElementById('practiceStepsList');
  list.innerHTML = '';
  const icon = OBJECTS[n % OBJECTS.length];
  const dotColors = ['#6C63FF','#FF6B9D','#FFC107','#00C896','#4FC3F7','#CE93D8','#FF7043'];

  for (let i = 1; i <= 12; i++) {
    const row = document.createElement('div');
    row.className = 'practice-step';
    row.style.animationDelay = (i * 0.05) + 's';
    const color = dotColors[(n + i) % dotColors.length];

    const dots = [];
    for (let d = 0; d < Math.min(n * i, 50); d++) dots.push(`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin:2px;animation:popIn 0.3s ease ${d * 0.02}s both"></span>`);

    row.innerHTML = `
      <span class="eq">${n} × ${i} =</span>
      <span class="eq-ans">${n * i}</span>
      <div class="practice-dots">${dots.join('')}</div>
    `;
    list.appendChild(row);
  }

  list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =====================================================================
// DASHBOARD
// =====================================================================
function updateDashboard() {
  document.getElementById('dash-xp').textContent = STATE.xp;
  document.getElementById('dash-level').textContent = STATE.level;
  document.getElementById('dash-acc').textContent = STATE.accuracy + '%';
  document.getElementById('dash-streak').textContent = STATE.bestCombo;
  document.getElementById('dash-mastered').textContent = STATE.masteredTables.size;
  document.getElementById('dash-highest').textContent = STATE.highestTable;

  // Table badges
  const { min, max } = getTableRange();
  const wrap = document.getElementById('tableBadges');
  wrap.innerHTML = '';
  for (let i = min; i <= max; i++) {
    const badge = document.createElement('div');
    badge.className = 'table-badge' + (STATE.masteredTables.has(i) ? ' done' : '');
    badge.textContent = '× ' + i + (STATE.masteredTables.has(i) ? ' ✓' : '');
    wrap.appendChild(badge);
  }
}

// =====================================================================
// INIT
// =====================================================================
// Select age group 1 by default
document.querySelectorAll('.age-card')[1].classList.add('selected');

// Prevent default drag on arena
document.addEventListener('dragover', e => e.preventDefault());
