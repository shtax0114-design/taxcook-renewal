document.querySelectorAll(".services .svc-card").forEach((card) => {
  const press = () => {
    card.classList.add("is-pressed");
    window.setTimeout(() => {
      card.classList.remove("is-pressed");
    }, 220);
  };

  card.addEventListener("pointerdown", press);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") press();
  });
});
