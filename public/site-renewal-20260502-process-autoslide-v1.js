(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 620px)");
  const grid = document.querySelector("#process .steps-grid");

  if (!grid || reduceMotion.matches) return;

  let cards = Array.from(grid.querySelectorAll(".step-card"));
  let timer = 0;
  let resumeTimer = 0;
  let activeIndex = 0;
  let isUserInteracting = false;

  const getCards = () => {
    cards = Array.from(grid.querySelectorAll(".step-card"));
    return cards;
  };

  const nearestIndex = () => {
    const currentCards = getCards();
    if (!currentCards.length) return 0;

    const gridCenter = grid.scrollLeft + grid.clientWidth / 2;
    let closest = 0;
    let distance = Number.POSITIVE_INFINITY;

    currentCards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const nextDistance = Math.abs(cardCenter - gridCenter);
      if (nextDistance < distance) {
        closest = index;
        distance = nextDistance;
      }
    });

    return closest;
  };

  const goTo = (index) => {
    const currentCards = getCards();
    if (!currentCards.length) return;

    activeIndex = (index + currentCards.length) % currentCards.length;
    currentCards[activeIndex].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  const start = () => {
    stop();
    if (!mobile.matches || document.hidden) return;

    timer = window.setInterval(() => {
      if (isUserInteracting) return;
      activeIndex = nearestIndex();
      goTo(activeIndex + 1);
    }, 3200);
  };

  const pauseThenResume = () => {
    isUserInteracting = true;
    activeIndex = nearestIndex();
    stop();
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      isUserInteracting = false;
      start();
    }, 7000);
  };

  grid.addEventListener("pointerdown", pauseThenResume, { passive: true });
  grid.addEventListener("touchstart", pauseThenResume, { passive: true });
  grid.addEventListener("wheel", pauseThenResume, { passive: true });
  grid.addEventListener(
    "scroll",
    () => {
      if (!mobile.matches) return;
      activeIndex = nearestIndex();
    },
    { passive: true }
  );

  mobile.addEventListener("change", start);
  document.addEventListener("visibilitychange", start);
  window.addEventListener("pageshow", start);

  start();
})();
