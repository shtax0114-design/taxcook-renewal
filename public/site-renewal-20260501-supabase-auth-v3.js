(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const pendingProfileKey = (userId) => `taxcookPendingProfile:${userId}`;

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

  const setupInputs = () => {
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
        const isBusiness = select.value === "사업자";
        if (row) row.hidden = !isBusiness;
        inputs.forEach((input) => {
          input.disabled = !isBusiness;
          if (!isBusiness) input.value = "";
        });
      };

      select.addEventListener("change", sync);
      sync();
    });
  };

  const authErrorMessage = (error) => {
    const message = String(error?.message || "");
    if (message.includes("Invalid login credentials")) return "아이디 또는 비밀번호를 확인해주세요.";
    if (message.includes("already registered") || message.includes("User already registered")) return "이미 가입된 아이디입니다.";
    if (message.includes("Password")) return "비밀번호는 6자리 이상 입력해주세요.";
    if (message.includes("row-level security")) return "회원 정보 저장 권한 설정을 확인해야 합니다.";
    return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  };

  const makeProfile = (data) => {
    const userId = String(data.get("userId") || "").trim().toLowerCase();
    const birthYear = String(data.get("birthYear") || "");
    const birthMonth = String(data.get("birthMonth") || "");
    const birthDate = String(data.get("birthDate") || "");
    const businessType = String(data.get("businessType") || "");
    const bizNumber = ["biznum1", "biznum2", "biznum3"].map((key) => core.onlyDigits(data.get(key))).join("");

    return {
      user_id: userId,
      name: String(data.get("name") || "").trim(),
      phone: core.onlyDigits(data.get("phone")),
      birth: birthYear && birthMonth && birthDate ? `${birthYear}-${birthMonth}-${birthDate}` : "",
      business_type: businessType,
      biz_number: businessType === "사업자" ? bizNumber : "",
      role: "customer"
    };
  };

  const ensureProfile = async (user, profile) => {
    if (!user || !profile) return;
    const { error } = await core.getClient().from("profiles").upsert({
      id: user.id,
      ...profile
    });
    if (error) throw error;
    clearPendingProfile(profile.user_id);
  };

  const validateProfile = (profile, password, passwordConfirm) => {
    if (!core.isValidUserId(profile.user_id)) return "아이디는 영문 소문자, 숫자, 점, 밑줄, 하이픈으로 4~30자리 입력해주세요.";
    if (password.length < 6) return "비밀번호는 6자리 이상 입력해주세요.";
    if (password !== passwordConfirm) return "비밀번호 확인이 일치하지 않습니다.";
    if (!profile.name) return "성명을 입력해주세요.";
    if (!/^\d{10,11}$/.test(profile.phone)) return "휴대폰번호는 숫자만 10~11자리로 입력해주세요.";
    if (!profile.birth) return "생년월일을 선택해주세요.";
    if (!profile.business_type) return "사업자구분을 선택해주세요.";
    if (profile.business_type === "사업자" && !/^\d{10}$/.test(profile.biz_number)) return "사업자번호를 정확히 입력해주세요.";
    return "";
  };

  fillBirthSelects();
  setupInputs();

  document.querySelector("[data-signup-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");
    const profile = makeProfile(data);
    const validation = validateProfile(profile, password, passwordConfirm);

    if (validation) return core.showMessage("[data-auth-message]", validation);
    savePendingProfile(profile);
    core.setBusy(button, true, "가입 중...");

    try {
      const supabase = core.getClient();
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: core.userIdToEmail(profile.user_id),
        password,
        options: {
          data: {
            user_id: profile.user_id,
            name: profile.name,
            phone: profile.phone,
            birth: profile.birth,
            business_type: profile.business_type,
            biz_number: profile.biz_number
          }
        }
      });

      if (signUpError) throw signUpError;
      let user = authData.user;

      if (!authData.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: core.userIdToEmail(profile.user_id),
          password
        });
        if (signInError) throw signInError;
        user = signInData.user || user;
      }

      await ensureProfile(user, profile);
      core.showMessage("[data-auth-message]", "회원가입이 완료되었습니다. My 택스쿡으로 이동합니다.", "success");
      window.setTimeout(() => {
        window.location.href = "mypage.html";
      }, 700);
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("already registered") || message.includes("User already registered")) {
        core.showMessage("[data-auth-message]", "이미 가입된 아이디입니다. 로그인하면 회원정보를 다시 정리합니다.");
      } else {
        core.showMessage("[data-auth-message]", authErrorMessage(error));
      }
    } finally {
      core.setBusy(button, false);
    }
  });

  document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
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
      if (pendingProfile && authData.user) await ensureProfile(authData.user, pendingProfile);

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
