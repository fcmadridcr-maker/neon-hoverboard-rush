
(function () {
  "use strict";

  const STORAGE_KEY = "neon-hoverboard-rush-v1";

  const DEFAULT_STATE = {
    theme: "dark",
    points: 0,
    level: 1,
    bestScore: 0,
    totalGames: 0,
    totalCoins: 0,
    lastClaimAt: 0,
    faucetClaimsToday: 0,
    faucetDate: new Date().toISOString().slice(0, 10),
    streak: 1,
    soundEnabled: true,
    musicEnabled: true,
    createdAt: Date.now()
  };

  function cloneDefaults() {
    return { ...DEFAULT_STATE };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return cloneDefaults();
      }

      const parsed = JSON.parse(saved);

      if (!parsed || typeof parsed !== "object") {
        return cloneDefaults();
      }

      return {
        ...cloneDefaults(),
        ...parsed,
        theme: parsed.theme === "light" ? "light" : "dark"
      };
    } catch (error) {
      console.warn("No se pudieron cargar los datos:", error);
      return cloneDefaults();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn("No se pudieron guardar los datos:", error);
      return false;
    }
  }

  function getState() {
    return { ...state };
  }

  function updateState(changes) {
    if (!changes || typeof changes !== "object") {
      return getState();
    }

    state = {
      ...state,
      ...changes
    };

    saveState();
    applyTheme();

    return getState();
  }

  function getTheme() {
    return state.theme;
  }

  function setTheme(theme) {
    state.theme = theme === "light" ? "light" : "dark";
    saveState();
    applyTheme();

    return state.theme;
  }

  function applyTheme() {
    if (!document.body) return;

    document.body.dataset.theme = state.theme;
  }

  function getPoints() {
    return Number(state.points) || 0;
  }

  function addPoints(amount) {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return getPoints();
    }

    state.points = getPoints() + value;
    saveState();

    return state.points;
  }

  function resetProgress() {
    const currentTheme = state.theme;
    state = cloneDefaults();
    state.theme = currentTheme;
    saveState();
    applyTheme();

    return getState();
  }

  function initialize() {
    applyTheme();
    saveState();
  }

  window.NHRStorage = {
    getState,
    updateState,
    getTheme,
    setTheme,
    getPoints,
    addPoints,
    resetProgress,
    initialize
  };

  initialize();
})();
