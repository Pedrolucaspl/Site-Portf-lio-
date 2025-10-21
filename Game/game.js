const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Função para ajustar o tamanho do canvas
function resizeCanvas() {
    const maxWidth = window.innerWidth - 20;
    const maxHeight = window.innerHeight - 20;
    const aspectRatio = 800 / 400;
    
    let newWidth = maxWidth;
    let newHeight = newWidth / aspectRatio;
    
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
    }
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
}

// Configurações do jogo
let gameSpeed = 4;
let gravity = 0.6;
let score = 0;
let bitsCollected = 0;
let running = true;
let lastTime = 0;

// Player
const player = {
  x: 50,
  y: 300,
  width: 30,
  height: 30,
  dy: 0,
  jumpPower: -12,
  grounded: true,
  jumpCount: 0,
  maxJumps: 2
};

// Obstáculos e bits
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
    // Obstáculo passável por baixo (alto o suficiente para não pular por cima)
    gap = player.height + 8;
    height = canvas.height - gap - 40;
    passBelow = true;
  } else if (typeRandom < 0.5) {
    // Obstáculo grande
    height = Math.random() * 80 + 60;
  } else {
    // Obstáculo pequeno
    height = Math.random() * 30 + 20;
  }

  obstacles.push({
    x: x,
    y: canvas.height - height,
    width: 20,
    height: height,
    passBelow: passBelow,
    gap: gap
  });

  bitsSinceLastObstacle = 0;
}

// --- Criar bit de dados ---
function createDataBit() {
  if (bitsSinceLastObstacle >= 3) return; // máximo 3 bits por obstáculo
  if (dataBits.length >= 3) return;       // máximo 3 bits ativos ao mesmo tempo

  const size = 15;
  const minDistanceFromObstacle = 20; // distância mínima lateral dos obstáculos
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

      // Verifica se o bit ficaria sobre ou muito perto de um obstáculo
      if (y + size > obsTop && y < obsBottom) {
        if (canvas.width + size > obs.x - minDistanceFromObstacle && canvas.width < obs.x + obs.width + minDistanceFromObstacle) {
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
  const minDistance = 200;
  const maxDistance = 400;
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
  gameSpeed = 4;
  running = true;
  lastTime = 0;
}

// --- Atualização do jogo ---
function update(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calcula tempo decorrido entre frames
  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000; // em segundos
  lastTime = timestamp;

  if (!running) {
    // Overlay Game Over
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff5555";
    ctx.font = "36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "18px monospace";
    ctx.fillText(`Score: ${Math.floor(score)} | Bits: ${bitsCollected}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText("Pressione R para reiniciar", canvas.width / 2, canvas.height / 2 + 40);
    requestAnimationFrame(update);
    return;
  }

  // Score aumenta com o tempo e também com a velocidade
score += deltaTime * (gameSpeed / 4); 


  // --- Player ---
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

  // --- Obstáculos ---
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= gameSpeed;

    ctx.fillStyle = "#ff0000";
    if (obs.passBelow) {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height - obs.gap);
    } else {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Colisão
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

  // --- Bits ---
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
      score += 5; // +5 pontos por bit
      bitsCollected += 1;
    }

    if (bit.x + bit.width < 0) {
      dataBits.splice(i, 1);
    }
  }

  // --- UI ---
  ctx.fillStyle = "#00ff00";
  ctx.font = "20px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + Math.floor(score), 10, 30);
  ctx.fillText("Bits: " + bitsCollected, 10, 60);

  // Velocidade gradual
  gameSpeed += 0.003;

  // Criar obstáculos e bits
  maybeCreateObstacle();
  if (Math.random() < 0.01) createDataBit();

  requestAnimationFrame(update);
}

// --- Controles ---
function jump() {
    if (player.grounded || player.jumpCount < player.maxJumps) {
        player.dy = player.jumpPower;
        player.grounded = false;
        player.jumpCount += 1;
    }
}

// Controles de teclado
document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        jump();
    }
    if (!running && (e.key === "r" || e.key === "R")) {
        restartGame();
    }
});

// Controles de toque
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (running) {
        jump();
    } else {
        restartGame();
    }
});

// Ajuste de tamanho quando a tela muda
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Iniciar jogo ---
requestAnimationFrame(update);
