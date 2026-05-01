(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12 })
    : null;

  document.querySelectorAll(".reveal").forEach((element) => {
    if (observer) observer.observe(element);
    else element.classList.add("visible");
  });

  const showAlert = ({ title, message, onClose }) => {
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
      if (typeof onClose === "function") onClose();
    };

    alert.querySelector("h3").textContent = title;
    alert.querySelector("p").innerHTML = message;
    alert.querySelector("button").onclick = close;
    alert.onclick = (event) => {
      if (event.target === alert) close();
    };
    alert.hidden = false;
  };

  const yearOptions = (includeCurrent = false) => {
    const values = [];
    let start = new Date().getFullYear() - 1;
    if (includeCurrent) start += 1;
    for (let year = start; year > start - 100; year -= 1) values.push(String(year));
    return values;
  };

  const fillSelect = (select, values) => {
    if (!select || select.dataset.filled === "true") return;
    values.forEach((value) => select.add(new Option(value, value)));
    select.dataset.filled = "true";
  };

  const setDisabled = (elements, disabled) => {
    elements.forEach((element) => {
      if (!element) return;
      element.disabled = disabled;
      if (disabled) element.value = "";
    });
  };

  const getField = (form, name) => String(new FormData(form).get(name) || "").trim();

  const getBirth = (form) => {
    const year = getField(form, "birthYear");
    const month = getField(form, "birthMonth");
    const day = getField(form, "birthDate");
    return year && month && day ? `${year}-${month}-${day}` : "";
  };

  const getBizNumber = (form) => ["biznum1", "biznum2", "biznum3"]
    .map((name) => core.onlyDigits(getField(form, name)))
    .filter(Boolean)
    .join("-");

  const getPeriod = (form, formType) => {
    const regularCheck = form.querySelector("[data-regular-check]");
    const lateCheck = form.querySelector("[data-late-check]");
    if (regularCheck?.checked) {
      if (formType === "vatax") return [getField(form, "etc1"), getField(form, "etc2"), "정기 신고"].filter(Boolean).join(" ");
      return [getField(form, "etc1"), "귀속 정기 신고"].filter(Boolean).join(" ");
    }
    if (lateCheck?.checked) {
      if (formType === "vatax") return [getField(form, "etc3"), getField(form, "etc4"), "기한후 신고"].filter(Boolean).join(" ");
      return [getField(form, "etc3"), "귀속 기한후 신고"].filter(Boolean).join(" ");
    }
    return "";
  };

  const validateApplication = (application) => {
    if (!application.customer_name) return "성명을 입력해주세요.";
    if (!application.phone) return "휴대폰번호를 입력해주세요.";
    if (!/^\d{10,11}$/.test(application.phone)) return "휴대폰번호는 숫자만 10~11자리로 입력해주세요.";
    if (!application.birth) return "생년월일을 선택해주세요.";
    if (!application.business_type) return "사업자구분을 선택해주세요.";
    if (!application.period) return "신고 구분과 귀속 기간을 선택해주세요.";
    return "";
  };

  const buildApplication = (form, formType, user) => {
    const isGitax = formType === "gitax";

    return {
      uid: user.id,
      service: formType,
      type: isGitax ? "종합소득세" : "부가가치세",
      customer_name: getField(form, "name"),
      phone: core.onlyDigits(getField(form, "phone")),
      birth: getBirth(form),
      company: getField(form, "company"),
      business_type: getField(form, "biz"),
      biz_number: getBizNumber(form),
      coupon: getField(form, "coupon"),
      period: getPeriod(form, formType),
      payment_status: "결제 대기",
      payment_summary: isGitax ? "계약금 결제 대기" : "신고유형 결제 대기",
      process_status: isGitax ? "신청 접수 및 계약금 결제" : "신청 접수",
      customer_memo: "신청이 접수되었습니다. 담당자가 확인 후 안내드리겠습니다.",
      order_name: isGitax ? "종합소득세신고 선결제" : "부가가치세 기본수수료"
    };
  };

  const setValue = (form, name, value) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field && value) field.value = value;
  };

  const splitBizNumber = (value) => {
    const digits = core.onlyDigits(value);
    return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 10)];
  };

  const setSelectIfOptionExists = (select, value) => {
    if (!select || !value) return false;
    const option = Array.from(select.options).find((item) => item.value === value || item.textContent.trim() === value);
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event("change"));
    return true;
  };

  const fillFromProfile = (form, profile) => {
    if (!profile) return false;
    let filled = false;

    if (profile.name) {
      setValue(form, "name", profile.name);
      filled = true;
    }
    if (profile.phone) {
      setValue(form, "phone", profile.phone);
      filled = true;
    }
    if (profile.birth) {
      const [year, month, day] = String(profile.birth).split("-");
      setValue(form, "birthYear", year);
      setValue(form, "birthMonth", month);
      setValue(form, "birthDate", day);
      filled = true;
    }

    const bizSelect = form.querySelector("[data-biz-select]");
    const profileBiz = profile.business_type;
    if (profileBiz && setSelectIfOptionExists(bizSelect, profileBiz)) filled = true;

    if (profile.biz_number) {
      const [biz1, biz2, biz3] = splitBizNumber(profile.biz_number);
      setValue(form, "biznum1", biz1);
      setValue(form, "biznum2", biz2);
      setValue(form, "biznum3", biz3);
      filled = true;
    }

    return filled;
  };

  const getBestProfile = async () => {
    const stored = core.readSessionProfile?.();
    if (stored?.name || stored?.phone || stored?.business_type) return stored;

    const user = await core.getSessionUser();
    if (!user) return null;
    return core.getProfile(user);
  };

  document.querySelectorAll(".renewal-apply-form").forEach((form) => {
    const formType = form.dataset.formType;
    fillSelect(form.querySelector('select[name="birthYear"]'), yearOptions());
    fillSelect(form.querySelector('select[name="birthMonth"]'), Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")));
    fillSelect(form.querySelector('select[name="birthDate"]'), Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")));
    fillSelect(form.querySelector("[data-regular-year]"), yearOptions(true));
    fillSelect(form.querySelector("[data-late-year]"), yearOptions(true));

    if (formType === "vatax") {
      const periods = ["1기확정 (1~6월)", "2기확정 (7~12월)", "간이과세 (01~12월)"];
      fillSelect(form.querySelector("[data-regular-period]"), periods);
      fillSelect(form.querySelector("[data-late-period]"), periods);
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
    bizSelect?.addEventListener("change", syncBiznum);
    syncBiznum();

    const regularCheck = form.querySelector("[data-regular-check]");
    const lateCheck = form.querySelector("[data-late-check]");
    const regularControls = [form.querySelector("[data-regular-year]"), form.querySelector("[data-regular-period]")];
    const lateControls = [form.querySelector("[data-late-year]"), form.querySelector("[data-late-period]")];
    const syncPeriod = (source) => {
      if (source === regularCheck && regularCheck?.checked && lateCheck) lateCheck.checked = false;
      if (source === lateCheck && lateCheck?.checked && regularCheck) regularCheck.checked = false;
      setDisabled(regularControls, !regularCheck?.checked);
      setDisabled(lateControls, !lateCheck?.checked);
      if (formType === "gitax" && regularCheck?.checked && regularControls[0] && !regularControls[0].value) {
        regularControls[0].value = String(new Date().getFullYear() - 1);
      }
    };
    regularCheck?.addEventListener("change", () => syncPeriod(regularCheck));
    lateCheck?.addEventListener("change", () => syncPeriod(lateCheck));
    syncPeriod(null);

    form.querySelector("[name='sameMember']")?.addEventListener("change", async (event) => {
      if (!event.target.checked) return;
      try {
        const profile = await getBestProfile();
        if (fillFromProfile(form, profile)) return;
        event.target.checked = false;
        showAlert({
          title: "고객정보가 필요합니다",
          message: "My 택스쿡에서 고객정보를 먼저 저장해주세요.",
          onClose: () => window.location.href = "mypage.html"
        });
      } catch (error) {
        console.error(error);
        event.target.checked = false;
        showAlert({
          title: "로그인이 필요합니다",
          message: "회원 정보와 동일하게 입력하려면 먼저 로그인해주세요.",
          onClose: () => window.location.href = "login.html"
        });
      }
    });

    form.querySelector(".form-submit-preview")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;

      try {
        const user = await core.requireUser();
        if (!user) return;
        const application = buildApplication(form, formType, user);
        const validationMessage = validateApplication(application);
        if (validationMessage) return showAlert({ title: "입력 내용을 확인해주세요", message: validationMessage });

        core.setBusy(button, true, "신청 저장 중...");
        const { error } = await core.getClient().from("applications").insert(application);
        if (error) throw error;

        showAlert({
          title: "신청이 접수되었습니다",
          message: "My 택스쿡에서 진행 현황을 확인할 수 있습니다.",
          onClose: () => window.location.href = "mypage.html"
        });
        window.setTimeout(() => {
          window.location.href = "mypage.html";
        }, 900);
      } catch (error) {
        console.error(error);
        showAlert({
          title: "신청 저장에 실패했습니다",
          message: "잠시 후 다시 시도해주세요. 문제가 계속되면 카카오채널로 문의해주세요."
        });
        core.setBusy(button, false);
      }
    });
  });
})();
