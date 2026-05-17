
  (function () {
    const FONT_SCALE_KEY = 'home-font-scale';
    const MIN_SCALE = 90;
    const MAX_SCALE = 120;
    const STEP = 5;
    const DEFAULT_SCALE = 100;

    function applyScale(scale) {
      document.documentElement.style.fontSize = `${scale}%`;
      localStorage.setItem(FONT_SCALE_KEY, String(scale));
    }

    window.adjustHomeFontSize = function (action) {
      let current = Number.parseInt(localStorage.getItem(FONT_SCALE_KEY) || String(DEFAULT_SCALE), 10);
      if (Number.isNaN(current)) current = DEFAULT_SCALE;

      if (action === 'inc') current = Math.min(MAX_SCALE, current + STEP);
      if (action === 'dec') current = Math.max(MIN_SCALE, current - STEP);
      if (action === 'reset') current = DEFAULT_SCALE;

      applyScale(current);
    };

    document.addEventListener('DOMContentLoaded', function () {
      const saved = Number.parseInt(localStorage.getItem(FONT_SCALE_KEY) || String(DEFAULT_SCALE), 10);
      if (!Number.isNaN(saved)) applyScale(saved);
    });
  })();
