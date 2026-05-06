const grid          = document.getElementById('grid');
const startBtn      = document.getElementById('start-btn');
const restartBtn    = document.getElementById('restart-btn');
const statusMessage = document.getElementById('status-message');
const currentLevel  = document.getElementById('current-level');
const bestLevelEl   = document.getElementById('best-level');
const gameOverScreen = document.getElementById('game-over-screen');
const finalLevel    = document.getElementById('final-level');
const wrongFlash    = document.getElementById('wrong-flash');

const cells = document.querySelectorAll('.cell');

let sequence       = [];
let playerClicks   = [];
let isInputAllowed = false;
let level          = 1;
let bestLevel      = 0;

cells.forEach(function(cell) {
  cell.addEventListener('click', function() {
    const index = Number(this.dataset.index);
    handleClick(index, this);
  });
});

function pickCells(n) {
  let allIndexes = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  let picked = [];

  for (let i = 0; i < n; i++) {
    let pos = Math.floor(Math.random() * allIndexes.length);
    picked.push(allIndexes[pos]);
    allIndexes.splice(pos, 1);
  }

  return picked;
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function updateLevelDisplay() {
  currentLevel.textContent = level;

  if (level > bestLevel) {
    bestLevel = level;
    bestLevelEl.textContent = bestLevel;
  }
}

const DISPLAY_SPEED = 700;
const LIT_DURATION  = 400;

function startRound() {
  playerClicks = [];
  isInputAllowed = false;
  grid.classList.add('disabled');

  sequence = pickCells(level);

  updateLevelDisplay();
  setStatus('Watch carefully...');

  for (let i = 0; i < sequence.length; i++) {
    setTimeout(function() {
      let cellIndex = sequence[i];
      let cell = cells[cellIndex];

      cell.classList.add('lit');

      setTimeout(function() {
        cell.classList.remove('lit');
      }, LIT_DURATION);

    }, (i + 1) * DISPLAY_SPEED);
  }

  setTimeout(function() {
    isInputAllowed = true;
    grid.classList.remove('disabled');
    setStatus('Your turn!');
  }, (sequence.length + 1) * DISPLAY_SPEED);
}

startBtn.addEventListener('click', function() {
  startBtn.style.display = 'none';
  level = 1;
  startRound();
});

function handleClick(index, cellEl) {
  if (!isInputAllowed) {
    return;
  }

  let currentStep = playerClicks.length;
  let expectedIndex = sequence[currentStep];

  if (index === expectedIndex) {
    cellEl.classList.add('clicked');
    setTimeout(function() {
      cellEl.classList.remove('clicked');
    }, 250);

    playerClicks.push(index);

    if (playerClicks.length === sequence.length) {
      isInputAllowed = false;
      grid.classList.add('disabled');
      setStatus('Nice one!');
      setTimeout(function() {
        checkResult();
      }, 800);
    }

  } else {
    cellEl.classList.add('wrong');
    setTimeout(function() {
      cellEl.classList.remove('wrong');
    }, 300);

    wrongFlash.classList.add('active');
    setTimeout(function() {
      wrongFlash.classList.remove('active');
    }, 450);

    isInputAllowed = false;
    grid.classList.add('disabled');

    setTimeout(function() {
      showGameOver();
    }, 600);
  }
}

function checkResult() {
  level = level + 1;
  setStatus('Level ' + level + '!');

  setTimeout(function() {
    startRound();
  }, 800);
}

function showGameOver() {
  finalLevel.textContent = level;
  gameOverScreen.style.display = 'flex';
}

function resetGame() {
  sequence     = [];
  playerClicks = [];
  level        = 1;
  isInputAllowed = false;

  gameOverScreen.style.display = 'none';

  startRound();
}

restartBtn.addEventListener('click', function() {
  resetGame();
});
