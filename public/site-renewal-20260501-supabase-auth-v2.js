(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const fillBirthSelects = () => {
    const year = document.querySelector('select[name="birthYear"]');
    const month = document.querySelector('select[name="birthMonth"]');
    const date = document.querySelector('select[name="birthDate"]');
    const currentYear = new Date().getFullYear();

    if (year && year.options.length === 1) {
      for (let value = currentYear; value >= currentYear - 100; value -= 1) {
        year.add(new Option(String(value), String(value)));
      }
    }

    if (month && month.options.length === 1) {
      for (let value = 1; value <= 12; value += 1) {
        const label = String(value).padStart(2, "0");
        month.add(new Option(label, label));
      }
    }

    if (date && date.options.length === 1) {
      for (let value = 1; value <= 31; value += 1) {
        const label = String(value).padStart(2, "0");
        date.add(new Option(label, label));
      }
    }
  };

  const setupBusinessFields = () => {
    document.querySelectorAll("[data-numeric]").forEach((input) => {
      input.inputMode = "numeric";
      input.pattern = "[0-9]*";
      input.addEventListener("input", () => {
        const max = Number(input.maxLength) || 99;
        input.value = core.onlyDigits(input.value).slice(0, max);
      });
    });

    document.querySelectorAll("[data-biz-select]").forEach((select) => {
      const form = select.closest("form");
      const row = form?.querySelector("[data-biznum-row]");
      const inputs = row ? Array.from(row.querySelectorAll("input")) : [];

      const sync = () => {
        const isBusiness = select.value === "사업자" || select.value.includes("사업자");
        if (row) row.hidden = !isBusiness;
        inputs.forEach((input) => {
          input.disabled = !isBusiness;
          if (!isBusiness) input.value = "";
        });
      };

      select.addEventListener("change", sync);
      sync();
    });

    document.querySelectorAll(".biznum-grid input, .auth-biznum input").forEach((input, index, inputs) => {
      input.addEventListener("input", () => {
        if (input.value.length === Number(input.maxLength) && inputs[index + 1]) inputs[index + 1].focus();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && inputs[index - 1]) inputs[index - 1].focus();
      });
    });
  };

  const authErrorMessage = (error) => {
    const code = error?.code || error?.name || "";
    const message = error?.message || "";
    if (message.includes("Invalid login credentials")) return "아이디 또는 비밀번호를 확인해주세요.";
    if (message.includes("already registered")) return "이미 가입된 아이디입니다.";
    if (message.includes("Password")) return "비밀번호는 6자리 이상 입력해주세요.";
    if (code || message) return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    return "처리 중 오류가 발생했습니다.";
  };

  const pendingProfileKey = (userId) => `taxcookPendingProfile:${userId}`;

  const profileFromForm = ({ userId, name, phone, birthYear, birthMonth, birthDate, businessType, bizNumber }) => ({
    user_id: userId,
    name,
    phone,
    birth: `${birthYear}-${birthMonth}-${birthDate}`,
    business_type: businessType,
    biz_number: businessType.includes("사업자") ? bizNumber : "",
    role: "customer"
  });

  const savePendingProfile = (profile) => {
    localStorage.setItem(pendingProfileKey(profile.user_id), JSON.stringify(profile));
  };

  const readPendingProfile = (userId) => {
    try {
      return JSON.parse(localStorage.getItem(pendingProfileKey(userId)) || "null");
    } catch (error) {
      return null;
    }
  };

  const clearPendingProfile = (userId) => {
    localStorage.removeItem(pendingProfileKey(userId));
  };

  const ensureProfile = async (supabase, user, profile) => {
    if (!user || !profile) return;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      ...profile
    });
    if (error) throw error;
    clearPendingProfile(profile.user_id);
  };

  const signupForm = document.querySelector("[data-signup-form]");
  const loginForm = document.querySelector("[data-login-form]");

  fillBirthSelects();
  setupBusinessFields();

  signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = signupForm.querySelector('button[type="submit"]');
    const data = new FormData(signupForm);
    const userId = String(data.get("userId") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");
    const name = String(data.get("name") || "").trim();
    const phone = core.onlyDigits(data.get("phone"));
    const birthYear = String(data.get("birthYear") || "");
    const birthMonth = String(data.get("birthMonth") || "");
    const birthDate = String(data.get("birthDate") || "");
    const businessType = String(data.get("businessType") || "");
    const bizNumber = ["biznum1", "biznum2", "biznum3"].map((key) => core.onlyDigits(data.get(key))).join("");

    if (!core.isValidUserId(userId)) return core.showMessage("[data-auth-message]", "아이디는 영문 소문자, 숫자, 점, 밑줄, 하이픈으로 4~30자리 입력해주세요.");
    if (password.length < 6) return core.showMessage("[data-auth-message]", "비밀번호는 6자리 이상 입력해주세요.");
    if (password !== passwordConfirm) return core.showMessage("[data-auth-message]", "비밀번호 확인이 일치하지 않습니다.");
    if (!name) return core.showMessage("[data-auth-message]", "성명을 입력해주세요.");
    if (!/^\d{10,11}$/.test(phone)) return core.showMessage("[data-auth-message]", "휴대폰번호는 숫자만 10~11자리로 입력해주세요.");
    if (!birthYear || !birthMonth || !birthDate) return core.showMessage("[data-auth-message]", "생년월일을 선택해주세요.");
    if (!businessType) return core.showMessage("[data-auth-message]", "사업자구분을 선택해주세요.");
    if (businessType.includes("사업자") && !/^\d{10}$/.test(bizNumber)) return core.showMessage("[data-auth-message]", "사업자번호를 정확히 입력해주세요.");

    const profile = profileFromForm({ userId, name, phone, birthYear, birthMonth, birthDate, businessType, bizNumber });
    savePendingProfile(profile);
    core.setBusy(button, true, "가입 중...");

    try {
      const supabase = core.getClient();
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: core.userIdToEmail(userId),
        password,
        options: {
          data: {
            user_id: userId,
            name,
            phone,
            birth: profile.birth,
            business_type: profile.business_type,
            biz_number: profile.biz_number
          }
        }
      });
      if (signupError) throw signupError;

      let user = authData.user;
      if (!user) throw new Error("회원가입 정보를 확인할 수 없습니다.");

      if (!authData.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: core.userIdToEmail(userId),
          password
        });
        if (signInError) throw signInError;
        user = signInData.user || user;
      }

      await ensureProfile(supabase, user, profile);

      core.showMessage("[data-auth-message]", "회원가입이 완료되었습니다. My 택스쿡으로 이동합니다.", "success");
      window.setTimeout(() => {
        window.location.href = "mypage.html";
      }, 700);
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("already registered") || message.includes("User already registered")) {
        core.showMessage("[data-auth-message]", "이미 가입된 아이디입니다. 로그인하면 회원정보를 이어서 정리합니다.", "error");
      } else {
        core.showMessage("[data-auth-message]", authErrorMessage(error));
      }
    } finally {
      core.setBusy(button, false);
    }
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = loginForm.querySelector('button[type="submit"]');
    const data = new FormData(loginForm);
    const userId = String(data.get("userId") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");

    if (!core.isValidUserId(userId)) return core.showMessage("[data-auth-message]", "아이디를 확인해주세요.");
    if (!password) return core.showMessage("[data-auth-message]", "비밀번호를 입력해주세요.");

    core.setBusy(button, true, "로그인 중...");

    try {
      const supabase = core.getClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: core.userIdToEmail(userId),
        password
      });
      if (error) throw error;

      const pendingProfile = readPendingProfile(userId);
      if (pendingProfile && authData.user) {
        await ensureProfile(supabase, authData.user, pendingProfile);
      }

      core.showMessage("[data-auth-message]", "로그인되었습니다. My 택스쿡으로 이동합니다.", "success");
      window.setTimeout(() => {
        window.location.href = "mypage.html";
      }, 500);
    } catch (error) {
      core.showMessage("[data-auth-message]", authErrorMessage(error));
    } finally {
      core.setBusy(button, false);
    }
  });
})();
