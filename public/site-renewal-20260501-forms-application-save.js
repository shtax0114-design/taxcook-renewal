const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.dataset.open === "true";
    nav.dataset.open = String(!isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href");
    const target = id ? document.querySelector(id) : null;
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (nav) nav.dataset.open = "false";
    if (menuButton) menuButton.setAttribute("aria-expanded", "false");
  });
});

const observer = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    )
  : null;

document.querySelectorAll(".reveal").forEach((element) => {
  if (observer) observer.observe(element);
  else element.classList.add("visible");
});

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const target = formData.get("service");
    if (typeof target === "string" && target.startsWith("https://tax-cook.com/")) {
      window.location.href = target;
    }
  });
}

const typingText = document.querySelector("[data-text]");

if (typingText) {
  const text = typingText.dataset.text || typingText.textContent || "";
  typingText.textContent = "";

  Array.from(text).forEach((character, index) => {
    window.setTimeout(() => {
      typingText.textContent += character;
    }, 120 + index * 95);
  });
}

const appStoreKey = "taxcookPreviewApplications";
const profileFallbackKey = (uid) => `taxcookProfile:${uid}`;

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getUserId = (user) => (user?.email || "").split("@")[0] || "";

const yearOptions = (includeCurrent = false) => {
  const options = [];
  let start = new Date().getFullYear() - 1;
  if (includeCurrent) start += 1;
  for (let year = start; year > start - 100; year -= 1) {
    options.push(String(year));
  }
  return options;
};

const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const dateOptions = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const vatPeriodOptions = ["1기확정 (1~6월, 7/25 신고)", "2기확정 (7~12월, 다음년 1/25 신고)", "간이과세 (01~12월, 다음년 1/25 신고)"];

const showFormAlert = ({ title, message, onClose }) => {
  let alert = document.querySelector("[data-form-alert]");
  if (!alert) {
    alert = document.createElement("div");
    alert.className = "form-alert";
    alert.dataset.formAlert = "true";
    alert.hidden = true;
    alert.innerHTML = `
      <div class="form-alert-dialog" role="dialog" aria-modal="true" aria-labelledby="form-alert-title">
        <h3 id="form-alert-title"></h3>
        <p></p>
        <button type="button">확인</button>
      </div>
    `;
    document.body.appendChild(alert);
  }

  const close = () => {
    alert.hidden = true;
    alert.dataset.hasCloseAction = "";
    if (typeof onClose === "function") onClose();
  };

  alert.querySelector("button").onclick = close;
  alert.onclick = (event) => {
    if (event.target === alert) close();
  };
  alert.querySelector("h3").textContent = title;
  alert.querySelector("p").innerHTML = message;
  alert.hidden = false;
};

const getVatRegularInfo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const firstStart = new Date(year, 6, 1);
  firstStart.setDate(firstStart.getDate() - 15);
  const firstEnd = new Date(year, 6, 25);
  firstEnd.setHours(firstEnd.getHours() + 9);
  const secondStart = new Date(year, 0, 1);
  secondStart.setDate(secondStart.getDate() - 15);
  const secondEnd = new Date(year, 0, 25);
  secondEnd.setHours(secondEnd.getHours() + 9);

  if (now >= secondStart && now <= secondEnd) {
    return { inPeriod: true, year: String(year - 1), period: "2기확정 (7~12월, 다음년 1/25 신고)" };
  }
  if (now >= firstStart && now <= firstEnd) {
    return { inPeriod: true, year: String(year), period: "1기확정 (1~6월, 7/25 신고)" };
  }
  return { inPeriod: false };
};

const fillSelect = (select, values) => {
  if (!select || select.dataset.filled === "true") return;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.dataset.filled = "true";
};

const setDisabled = (elements, disabled) => {
  elements.forEach((element) => {
    if (!element) return;
    element.disabled = disabled;
    if (disabled) element.value = "";
  });
};

const getFirebaseServices = () => {
  if (!window.firebase?.apps?.length) return null;
  return {
    auth: window.firebase.auth(),
    db: window.firebase.firestore?.()
  };
};

const readCurrentProfile = async (db, user) => {
  const fallback = readJson(profileFallbackKey(user.uid), {});

  if (!db) return fallback;

  try {
    const snapshot = await db.collection("members").doc(user.uid).get();
    return {
      ...fallback,
      ...(snapshot.exists ? snapshot.data() : {})
    };
  } catch (error) {
    console.warn("Profile fallback was used because Firestore is not ready.", error);
    return fallback;
  }
};

const getField = (form, name) => String(new FormData(form).get(name) || "").trim();

const getBirth = (form) => {
  const year = getField(form, "birthYear");
  const month = getField(form, "birthMonth");
  const date = getField(form, "birthDate");
  return year && month && date ? `${year}-${month}-${date}` : "";
};

const getBizNumber = (form) => {
  return ["biznum1", "biznum2", "biznum3"].map((name) => getField(form, name)).filter(Boolean).join("-");
};

const getReportPeriod = (form, formType) => {
  const regularCheck = form.querySelector("[data-regular-check]");
  const lateCheck = form.querySelector("[data-late-check]");
  const regularYear = getField(form, "etc1");
  const regularPeriod = getField(form, "etc2");
  const lateYear = getField(form, "etc3");
  const latePeriod = getField(form, "etc4");

  if (regularCheck?.checked) {
    if (formType === "vatax") return [regularYear, regularPeriod, "정기 신고"].filter(Boolean).join(" ");
    return [regularYear, "귀속 정기 신고"].filter(Boolean).join(" ");
  }

  if (lateCheck?.checked) {
    if (formType === "vatax") return [lateYear, latePeriod, "기한후 신고"].filter(Boolean).join(" ");
    return [lateYear, "귀속 기한후 신고"].filter(Boolean).join(" ");
  }

  return "";
};

const validateApplication = (application) => {
  if (!application.customerName) return "성명을 입력해 주세요.";
  if (!application.phone) return "휴대폰번호를 입력해 주세요.";
  if (!application.birth) return "생년월일을 선택해 주세요.";
  if (!application.businessType) return "사업자구분을 선택해 주세요.";
  if (!application.period) return "신고 구분과 귀속 기간을 선택해 주세요.";
  return "";
};

const saveLocalApplication = (application) => {
  const existing = readJson(appStoreKey, []);
  writeJson(appStoreKey, [application, ...existing]);
};

const buildApplication = (form, formType, user) => {
  const now = new Date().toISOString();
  const type = formType === "vatax" ? "부가가치세" : "종합소득세";

  return {
    id: `${formType.toUpperCase()}-${Date.now()}`,
    uid: user.uid,
    loginId: getUserId(user),
    service: formType,
    type,
    customerName: getField(form, "name"),
    phone: getField(form, "phone"),
    birth: getBirth(form),
    company: getField(form, "company"),
    businessType: getField(form, "biz"),
    bizNumber: getBizNumber(form),
    coupon: getField(form, "coupon"),
    period: getReportPeriod(form, formType),
    requestedAt: now,
    reportedAt: "",
    paymentStatus: "결제대기",
    paymentSummary: formType === "gitax" ? "계약금 결제 대기" : "신고유형 결제 대기",
    processStatus: formType === "gitax" ? "신청 접수 및 계약금 결제" : "신청 접수",
    customerMemo: "신청이 접수되었습니다. 담당자가 확인 후 안내드리겠습니다.",
    createdAt: now,
    updatedAt: now
  };
};

document.querySelectorAll(".renewal-apply-form").forEach((form) => {
  const formType = form.dataset.formType;

  fillSelect(form.querySelector('select[name="birthYear"]'), yearOptions());
  fillSelect(form.querySelector('select[name="birthMonth"]'), monthOptions);
  fillSelect(form.querySelector('select[name="birthDate"]'), dateOptions);

  const regularYear = form.querySelector("[data-regular-year]");
  const lateYear = form.querySelector("[data-late-year]");
  fillSelect(regularYear, yearOptions(true));
  fillSelect(lateYear, yearOptions(true));

  if (formType === "vatax") {
    fillSelect(form.querySelector("[data-regular-period]"), vatPeriodOptions);
    fillSelect(form.querySelector("[data-late-period]"), vatPeriodOptions);
  }

  const bizSelect = form.querySelector("[data-biz-select]");
  const biznumRow = form.querySelector("[data-biznum-row]");
  const syncBiznum = () => {
    if (!bizSelect || !biznumRow) return;
    const show = ["사업자", "간이사업자", "일반사업자"].includes(bizSelect.value);
    biznumRow.hidden = !show;
    biznumRow.querySelectorAll("input").forEach((input) => {
      input.disabled = !show;
      if (!show) input.value = "";
    });
  };
  if (bizSelect) {
    bizSelect.addEventListener("change", syncBiznum);
    syncBiznum();
  }

  const regularCheck = form.querySelector("[data-regular-check]");
  const lateCheck = form.querySelector("[data-late-check]");
  const regularControls = [form.querySelector("[data-regular-year]"), form.querySelector("[data-regular-period]")];
  const lateControls = [form.querySelector("[data-late-year]"), form.querySelector("[data-late-period]")];

  const syncPeriod = (source) => {
    if (formType === "vatax" && source === regularCheck && regularCheck?.checked) {
      const vatInfo = getVatRegularInfo();
      if (!vatInfo.inPeriod) {
        regularCheck.checked = false;
        setDisabled(regularControls, true);
        showFormAlert({
          title: "부가세 신고기간 안내",
          message: "* 해당 부가세 신고기간 아래에 안내드립니다.<br>( 1기확정 : 7/1~ 7/25 , 2기확정 : 다음년 1/1 ~ 1/25 )<br>* 신고기간을 참고 후 기간에 맞게 신청 부탁드립니다.<br>* 위의 기간 외에는 기한후 신고로 접수해주시기 바랍니다."
        });
        return;
      }
    }

    if (source === regularCheck && regularCheck?.checked && lateCheck) lateCheck.checked = false;
    if (source === lateCheck && lateCheck?.checked && regularCheck) regularCheck.checked = false;

    setDisabled(regularControls, !regularCheck?.checked);
    setDisabled(lateControls, !lateCheck?.checked);

    if (formType === "vatax" && regularCheck?.checked) {
      const vatInfo = getVatRegularInfo();
      if (vatInfo.inPeriod) {
        if (regularYear) regularYear.value = vatInfo.year;
        const regularPeriod = form.querySelector("[data-regular-period]");
        if (regularPeriod) regularPeriod.value = vatInfo.period;
      }
    }
    if (formType === "gitax" && regularCheck?.checked && regularYear && !regularYear.value) {
      regularYear.value = String(new Date().getFullYear() - 1);
    }
  };

  if (regularCheck) regularCheck.addEventListener("change", () => syncPeriod(regularCheck));
  if (lateCheck) lateCheck.addEventListener("change", () => syncPeriod(lateCheck));
  syncPeriod(null);

  form.querySelector("[name='sameMember']")?.addEventListener("change", async (event) => {
    if (!event.target.checked) return;
    const services = getFirebaseServices();
    const user = services?.auth.currentUser;
    if (!user) {
      event.target.checked = false;
      showFormAlert({
        title: "로그인이 필요합니다",
        message: "회원 정보와 동일하게 입력하려면 먼저 로그인해 주세요.",
        onClose: () => {
          window.location.href = "login.html";
        }
      });
      return;
    }

    const profile = await readCurrentProfile(services.db, user);
    const setValue = (name, value) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (field && value) field.value = value;
    };
    setValue("name", profile.name || user.displayName || "");
    setValue("phone", profile.phone || "");
    if (profile.businessType && bizSelect) {
      bizSelect.value = profile.businessType;
      syncBiznum();
    }
  });

  form.querySelector(".form-submit-preview")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const services = getFirebaseServices();
    const user = services?.auth.currentUser;

    if (!user) {
      showFormAlert({
        title: "로그인이 필요합니다",
        message: "신청 내역 확인을 위해 로그인 후 신청해 주세요.",
        onClose: () => {
          window.location.href = "login.html";
        }
      });
      return;
    }

    const application = buildApplication(form, formType, user);
    const validationMessage = validateApplication(application);
    if (validationMessage) {
      showFormAlert({ title: "입력 내용을 확인해 주세요", message: validationMessage });
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "신청 저장 중";

    try {
      let savedApplication = application;
      if (services?.db) {
        const payload = {
          ...application,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        delete payload.id;
        const docRef = await services.db.collection("applications").add(payload);
        savedApplication = { ...application, id: docRef.id };
      }

      saveLocalApplication(savedApplication);
      showFormAlert({
        title: "신청이 접수되었습니다",
        message: "마이페이지에서 진행 현황을 확인할 수 있습니다.",
        onClose: () => {
          window.location.href = "mypage.html";
        }
      });
      window.setTimeout(() => {
        window.location.href = "mypage.html";
      }, 900);
    } catch (error) {
      console.error("Application save failed.", error);
      showFormAlert({
        title: "신청 저장에 실패했습니다",
        message: "잠시 후 다시 시도해 주세요. 문제가 계속되면 카톡채널로 문의해 주세요."
      });
      button.disabled = false;
      button.textContent = originalText;
    }
  });
});
