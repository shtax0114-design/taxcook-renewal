document.querySelectorAll(".hero-actions a").forEach((button) => {
  const press = () => {
    button.classList.add("is-pressed");
    window.setTimeout(() => {
      button.classList.remove("is-pressed");
    }, 220);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") press();
  });
});
