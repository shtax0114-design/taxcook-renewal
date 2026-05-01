const motionObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("tax-page-motion-visible");
          motionObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.14
      }
    )
  : null;

const prepareMotionItem = (item, index = 0) => {
  item.classList.add("tax-page-motion");
  item.style.setProperty("--tax-motion-delay", `${Math.min(index * 0.13, 0.65)}s`);

  if (motionObserver) {
    motionObserver.observe(item);
  } else {
    item.classList.add("tax-page-motion-visible");
  }
};

document
  .querySelectorAll(".sub-hero .deposit-notice, .fee-section .fee-note, .apply-section .apply-box")
  .forEach((item) => prepareMotionItem(item));

document.querySelectorAll(".fee-grid, .sub-grid").forEach((group) => {
  group.querySelectorAll(":scope > article").forEach((item, index) => {
    prepareMotionItem(item, index);
  });
});
