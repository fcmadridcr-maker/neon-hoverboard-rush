
(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const loading = document.getElementById("loading-screen");
  const progress = document.getElementById("loading-progress");
  const startButton = document.getElementById("start-button");
  const scoreLabel = document.getElementById("score");
  const message = document.getElementById("game-message");

  if (!canvas || !window.BABYLON) {
    if (message) message.textContent = "NO SE PUDO CARGAR EL MOTOR 3D";
    return;
  }

  const B = BABYLON;
  const engine = new B.Engine(canvas, true, {
    antialias: true,
    stencil: true,
    preserveDrawingBuffer: false
  });

  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.035, 0.012, 0.008, 1);
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.009;
  scene.fogColor = new B.Color3(0.12, 0.035, 0.012);

  const camera = new B.FollowCamera(
    "playerCamera",
    new B.Vector3(0, 5, -12),
    scene
  );
  camera.radius = 12;
  camera.heightOffset = 4.1;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.045;
  camera.maxCameraSpeed = 12;
  camera.fov = 0.9;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  const glow = new B.GlowLayer("lavaGlow", scene);
  glow.intensity = 0.55;

  const ambient = new B.HemisphericLight(
    "caveAmbient",
    new B.Vector3(0, 1, 0),
    scene
  );
  ambient.intensity = 0.65;
  ambient.diffuse = new B.Color3(1, 0.48, 0.24);
  ambient.groundColor = new B.Color3(0.12, 0.025, 0.012);

  const lavaLight = new B.PointLight(
    "lavaLight",
    new B.Vector3(0, 2, 5),
    scene
  );
  lavaLight.diffuse = new B.Color3(1, 0.22, 0.025);
  lavaLight.intensity = 1.5;
  lavaLight.range = 28;

  const fillLight = new B.DirectionalLight(
    "frontLight",
    new B.Vector3(0.2, -1, -0.4),
    scene
  );
  fillLight.intensity = 0.55;
  fillLight.diffuse = new B.Color3(1, 0.72, 0.48);

  function mat(name, color, emissive = null, specular = 0.35) {
    const m = new B.StandardMaterial(name, scene);
    m.diffuseColor = B.Color3.FromHexString(color);
    m.specularColor = new B.Color3(specular, specular, specular);
    m.specularPower = 64;
    if (emissive) {
      m.emissiveColor = B.Color3.FromHexString(emissive);
    }
    return m;
  }

  const M = {
    road: mat("VolcanicRoad", "#29201c"),
    roadDetail: mat("RoadDetails", "#514039"),
    rock: mat("CaveRock", "#29201d"),
    rockLight: mat("RockHighlights", "#493128"),
    rockDark: mat("DeepRock", "#171211"),
    lava: mat("MoltenLava", "#ff4b08", "#ff3900", 0.1),
    lavaBright: mat("LavaHighlights", "#ffad24", "#ff6500", 0.1),
    skin: mat("WarmSkin", "#f4b58d"),
    skinLight: mat("SkinHighlights", "#ffd0aa"),
    hair: mat("MahoganyHair", "#54251f"),
    hairLight: mat("HairHighlights", "#78392d"),
    cap: mat("RedCap", "#d92924"),
    capDark: mat("CapShadow", "#8d1719"),
    shirt: mat("BeigeShirt", "#e9d9bd"),
    shirtDetail: mat("ShirtDetails", "#c5ae8c"),
    jeans: mat("BlueJeans", "#315a7d"),
    jeansDark: mat("JeansSeams", "#1d3e5a"),
    shoes: mat("RedSneakers", "#d52d2e"),
    shoeWhite: mat("SneakerSoles", "#f4eee4"),
    shoeYellow: mat("ShoeDetails", "#ffbd37"),
    eyeWhite: mat("EyeWhite", "#ffffff"),
    eye: mat("DarkEyes", "#251b1a"),
    pupil: mat("Pupils", "#08090d"),
    mouth: mat("Smile", "#8c3c36"),
    board: mat("BoardBlack", "#171b25"),
    boardTop: mat("BoardTop", "#333746"),
    cyan: mat("ElectricBlue", "#20caff", "#078dff"),
    gold: mat("CoinGold", "#ffbf32", "#b86b08"),
    goldLight: mat("CoinRelief", "#ffe38a", "#e6a31a"),
    obstacle: mat("VolcanicObstacle", "#553127"),
    crystal: mat("LavaCrystal", "#ff521d", "#ff2b08")
  };

  function box(name, size, parent, pos, material, rotation) {
    const mesh = B.MeshBuilder.CreateBox(name, size, scene);
    mesh.parent = parent || null;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.material = material;
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    return mesh;
  }

  function sphere(name, diameter, parent, pos, material, scale) {
    const mesh = B.MeshBuilder.CreateSphere(
      name,
      { diameter, segments: 24 },
      scene
    );
    mesh.parent = parent || null;
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (scale) mesh.scaling.set(scale[0], scale[1], scale[2]);
    mesh.material = material;
    return mesh;
  }

  function cylinder(name, height, top, bottom, parent, pos, material) {
    const mesh = B.MeshBuilder.CreateCylinder(
      name,
      {
        height,
        diameterTop: top,
        diameterBottom: bottom,
        tessellation: 32
      },
      scene
    );
    mesh.parent = parent || null;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.material = material;
    return mesh;
  }

  // --------------------------------------------------
  // CAVERNA VOLCÁNICA
  // --------------------------------------------------

  const trackSegments = [];
  const caveSegments = [];
  const trackLength = 28;
  const segmentCount = 7;

  function createTrackSegment(z) {
    const root = new B.TransformNode("stoneTrackSegment", scene);
    root.position.z = z;

    const floor = box(
      "DarkStoneTrack",
      { width: 12, height: 0.55, depth: trackLength },
      root,
      [0, -0.38, 0],
      M.road
    );

    for (const x of [-2, 2]) {
      box(
        "StoneLaneMark",
        { width: 0.055, height: 0.025, depth: trackLength },
        root,
        [x, -0.095, 0],
        M.roadDetail
      );
    }

    for (const side of [-1, 1]) {
      box(
        "LavaChannel",
        { width: 2.2, height: 0.16, depth: trackLength },
        root,
        [side * 7.15, -0.38, 0],
        M.lava
      );

      box(
        "LavaEdge",
        { width: 0.22, height: 0.2, depth: trackLength },
        root,
        [side * 5.95, -0.24, 0],
        M.rockLight
      );

      box(
        "OuterStoneRim",
        { width: 0.6, height: 0.65, depth: trackLength },
        root,
        [side * 6.25, -0.2, 0],
        M.rock
      );

      for (let i = 0; i < 5; i++) {
        sphere(
          "MoltenBubble",
          0.45,
          root,
          [
            side * (7.15 + (Math.random() - 0.5) * 0.8),
            -0.22 + Math.random() * 0.08,
            -11 + i * 5
          ],
          M.lavaBright,
          [1.4, 0.25, 1.2]
        );
      }
    }

    trackSegments.push(root);
  }

  function createCaveSegment(z) {
    const root = new B.TransformNode("caveSection", scene);
    root.position.z = z;

    // Techo rocoso irregular
    sphere(
      "CaveCeiling",
      1,
      root,
      [0, 7.1, 0],
      M.rock,
      [8.5, 4.1, 15]
    );

    // Paredes laterales
    for (const side of [-1, 1]) {
      sphere(
        "CaveWall",
        1,
        root,
        [side * 7.7, 2.5, 0],
        M.rockDark,
        [2.2, 4.8, 15]
      );

      sphere(
        "RockOutcrop",
        1,
        root,
        [side * 6.8, 4.5, -7],
        M.rockLight,
        [1.3, 1.8, 3]
      );

      sphere(
        "RockOutcrop",
        1,
        root,
        [side * 7.1, 3.8, 8],
        M.rock,
        [1.5, 2, 2.5]
      );

      // Estalactitas
      for (let i = 0; i < 3; i++) {
        const spike = cylinder(
          "HangingStalactite",
          1.5 + Math.random() * 1.5,
          0.03,
          0.45 + Math.random() * 0.3,
          root,
          [
            side * (3.5 + Math.random() * 2),
            5.7 + Math.random() * 1.5,
            -10 + i * 9
          ],
          M.rockLight
        );
        spike.rotation.x = Math.PI;
        spike.rotation.z = (Math.random() - 0.5) * 0.35;
      }
    }

    // Rocas en el techo
    for (let i = 0; i < 5; i++) {
      sphere(
        "CeilingRock",
        1,
        root,
        [
          (Math.random() - 0.5) * 11,
          8 + Math.random() * 1.2,
          -12 + i * 5
        ],
        Math.random() > 0.5 ? M.rock : M.rockLight,
        [
          0.7 + Math.random(),
          0.5 + Math.random() * 0.6,
          1 + Math.random()
        ]
      );
    }

    caveSegments.push(root);
  }

  for (let i = 0; i < segmentCount; i++) {
    createTrackSegment(i * trackLength);
    createCaveSegment(i * trackLength);
  }

  // Luces cálidas repartidas por la caverna
  const caveLights = [];
  for (let i = 0; i < 6; i++) {
    const light = new B.PointLight(
      "WallLavaLight",
      new B.Vector3(i % 2 ? 5.2 : -5.2, 2.5, i * 25),
      scene
    );
    light.diffuse = new B.Color3(1, 0.19, 0.035);
    light.intensity = 1.1;
    light.range = 15;
    caveLights.push(light);
  }

  // --------------------------------------------------
  // NIÑO SOBRE HOVERBOARD
  // --------------------------------------------------

  const player = new B.TransformNode("BoyRider", scene);
  player.position.set(0, 0.2, 0);

  const board = new B.TransformNode("Hoverboard", scene);
  board.parent = player;
  board.position.set(0, 0.05, 0.12);

  // Tabla negra con bordes y luces azules
  box(
    "HoverboardBase",
    { width: 1.65, height: 0.19, depth: 0.82 },
    board,
    [0, 0, 0],
    M.board
  );

  box(
    "HoverboardTop",
    { width: 1.48, height: 0.07, depth: 0.68 },
    board,
    [0, 0.12, 0],
    M.boardTop
  );

  for (const side of [-1, 1]) {
    box(
      "BlueBoardLight",
      { width: 0.12, height: 0.08, depth: 0.56 },
      board,
      [side * 0.64, 0.11, 0],
      M.cyan
    );

    const thruster = cylinder(
      "BlueThruster",
      0.55,
      0.08,
      0.32,
      board,
      [side * 0.48, -0.32, 0.12],
      M.cyan
    );
    thruster.rotation.x = Math.PI;
  }

  // Piernas y pantalón azul
  for (const side of [-1, 1]) {
    box(
      "BlueJeansLeg",
      { width: 0.31, height: 0.68, depth: 0.37 },
      player,
      [side * 0.23, 0.62, 0.02],
      M.jeans
    );

    box(
      "JeansCuff",
      { width: 0.34, height: 0.13, depth: 0.39 },
      player,
      [side * 0.23, 0.3, 0.02],
      M.jeansDark
    );

    // Zapatillas rojas
    sphere(
      "RedSneaker",
      0.55,
      player,
      [side * 0.23, 0.22, -0.16],
      M.shoes,
      [0.72, 0.53, 1.15]
    );

    box(
      "WhiteSneakerSole",
      { width: 0.42, height: 0.1, depth: 0.48 },
      player,
      [side * 0.23, 0.045, -0.17],
      M.shoeWhite
    );

    box(
      "YellowShoeStripe",
      { width: 0.25, height: 0.045, depth: 0.04 },
      player,
      [side * 0.23, 0.29, -0.36],
      M.shoeYellow
    );
  }

  // Camiseta beige
  sphere(
    "BeigeShirtBody",
    1,
    player,
    [0, 1.17, 0.02],
    M.shirt,
    [0.78, 0.91, 0.53]
  );

  box(
    "ShirtHem",
    { width: 0.78, height: 0.12, depth: 0.48 },
    player,
    [0, 0.77, 0.02],
    M.shirtDetail
  );

  // Cuello
  cylinder(
    "Neck",
    0.22,
    0.26,
    0.26,
    player,
    [0, 1.78, 0],
    M.skin
  );

  // Brazos extendidos hacia delante
  for (const side of [-1, 1]) {
    const arm = sphere(
      "ShirtSleeve",
      0.43,
      player,
      [side * 0.56, 1.38, -0.13],
      M.shirt,
      [0.72, 0.75, 1.25]
    );
    arm.rotation.z = side * -0.3;
    arm.rotation.x = -0.4;

    const forearm = sphere(
      "BoyForearm",
      0.34,
      player,
      [side * 0.62, 1.16, -0.42],
      M.skin,
      [0.62, 0.7, 1.2]
    );
    forearm.rotation.x = -0.65;
    forearm.rotation.z = side * -0.18;

    sphere(
      "BoyHand",
      0.24,
      player,
      [side * 0.63, 1.04, -0.57],
      M.skinLight,
      [1, 0.8, 0.8]
    );
  }

  // Cabeza grande y expresiva
  const head = new B.TransformNode("BoyHead", scene);
  head.parent = player;
  head.position.set(0, 2.13, -0.015);

  sphere(
    "BoyFace",
    1,
    head,
    [0, 0, -0.02],
    M.skin,
    [0.91, 1.03, 0.78]
  );

  // Mejillas
  for (const side of [-1, 1]) {
    sphere(
      "Cheek",
      0.2,
      head,
      [side * 0.37, -0.12, -0.57],
      M.skinLight,
      [1, 0.65, 0.3]
    );
  }

  // Cabello marrón caoba, visible bajo la gorra
  sphere(
    "MahoganyHairBack",
    1,
    head,
    [0, 0.27, 0.18],
    M.hair,
    [0.94, 0.8, 0.76]
  );

  for (const side of [-1, 1]) {
    sphere(
      "HairSide",
      0.38,
      head,
      [side * 0.65, 0.05, 0.02],
      M.hair,
      [0.65, 1.2, 0.8]
    );
  }

  // Mechones delanteros
  for (let i = 0; i < 5; i++) {
    const strand = sphere(
      "MahoganyHairStrand",
      0.27,
      head,
      [-0.38 + i * 0.19, 0.43 + (i % 2) * 0.07, -0.49],
      i % 2 ? M.hairLight : M.hair,
      [0.7, 0.7, 0.8]
    );
    strand.rotation.z = (i - 2) * 0.2;
  }

  // Ojos grandes
  for (const side of [-1, 1]) {
    sphere(
      "EyeWhite",
      0.24,
      head,
      [side * 0.2, 0.12, -0.64],
      M.eyeWhite,
      [0.88, 1.12, 0.48]
    );

    sphere(
      "EyeIris",
      0.15,
      head,
      [side * 0.2, 0.11, -0.7],
      M.eye,
      [0.85, 1, 0.4]
    );

    sphere(
      "EyePupil",
      0.09,
      head,
      [side * 0.2, 0.11, -0.74],
      M.pupil,
      [0.85, 1, 0.35]
    );

    sphere(
      "EyeSparkle",
      0.045,
      head,
      [side * 0.17, 0.16, -0.77],
      M.eyeWhite
    );
  }

  // Cejas y nariz
  for (const side of [-1, 1]) {
    const brow = box(
      "Eyebrow",
      { width: 0.2, height: 0.045, depth: 0.045 },
      head,
      [side * 0.2, 0.32, -0.63],
      M.hair,
      [0, 0, side * -0.12]
    );
  }

  sphere(
    "BoyNose",
    0.13,
    head,
    [0, -0.06, -0.72],
    M.skinLight,
    [0.9, 0.75, 0.75]
  );

  // Sonrisa
  const smile = box(
    "BoySmile",
    { width: 0.2, height: 0.035, depth: 0.025 },
    head,
    [0, -0.28, -0.69],
    M.mouth
  );

  // Gorra roja: corona, visera y detalles
  sphere(
    "RedCapCrown",
    1,
    head,
    [0, 0.64, 0.02],
    M.cap,
    [0.92, 0.43, 0.86]
  );

  box(
    "CapFrontPanel",
    { width: 0.76, height: 0.22, depth: 0.12 },
    head,
    [0, 0.52, -0.58],
    M.capDark
  );

  const brim = B.MeshBuilder.CreateCylinder(
    "CapVisor",
    { height: 0.09, diameterTop: 0.95, diameterBottom: 1.08, tessellation: 40 },
    scene
  );
  brim.parent = head;
  brim.scaling.set(1, 0.22, 0.75);
  brim.position.set(0, 0.43, -0.62);
  brim.rotation.x = Math.PI / 2;
  brim.material = M.cap;

  sphere(
    "CapButton",
    0.09,
    head,
    [0, 0.98, 0.02],
    M.capDark
  );

  // Cámara sigue al niño
  camera.lockedTarget = player;

  // --------------------------------------------------
  // MONEDAS DORADAS SÓLIDAS
  // --------------------------------------------------

  const objects = [];
  const lanes = [-4, 0, 4];

  function createStar(parent) {
    const positions = [];
    const indices = [];
    const outer = 0.23;
    const inner = 0.105;

    positions.push(0, 0.078, 0);

    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? outer : inner;
      positions.push(
        Math.cos(angle) * radius,
        0.078,
        Math.sin(angle) * radius
      );
    }

    for (let i = 0; i < 10; i++) {
      indices.push(0, i + 1, ((i + 1) % 10) + 1);
    }

    const vertexData = new B.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;

    const normals = [];
    B.VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;

    const star = new B.Mesh("CoinStarRelief", scene);
    vertexData.applyToMesh(star);
    star.parent = parent;
    star.material = M.goldLight;
    return star;
  }

  function createCoin(x, z) {
    const coin = B.MeshBuilder.CreateCylinder(
      "SolidGoldCoin",
      {
        height: 0.15,
        diameter: 0.82,
        tessellation: 48
      },
      scene
    );

    coin.position.set(x, 1.35, z);
    coin.rotation.x = Math.PI / 2;
    coin.material = M.gold;

    // Estrella grabada en la cara visible
    createStar(coin);

    // Borde metálico
    const rim = B.MeshBuilder.CreateTorus(
      "CoinMetalRim",
      { diameter: 0.78, thickness: 0.045, tessellation: 40 },
      scene
    );
    rim.parent = coin;
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.078;
    rim.material = M.goldLight;

    objects.push({
      mesh: coin,
      type: "coin",
      active: true
    });
  }

  // --------------------------------------------------
  // OBSTÁCULOS VOLCÁNICOS
  // --------------------------------------------------

  function createObstacle(x, z) {
    const root = new B.TransformNode("LavaRockObstacle", scene);
    root.position.set(x, 0.35, z);

    const rock = sphere(
      "ObstacleBoulder",
      1,
      root,
      [0, 0, 0],
      M.obstacle,
      [0.85, 0.85, 0.78]
    );

    rock.rotation.z = Math.random() * 0.5;

    // Grieta incandescente
    box(
      "LavaCrack",
      { width: 0.65, height: 0.07, depth: 0.06 },
      root,
      [0, 0.08, -0.43],
      M.crystal,
      [0, 0, 0.25]
    );

    objects.push({
      mesh: root,
      type: "obstacle",
      active: true
    });
  }

  function spawnRow(z) {
    const safeLane = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
      if (i === safeLane) {
        for (let n = 0; n < 4; n++) {
          createCoin(lanes[i], z + n * 2.1);
        }
      } else if (Math.random() > 0.25) {
        createObstacle(lanes[i], z + Math.random() * 2.5);
      } else {
        createCoin(lanes[i], z);
      }
    }
  }

  // --------------------------------------------------
  // ESTADO Y CONTROLES
  // --------------------------------------------------

  let running = false;
  let score = 0;
  let speed = 0;
  let lane = 1;
  let targetX = 0;
  let jumpVelocity = 0;
  let jumpHeight = 0;
  let distance = 0;
  let nextSpawn = 165;
  let lastTime = performance.now();

  function updateScore(value) {
    score = Math.max(0, value);
    if (scoreLabel) scoreLabel.textContent = String(score);
  }

  function clearObjects() {
    for (const item of objects) {
      item.mesh.dispose();
    }
    objects.length = 0;
  }

  function resetGame() {
    score = 0;
    distance = 0;
    speed = 0;
    lane = 1;
    targetX = 0;
    jumpHeight = 0;
    jumpVelocity = 0;
    nextSpawn = 165;
    running = false;

    updateScore(0);

    player.position.set(0, 0.2, 0);
    player.rotation.set(0, 0, 0);
    board.rotation.set(0, 0, 0);
    board.position.y = 0.05;

    clearObjects();

    for (let i = 0; i < 8; i++) {
      spawnRow(24 + i * 19);
    }
  }

  function startGame() {
    resetGame();
    running = true;
    speed = 15;

    if (startButton) startButton.textContent = "REINICIAR";
    if (message) message.textContent = "¡A TODA VELOCIDAD!";
  }

  function endGame() {
    running = false;
    if (message) {
      message.textContent = "¡FIN DE LA PARTIDA! PUNTOS: " + score;
    }
    if (startButton) startButton.textContent = "VOLVER A JUGAR";
  }

  function moveLeft() {
    if (!running) return;
    lane = Math.max(0, lane - 1);
    targetX = lanes[lane];
  }

  function moveRight() {
    if (!running) return;
    lane = Math.min(2, lane + 1);
    targetX = lanes[lane];
  }

  function jump() {
    if (!running || jumpHeight > 0.05) return;
    jumpVelocity = 9;
  }

  if (startButton) {
    startButton.addEventListener("click", startGame);
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (["arrowleft", "arrowright", "arrowup", " "].includes(key)) {
      event.preventDefault();
    }

    if (key === "arrowleft" || key === "a") moveLeft();
    if (key === "arrowright" || key === "d") moveRight();
    if (key === " " || key === "arrowup") jump();
  });

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

  // --------------------------------------------------
  // ACTUALIZACIÓN DEL MUNDO
  // --------------------------------------------------

  function update(delta) {
    if (!running) return;

    const dt = Math.min(delta, 0.04);

    distance += speed * dt;
    speed = Math.min(24, speed + dt * 0.12);

    // Pista y canales de lava
    for (const segment of trackSegments) {
      segment.position.z -= speed * dt;

      if (segment.position.z < -trackLength) {
        segment.position.z += trackLength * segmentCount;
      }
    }

    // Paredes y techo de la caverna
    for (const segment of caveSegments) {
      segment.position.z -= speed * dt;

      if (segment.position.z < -trackLength) {
        segment.position.z += trackLength * segmentCount;
      }
    }

    // Movimiento de luces de lava
    for (const light of caveLights) {
      light.position.z -= speed * dt;
      if (light.position.z < -18) {
        light.position.z += 150;
      }
    }

    // Cambio de carril
    player.position.x +=
      (targetX - player.position.x) * Math.min(1, dt * 10);

    // Salto
    jumpVelocity -= 22 * dt;
    jumpHeight += jumpVelocity * dt;

    if (jumpHeight < 0) {
      jumpHeight = 0;
      jumpVelocity = 0;
    }

    player.position.y = 0.2 + jumpHeight;

    // Inclinación y animación
    player.rotation.z +=
      ((targetX - player.position.x) * -0.09 - player.rotation.z) *
      Math.min(1, dt * 8);

    const now = performance.now();
    const bob = Math.sin(now * 0.008) * 0.035;

    head.rotation.z = Math.sin(now * 0.003) * 0.025;
    board.position.y = 0.05 + bob;
    board.rotation.z = player.rotation.z * 0.6;

    // Movimiento de objetos y colisiones
    for (const item of objects) {
      if (!item.active) continue;

      item.mesh.position.z -= speed * dt;

      if (item.type === "coin") {
        item.mesh.rotation.y += dt * 1.5;
      }

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

    // Eliminar objetos recogidos y generar nuevas filas
    for (let i = objects.length - 1; i >= 0; i--) {
      if (!objects[i].active) objects.splice(i, 1);
    }

    if (distance >= nextSpawn) {
      spawnRow(155);
      nextSpawn += 19;
    }
  }

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

  // Pantalla de carga
  if (progress) progress.style.width = "100%";

  setTimeout(() => {
    if (loading) loading.classList.add("hidden");
    if (message) message.textContent = "PREPARADO PARA CORRER";
  }, 900);

  resetGame();
})();
