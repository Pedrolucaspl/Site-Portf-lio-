const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
// Velocidade inicial (desktop mais lenta; mobile mais rápida)
// Aumentei os valores mobile para deixar o jogo mais rápido apenas em celulares
let baseSpeed = isMobile ? 6 : 2.0; // mais rápido no celular
let maxSpeed = isMobile ? 12 : 6;
let gameSpeed = baseSpeed;

// ⚙️ Configurações iniciais
let gravity = 0.3;
let score = 0;
let bitsCollected = 0;
let running = true;
let lastTime = 0;



// 👾 Player
const player = {
  x: 50,
  y: 300,
  width: 30,
  height: 30,
  dy: 0,
  jumpPower: -10,
  grounded: true,
  jumpCount: 0,
  maxJumps: 2,
};

// 🚧 Obstáculos e bits
let obstacles = [];
let dataBits = [];
let bitsSinceLastObstacle = 0;

// --- Criar obstáculo ---
function createObstacleAt(x) {
  const typeRandom = Math.random();
  let height;
  let passBelow = false;
  let gap = 0;

  if (typeRandom < 0.2) {
    gap = player.height + 8;
    height = canvas.height - gap - 40;
    passBelow = true;
  } else if (typeRandom < 0.5) {
    height = Math.random() * 80 + 60;
  } else {
    height = Math.random() * 30 + 20;
  }

  obstacles.push({
    x: x,
    y: canvas.height - height,
    width: 20,
    height: height,
    passBelow,
    gap,
  });

  bitsSinceLastObstacle = 0;
}

// --- Criar bit ---
function createDataBit() {
  if (bitsSinceLastObstacle >= 3) return;
  if (dataBits.length >= 3) return;

  const size = 15;
  const minDistanceFromObstacle = 20;
  const maxJumpHeight = player.jumpPower * -2.5;
  const minY = canvas.height - player.height - 10;
  const maxY = canvas.height - player.height - maxJumpHeight;

  let y;
  let attempts = 0;
  do {
    y = Math.random() * (minY - maxY) + maxY;
    attempts++;

    let collision = false;
    for (const obs of obstacles) {
      const obsTop = obs.y;
      const obsBottom = obs.passBelow ? obs.y + obs.height - obs.gap : obs.y + obs.height;
      if (y + size > obsTop && y < obsBottom) {
        if (
          canvas.width + size > obs.x - minDistanceFromObstacle &&
          canvas.width < obs.x + obs.width + minDistanceFromObstacle
        ) {
          collision = true;
          break;
        }
      }
    }

    if (!collision) break;
    if (attempts > 20) break;
  } while (true);

  dataBits.push({ x: canvas.width, y: y, width: size, height: size });
  bitsSinceLastObstacle++;
}

// --- Criar obstáculos aleatórios ---
function maybeCreateObstacle() {
  const minDistance = 200 + gameSpeed * 15;
  const maxDistance = 400 + gameSpeed * 25;
  const lastObstacle = obstacles[obstacles.length - 1];

  if (!lastObstacle || lastObstacle.x + lastObstacle.width < canvas.width - minDistance) {
    const distance = Math.random() * (maxDistance - minDistance) + minDistance;
    createObstacleAt(canvas.width + distance);
  }
}

// --- Game Over ---
function gameOver() {
  running = false;
}

// --- Restart ---
function restartGame() {
  obstacles = [];
  dataBits = [];
  score = 0;
  bitsCollected = 0;
  player.y = 300;
  player.dy = 0;
  player.grounded = true;
  player.jumpCount = 0;
  gameSpeed = baseSpeed;
  running = true;
  lastTime = 0;
}

// --- Atualização do jogo ---
function update(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (!running) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff5555";
    ctx.font = "36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "18px monospace";
    ctx.fillText(`Score: ${Math.floor(score)} | Bits: ${bitsCollected}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText("Toque para reiniciar", canvas.width / 2, canvas.height / 2 + 40);
    requestAnimationFrame(update);
    return;
  }

  // 🎚️ Dificuldade
  const difficultyScale = 1 - Math.exp(-score / 200);
  gameSpeed = baseSpeed + (maxSpeed - baseSpeed) * difficultyScale;

  // 🧮 Score
  score += deltaTime * (gameSpeed / 4);

  // 👾 Player
  player.dy += gravity;
  player.y += player.dy;

  if (player.y + player.height >= canvas.height) {
    player.y = canvas.height - player.height;
    player.dy = 0;
    player.grounded = true;
    player.jumpCount = 0;
  }

  ctx.fillStyle = "#00ff00";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // 🚧 Obstáculos
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= gameSpeed;

    ctx.fillStyle = "#ff0000";
    if (obs.passBelow) {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height - obs.gap);
    } else {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }

    if (player.x < obs.x + obs.width && player.x + player.width > obs.x) {
      if (!obs.passBelow) {
        if (player.y < obs.y + obs.height && player.y + player.height > obs.y) {
          gameOver();
        }
      } else {
        if (player.y < obs.y + obs.height - obs.gap && player.y + player.height > obs.y) {
          gameOver();
        }
      }
    }

    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }

  // 💾 Bits
  for (let i = dataBits.length - 1; i >= 0; i--) {
    const bit = dataBits[i];
    bit.x -= gameSpeed;
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(bit.x, bit.y, bit.width, bit.height);

    if (
      player.x < bit.x + bit.width &&
      player.x + player.width > bit.x &&
      player.y < bit.y + bit.height &&
      player.y + player.height > bit.y
    ) {
      dataBits.splice(i, 1);
      score += 5;
      bitsCollected += 1;
    }

    if (bit.x + bit.width < 0) {
      dataBits.splice(i, 1);
    }
  }

  // 🧠 UI
  ctx.fillStyle = "#00ff00";
  ctx.font = "20px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + Math.floor(score), 10, 30);
  ctx.fillText("Bits: " + bitsCollected, 10, 60);

  // Spawn
  maybeCreateObstacle();
  if (Math.random() < 0.01) createDataBit();

  requestAnimationFrame(update);
}

// 🎮 Controles teclado
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") jumpPlayer();
  if (!running && (e.key === "r" || e.key === "R")) restartGame();
});

// 📱 Controles toque
canvas.addEventListener("touchstart", () => {
  if (running) {
    jumpPlayer();
  } else {
    restartGame();
  }
});

function jumpPlayer() {
  if (player.grounded || player.jumpCount < player.maxJumps) {
    player.dy = player.jumpPower;
    player.grounded = false;
    player.jumpCount += 1;
  }
}

// ▶️ Iniciar o jogo
requestAnimationFrame(update);

