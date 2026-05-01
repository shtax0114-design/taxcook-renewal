const heroActions = document.querySelector(".hero-actions");

if (heroActions) {
  const showHeroActions = () => {
    heroActions.classList.add("motion-visible");
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
      { threshold: 0.45 }
    );

    observer.observe(heroActions);
  } else {
    showHeroActions();
  }
}
