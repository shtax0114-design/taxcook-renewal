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

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

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
const vatPeriodOptions = ["1기확정(1~6월,7/25신고)", "2기확정(7~12월, 익년1/25신고)", "간이과세 (01~12월, 익년1/25신고)"];

const showFormAlert = ({ title, message }) => {
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
    alert.querySelector("button").addEventListener("click", () => {
      alert.hidden = true;
    });
    alert.addEventListener("click", (event) => {
      if (event.target === alert) alert.hidden = true;
    });
  }

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
    return { inPeriod: true, year: String(year - 1), period: "2기확정(7~12월, 익년1/25신고)" };
  }
  if (now >= firstStart && now <= firstEnd) {
    return { inPeriod: true, year: String(year), period: "1기확정(1~6월,7/25신고)" };
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
          message: "*해당 부가세 신고기간 아래에 안내드립니다.<br>( 1기확정 : 7/1~ 7/25 , 2기확정 : 익년 1/1 ~ 1/25 )<br>* 위 신고기간 참고 후 기간에 맞게 신청 부탁드립니다.<br>* 이 외의 기간에는 기한 후 신고로<br>접수 해주시길 바랍니다."
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
});
