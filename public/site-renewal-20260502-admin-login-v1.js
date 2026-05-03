(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const showMessage = (message, type = "error") => {
    const target = document.querySelector("[data-admin-login-message]");
    if (!target) return;
    target.textContent = message;
    target.dataset.type = type;
    target.hidden = !message;
  };

  const authErrorMessage = (error) => {
    const message = String(error?.message || "");
    if (message.includes("Invalid login credentials")) return "아이디 또는 비밀번호를 확인해 주세요.";
    if (message.includes("Email not confirmed")) return "이메일 인증 후 로그인해 주세요.";
    return message || "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  };

  const redirectIfAdmin = async () => {
    const user = await core.getSessionUser();
    if (!user) return;
    const profile = await core.getProfile(user);
    if (["admin", "developer"].includes(profile?.role)) {
      window.location.href = "admin.html";
    }
  };

  document.querySelector("[data-admin-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const email = core.normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");

    showMessage("");
    if (!core.isValidEmail(email)) {
      showMessage("아이디는 이메일 형식으로 입력해 주세요.");
      return;
    }
    if (!password) {
      showMessage("비밀번호를 입력해 주세요.");
      return;
    }

    core.setBusy(button, true, "확인 중...");
    try {
      const { data, error } = await core.getClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      core.clearSessionProfile();
      const profile = await core.getProfile(data.user);
      if (!["admin", "developer"].includes(profile?.role)) {
        await core.getClient().auth.signOut();
        core.clearSessionProfile();
        showMessage("관리자 권한이 없는 계정입니다.");
        return;
      }
      showMessage("관리자로 로그인되었습니다.", "success");
      window.setTimeout(() => {
        window.location.href = "admin.html";
      }, 250);
    } catch (error) {
      console.error("TaxCook admin login failed", error);
      showMessage(authErrorMessage(error));
    } finally {
      core.setBusy(button, false);
    }
  });

  redirectIfAdmin();
})();
