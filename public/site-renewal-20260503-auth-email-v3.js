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

  const getReturnToPath = () => {
    const fallback = "/mypage.html";
    const value = new URLSearchParams(window.location.search).get("returnTo");
    if (!value) return fallback;

    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return fallback;
      return `${url.pathname}${url.search}${url.hash}` || fallback;
    } catch (error) {
      return fallback;
    }
  };

  const getPostLoginUrl = () => getReturnToPath();
  const getRedirectUrl = () => `${window.location.origin}${getReturnToPath()}`;

  const socialProviderName = {
    kakao: "카카오",
    naver: "네이버",
    google: "구글"
  };

  const socialProviderId = {
    kakao: "kakao",
    naver: "custom:naver",
    google: "google"
  };

  const socialErrorMessage = (provider, error) => {
    const name = socialProviderName[provider] || "간편 인증";
    const message = String(error?.message || "");
    if (message.includes("Unsupported provider") || message.includes("provider is not enabled")) {
      return `${name} 인증은 Supabase Auth Provider 설정을 먼저 켜야 사용할 수 있습니다.`;
    }
    if (message) return message;
    return `${name} 인증을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.`;
  };

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
        window.location.href = getPostLoginUrl();
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
      window.location.href = getPostLoginUrl();
    } catch (error) {
      console.error("TaxCook login failed", error);
      core.showMessage("[data-auth-message]", authErrorMessage(error));
    } finally {
      core.setBusy(button, false);
    }
  });

  document.querySelectorAll("[data-social-login]").forEach((button) => {
    button.addEventListener("click", async () => {
      const provider = button.dataset.socialLogin;
      const label = socialProviderName[provider] || "간편";
      core.hideMessage("[data-auth-message]");
      core.setBusy(button, true, `${label} 연결 중...`);

      try {
        const { data, error } = await core.getClient().auth.signInWithOAuth({
          provider: socialProviderId[provider] || provider,
          options: {
            redirectTo: getRedirectUrl(),
            skipBrowserRedirect: true
          }
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("소셜 로그인 이동 주소를 받지 못했습니다.");
      } catch (error) {
        console.error(`TaxCook ${provider} login failed`, error);
        core.showMessage("[data-auth-message]", socialErrorMessage(provider, error));
        core.setBusy(button, false);
      }
    });
  });
})();
