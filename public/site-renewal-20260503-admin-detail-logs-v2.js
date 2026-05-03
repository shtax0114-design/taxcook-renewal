(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const forms = Array.from(document.querySelectorAll("[data-application-detail]"));
  let form = null;
  let currentApplication = null;
  let currentProfile = null;
  const GITAX_DEPOSIT_FEE = 55000;
  const editLogSection = document.querySelector("[data-edit-log-section]");
  const editLogList = document.querySelector("[data-edit-log-list]");
  const editLogToggle = document.querySelector("[data-edit-log-toggle]");
  const editLogRefresh = document.querySelector("[data-edit-log-refresh]");
  let editLogExpanded = false;
  let editLogsLoaded = false;

  const numberOrNull = (value) => {
    const number = Number(value || 0);
    return number ? number : null;
  };

  const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

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

  const defaultVataxFee = (businessType = "") => {
    if (businessType.includes("일반")) return 110000;
    return 88000;
  };

  const defaultVataxSupplyFee = (businessType = "") => {
    if (businessType.includes("일반")) return 100000;
    return 80000;
  };

  const discountedVataxFee = (businessType = "", discountAmount = 0) => {
    const supplyFee = defaultVataxSupplyFee(businessType);
    return Math.round(Math.max(supplyFee - Number(discountAmount || 0), 0) * 1.1);
  };

  const resolveCouponDiscount = async (application) => {
    const coupon = String(application?.coupon || "").trim();
    if (!coupon || Number(application?.discount_amount || 0)) return application;

    try {
      const { data, error } = await core.getClient()
        .from("discount_codes")
        .select("code, amount, is_active")
        .eq("is_active", true);
      if (error) throw error;
      const matched = (data || []).find((item) => String(item.code || "").trim().toLowerCase() === coupon.toLowerCase());
      if (!matched) return application;

      const discountAmount = toNumber(matched.amount);
      if (!discountAmount) return application;
      const baseFee = application.service === "gitax"
        ? application.base_fee ?? defaultGitaxFee(application.report_type || application.type || "")
        : application.base_fee ?? defaultVataxFee(application.business_type);
      const vataxAmount = discountedVataxFee(application.business_type, discountAmount);

      return {
        ...application,
        coupon: matched.code,
        discount_amount: discountAmount,
        base_fee: baseFee,
        final_payment_amount: application.service === "vatax" ? vataxAmount : application.final_payment_amount,
        total_amount: application.service === "vatax" ? vataxAmount : application.total_amount,
        supply_amount: application.service === "vatax" ? vataxAmount : application.supply_amount
      };
    } catch (error) {
      console.warn("Discount fallback failed.", error);
      return application;
    }
  };

  const calculateGitaxFees = ({ syncBaseFee = false } = {}) => {
    if (!form || currentApplication?.service !== "gitax") return null;
    const type = getValue("reportType");
    const defaultBaseFee = defaultGitaxFee(type);
    if (syncBaseFee) setValue("baseFee", defaultBaseFee);

    const baseFee = toNumber(getValue("baseFee")) || defaultBaseFee;
    const extraAmount = toNumber(getValue("extraPaymentAmount"));
    const businessExtraAmount = toNumber(getValue("businessExtraAmount"));
    const etcExtraAmount = toNumber(getValue("etcExtraAmount"));
    const discountAmount = toNumber(getValue("discountAmount"));
    const finalPaymentAmount = Math.max(baseFee + extraAmount + businessExtraAmount + etcExtraAmount - discountAmount, 0);
    const vatAmount = Math.round(finalPaymentAmount * 0.1);
    const totalAmount = Math.max(finalPaymentAmount + vatAmount - GITAX_DEPOSIT_FEE, 0);

    setMoney("depositFee", GITAX_DEPOSIT_FEE);
    setMoney("baseFee", baseFee);
    setMoney("discountAmount", discountAmount);
    setMoney("finalPaymentAmount", finalPaymentAmount);
    setMoney("vatAmount", vatAmount);
    setMoney("totalAmount", totalAmount);

    return {
      baseFee,
      discountAmount,
      finalPaymentAmount,
      vatAmount,
      totalAmount
    };
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
    const reportType = application.report_type || application.type || "";
    const baseFee = isGitax ? application.base_fee ?? defaultGitaxFee(reportType) : application.base_fee ?? defaultVataxFee(application.business_type);
    const discountAmount = Number(application.discount_amount || 0);
    const vataxAmount = discountAmount ? discountedVataxFee(application.business_type, discountAmount) : baseFee;
    const finalPaymentAmount = isGitax ? application.final_payment_amount ?? application.total_amount ?? baseFee : vataxAmount;
    const supplyAmount = isGitax ? application.supply_amount ?? application.total_amount ?? finalPaymentAmount : vataxAmount;
    const totalAmount = isGitax ? application.total_amount : finalPaymentAmount;
    const depositFee = application.deposit_fee ?? GITAX_DEPOSIT_FEE;

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
    setMoney("discountAmount", discountAmount);
    setMoney("supplyAmount", supplyAmount);
    setMoney("vatAmount", application.vat_amount ?? (isGitax ? 5000 : null));
    setMoney("totalAmount", totalAmount);
    setMoney("finalPaymentAmount", finalPaymentAmount);
    setMoney("paidAmount", application.paid_amount || (isGitax ? depositFee : application.total_amount || application.final_payment_amount || depositFee));

    setValue("id", application.id);
    setValue("manager", application.manager);
    setValue("reportType", reportType);
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
    calculateGitaxFees();
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
      const fees = calculateGitaxFees() || {};
      Object.assign(payload, {
        report_type: getValue("reportType"),
        deposit_fee: GITAX_DEPOSIT_FEE,
        base_fee: numberOrNull(fees.baseFee),
        discount_amount: numberOrNull(fees.discountAmount),
        final_payment_amount: numberOrNull(fees.finalPaymentAmount),
        vat_amount: numberOrNull(fees.vatAmount),
        total_amount: numberOrNull(fees.totalAmount),
        tax_reduction: numberOrNull(getValue("taxReduction")),
        calculated_tax: numberOrNull(getValue("calculatedTax")),
        prepaid_tax: numberOrNull(getValue("prepaidTax")),
        final_tax_due: numberOrNull(getValue("finalTaxDue")),
        payment_summary: fees.totalAmount ? core.money(fees.totalAmount) : getValue("processStatus")
      });
    } else {
      const fee = defaultVataxFee(currentApplication?.business_type);
      const discountAmount = Number(currentApplication?.discount_amount || 0);
      const finalAmount = discountAmount ? discountedVataxFee(currentApplication?.business_type, discountAmount) : fee;
      Object.assign(payload, {
        base_fee: fee,
        discount_amount: discountAmount || null,
        final_payment_amount: finalAmount,
        total_amount: finalAmount,
        supply_amount: finalAmount,
        payment_due: numberOrNull(getValue("paymentDue")),
        credit_deduction: numberOrNull(getValue("creditDeduction"))
      });
    }
    return payload;
  };

  const canViewEditLogs = () => currentProfile?.role === "developer";

  const syncEditLogToggle = () => {
    if (!editLogList || !editLogToggle || !editLogRefresh) return;
    editLogList.hidden = !editLogExpanded;
    editLogRefresh.hidden = !editLogExpanded;
    editLogToggle.setAttribute("aria-expanded", String(editLogExpanded));
    editLogToggle.textContent = editLogExpanded ? "문서 수정 로그 접기" : "문서 수정 로그 보기";
  };

  const editLogFieldLabels = {
    admin_memo: "관리자 내부 메모",
    bank_name: "은행",
    base_fee: "기본 수수료",
    before_deadline: "납부서 전달",
    business_extra_amount: "사업장 추가 금액",
    business_extra_type: "사업장 추가 항목",
    calculated_tax: "산출세액",
    credit_deduction: "발행공제",
    customer_memo: "고객 안내 메모",
    discount_amount: "할인금액",
    etc_extra_amount: "기타 추가 금액",
    etc_extra_type: "기타 추가 항목",
    extra_payment_amount: "추가결제 금액",
    extra_payment_type: "추가결제 항목",
    final_payment_amount: "최종결제금액",
    final_tax_due: "최종 납부세액",
    manager: "담당자",
    payment_due: "납부금액",
    process_status: "처리상태",
    report_date: "신고일자",
    report_type: "신고유형",
    tax_reduction: "세액공제감면",
    total_amount: "합계금액",
    updated_by: "최종수정자",
    vat_amount: "부가세"
  };

  const formatLogValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "예" : "아니오";
    if (typeof value === "number") return core.money(value);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const normalizeChangedFields = (changedFields) => {
    if (Array.isArray(changedFields)) return changedFields.filter(Boolean);
    if (changedFields && typeof changedFields === "object") return Object.keys(changedFields);
    if (typeof changedFields === "string") {
      try {
        const parsed = JSON.parse(changedFields);
        return normalizeChangedFields(parsed);
      } catch (error) {
        return changedFields.split(",").map((field) => field.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const renderEditLogs = (logs = []) => {
    if (!editLogList) return;
    if (!logs.length) {
      editLogList.innerHTML = '<div class="developer-log-empty">아직 남겨진 수정 로그가 없습니다.</div>';
      return;
    }

    editLogList.innerHTML = logs.map((log) => {
      const fields = normalizeChangedFields(log.changed_fields);
      const actionLabel = log.action === "DELETE" ? "삭제" : "수정";
      const actor = log.actor_name || log.actor_email || "알 수 없음";
      const date = core.formatDateTime(log.created_at);
      const chips = fields.length
        ? fields.map((field) => `<span class="developer-log-chip">${escapeHtml(editLogFieldLabels[field] || field)}</span>`).join("")
        : '<span class="developer-log-chip">변경 필드 없음</span>';
      const rows = fields.length
        ? fields.map((field) => {
          const label = editLogFieldLabels[field] || field;
          const beforeValue = formatLogValue(log.before_data?.[field]);
          const afterValue = formatLogValue(log.after_data?.[field]);
          return `
            <div class="developer-log-change-row">
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(beforeValue)}</span>
              <em>→</em>
              <span>${escapeHtml(afterValue)}</span>
            </div>
          `;
        }).join("")
        : '<div class="developer-log-empty">표시할 변경값이 없습니다.</div>';

      return `
        <article class="developer-log-item">
          <div class="developer-log-head">
            <div class="developer-log-title">
              <span class="developer-log-action">${actionLabel}</span>
              <span>${escapeHtml(actor)}</span>
            </div>
            <div class="developer-log-meta">
              <div>${escapeHtml(date)}</div>
              <div>${escapeHtml(log.actor_role || "developer")}</div>
            </div>
          </div>
          <div class="developer-log-changes">${chips}</div>
          <div class="developer-log-change-table">${rows}</div>
        </article>
      `;
    }).join("");
  };

  const loadEditLogs = async ({ force = false } = {}) => {
    if (!editLogSection || !editLogList || !currentApplication?.id) return;
    if (!canViewEditLogs()) {
      editLogSection.hidden = true;
      return;
    }
    editLogSection.hidden = false;
    syncEditLogToggle();
    if (!editLogExpanded && !force) {
      editLogsLoaded = false;
      return;
    }
    editLogList.innerHTML = '<div class="developer-log-empty">수정 로그를 불러오는 중입니다.</div>';
    try {
      const { data, error } = await core.getClient()
        .from("application_edit_logs")
        .select("id, application_id, action, actor_name, actor_email, actor_role, changed_fields, before_data, after_data, created_at")
        .eq("application_id", currentApplication.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      renderEditLogs(data || []);
      editLogsLoaded = true;
    } catch (error) {
      console.error(error);
      editLogList.innerHTML = `<div class="developer-log-error">수정 로그를 불러오지 못했습니다. Supabase 로그 테이블/정책 적용을 확인해 주세요.<br>${escapeHtml(error.message || "")}</div>`;
    }
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
      const application = await resolveCouponDiscount(applicationResult.data);
      render(application);
      loadEditLogs();
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
        if (editLogExpanded) loadEditLogs({ force: true });
        else editLogsLoaded = false;
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
    if (event.target.closest("[data-edit-log-refresh]")) {
      editLogExpanded = true;
      syncEditLogToggle();
      loadEditLogs({ force: true });
    }
    if (event.target.closest("[data-edit-log-toggle]")) {
      editLogExpanded = !editLogExpanded;
      syncEditLogToggle();
      if (editLogExpanded && !editLogsLoaded) loadEditLogs({ force: true });
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

  document.addEventListener("change", (event) => {
    if (!event.target.closest('[data-service-form="gitax"]')) return;
    if (event.target.name === "reportType") {
      calculateGitaxFees({ syncBaseFee: true });
      return;
    }
    if (["baseFee", "extraPaymentAmount", "businessExtraAmount", "etcExtraAmount", "discountAmount"].includes(event.target.name)) {
      calculateGitaxFees();
    }
  });

  document.addEventListener("input", (event) => {
    if (!event.target.closest('[data-service-form="gitax"]')) return;
    if (["baseFee", "extraPaymentAmount", "businessExtraAmount", "etcExtraAmount", "discountAmount"].includes(event.target.name)) {
      calculateGitaxFees();
    }
  });

  boot();
})();
