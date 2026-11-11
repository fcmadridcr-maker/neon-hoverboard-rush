
(function () {
  "use strict";

  const storage = window.NHRStorage;
  const gameEngine = window.NHRGame;

  if (!storage || !gameEngine) {
    console.error("No se pudieron cargar los módulos de Neon Hoverboard Rush.");
    return;
  }

  const appHeader = document.getElementById("app-header");
  const mainContent = document.getElementById("main-content");
  const bottomNavigation = document.getElementById("bottom-navigation");

  let currentView = "home";
  let faucetInterval = null;
  let ptcInterval = null;
  let ptcSeconds = 0;
  let ptcActive = false;

  const views = [
    { id: "home", label: "Inicio", icon: "⌂" },
    { id: "faucet", label: "Faucet", icon: "◈" },
    { id: "earn", label: "Earn", icon: "✦" },
    { id: "arcade", label: "Arcade", icon: "▣" },
    { id: "profile", label: "Perfil", icon: "●" }
  ];

  function getState() {
    return storage.getState();
  }

  function formatPoints(value) {
    return Number(value || 0).toLocaleString("es-ES", {
      maximumFractionDigits: 4
    });
  }

  function updateHeader() {
    const state = getState();

    appHeader.innerHTML = `
      <div class="topbar">
        <a class="brand" href="#" data-view="home">
          <span class="brand-symbol">✦</span>
          <span class="brand-name">
            NEON <strong>HOVERBOARD</strong>
            <small>RUSH</small>
          </span>
        </a>

        <div class="header-actions">
          <div class="balance-pill">
            <span>✦</span>
            <strong>${formatPoints(state.points)}</strong>
            <small>PTS</small>
          </div>

          <button class="theme-button" id="theme-toggle" type="button"
            aria-label="Cambiar tema">
            ${state.theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </div>
    `;

    document.getElementById("theme-toggle").addEventListener("click", () => {
      storage.setTheme(getState().theme === "dark" ? "light" : "dark");
      updateHeader();
    });
  }

  function renderNavigation() {
    bottomNavigation.innerHTML = views.map(view => `
      <button class="nav-item ${currentView === view.id ? "active" : ""}"
        type="button" data-view="${view.id}">
        <span class="nav-icon">${view.icon}</span>
        <span>${view.label}</span>
      </button>
    `).join("");
  }

  function navigate(view) {
    if (!views.some(item => item.id === view)) return;

    if (currentView === "arcade" && view !== "arcade") {
      gameEngine.pause();
    }

    currentView = view;
    render();
  }

  function homeView() {
    const state = getState();

    return `
      <section class="view active">
        <div class="hero-panel">
          <div class="hero-copy">
            <span class="eyebrow">BIENVENIDO A TU UNIVERSO</span>
            <h1>Gana. Juega.<br><span>Explora.</span></h1>
            <p>Tu aventura arcade comienza aquí.</p>
            <button class="primary-button" data-view="arcade">
              <span>▶</span> JUGAR AHORA
            </button>
          </div>

          <div class="hero-art">
            <div class="hero-orbit orbit-one"></div>
            <div class="hero-orbit orbit-two"></div>
            <div class="hero-planet">✦</div>
            <div class="hero-rocket">🚀</div>
          </div>
        </div>

        <div class="section-heading">
          <div>
            <span class="eyebrow">TU PROGRESO</span>
            <h2>Resumen de actividad</h2>
          </div>
          <span class="level-badge">NIVEL ${state.level}</span>
        </div>

        <div class="stats-grid">
          <article class="stat-card">
            <span class="stat-icon">✦</span>
            <strong>${formatPoints(state.points)}</strong>
            <small>Puntos acumulados</small>
          </article>

          <article class="stat-card">
            <span class="stat-icon">🏆</span>
            <strong>${formatPoints(state.bestScore)}</strong>
            <small>Mejor puntuación</small>
          </article>

          <article class="stat-card">
            <span class="stat-icon">🎮</span>
            <strong>${state.totalGames}</strong>
            <small>Partidas jugadas</small>
          </article>

          <article class="stat-card">
            <span class="stat-icon">🪙</span>
            <strong>${state.totalCoins}</strong>
            <small>Monedas recogidas</small>
          </article>
        </div>

        <div class="section-heading">
          <div>
            <span class="eyebrow">DESCUBRE</span>
            <h2>Accesos rápidos</h2>
          </div>
        </div>

        <div class="quick-grid">
          <button class="quick-card" data-view="faucet">
            <span>◈</span>
            <strong>Faucet</strong>
            <small>Reclama tus puntos</small>
          </button>

          <button class="quick-card" data-view="earn">
            <span>✦</span>
            <strong>Earn Zone</strong>
            <small>Completa actividades</small>
          </button>

          <button class="quick-card" data-view="arcade">
            <span>▣</span>
            <strong>Arcade</strong>
            <small>Entra en la carrera</small>
          </button>

          <button class="quick-card" data-view="profile">
            <span>◉</span>
            <strong>Mi perfil</strong>
            <small>Revisa tu cuenta</small>
          </button>
        </div>

        <div class="notice-panel">
          <span>ⓘ</span>
          <p>Plataforma en modo demostración. Los puntos se guardan localmente y no representan fondos retirables.</p>
        </div>
      </section>
    `;
  }

  function faucetView() {
    const state = getState();
    const remaining = Math.max(
      0,
      300000 - (Date.now() - Number(state.lastClaimAt || 0))
    );

    return `
      <section class="view active">
        <div class="page-heading">
          <span class="eyebrow">RECOMPENSAS</span>
          <h1>Faucet <span>Zone</span></h1>
          <p>Reclama tu recompensa cada cinco minutos.</p>
        </div>

        <div class="faucet-panel">
          <div class="faucet-symbol">◈</div>
          <span class="eyebrow">RECOMPENSA POR CLAIM</span>
          <div class="faucet-amount">0.0005 <small>PTS</small></div>
          <p>Una pequeña recompensa para continuar tu aventura.</p>

          <div class="countdown" id="faucet-countdown">
            ${formatTime(remaining)}
          </div>

          <button class="primary-button claim-button" id="claim-button"
            ${remaining > 0 ? "disabled" : ""}>
            ${remaining > 0 ? "ESPERA PARA RECLAMAR" : "RECLAMAR AHORA"}
          </button>

          <small class="demo-label">RECOMPENSA DEMOSTRATIVA</small>
        </div>

        <div class="stats-grid">
          <article class="stat-card">
            <strong>${formatPoints(state.points)}</strong>
            <small>Saldo de puntos</small>
          </article>
          <article class="stat-card">
            <strong>${state.faucetClaimsToday || 0}</strong>
            <small>Claims de hoy</small>
          </article>
        </div>
      </section>
    `;
  }

  function earnView() {
    return `
      <section class="view active">
        <div class="page-heading">
          <span class="eyebrow">GANA RECOMPENSAS</span>
          <h1>Earn <span>Zone</span></h1>
          <p>Explora actividades y acumula puntos.</p>
        </div>

        <div class="earn-list">
          <article class="earn-card">
            <div class="earn-icon">🔗</div>
            <div class="earn-info">
              <strong>Shortlinks</strong>
              <p>Completa enlaces de demostración.</p>
              <small>Recompensa de prueba: 25 PTS</small>
            </div>
            <button class="secondary-button" data-demo-reward="25">
              Abrir
            </button>
          </article>

          <article class="earn-card">
            <div class="earn-icon">◉</div>
            <div class="earn-info">
              <strong>PTC Ads</strong>
              <p>Visualiza un anuncio durante unos segundos.</p>
              <small>Recompensa de prueba: 10 PTS</small>
            </div>
            <button class="secondary-button" id="ptc-button">
              Ver anuncio
            </button>
          </article>

          <article class="earn-card">
            <div class="earn-icon">✓</div>
            <div class="earn-info">
              <strong>Tareas diarias</strong>
              <p>Explora las misiones de la plataforma.</p>
              <small>Recompensa de prueba: 15 PTS</small>
            </div>
            <button class="secondary-button" data-demo-reward="15">
              Completar
            </button>
          </article>

          <article class="earn-card">
            <div class="earn-icon">🎬</div>
            <div class="earn-info">
              <strong>Videos</strong>
              <p>Sección preparada para anuncios recompensados.</p>
              <small>Disponible en una próxima versión</small>
            </div>
            <button class="secondary-button" data-coming-soon>
              Explorar
            </button>
          </article>
        </div>

        <div class="notice-panel">
          <span>ⓘ</span>
          <p>Las actividades actuales son simulaciones. No hay proveedores publicitarios conectados.</p>
        </div>
      </section>
    `;
  }

  function arcadeView() {
    return `
      <section class="view active">
        <div class="page-heading">
          <span class="eyebrow">ARCADE EXPERIENCE</span>
          <h1>Neon <span>Rush</span></h1>
          <p>Esquiva obstáculos, recoge monedas y activa el turbo.</p>
        </div>

        <div class="game-stats">
          <div><small>PUNTOS</small><strong id="game-score">0</strong></div>
          <div><small>DISTANCIA</small><strong id="game-distance">0</strong></div>
          <div><small>BATERÍAS</small><strong id="game-batteries">0/5</strong></div>
        </div>

        <div class="game-container">
          <canvas id="game-canvas" aria-label="Juego Neon Hoverboard Rush"></canvas>

          <div class="game-overlay" id="game-overlay">
            <div class="game-overlay-card">
              <span class="eyebrow">PREPÁRATE</span>
              <h2>¡La carrera<br>te espera!</h2>
              <p>Muévete entre carriles y evita los obstáculos.</p>
              <button class="primary-button" id="start-game">
                ▶ INICIAR PARTIDA
              </button>
            </div>
          </div>
        </div>

        <div class="game-controls">
          <button class="control-button" id="move-left">←</button>
          <button class="control-button" id="jump-button">↑ SALTAR</button>
          <button class="control-button" id="move-right">→</button>
        </div>

        <p class="game-hint">PC: usa las flechas o A/D. Móvil: desliza a los lados para cambiar de carril y hacia arriba para saltar.</p>
      </section>
    `;
  }

  function profileView() {
    const state = getState();

    return `
      <section class="view active">
        <div class="page-heading">
          <span class="eyebrow">TU CUENTA</span>
          <h1>Mi <span>Perfil</span></h1>
          <p>Tu espacio personal dentro de Neon Hoverboard Rush.</p>
        </div>

        <div class="profile-card">
          <div class="profile-avatar">N</div>
          <h2>Jugador Neon</h2>
          <p>Explorador espacial</p>
          <span class="level-badge">NIVEL ${state.level}</span>
        </div>

        <div class="stats-grid">
          <article class="stat-card">
            <strong>${formatPoints(state.points)}</strong>
            <small>Puntos</small>
          </article>
          <article class="stat-card">
            <strong>${state.totalGames}</strong>
            <small>Partidas</small>
          </article>
        </div>

        <div class="profile-options">
          <button class="profile-option" id="wallet-button">
            <span>◈</span> Mi billetera <b>›</b>
          </button>
          <button class="profile-option" id="referrals-button">
            <span>♧</span> Referidos <b>›</b>
          </button>
          <button class="profile-option" id="settings-button">
            <span>⚙</span> Configuración <b>›</b>
          </button>
          <button class="profile-option" id="help-button">
            <span>?</span> Ayuda <b>›</b>
          </button>
        </div>
      </section>
    `;
  }

  function formatTime(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function showMessage(title, message) {
    const modal = document.createElement("div");
    modal.className = "message-modal";

    modal.innerHTML = `
      <div class="message-card">
        <span class="eyebrow">NEON HOVERBOARD RUSH</span>
        <h2>${title}</h2>
        <p>${message}</p>
        <button class="primary-button" type="button">ENTENDIDO</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("button").addEventListener("click", () => {
      modal.remove();
    });
  }

  function updateFaucetTimer() {
    const state = getState();
    const remaining = Math.max(
      0,
      300000 - (Date.now() - Number(state.lastClaimAt || 0))
    );

    const counter = document.getElementById("faucet-countdown");
    const button = document.getElementById("claim-button");

    if (!counter || !button) return;

    counter.textContent = formatTime(remaining);
    button.disabled = remaining > 0;
    button.textContent = remaining > 0
      ? "ESPERA PARA RECLAMAR"
      : "RECLAMAR AHORA";
  }

  function claimFaucet() {
    const state = getState();
    const remaining = 300000 - (Date.now() - Number(state.lastClaimAt || 0));

    if (remaining > 0) {
      showMessage("Todavía no", "Espera a que termine el temporizador.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const claims = state.faucetDate === today
      ? Number(state.faucetClaimsToday || 0)
      : 0;

    storage.updateState({
      points: Number(state.points || 0) + 0.0005,
      lastClaimAt: Date.now(),
      faucetDate: today,
      faucetClaimsToday: claims + 1
    });

    updateHeader();
    updateFaucetTimer();
    showMessage("¡Recompensa recibida!", "Has sumado 0.0005 puntos demostrativos.");
  }

  function startPtc() {
    if (ptcActive) return;

    ptcActive = true;
    ptcSeconds = 5;

    const button = document.getElementById("ptc-button");
    if (!button) return;

    button.disabled = true;
    button.textContent = `Espera ${ptcSeconds}s`;

    ptcInterval = setInterval(() => {
      ptcSeconds--;

      const currentButton = document.getElementById("ptc-button");
      if (!currentButton) {
        clearInterval(ptcInterval);
        ptcActive = false;
        return;
      }

      if (ptcSeconds > 0) {
        currentButton.textContent = `Espera ${ptcSeconds}s`;
      } else {
        clearInterval(ptcInterval);
        ptcActive = false;

        const state = getState();
        storage.updateState({ points: Number(state.points || 0) + 10 });

        updateHeader();
        currentButton.disabled = false;
        currentButton.textContent = "Ver anuncio";
        showMessage("¡Actividad completada!", "Has recibido 10 puntos demostrativos.");
      }
    }, 1000);
  }

  function setupGame() {
    const canvas = document.getElementById("game-canvas");
    if (!canvas) return;

    const overlay = document.getElementById("game-overlay");

    gameEngine.init({
      canvas,

      onUpdate(data) {
        const scoreElement = document.getElementById("game-score");
        const distanceElement = document.getElementById("game-distance");
        const batteryElement = document.getElementById("game-batteries");

        if (scoreElement) scoreElement.textContent = data.score;
        if (distanceElement) distanceElement.textContent = data.distance;
        if (batteryElement) batteryElement.textContent = `${data.batteries}/5`;
      },

      onGameOver(data) {
        const state = getState();
        const bestScore = Math.max(Number(state.bestScore || 0), data.score);

        storage.updateState({
          bestScore,
          totalGames: Number(state.totalGames || 0) + 1,
          totalCoins: Number(state.totalCoins || 0) + data.coins
        });

        updateHeader();

        if (overlay) {
          overlay.innerHTML = `
            <div class="game-overlay-card">
              <span class="eyebrow">FIN DE LA PARTIDA</span>
              <h2>¡Buen intento!</h2>
              <p>Puntuación: <strong>${data.score}</strong></p>
              <p>Monedas recogidas: <strong>${data.coins}</strong></p>
              <button class="primary-button" id="restart-game">
                ↻ VOLVER A JUGAR
              </button>
            </div>
          `;

          overlay.classList.remove("hidden");

          document.getElementById("restart-game").addEventListener("click", () => {
            overlay.classList.add("hidden");
            gameEngine.start();
          });
        }
      }
    });

    document.getElementById("start-game").addEventListener("click", () => {
      overlay.classList.add("hidden");
      gameEngine.start();
    });

    document.getElementById("move-left").addEventListener("click", () => {
      gameEngine.moveLeft();
    });

    document.getElementById("move-right").addEventListener("click", () => {
      gameEngine.moveRight();
    });

    document.getElementById("jump-button").addEventListener("click", () => {
      gameEngine.jump();
    });
  }

  function bindActions() {
    document.querySelectorAll("[data-view]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        navigate(button.dataset.view);
      });
    });

    document.getElementById("claim-button")?.addEventListener("click", claimFaucet);
    document.getElementById("ptc-button")?.addEventListener("click", startPtc);

    document.querySelectorAll("[data-demo-reward]").forEach(button => {
      button.addEventListener("click", () => {
        const amount = Number(button.dataset.demoReward);
        const state = getState();

        storage.updateState({
          points: Number(state.points || 0) + amount
        });

        updateHeader();
        showMessage("Actividad demostrativa", `Has recibido ${amount} puntos de prueba.`);
      });
    });

    document.querySelectorAll("[data-coming-soon]").forEach(button => {
      button.addEventListener("click", () => {
        showMessage("Próximamente", "Esta función estará disponible en una próxima versión.");
      });
    });

    document.getElementById("wallet-button")?.addEventListener("click", () => {
      showMessage("Mi billetera", "La conexión de billetera y los retiros se implementarán cuando configuremos el backend seguro.");
    });

    document.getElementById("referrals-button")?.addEventListener("click", () => {
      showMessage("Referidos", "El sistema de invitaciones estará disponible en una próxima versión.");
    });

    document.getElementById("settings-button")?.addEventListener("click", () => {
      showMessage("Configuración", "Puedes cambiar entre el tema oscuro y el tema blanco desde el botón superior.");
    });

    document.getElementById("help-button")?.addEventListener("click", () => {
      showMessage("Ayuda", "Bienvenido a Neon Hoverboard Rush. Explora las secciones y disfruta de la experiencia.");
    });
  }

  function render() {
    updateHeader();

    const content = {
      home: homeView,
      faucet: faucetView,
      earn: earnView,
      arcade: arcadeView,
      profile: profileView
    };

    mainContent.innerHTML = content[currentView]();
    renderNavigation();
    bindActions();

    if (currentView === "faucet") {
      updateFaucetTimer();

      clearInterval(faucetInterval);
      faucetInterval = setInterval(updateFaucetTimer, 1000);
    } else {
      clearInterval(faucetInterval);
    }

    if (currentView === "arcade") {
      setupGame();
    }
  }

  storage.initialize();
  render();

})();
