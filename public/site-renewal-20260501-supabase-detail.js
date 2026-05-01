(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const form = document.querySelector("[data-application-detail]");
  let currentApplication = null;

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
    else field.value = value || "";
  };

  const getValue = (name) => {
    const field = form?.elements?.[name];
    if (!field) return "";
    if (field.type === "checkbox") return field.checked;
    return field.value;
  };

  const syncServiceVisibility = (service) => {
    document.body.dataset.service = service || "";
    document.querySelectorAll(".vatax-only").forEach((element) => {
      element.hidden = service !== "vatax";
    });
    document.querySelectorAll(".gitax-only").forEach((element) => {
      element.hidden = service !== "gitax";
    });
  };

  const render = (application) => {
    currentApplication = application;
    syncServiceVisibility(application.service);

    setText("appliedAt", core.formatDateTime(application.requested_at || application.created_at));
    setText("customerName", application.customer_name);
    setText("applicantName", application.customer_name);
    setText("businessNumber", application.biz_number);
    setText("phone", application.phone);
    setText("birthDate", application.birth);
    setText("businessType", application.business_type);
    setText("taxYear", application.period);
    setText("period", application.period);
    setText("type", application.type);
    setText("couponCode", application.coupon);
    setText("paymentStatus", application.payment_status);
    setText("bankName", application.bank_name || "-");
    setText("orderName", application.order_name);

    setMoney("depositFee", application.deposit_fee);
    setMoney("baseFee", application.base_fee);
    setMoney("discountAmount", application.discount_amount);
    setMoney("supplyAmount", application.supply_amount);
    setMoney("finalFee", application.final_payment_amount);
    setMoney("vatAmount", application.vat_amount);
    setMoney("totalAmount", application.total_amount || application.final_payment_amount);
    setMoney("paidAmount", application.paid_amount || application.final_payment_amount);

    setValue("id", application.id);
    setValue("reportType", application.report_type);
    setValue("creditDeduction", application.credit_deduction);
    setValue("manager", application.manager);
    setValue("processStatus", application.process_status);
    setValue("extraPaymentType", application.extra_payment_type);
    setValue("extraPaymentStatus", application.extra_payment_status);
    setValue("extraPaymentAmount", application.extra_payment_amount);
    setValue("incomeExtraType", application.income_extra_type);
    setValue("incomeExtraAmount", application.income_extra_amount);
    setValue("businessExtraType", application.business_extra_type);
    setValue("businessExtraAmount", application.business_extra_amount);
    setValue("etcExtraType", application.etc_extra_type);
    setValue("etcExtraAmount", application.etc_extra_amount);
    setValue("taxReduction", application.tax_reduction);
    setValue("reportDate", application.report_date);
    setValue("calculatedTax", application.calculated_tax);
    setValue("prepaidTax", application.prepaid_tax);
    setValue("paymentDue", application.payment_due);
    setValue("finalTaxDue", application.final_tax_due);
    setValue("beforeDeadline", application.before_deadline);
    setValue("customerMemo", application.customer_memo);
    setValue("adminMemo", application.admin_memo);

    document.querySelector("[data-receipt-open]")?.addEventListener("click", () => {
      if (application.receipt_url) window.open(application.receipt_url, "_blank", "noopener");
    });
  };

  const boot = async () => {
    if (!id) {
      alert("신청 ID가 없습니다.");
      window.location.href = "admin-vatax.html";
      return;
    }

    try {
      await core.requireAdmin();
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

    const saveMessage = document.querySelector("[data-save-message]");
    const payload = {
      report_type: getValue("reportType"),
      credit_deduction: Number(getValue("creditDeduction") || 0) || null,
      manager: getValue("manager"),
      process_status: getValue("processStatus"),
      extra_payment_type: getValue("extraPaymentType"),
      extra_payment_status: getValue("extraPaymentStatus"),
      extra_payment_amount: Number(getValue("extraPaymentAmount") || 0) || null,
      income_extra_type: getValue("incomeExtraType"),
      income_extra_amount: Number(getValue("incomeExtraAmount") || 0) || null,
      business_extra_type: getValue("businessExtraType"),
      business_extra_amount: Number(getValue("businessExtraAmount") || 0) || null,
      etc_extra_type: getValue("etcExtraType"),
      etc_extra_amount: Number(getValue("etcExtraAmount") || 0) || null,
      tax_reduction: Number(getValue("taxReduction") || 0) || null,
      report_date: getValue("reportDate") || null,
      calculated_tax: Number(getValue("calculatedTax") || 0) || null,
      prepaid_tax: Number(getValue("prepaidTax") || 0) || null,
      payment_due: Number(getValue("paymentDue") || 0) || null,
      final_tax_due: Number(getValue("finalTaxDue") || 0) || null,
      before_deadline: getValue("beforeDeadline"),
      customer_memo: getValue("customerMemo"),
      admin_memo: getValue("adminMemo")
    };

    try {
      if (saveMessage) {
        saveMessage.hidden = false;
        saveMessage.textContent = "저장 중...";
      }
      const { error } = await core.getClient().from("applications").update(payload).eq("id", currentApplication.id);
      if (error) throw error;
      if (saveMessage) saveMessage.textContent = "저장되었습니다.";
    } catch (error) {
      console.error(error);
      if (saveMessage) saveMessage.textContent = "저장에 실패했습니다.";
    }
  });

  boot();
})();
