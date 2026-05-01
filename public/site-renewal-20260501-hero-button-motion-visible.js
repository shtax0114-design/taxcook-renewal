const heroActions = document.querySelector(".hero-actions");

if (heroActions) {
  const showHeroActions = () => {
    window.setTimeout(() => {
      heroActions.classList.add("motion-visible");
    }, 500);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          showHeroActions();
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(heroActions);
  } else {
    showHeroActions();
  }
}
