window.Save = (() => {
  const KEY = 'kawaii_math_save';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return _defaults();
      const data = JSON.parse(raw);
      return {
        worldProgress: data.worldProgress || [0,0,0,0,0],
        levelStars: data.levelStars || {}
      };
    } catch(e) {
      return _defaults();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        worldProgress: state.worldProgress,
        levelStars: state.levelStars || {}
      }));
    } catch(e) {}
  }

  function getBestStars(w, l) {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      return (data.levelStars || {})[`${w}_${l}`] || 0;
    } catch(e) { return 0; }
  }

  function _defaults() {
    return { worldProgress: [0,0,0,0,0], levelStars: {} };
  }

  return { load, save, getBestStars };
})();
