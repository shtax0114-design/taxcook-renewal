(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const forms = Array.from(document.querySelectorAll("[data-application-detail]"));
  let form = null;
  let currentApplication = null;
  let currentProfile = null;

  const numberOrNull = (value) => {
    const number = Number(value || 0);
    return number ? number : null;
  };

  const setText = (key, value) => {
    document.querySelectorAll(`[data-detail-text="${key}"]`).forEach((element) => {
      element.textContent = value || "-";
    });
  };

  const setMoney = (key, value) => {
    document.querySelectorAll(`[data-detail-money="${key}"]`).forEach((element) => {
      element.textContent = core.money(value);
    });
  };

  const ensureOption = (field, value) => {
    if (!value || field.tagName !== "SELECT") return;
    if (field.dataset.fixedOptions !== undefined) return;
    const hasOption = Array.from(field.options).some((option) => option.value === value || option.textContent === value);
    if (hasOption) return;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    field.append(option);
  };

  const setValue = (name, value) => {
    const field = form?.elements?.[name];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else {
      ensureOption(field, value);
      field.value = value ?? "";
      if (field.tagName === "SELECT" && field.dataset.fixedOptions !== undefined && field.selectedIndex < 0) {
        field.value = field.dataset.defaultOption || "";
      }
    }
  };

  const getValue = (name) => {
    const field = form?.elements?.[name];
    if (!field) return "";
    if (field.type === "checkbox") return field.checked;
    return field.value;
  };

  const showSaveMessage = (message, type = "") => {
    document.querySelectorAll("[data-save-message]").forEach((saveMessage) => {
      saveMessage.hidden = saveMessage.closest("[data-application-detail]") !== form;
      if (saveMessage.hidden) return;
      saveMessage.dataset.type = type;
      saveMessage.textContent = message;
    });
  };

  const defaultGitaxFee = (type = "") => {
    if (type.includes("복식")) return 500000;
    if (type.includes("간편장부A")) return 300000;
    if (type.includes("간편장부B")) return 200000;
    if (type.includes("기준")) return 100000;
    return 50000;
  };

  const activateForm = (service) => {
    form = document.querySelector(`[data-service-form="${service}"]`) || document.querySelector('[data-service-form="vatax"]');
    document.body.dataset.detailService = service || "vatax";
    forms.forEach((item) => {
      item.hidden = item !== form;
    });
  };

  const populateManagers = (profiles) => {
    const names = Array.from(new Set((profiles || [])
      .filter((profile) => profile.role === "admin")
      .map((profile) => profile.name || profile.user_id || profile.email)
      .filter(Boolean)));
    if (currentProfile?.name && !names.includes(currentProfile.name)) names.unshift(currentProfile.name);
    document.querySelectorAll("[data-manager-select]").forEach((select) => {
      const current = select.value;
      select.innerHTML = '<option value="">신고담당자명</option>';
      names.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.append(option);
      });
      select.value = current;
    });
  };

  const render = (application) => {
    currentApplication = application;
    activateForm(application.service || "vatax");
    document.querySelector("[data-list-link]")?.setAttribute("href", "admin.html");

    const isGitax = application.service === "gitax";
    const baseFee = application.base_fee ?? application.deposit_fee ?? (isGitax ? defaultGitaxFee(application.type) : application.type?.includes("일반") ? 100000 : 80000);
    const finalPaymentAmount = application.final_payment_amount ?? application.total_amount ?? baseFee;
    const supplyAmount = application.supply_amount ?? application.total_amount ?? finalPaymentAmount;
    const depositFee = application.deposit_fee ?? 55000;

    setText("appliedAt", core.formatDateTime(application.requested_at || application.created_at));
    setText("customerName", application.customer_name);
    setText("phone", application.phone);
    setText("birth", application.birth);
    setText("businessType", application.business_type);
    setText("businessNumber", application.biz_number);
    setText("company", application.company || application.customer_name);
    setText("period", application.period);
    setText("gitaxYear", (application.period || "").match(/\d{4}/)?.[0] ? `${(application.period || "").match(/\d{4}/)[0]} 년` : application.period);
    setText("type", application.type);
    setText("couponCode", application.coupon);
    setText("paymentStatus", application.payment_status);
    setText("bankName", application.bank_name);
    setText("orderName", application.order_name);
    setText("cardCompany", application.card_company || application.bank_name || "롯데카드");
    setText("cardNumber", application.card_number);
    setText("orderId", application.order_id);
    setText("approvalNo", application.approval_no);

    setMoney("depositFee", depositFee);
    setMoney("baseFee", baseFee);
    setMoney("discountAmount", application.discount_amount);
    setMoney("supplyAmount", supplyAmount);
    setMoney("vatAmount", application.vat_amount ?? (isGitax ? 5000 : null));
    setMoney("totalAmount", application.total_amount);
    setMoney("finalPaymentAmount", finalPaymentAmount);
    setMoney("paidAmount", application.paid_amount || application.total_amount || application.final_payment_amount || depositFee);

    setValue("id", application.id);
    setValue("manager", application.manager);
    setValue("reportType", application.report_type || application.type);
    setValue("reportDate", application.report_date);
    setValue("processStatus", application.process_status);
    setValue("baseFee", baseFee);
    setValue("paymentDue", application.payment_due);
    setValue("finalTaxDue", application.final_tax_due);
    setValue("extraPaymentType", application.extra_payment_type);
    setValue("extraPaymentAmount", application.extra_payment_amount);
    setValue("businessExtraType", application.business_extra_type);
    setValue("businessExtraAmount", application.business_extra_amount);
    setValue("etcExtraType", application.etc_extra_type);
    setValue("etcExtraAmount", application.etc_extra_amount);
    setValue("creditDeduction", application.credit_deduction);
    setValue("discountAmount", application.discount_amount);
    setValue("taxReduction", application.tax_reduction);
    setValue("calculatedTax", application.calculated_tax);
    setValue("prepaidTax", application.prepaid_tax);
    setValue("beforeDeadline", application.before_deadline);
    setValue("customerMemo", application.customer_memo);
    setValue("adminMemo", application.admin_memo);
  };

  const buildPayload = () => {
    const payload = {
      manager: getValue("manager"),
      report_date: getValue("reportDate") || null,
      process_status: getValue("processStatus"),
      extra_payment_type: getValue("extraPaymentType"),
      extra_payment_amount: numberOrNull(getValue("extraPaymentAmount")),
      business_extra_type: getValue("businessExtraType"),
      business_extra_amount: numberOrNull(getValue("businessExtraAmount")),
      etc_extra_type: getValue("etcExtraType"),
      etc_extra_amount: numberOrNull(getValue("etcExtraAmount")),
      before_deadline: getValue("beforeDeadline"),
      customer_memo: getValue("customerMemo"),
      admin_memo: getValue("adminMemo"),
      updated_by: currentProfile?.name || currentProfile?.email || "관리자"
    };

    if (currentApplication?.service === "gitax") {
      Object.assign(payload, {
        report_type: getValue("reportType"),
        base_fee: numberOrNull(getValue("baseFee")),
        discount_amount: numberOrNull(getValue("discountAmount")),
        tax_reduction: numberOrNull(getValue("taxReduction")),
        calculated_tax: numberOrNull(getValue("calculatedTax")),
        prepaid_tax: numberOrNull(getValue("prepaidTax")),
        final_tax_due: numberOrNull(getValue("finalTaxDue")),
        payment_summary: getValue("finalTaxDue") ? core.money(getValue("finalTaxDue")) : getValue("processStatus")
      });
    } else {
      Object.assign(payload, {
        payment_due: numberOrNull(getValue("paymentDue")),
        credit_deduction: numberOrNull(getValue("creditDeduction"))
      });
    }
    return payload;
  };

  const boot = async () => {
    if (!id) {
      alert("신청 ID가 없습니다.");
      window.location.href = "admin.html";
      return;
    }
    try {
      const admin = await core.requireAdmin();
      if (!admin) return;
      currentProfile = admin.profile;
      const [applicationResult, profileResult] = await Promise.all([
        core.getClient().from("applications").select("*").eq("id", id).maybeSingle(),
        core.getClient().from("profiles").select("name,user_id,role")
      ]);
      if (applicationResult.error) throw applicationResult.error;
      if (!applicationResult.data) throw new Error("신청 내역이 없습니다.");
      populateManagers(profileResult.data || []);
      render(applicationResult.data);
    } catch (error) {
      console.error(error);
      alert("신청 상세를 불러오지 못했습니다.");
    }
  };

  forms.forEach((item) => {
    item.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentApplication) return;
      form = item;
      try {
        showSaveMessage("저장 중...");
        const { data, error } = await core.getClient()
          .from("applications")
          .update(buildPayload())
          .eq("id", currentApplication.id)
          .select("*")
          .single();
        if (error) throw error;
        render(data);
        showSaveMessage("저장되었습니다.", "success");
      } catch (error) {
        console.error(error);
        showSaveMessage(`저장 실패: ${error.message || "잠시 후 다시 시도해주세요."}`, "error");
      }
    });
  });

  document.addEventListener("click", async (event) => {
    if (event.target.closest("[data-edit-application]")) {
      form?.querySelector("select, input:not([type='hidden']), textarea")?.focus();
    }
    if (event.target.closest("[data-receipt-open]") && currentApplication?.receipt_url) {
      window.open(currentApplication.receipt_url, "_blank", "noopener");
    }
    if (event.target.closest("[data-cancel-payment]")) {
      alert("실제 결제취소 기능은 TossPayments 연결 후 활성화됩니다.");
    }
    if (event.target.closest("[data-mark-undelivered]")) {
      setValue("beforeDeadline", false);
      showSaveMessage("납부서 전달 상태를 미전송으로 바꿨습니다. 저장을 눌러 반영해주세요.");
    }
    if (event.target.closest("[data-delete-application]")) {
      if (!currentApplication || !confirm("이 신청 내역을 삭제할까요?")) return;
      try {
        const { error } = await core.getClient().from("applications").delete().eq("id", currentApplication.id);
        if (error) throw error;
        window.location.href = "admin.html";
      } catch (error) {
        console.error(error);
        showSaveMessage(`삭제 실패: ${error.message || "잠시 후 다시 시도해주세요."}`, "error");
      }
    }
  });

  document.querySelectorAll("input[type='date']").forEach((field) => {
    field.addEventListener("click", () => {
      if (typeof field.showPicker === "function") field.showPicker();
    });
    field.addEventListener("focus", () => {
      if (typeof field.showPicker === "function") field.showPicker();
    });
  });

  boot();
})();
