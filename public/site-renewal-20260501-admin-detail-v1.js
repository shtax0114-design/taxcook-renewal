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

  const setValue = (name, value) => {
    const field = form?.elements?.[name];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
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
    document.querySelector("[data-list-link]")?.setAttribute("href", application.service === "gitax" ? "admin-gitax.html" : "admin-vatax.html");

    setText("appliedAt", core.formatDateTime(application.requested_at || application.created_at));
    setText("customerName", application.customer_name);
    setText("phone", application.phone);
    setText("businessType", application.business_type);
    setText("businessNumber", application.biz_number);
    setText("company", application.company);
    setText("serviceLabel", serviceLabel(application.service));
    setText("period", application.period);
    setText("type", application.type);
    setText("couponCode", application.coupon);
    setText("paymentStatus", application.payment_status);
    setText("bankName", application.bank_name);
    setText("orderName", application.order_name);

    setMoney("paidAmount", application.paid_amount || application.final_payment_amount);

    setValue("id", application.id);
    setValue("manager", application.manager);
    setValue("reportDate", application.report_date);
    setValue("processStatus", application.process_status);
    setValue("paymentStatus", application.payment_status);
    setValue("paymentSummary", application.payment_summary);
    setValue("finalPaymentAmount", application.final_payment_amount);
    setValue("paymentDue", application.payment_due);
    setValue("finalTaxDue", application.final_tax_due);
    setValue("extraPaymentType", application.extra_payment_type);
    setValue("extraPaymentStatus", application.extra_payment_status);
    setValue("extraPaymentAmount", application.extra_payment_amount);
    setValue("calculatedTax", application.calculated_tax);
    setValue("prepaidTax", application.prepaid_tax);
    setValue("beforeDeadline", application.before_deadline);
    setValue("customerMemo", application.customer_memo);
    setValue("adminMemo", application.admin_memo);
  };

  const boot = async () => {
    if (!id) {
      alert("신청 ID가 없습니다.");
      window.location.href = "admin-vatax.html";
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
      payment_status: getValue("paymentStatus"),
      payment_summary: getValue("paymentSummary"),
      final_payment_amount: numberOrNull(getValue("finalPaymentAmount")),
      payment_due: numberOrNull(getValue("paymentDue")),
      final_tax_due: numberOrNull(getValue("finalTaxDue")),
      extra_payment_type: getValue("extraPaymentType"),
      extra_payment_status: getValue("extraPaymentStatus"),
      extra_payment_amount: numberOrNull(getValue("extraPaymentAmount")),
      calculated_tax: numberOrNull(getValue("calculatedTax")),
      prepaid_tax: numberOrNull(getValue("prepaidTax")),
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

  document.querySelector("[data-receipt-open]")?.addEventListener("click", () => {
    if (currentApplication?.receipt_url) window.open(currentApplication.receipt_url, "_blank", "noopener");
  });

  document.querySelector("[data-delete-application]")?.addEventListener("click", async () => {
    if (!currentApplication || !confirm("이 신청 내역을 삭제할까요?")) return;
    try {
      const { error } = await core.getClient().from("applications").delete().eq("id", currentApplication.id);
      if (error) throw error;
      window.location.href = currentApplication.service === "gitax" ? "admin-gitax.html" : "admin-vatax.html";
    } catch (error) {
      console.error(error);
      showSaveMessage(`삭제 실패: ${error.message || "잠시 후 다시 시도해주세요."}`, "error");
    }
  });

  boot();
})();
