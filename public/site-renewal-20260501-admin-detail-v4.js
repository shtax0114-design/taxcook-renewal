(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const form = document.querySelector("[data-application-detail]");
  let currentApplication = null;
  let currentProfile = null;

  const serviceLabel = (service) => service === "gitax" ? "종합소득세" : "부가가치세";
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
    }
  };

  const getValue = (name) => {
    const field = form?.elements?.[name];
    if (!field) return "";
    if (field.type === "checkbox") return field.checked;
    return field.value;
  };

  const showSaveMessage = (message, type = "") => {
    const saveMessage = document.querySelector("[data-save-message]");
    if (!saveMessage) return;
    saveMessage.hidden = false;
    saveMessage.dataset.type = type;
    saveMessage.textContent = message;
  };

  const render = (application) => {
    currentApplication = application;
    document.body.dataset.detailService = application.service || "";
    document.querySelector("[data-list-link]")?.setAttribute("href", "admin.html");

    const gitaxDefaultFee = application.type?.includes("복식")
      ? 500000
      : application.type?.includes("간편장부A")
        ? 300000
        : application.type?.includes("간편장부B")
          ? 200000
          : application.type?.includes("기준")
            ? 100000
            : 50000;
    const defaultFee = application.service === "gitax" ? gitaxDefaultFee : application.type?.includes("일반") ? 100000 : 80000;
    const baseFee = application.base_fee ?? application.deposit_fee ?? defaultFee;
    const finalPaymentAmount = application.final_payment_amount ?? application.total_amount ?? baseFee;
    const supplyAmount = application.supply_amount ?? application.total_amount ?? finalPaymentAmount;

    setText("appliedAt", core.formatDateTime(application.requested_at || application.created_at));
    setText("customerName", application.customer_name);
    setText("phone", application.phone);
    setText("businessType", application.business_type);
    setText("businessNumber", application.biz_number);
    setText("company", application.company || application.customer_name);
    setText("serviceLabel", serviceLabel(application.service));
    setText("period", application.period);
    setText("type", application.type);
    setText("couponCode", application.coupon);
    setText("paymentStatus", application.payment_status);
    setText("bankName", application.bank_name);
    setText("orderName", application.order_name);

    setMoney("baseFee", baseFee);
    setMoney("discountAmount", application.discount_amount);
    setMoney("supplyAmount", supplyAmount);
    setMoney("finalPaymentAmount", finalPaymentAmount);
    setMoney("paidAmount", application.paid_amount || application.total_amount || application.final_payment_amount);

    setValue("id", application.id);
    setValue("manager", application.manager);
    setValue("reportDate", application.report_date);
    setValue("processStatus", application.process_status);
    setValue("paymentSummary", application.payment_summary);
    setValue("finalPaymentAmount", application.final_payment_amount);
    setValue("paymentDue", application.payment_due);
    setValue("finalTaxDue", application.final_tax_due);
    setValue("extraPaymentType", application.extra_payment_type);
    setValue("extraPaymentAmount", application.extra_payment_amount);
    setValue("businessExtraType", application.business_extra_type);
    setValue("businessExtraAmount", application.business_extra_amount);
    setValue("etcExtraType", application.etc_extra_type);
    setValue("etcExtraAmount", application.etc_extra_amount);
    setValue("creditDeduction", application.credit_deduction);
    setValue("calculatedTax", application.calculated_tax);
    setValue("prepaidTax", application.prepaid_tax);
    setValue("beforeDeadline", application.before_deadline);
    setValue("customerMemo", application.customer_memo);
    setValue("adminMemo", application.admin_memo);
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
      const { data, error } = await core.getClient()
        .from("applications")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("신청 내역이 없습니다.");
      render(data);
    } catch (error) {
      console.error(error);
      alert("신청 상세를 불러오지 못했습니다.");
    }
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentApplication) return;

    const payload = {
      manager: getValue("manager"),
      report_date: getValue("reportDate") || null,
      process_status: getValue("processStatus"),
      payment_due: numberOrNull(getValue("paymentDue")),
      extra_payment_type: getValue("extraPaymentType"),
      extra_payment_amount: numberOrNull(getValue("extraPaymentAmount")),
      business_extra_type: getValue("businessExtraType"),
      business_extra_amount: numberOrNull(getValue("businessExtraAmount")),
      etc_extra_type: getValue("etcExtraType"),
      etc_extra_amount: numberOrNull(getValue("etcExtraAmount")),
      credit_deduction: numberOrNull(getValue("creditDeduction")),
      before_deadline: getValue("beforeDeadline"),
      customer_memo: getValue("customerMemo"),
      admin_memo: getValue("adminMemo"),
      updated_by: currentProfile?.name || currentProfile?.email || "관리자"
    };

    try {
      showSaveMessage("저장 중...");
      const { data, error } = await core.getClient()
        .from("applications")
        .update(payload)
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

  document.querySelector("[data-edit-application]")?.addEventListener("click", () => {
    form?.querySelector("select, input:not([type='hidden']), textarea")?.focus();
  });

  form?.querySelectorAll("input[type='date']").forEach((field) => {
    field.addEventListener("click", () => {
      if (typeof field.showPicker === "function") field.showPicker();
    });
    field.addEventListener("focus", () => {
      if (typeof field.showPicker === "function") field.showPicker();
    });
  });

  document.querySelector("[data-receipt-open]")?.addEventListener("click", () => {
    if (currentApplication?.receipt_url) window.open(currentApplication.receipt_url, "_blank", "noopener");
  });

  document.querySelector("[data-cancel-payment]")?.addEventListener("click", () => {
    alert("실제 결제취소 기능은 TossPayments 연결 후 활성화됩니다.");
  });

  document.querySelector("[data-delete-application]")?.addEventListener("click", async () => {
    if (!currentApplication || !confirm("이 신청 내역을 삭제할까요?")) return;
    try {
      const { error } = await core.getClient().from("applications").delete().eq("id", currentApplication.id);
      if (error) throw error;
      window.location.href = "admin.html";
    } catch (error) {
      console.error(error);
      showSaveMessage(`삭제 실패: ${error.message || "잠시 후 다시 시도해주세요."}`, "error");
    }
  });

  boot();
})();
