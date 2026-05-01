(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const authErrorMessage = (error) => {
    const message = String(error?.message || "");
    if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호를 확인해주세요.";
    if (message.includes("Email not confirmed")) return "이메일 인증 후 로그인해주세요.";
    if (message.includes("already registered") || message.includes("User already registered")) return "이미 가입된 이메일입니다. 로그인해주세요.";
    if (message.includes("Password")) return "비밀번호는 6자리 이상 입력해주세요.";
    if (message) return message;
    return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  };

  const getRedirectUrl = () => `${window.location.origin}/mypage.html`;

  document.querySelector("[data-signup-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const email = core.normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("passwordConfirm") || "");

    core.hideMessage("[data-auth-message]");

    if (!core.isValidEmail(email)) return core.showMessage("[data-auth-message]", "이메일 주소를 정확히 입력해주세요.");
    if (password.length < 6) return core.showMessage("[data-auth-message]", "비밀번호는 6자리 이상 입력해주세요.");
    if (password !== passwordConfirm) return core.showMessage("[data-auth-message]", "비밀번호 확인이 일치하지 않습니다.");

    core.setBusy(button, true, "가입 중...");

    try {
      const { data, error } = await core.getClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
          data: { email }
        }
      });

      if (error) throw error;

      if (data.session) {
        core.clearSessionProfile();
        window.location.href = "mypage.html";
        return;
      }

      core.showMessage("[data-auth-message]", "인증 메일을 보냈습니다. 이메일 인증 후 로그인해주세요.", "success");
      form.reset();
    } catch (error) {
      console.error("TaxCook signup failed", error);
      core.showMessage("[data-auth-message]", authErrorMessage(error));
    } finally {
      core.setBusy(button, false);
    }
  });

  document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const email = core.normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");

    core.hideMessage("[data-auth-message]");

    if (!core.isValidEmail(email)) return core.showMessage("[data-auth-message]", "이메일 주소를 정확히 입력해주세요.");
    if (!password) return core.showMessage("[data-auth-message]", "비밀번호를 입력해주세요.");

    core.setBusy(button, true, "로그인 중...");

    try {
      const { error } = await core.getClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      core.clearSessionProfile();
      window.location.href = "mypage.html";
    } catch (error) {
      console.error("TaxCook login failed", error);
      core.showMessage("[data-auth-message]", authErrorMessage(error));
    } finally {
      core.setBusy(button, false);
    }
  });
})();
