(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const loginLinks = Array.from(document.querySelectorAll(".login-link, .mobile-login-cta"));
  if (!loginLinks.length) return;

  const setLoggedOut = () => {
    loginLinks.forEach((link) => {
      link.textContent = "로그인";
      link.href = "login.html";
      link.removeAttribute("data-auth-logout");
    });
  };

  const setLoggedIn = () => {
    loginLinks.forEach((link) => {
      link.textContent = "로그아웃";
      link.href = "#logout";
      link.dataset.authLogout = "true";
    });
  };

  const consumePostLoginReturnTo = (user) => {
    if (!user) return false;
    const returnTo = sessionStorage.getItem("taxcookPostLoginReturnTo");
    if (!returnTo) return false;
    sessionStorage.removeItem("taxcookPostLoginReturnTo");

    try {
      const url = new URL(returnTo, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      const target = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (target && target !== current) {
        window.location.href = target;
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  };

  document.addEventListener("click", async (event) => {
    const link = event.target.closest("[data-auth-logout]");
    if (!link) return;

    event.preventDefault();
    await core.getClient().auth.signOut();
    core.clearSessionProfile?.();
    window.location.href = "login.html";
  });

  core.getSessionUser()
    .then((user) => {
      if (consumePostLoginReturnTo(user)) return;
      if (user) setLoggedIn();
      else setLoggedOut();
    })
    .catch(() => setLoggedOut());
})();
