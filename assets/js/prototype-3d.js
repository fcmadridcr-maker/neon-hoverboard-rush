
(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const loading = document.getElementById("loading-screen");
  const progress = document.getElementById("loading-progress");
  const startButton = document.getElementById("start-button");
  const scoreLabel = document.getElementById("score");
  const message = document.getElementById("game-message");

  if (!canvas || !window.BABYLON) {
    message.textContent = "NO SE PUDO CARGAR EL MOTOR 3D";
    return;
  }

  const B = BABYLON;
  const engine = new B.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    antialias: true
  });

  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.025, 0.012, 0.07, 1);
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new B.Color3(0.035, 0.015, 0.09);

  const camera = new B.FollowCamera(
    "playerCamera",
    new B.Vector3(0, 5, -11),
    scene
  );
  camera.radius = 11;
  camera.heightOffset = 4.2;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.045;
  camera.maxCameraSpeed = 12;
  camera.fov = 0.9;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  const glow = new B.GlowLayer("neonGlow", scene);
  glow.intensity = 0.65;

  const hemi = new B.HemisphericLight(
    "ambientLight",
    new B.Vector3(0, 1, 0),
    scene
  );
  hemi.intensity = 0.85;
  hemi.diffuse = new B.Color3(0.65, 0.62, 1);

  const keyLight = new B.DirectionalLight(
    "mainLight",
    new B.Vector3(-0.4, -1, 0.5),
    scene
  );
  keyLight.position = new B.Vector3(0, 12, -5);
  keyLight.intensity = 1.1;

  function material(name, color, emissive = null, metallic = 0) {
    const m = new B.StandardMaterial(name, scene);
    m.diffuseColor = B.Color3.FromHexString(color);
    m.specularColor = new B.Color3(0.8, 0.8, 1);
    m.specularPower = 90;
    m.metallic = metallic;
    if (emissive) {
      m.emissiveColor = B.Color3.FromHexString(emissive);
    }
    return m;
  }

  const mats = {
    road: material("road", "#17132b", "#08051b", 0.4),
    edge: material("roadEdge", "#472080", "#8b35ff", 0.2),
    purple: material("purpleArmor", "#8138dc", "#34105e", 0.35),
    violet: material("violet", "#bd72ff", "#812cff"),
    cyan: material("cyan", "#37dcff", "#16baff"),
    white: material("whiteSuit", "#e9eaff", "#444477"),
    dark: material("darkSuit", "#22243e", "#17102b"),
    visor: material("visor", "#153e69", "#087dce", 0.7),
    skin: material("skin", "#ffbd91"),
    gold: material("coinGold", "#ffca4b", "#ff9c16", 0.3),
    obstacle: material("obstacle", "#502078", "#b32cff"),
    building: material("building", "#17102c", "#28134d", 0.2),
    window: material("windows", "#47216f", "#a34bff"),
    thruster: material("thruster", "#40dfff", "#19caff")
  };

  // Luces decorativas de la pista
  const trackSegments = [];
  const trackLength = 28;

  function createTrackSegment(z) {
    const root = new B.TransformNode("trackSegment", scene);
    root.position.z = z;

    const floor = B.MeshBuilder.CreateBox(
      "roadFloor",
      { width: 12, height: 0.35, depth: trackLength },
      scene
    );
    floor.position.y = -0.35;
    floor.parent = root;
    floor.material = mats.road;

    for (const x of [-6, 6]) {
      const rail = B.MeshBuilder.CreateBox(
        "neonRail",
        { width: 0.16, height: 0.24, depth: trackLength },
        scene
      );
      rail.position.set(x, -0.12, 0);
      rail.parent = root;
      rail.material = mats.edge;
    }

    for (const x of [-2, 2]) {
      const line = B.MeshBuilder.CreateBox(
        "laneLine",
        { width: 0.045, height: 0.025, depth: trackLength },
        scene
      );
      line.position.set(x, -0.16, 0);
      line.parent = root;
      line.material = mats.cyan;
    }

    trackSegments.push(root);
  }

  for (let i = 0; i < 6; i++) {
    createTrackSegment(i * trackLength);
  }

  // Personaje caricaturesco 3D
  const player = new B.TransformNode("cartoonRider", scene);
  player.position.set(0, 0.2, 0);

  function sphere(name, diameter, parent, pos, mat, scale = null) {
    const mesh = B.MeshBuilder.CreateSphere(
      name,
      { diameter, segments: 24 },
      scene
    );
    mesh.parent = parent;
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (scale) mesh.scaling.set(scale[0], scale[1], scale[2]);
    mesh.material = mat;
    return mesh;
  }

  function box(name, size, parent, pos, mat, rotation = null) {
    const mesh = B.MeshBuilder.CreateBox(name, size, scene);
    mesh.parent = parent;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.material = mat;
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    return mesh;
  }

  // Piernas y botas
  for (const x of [-0.23, 0.23]) {
    const leg = box(
      "riderLeg",
      { width: 0.25, height: 0.55, depth: 0.3 },
      player,
      [x, 0.53, 0],
      mats.dark
    );

    const boot = box(
      "riderBoot",
      { width: 0.32, height: 0.2, depth: 0.43 },
      player,
      [x, 0.22, 0.08],
      mats.purple
    );
    boot.rotation.x = -0.12;
  }

  // Cuerpo
  const torso = sphere(
    "riderBody",
    0.9,
    player,
    [0, 1.12, 0],
    mats.white,
    [0.9, 1.12, 0.72]
  );

  box(
    "chestArmor",
    { width: 0.53, height: 0.35, depth: 0.12 },
    player,
    [0, 1.2, -0.32],
    mats.purple
  );

  sphere(
    "chestCore",
    0.18,
    player,
    [0, 1.2, -0.4],
    mats.cyan
  );

  // Brazos
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = sphere(
      "riderArm",
      0.38,
      player,
      [side * 0.52, 1.17, 0],
      mats.white,
      [0.62, 1.15, 0.65]
    );
    arm.rotation.z = side * -0.35;
    arms.push(arm);

    sphere(
      "riderGlove",
      0.24,
      player,
      [side * 0.65, 0.87, 0.08],
      mats.purple
    );
  }

  // Cabeza y casco
  const head = new B.TransformNode("riderHead", scene);
  head.parent = player;
  head.position.y = 2.05;

  sphere(
    "helmet",
    1.05,
    head,
    [0, 0.12, 0],
    mats.purple,
    [1, 1.02, 0.92]
  );

  sphere(
    "helmetFace",
    0.78,
    head,
    [0, 0.1, -0.36],
    mats.visor,
    [1, 0.8, 0.35]
  );

  for (const x of [-0.17, 0.17]) {
    sphere(
      "eyeGlow",
      0.105,
      head,
      [x, 0.11, -0.66],
      mats.cyan,
      [1, 1.15, 0.45]
    );
  }

  // Detalles luminosos del casco
  for (const x of [-0.49, 0.49]) {
    sphere(
      "helmetSide",
      0.27,
      head,
      [x, 0.05, 0],
      mats.cyan,
      [0.5, 1, 1]
    );
  }

  // Hoverboard
  const board = new B.TransformNode("hoverboard", scene);
  board.parent = player;
  board.position.set(0, 0.05, 0.12);

  const deck = box(
    "boardDeck",
    { width: 1.45, height: 0.16, depth: 0.65 },
    board,
    [0, 0, 0],
    mats.dark
  );

  box(
    "boardTop",
    { width: 1.3, height: 0.055, depth: 0.52 },
    board,
    [0, 0.095, 0],
    mats.purple
  );

  for (const x of [-0.55, 0.55]) {
    const light = box(
      "boardLight",
      { width: 0.12, height: 0.06, depth: 0.48 },
      board,
      [x, 0.13, 0],
      mats.cyan
    );
  }

  const thrusters = [];
  for (const x of [-0.48, 0.48]) {
    const flame = B.MeshBuilder.CreateCylinder(
      "boardThruster",
      { height: 0.65, diameterTop: 0.05, diameterBottom: 0.28 },
      scene
    );
    flame.parent = board;
    flame.position.set(x, -0.28, 0.12);
    flame.rotation.x = Math.PI;
    flame.material = mats.thruster;
    thrusters.push(flame);
  }

  camera.lockedTarget = player;

  // Edificios futuristas a los lados
  const buildings = [];

  function createBuilding(side, z) {
    const height = 4 + Math.random() * 10;
    const width = 2 + Math.random() * 2;

    const building = B.MeshBuilder.CreateBox(
      "cityTower",
      { width, height, depth: 2.5 },
      scene
    );

    building.position.set(
      side * (8 + Math.random() * 5),
      height / 2 - 0.3,
      z
    );
    building.material = mats.building;

    const windows = [];
    for (let row = 0; row < Math.floor(height / 1.4); row++) {
      const windowMesh = B.MeshBuilder.CreateBox(
        "towerWindow",
        { width: 0.12, height: 0.35, depth: 0.04 },
        scene
      );
      windowMesh.position.set(
        building.position.x - side * (width / 2 + 0.025),
        0.7 + row * 1.3,
        z - 1.28
      );
      windowMesh.material = mats.window;
      windows.push(windowMesh);
    }

    buildings.push({ building, windows });
  }

  for (let i = 0; i < 16; i++) {
    createBuilding(-1, i * 12 + 8);
    createBuilding(1, i * 12 + 8);
  }

  // Monedas y obstáculos
  const objects = [];

  function createCoin(x, z) {
    const coin = B.MeshBuilder.CreateTorus(
      "energyCoin",
      { diameter: 0.7, thickness: 0.15, tessellation: 24 },
      scene
    );
    coin.position.set(x, 1.15, z);
    coin.material = mats.gold;
    coin.rotation.x = Math.PI / 2;
    objects.push({ mesh: coin, type: "coin", active: true });
  }

  function createObstacle(x, z) {
    const obstacle = B.MeshBuilder.CreateBox(
      "neonObstacle",
      { width: 1.1, height: 1.15, depth: 0.85 },
      scene
    );
    obstacle.position.set(x, 0.4, z);
    obstacle.material = mats.obstacle;

    const top = B.MeshBuilder.CreateBox(
      "obstacleLight",
      { width: 1.12, height: 0.09, depth: 0.9 },
      scene
    );
    top.parent = obstacle;
    top.position.y = 0.5;
    top.material = mats.cyan;

    objects.push({ mesh: obstacle, type: "obstacle", active: true });
  }

  function spawnRow(z) {
    const lanes = [-4, 0, 4];
    const safeLane = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
      if (i === safeLane) {
        for (let n = 0; n < 4; n++) {
          createCoin(lanes[i], z + n * 2);
        }
      } else if (Math.random() > 0.25) {
        createObstacle(lanes[i], z + Math.random() * 3);
      } else {
        createCoin(lanes[i], z);
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    spawnRow(24 + i * 19);
  }

  // Estado de la partida
  let running = false;
  let gameOver = false;
  let score = 0;
  let speed = 0;
  let lane = 1;
  let targetX = 0;
  let jumpVelocity = 0;
  let jumpHeight = 0;
  let distance = 0;
  let lastTime = performance.now();

  function updateScore(value) {
    score = Math.max(0, value);
    scoreLabel.textContent = score;
  }

  function resetGame() {
    score = 0;
    distance = 0;
    speed = 0;
    lane = 1;
    targetX = 0;
    jumpHeight = 0;
    jumpVelocity = 0;
    gameOver = false;
    updateScore(0);

    player.position.set(0, 0.2, 0);
    player.rotation.set(0, 0, 0);
    board.rotation.set(0, 0, 0);

    for (const item of objects) {
      item.mesh.dispose();
    }
    objects.length = 0;

    for (let i = 0; i < 8; i++) {
      spawnRow(24 + i * 19);
    }
  }

  function startGame() {
    resetGame();
    running = true;
    speed = 15;
    startButton.textContent = "REINICIAR";
    message.textContent = "¡A TODA VELOCIDAD!";
  }

  function endGame() {
    running = false;
    gameOver = true;
    message.textContent = "¡FIN DE LA PARTIDA! PUNTOS: " + score;
    startButton.textContent = "VOLVER A JUGAR";
  }

  startButton.addEventListener("click", startGame);

  // Controles de teclado
  function moveLeft() {
    if (!running) return;
    lane = Math.max(0, lane - 1);
    targetX = [-4, 0, 4][lane];
  }

  function moveRight() {
    if (!running) return;
    lane = Math.min(2, lane + 1);
    targetX = [-4, 0, 4][lane];
  }

  function jump() {
    if (!running || jumpHeight > 0.05) return;
    jumpVelocity = 9;
  }

  window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      moveLeft();
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      moveRight();
    }
    if (event.key === " " || event.key === "ArrowUp") {
      jump();
    }
  });

  // Gestos táctiles
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("pointerdown", (event) => {
    touchStartX = event.clientX;
    touchStartY = event.clientY;
  });

  canvas.addEventListener("pointerup", (event) => {
    const dx = event.clientX - touchStartX;
    const dy = event.clientY - touchStartY;

    if (Math.abs(dx) > 30) {
      dx < 0 ? moveLeft() : moveRight();
    } else if (dy < -25) {
      jump();
    }
  });

  function update(delta) {
    if (!running) return;

    const dt = Math.min(delta, 0.04);

    distance += speed * dt;
    speed = Math.min(24, speed + dt * 0.12);

    // Desplazamiento de la pista
    for (const segment of trackSegments) {
      segment.position.z -= speed * dt;
      if (segment.position.z < -trackLength) {
        segment.position.z += trackLength * trackSegments.length;
      }
    }

    // Ciudad en movimiento
    for (const item of buildings) {
      item.building.position.z -= speed * dt;
      for (const win of item.windows) {
        win.position.z = item.building.position.z - 1.28;
      }

      if (item.building.position.z < -15) {
        item.building.position.z += 16 * 12;
        for (const win of item.windows) {
          win.position.z = item.building.position.z - 1.28;
        }
      }
    }

    // Movimiento suave del piloto
    player.position.x += (targetX - player.position.x) * Math.min(1, dt * 10);

    // Salto
    jumpVelocity -= 22 * dt;
    jumpHeight += jumpVelocity * dt;

    if (jumpHeight < 0) {
      jumpHeight = 0;
      jumpVelocity = 0;
    }

    player.position.y = 0.2 + jumpHeight;

    // Inclinación al cambiar de carril
    player.rotation.z +=
      ((targetX - player.position.x) * -0.09 - player.rotation.z) *
      Math.min(1, dt * 8);

    // Animación del personaje
    const bob = Math.sin(performance.now() * 0.008) * 0.035;
    head.rotation.z = Math.sin(performance.now() * 0.003) * 0.025;
    board.position.y = 0.05 + bob;
    board.rotation.z = player.rotation.z * 0.6;

    // Propulsores
    for (const flame of thrusters) {
      flame.scaling.y = 0.8 + Math.random() * 0.5;
    }

    // Monedas y obstáculos
    for (const item of objects) {
      if (!item.active) continue;

      item.mesh.position.z -= speed * dt;
      item.mesh.rotation.y += dt * 2.5;

      const close =
        Math.abs(item.mesh.position.z) < 0.85 &&
        Math.abs(item.mesh.position.x - player.position.x) < 1.15;

      if (close) {
        if (item.type === "coin") {
          updateScore(score + 10);
          item.active = false;
          item.mesh.dispose();
        } else if (jumpHeight < 0.8) {
          endGame();
          return;
        }
      }

      if (item.mesh.position.z < -7) {
        item.active = false;
        item.mesh.dispose();
      }
    }

    // Crear nuevas filas delante del jugador
    const farthest = objects.reduce(
      (max, item) => Math.max(max, item.mesh.position.z),
      0
    );

    if (farthest < 115) {
      spawnRow(145);
    }

    updateScore(score);
  }

  // Preparar escena
  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    update(delta);
  });

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });

  // Mostrar el prototipo cuando el escenario esté listo
  progress.style.width = "100%";

  setTimeout(() => {
    loading.classList.add("hidden");
    message.textContent = "PREPARADO PARA CORRER";
  }, 900);

})();
