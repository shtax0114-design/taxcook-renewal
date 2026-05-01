const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.dataset.open === "true";
    nav.dataset.open = String(!isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });
}

const onlyDigits = (value) => value.replace(/\D/g, "");
const userIdToEmail = (userId) => `${userId.toLowerCase()}@taxcook.local`;
const profileFallbackKey = (uid) => `taxcookProfile:${uid}`;

const showAuthMessage = (message, type = "error") => {
  const target = document.querySelector("[data-auth-message]");
  if (!target) return;
  target.textContent = message;
  target.dataset.type = type;
  target.hidden = false;
};

const setBusy = (form, busy) => {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = busy;
  button.dataset.originalText ||= button.textContent;
  button.textContent = busy ? "처리 중..." : button.dataset.originalText;
};

const getFirebase = () => {
  if (!window.firebase?.apps?.length) {
    showAuthMessage("Firebase 설정을 불러오지 못했습니다. 배포된 preview 주소에서 다시 시도해주세요.");
    return null;
  }

  return {
    auth: window.firebase.auth(),
    db: window.firebase.firestore?.()
  };
};

const translateAuthError = (error) => {
  const code = error?.code || "";

  if (code === "auth/operation-not-allowed") {
    return "Firebase 콘솔에서 이메일/비밀번호 로그인을 먼저 활성화해주세요.";
  }
  if (code === "auth/email-already-in-use") return "이미 가입된 아이디입니다.";
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "아이디 또는 비밀번호를 확인해주세요.";
  }
  if (code === "auth/network-request-failed") return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  if (code === "auth/weak-password") return "비밀번호는 6자리 이상 입력해주세요.";

  return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
};

const validateUserId = (userId) => /^[a-z0-9._-]{4,30}$/.test(userId);

const setNumericInput = (input) => {
  if (!input) return;
  input.inputMode = "numeric";
  input.pattern = "[0-9]*";
  input.addEventListener("input", () => {
    const max = Number(input.maxLength) || 99;
    input.value = onlyDigits(input.value).slice(0, max);
  });
};

document.querySelectorAll("[data-numeric]").forEach(setNumericInput);

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

document.querySelectorAll(".biznum-grid input").forEach((input, index, inputs) => {
  input.addEventListener("input", () => {
    if (input.value.length === Number(input.maxLength) && inputs[index + 1]) {
      inputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
      inputs[index - 1].focus();
    }
  });
});

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

fillBirthSelects();

const saveProfile = async (db, user, profile) => {
  localStorage.setItem(profileFallbackKey(user.uid), JSON.stringify(profile));

  if (!db) return;

  try {
    await db.collection("members").doc(user.uid).set(
      {
        ...profile,
        uid: user.uid,
        email: user.email,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Profile was saved locally because Firestore is not ready.", error);
  }
};

const signupForm = document.querySelector("[data-signup-form]");

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const services = getFirebase();
    if (!services) return;

    const data = new FormData(signupForm);
    const userId = String(data.get("userId") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");
    const name = String(data.get("name") || "").trim();
    const phone = onlyDigits(String(data.get("phone") || ""));
    const birthYear = String(data.get("birthYear") || "");
    const birthMonth = String(data.get("birthMonth") || "");
    const birthDate = String(data.get("birthDate") || "");
    const businessType = String(data.get("businessType") || "");
    const bizNumber = ["biznum1", "biznum2", "biznum3"].map((key) => String(data.get(key) || "")).join("");

    if (!validateUserId(userId)) return showAuthMessage("아이디는 영문 소문자, 숫자, 점, 밑줄, 하이픈으로 4~30자리 입력해주세요.");
    if (password.length < 6) return showAuthMessage("비밀번호는 6자리 이상 입력해주세요.");
    if (password !== passwordConfirm) return showAuthMessage("비밀번호 확인이 일치하지 않습니다.");
    if (!name) return showAuthMessage("성명을 입력해주세요.");
    if (!/^\d{10,11}$/.test(phone)) return showAuthMessage("휴대폰번호를 숫자만 10~11자리로 입력해주세요.");
    if (!birthYear || !birthMonth || !birthDate) return showAuthMessage("생년월일을 선택해주세요.");
    if (!businessType) return showAuthMessage("사업자구분을 선택해주세요.");
    if (businessType === "사업자" && !/^\d{10}$/.test(bizNumber)) return showAuthMessage("사업자번호를 3자리, 2자리, 5자리로 입력해주세요.");

    setBusy(signupForm, true);

    try {
      const credential = await services.auth.createUserWithEmailAndPassword(userIdToEmail(userId), password);
      const user = credential.user;
      const profile = {
        userId,
        name,
        phone,
        birth: `${birthYear}-${birthMonth}-${birthDate}`,
        businessType,
        bizNumber: businessType === "사업자" ? bizNumber : ""
      };

      await user.updateProfile({ displayName: name });
      await saveProfile(services.db, user, profile);

      showAuthMessage("회원가입이 완료되었습니다. My 택스쿡으로 이동합니다.", "success");
      window.setTimeout(() => {
        window.location.href = "mypage.html";
      }, 700);
    } catch (error) {
      showAuthMessage(translateAuthError(error));
    } finally {
      setBusy(signupForm, false);
    }
  });
}

const loginForm = document.querySelector("[data-login-form]");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const services = getFirebase();
    if (!services) return;

    const data = new FormData(loginForm);
    const userId = String(data.get("userId") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");

    if (!validateUserId(userId)) return showAuthMessage("아이디를 확인해주세요.");
    if (!password) return showAuthMessage("비밀번호를 입력해주세요.");

    setBusy(loginForm, true);

    try {
      await services.auth.signInWithEmailAndPassword(userIdToEmail(userId), password);
      showAuthMessage("로그인되었습니다. My 택스쿡으로 이동합니다.", "success");
      window.setTimeout(() => {
        window.location.href = "mypage.html";
      }, 500);
    } catch (error) {
      showAuthMessage(translateAuthError(error));
    } finally {
      setBusy(loginForm, false);
    }
  });
}
