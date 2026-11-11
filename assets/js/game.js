
(function () {
  "use strict";

  const CONFIG = {
    lanes: 3,
    startingSpeed: 5,
    maxSpeed: 12,
    acceleration: 0.0008,
    spawnInterval: 850,
    coinPoints: 10,
    batteryTurboCount: 5,
    turboDuration: 5000
  };

  let canvas = null;
  let ctx = null;
  let animationId = null;
  let lastTime = 0;
  let spawnTimer = 0;
  let running = false;
  let paused = false;
  let gameOver = false;

  let player = {
    lane: 1,
    x: 0,
    y: 0,
    targetX: 0,
    width: 42,
    height: 58
  };

  let objects = [];
  let particles = [];
  let score = 0;
  let distance = 0;
  let speed = CONFIG.startingSpeed;
  let batteries = 0;
  let turboUntil = 0;
  let collectedCoins = 0;

  let callbacks = {};

  function laneX(lane) {
    const laneWidth = canvas.width / CONFIG.lanes;
    return laneWidth * lane + laneWidth / 2;
  }

  function resize() {
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    player.y = rect.height * 0.78;
    player.x = laneX(player.lane);
    player.targetX = player.x;
  }

  function getDimensions() {
    const rect = canvas.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height
    };
  }

  function notify() {
    if (typeof callbacks.onUpdate === "function") {
      callbacks.onUpdate({
        score,
        distance: Math.floor(distance),
        batteries,
        coins: collectedCoins,
        speed: Number(speed.toFixed(1)),
        turbo: Date.now() < turboUntil,
        gameOver
      });
    }
  }

  function createParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1,
        color
      });
    }
  }

  function spawnObject() {
    const lane = Math.floor(Math.random() * CONFIG.lanes);
    const roll = Math.random();

    let type = "obstacle";

    if (roll < 0.48) {
      type = "coin";
    } else if (roll < 0.64) {
      type = "battery";
    }

    objects.push({
      type,
      lane,
      x: laneX(lane),
      y: -40,
      size: type === "obstacle" ? 34 : 18,
      collected: false
    });
  }

  function movePlayer(direction) {
    if (!running || paused || gameOver) return;

    player.lane = Math.max(
      0,
      Math.min(CONFIG.lanes - 1, player.lane + direction)
    );

    player.targetX = laneX(player.lane);
  }

  function jump() {
    if (!running || paused || gameOver) return;

    player.jumpUntil = Date.now() + 450;
  }

  function handleKey(event) {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      movePlayer(-1);
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      movePlayer(1);
    }

    if (event.key === "ArrowUp" || event.key === " ") {
      event.preventDefault();
      jump();
    }
  }

  function drawBackground(width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#08051b");
    gradient.addColorStop(1, "#11102b");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 36; i++) {
      const x = (i * 97) % width;
      const y = (i * 137 + distance * 0.3) % height;

      ctx.fillStyle = "rgba(180,170,255,0.65)";
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.strokeStyle = "rgba(145,90,255,0.28)";
    ctx.lineWidth = 2;

    for (let lane = 1; lane < CONFIG.lanes; lane++) {
      const x = width / CONFIG.lanes * lane;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(70,220,255,0.13)";

    const offset = (distance * 3) % 45;

    for (let y = offset; y < height; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const jumping = Date.now() < (player.jumpUntil || 0);
    const jumpOffset = jumping ? 28 : 0;

    const x = player.x;
    const y = player.y - jumpOffset;

    ctx.save();

    ctx.shadowBlur = 22;
    ctx.shadowColor = "#a855f7";

    // Hoverboard
    ctx.fillStyle = "#9b5cff";
    ctx.beginPath();
    ctx.roundRect(
      x - 27,
      y + 19,
      54,
      12,
      7
    );
    ctx.fill();

    ctx.shadowColor = "#45eaff";
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#45eaff";
    ctx.beginPath();
    ctx.ellipse(x, y + 27, 21, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rider body
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 14;

    ctx.fillStyle = "#d8d5ff";
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 13, 24, 32, 9);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#f7f5ff";
    ctx.beginPath();
    ctx.arc(x, y - 20, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4ceaff";
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawObjects() {
    objects.forEach((object) => {
      if (object.collected) return;

      ctx.save();
      ctx.translate(object.x, object.y);

      if (object.type === "coin") {
        ctx.shadowColor = "#ffd34e";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ffd34e";
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#9c6410";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", 0, 1);
      } else if (object.type === "battery") {
        ctx.shadowColor = "#42f5b3";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#42f5b3";
        ctx.beginPath();
        ctx.roundRect(-10, -15, 20, 30, 5);
        ctx.fill();

        ctx.fillStyle = "#073f35";
        ctx.font = "bold 19px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+", 0, 0);
      } else {
        ctx.shadowColor = "#ff4c91";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#ff4c91";
        ctx.beginPath();
        ctx.roundRect(-17, -17, 34, 34, 7);
        ctx.fill();

        ctx.fillStyle = "#40132d";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", 0, 1);
      }

      ctx.restore();
    });
  }

  function collectObject(object) {
    if (object.collected) return;

    object.collected = true;

    if (object.type === "coin") {
      score += CONFIG.coinPoints;
      collectedCoins++;
      createParticles(object.x, object.y, "#ffd34e", 9);
    }

    if (object.type === "battery") {
      batteries++;
      createParticles(object.x, object.y, "#42f5b3", 12);

      if (batteries >= CONFIG.batteryTurboCount) {
        batteries = 0;
        turboUntil = Date.now() + CONFIG.turboDuration;
        createParticles(player.x, player.y, "#42f5ff", 24);
      }
    }

    notify();
  }

  function updateObjects(delta) {
    const multiplier = Date.now() < turboUntil ? 1.7 : 1;

    objects.forEach((object) => {
      object.y += speed * multiplier * delta * 0.06;

      const sameLane = object.lane === player.lane;
      const nearPlayer = Math.abs(object.y - player.y) < 32;

      if (!object.collected && sameLane && nearPlayer) {
        if (object.type === "obstacle") {
          if (Date.now() < (player.jumpUntil || 0)) {
            createParticles(object.x, object.y, "#45eaff", 10);
            object.collected = true;
          } else {
            endGame();
          }
        } else {
          collectObject(object);
        }
      }
    });

    objects = objects.filter(
      (object) => object.y < getDimensions().height + 50 && !object.collected
    );
  }

  function drawParticles(delta) {
    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= delta * 0.002;

      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    particles = particles.filter((particle) => particle.life > 0);
  }

  function endGame() {
    if (gameOver) return;

    gameOver = true;
    running = false;

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    const result = {
      score,
      distance: Math.floor(distance),
      coins: collectedCoins,
      bestScore: score
    };

    if (typeof callbacks.onGameOver === "function") {
      callbacks.onGameOver(result);
    }

    notify();
  }

  function render(delta) {
    const dimensions = getDimensions();

    drawBackground(dimensions.width, dimensions.height);

    player.x += (player.targetX - player.x) * Math.min(1, delta * 0.015);

    drawObjects();
    drawPlayer();
    drawParticles(delta);

    if (Date.now() < turboUntil) {
      ctx.fillStyle = "rgba(65,235,255,0.08)";
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    }
  }

  function loop(timestamp) {
    if (!running || paused || gameOver) return;

    const delta = Math.min(timestamp - lastTime || 16, 40);
    lastTime = timestamp;

    const turbo = Date.now() < turboUntil;

    distance += delta * (turbo ? 0.025 : 0.015);
    speed = Math.min(
      CONFIG.maxSpeed,
      speed + CONFIG.acceleration * delta
    );

    spawnTimer += delta;

    if (spawnTimer >= CONFIG.spawnInterval) {
      spawnObject();
      spawnTimer = 0;
    }

    updateObjects(delta);
    render(delta);

    if (Math.floor(distance) % 10 === 0) {
      notify();
    }

    if (running && !gameOver && !paused) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function start() {
    if (!canvas || !ctx) return;

    if (animationId) cancelAnimationFrame(animationId);

    score = 0;
    distance = 0;
    speed = CONFIG.startingSpeed;
    batteries = 0;
    turboUntil = 0;
    collectedCoins = 0;

    objects = [];
    particles = [];

    player.lane = 1;
    player.x = laneX(1);
    player.targetX = player.x;
    player.jumpUntil = 0;

    spawnTimer = 0;
    gameOver = false;
    paused = false;
    running = true;

    lastTime = performance.now();

    notify();
    animationId = requestAnimationFrame(loop);
  }

  function pause() {
    if (!running) return;

    paused = true;

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function resume() {
    if (!running || !paused || gameOver) return;

    paused = false;
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
  }

  function init(options) {
    options = options || {};

    canvas = options.canvas;

    if (!canvas) {
      console.error("NHRGame necesita un elemento canvas.");
      return;
    }

    ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("No se pudo inicializar Canvas.");
      return;
    }

    callbacks = {
      onUpdate: options.onUpdate,
      onGameOver: options.onGameOver
    };

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", handleKey);

    resize();

    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    canvas.addEventListener("touchend", (event) => {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 25) {
        movePlayer(dx > 0 ? 1 : -1);
      } else if (dy < -25) {
        jump();
      }
    }, { passive: true });

    canvas.addEventListener("click", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;

      if (x < rect.width / 3) {
        movePlayer(-1);
      } else if (x > rect.width * 2 / 3) {
        movePlayer(1);
      } else {
        jump();
      }
    });
  }

  window.NHRGame = {
    init,
    start,
    pause,
    resume,
    moveLeft: () => movePlayer(-1),
    moveRight: () => movePlayer(1),
    jump,
    getState: () => ({
      score,
      distance: Math.floor(distance),
      batteries,
      coins: collectedCoins,
      speed,
      running,
      paused,
      gameOver
    })
  };
})();
