
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

  // --------------------------------------------------
  // AUTOMÓVIL DEPORTIVO 3D
  // --------------------------------------------------

  const player = new B.TransformNode("PlayerCar", scene);
  player.position.set(0, 0.2, 0);

  camera.lockedTarget = player;

  let carRoot = null;
  let carLoaded = false;

  async function loadSportsCar() {
    try {
      if (progress) progress.style.width = "25%";
      if (message) message.textContent = "CARGANDO AUTOMÓVIL 3D...";

      const result = await B.SceneLoader.ImportMeshAsync(
        "",
        "assets/models/",
        "1990s-sports-car.glb",
        scene
      );

      carRoot = result.meshes[0];

      if (!carRoot) {
        throw new Error("No se encontró el modelo principal del automóvil");
      }

      carRoot.parent = player;

      // Medir el modelo original
      scene.render();
      carRoot.computeWorldMatrix(true);

      let minX = Infinity;
      let maxX = -Infinity;

      for (const mesh of result.meshes) {
        if (!mesh.getBoundingInfo || mesh === carRoot) continue;

        mesh.computeWorldMatrix(true);

        const bounds = mesh.getBoundingInfo().boundingBox;
        minX = Math.min(minX, bounds.minimumWorld.x);
        maxX = Math.max(maxX, bounds.maximumWorld.x);
      }

      // Ajustar el ancho del vehículo a la pista
      const originalWidth = maxX - minX;

      if (Number.isFinite(originalWidth) && originalWidth > 0) {
        const scale = 2.8 / originalWidth;
        carRoot.scaling.setAll(scale);
      }

      // Colocar el vehículo sobre la superficie
      scene.render();
      carRoot.computeWorldMatrix(true);

      let lowestY = Infinity;

      for (const mesh of result.meshes) {
        if (!mesh.getBoundingInfo || mesh === carRoot) continue;

        mesh.computeWorldMatrix(true);

        const bounds = mesh.getBoundingInfo().boundingBox;
        lowestY = Math.min(lowestY, bounds.minimumWorld.y);
      }

      if (Number.isFinite(lowestY)) {
        carRoot.position.y += player.position.y - lowestY + 0.04;
      }

      carLoaded = true;

      if (progress) progress.style.width = "100%";
      if (message) message.textContent = "PREPARADO PARA CORRER";

      if (loading) loading.classList.add("hidden");

    } catch (error) {
      console.error("Error cargando el automóvil 3D:", error);

      if (message) {
        message.textContent = "ERROR AL CARGAR EL AUTOMÓVIL";
      }

      if (progress) progress.style.width = "100%";
    }
  }

  loadSportsCar();


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

if (carRoot) {
  carRoot.rotation.set(0, 0, 0);
}

    clearObjects();

    for (let i = 0; i < 8; i++) {
      spawnRow(24 + i * 19);
    }
  }

function startGame() {
  if (!carLoaded) {
    if (message) message.textContent = "CARGANDO AUTOMÓVIL...";
    return;
  }

  resetGame();
  running = true;
  speed = 15;

  if (startButton) startButton.textContent = "REINICIAR";
  if (message) message.textContent = "¡A TODA VELOCIDAD!";
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
