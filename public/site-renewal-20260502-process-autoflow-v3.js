(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 620px)");
  const grid = document.querySelector("#process .steps-grid");

  if (!grid || reduceMotion.matches) return;

  const originalCards = Array.from(grid.querySelectorAll(".step-card"));
  if (originalCards.length < 2) return;

  let frame = 0;
  let resumeTimer = 0;
  let lastTime = 0;
  let loopWidth = 0;
  let isPaused = false;
  const speed = 54;

  const ensureClones = () => {
    if (grid.querySelector(".is-process-clone")) return;

    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.classList.add("is-process-clone");
      clone.setAttribute("aria-hidden", "true");
      grid.appendChild(clone);
    });
  };

  const removeClones = () => {
    grid.querySelectorAll(".is-process-clone").forEach((clone) => clone.remove());
  };

  const measure = () => {
    ensureClones();
    const firstClone = grid.querySelector(".is-process-clone");
    loopWidth = firstClone ? firstClone.offsetLeft - originalCards[0].offsetLeft : 0;
  };

  const stop = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    grid.classList.remove("is-auto-flowing");
  };

  const tick = (time) => {
    if (!mobile.matches || isPaused || document.hidden) {
      stop();
      return;
    }

    if (!lastTime) lastTime = time;
    const elapsed = Math.min(time - lastTime, 48);
    lastTime = time;

    if (!loopWidth) measure();
    grid.scrollLeft += (speed * elapsed) / 1000;

    if (loopWidth && grid.scrollLeft >= loopWidth) {
      grid.scrollLeft -= loopWidth;
    }

    frame = window.requestAnimationFrame(tick);
  };

  const start = () => {
    stop();
    if (!mobile.matches || document.hidden) {
      removeClones();
      return;
    }

    ensureClones();
    measure();
    grid.classList.add("is-auto-flowing");
    window.setTimeout(() => {
      if (!isPaused && mobile.matches && !document.hidden) {
        frame = window.requestAnimationFrame(tick);
      }
    }, 240);
  };

  const pauseThenResume = () => {
    isPaused = true;
    stop();
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      isPaused = false;
      start();
    }, 7000);
  };

  grid.addEventListener("pointerdown", pauseThenResume, { passive: true });
  grid.addEventListener("touchstart", pauseThenResume, { passive: true });
  grid.addEventListener("wheel", pauseThenResume, { passive: true });
  mobile.addEventListener("change", start);
  document.addEventListener("visibilitychange", start);
  window.addEventListener("resize", measure);
  window.addEventListener("pageshow", start);

  start();
})();
