const taxMotionObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("tax-page-motion-visible");
          taxMotionObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.14
      }
    )
  : null;

const setTaxMotionDelay = (item, index = 0, step = 0.13, max = 0.7) => {
  item.style.setProperty("--tax-motion-delay", `${Math.min(index * step, max)}s`);
};

const revealTaxHero = () => {
  const heroItems = document.querySelectorAll(
    ".sub-hero .section-eyebrow, .sub-hero h1, .sub-hero p:not(.deposit-notice p), .sub-hero .deposit-notice, .sub-hero .apply-shortcut"
  );

  heroItems.forEach((item, index) => {
    item.classList.add("tax-hero-motion");
    setTaxMotionDelay(item, index, 0.16, 0.8);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      heroItems.forEach((item) => item.classList.add("tax-page-motion-visible"));
    });
  });
};

const prepareTaxScrollMotion = (item, index = 0) => {
  item.classList.add("tax-page-motion");
  setTaxMotionDelay(item, index);

  if (taxMotionObserver) {
    taxMotionObserver.observe(item);
  } else {
    item.classList.add("tax-page-motion-visible");
  }
};

revealTaxHero();

document
  .querySelectorAll(".fee-section .fee-note, .apply-section .apply-box")
  .forEach((item) => prepareTaxScrollMotion(item));

document.querySelectorAll(".fee-grid, .sub-grid").forEach((group) => {
  group.querySelectorAll(":scope > article").forEach((item, index) => {
    prepareTaxScrollMotion(item, index);
  });
});
