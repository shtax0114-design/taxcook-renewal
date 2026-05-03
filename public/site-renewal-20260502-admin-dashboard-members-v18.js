(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  let applications = [];
  let members = [];
  let popups = [];
  let discounts = [];
  let popupLoadError = "";
  let discountLoadError = "";
  let activeTab = "applications";
  let expandedApplicationId = "";
  let adminProfile = null;
  let memberRoleFilter = "";
  let permissionMode = false;
  let permissionUnlocked = false;
  let ownerPasscode = "";
  const protectedDeveloperEmail = "chaewoon83@gmail.com";
  const pendingRoleChanges = new Map();
  let activeColumnFilter = "";
  const columnFilters = {
    customer: "",
    businessType: "",
    processStatus: "",
    manager: "",
    phone: ""
  };

  const processStatusOptions = [
    "신청 접수",
    "신청 접수 및 계약금 결제",
    "신고유형 검토 및 결제",
    "신고서 작성",
    "추가결제 및 최종완료",
    "신고 접수 완료"
  ];

  const serviceLabel = (service) => service === "gitax" ? "종합소득세" : "부가가치세";
  const normalize = (value) => String(value || "").toLowerCase();
  const defaultVataxFee = (businessType = "") => businessType.includes("일반") ? 110000 : 88000;
  const defaultVataxSupplyFee = (businessType = "") => businessType.includes("일반") ? 100000 : 80000;
  const displayFinalAmount = (item) => {
    if (item.service === "vatax") {
      const baseFee = item.base_fee || defaultVataxFee(item.business_type);
      const discountAmount = Number(item.discount_amount || 0);
      if (discountAmount) {
        return Math.round(Math.max(defaultVataxSupplyFee(item.business_type) - discountAmount, 0) * 1.1);
      }
      return item.final_payment_amount || item.total_amount || baseFee;
    }
    if (item.final_payment_amount || item.payment_due || item.final_tax_due) {
      return item.final_payment_amount || item.payment_due || item.final_tax_due;
    }
    return null;
  };

  const renderDeliveryIcon = (cell, delivered) => {
    const icon = document.createElement("span");
    icon.className = `delivery-status-icon ${delivered ? "is-done" : "is-waiting"}`;
    icon.setAttribute("aria-label", delivered ? "납부서 전달완료" : "납부서 미전달");
    icon.setAttribute("title", delivered ? "납부서 전달완료" : "납부서 미전달");
    icon.textContent = delivered ? "✓" : "×";
    cell.classList.add("delivery-status-cell");
    cell.append(icon);
  };

  const getKeyword = () => normalize(document.querySelector("[data-admin-search]")?.value);
  const getServiceFilter = () => document.querySelector("[data-service-filter]")?.value || "";
  const getProcessFilter = () => document.querySelector("[data-process-filter]")?.value || "";

  const uniqueOptions = (values) =>
    Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko"));

  const columnFilterConfig = {
    customer: { type: "text", label: "이름" },
    businessType: { type: "select", label: "사업자구분", options: () => ["사업자", "비사업자"] },
    processStatus: { type: "select", label: "처리상태", options: () => processStatusOptions },
    manager: { type: "select", label: "담당자", options: () => uniqueOptions(applications.map((item) => item.manager)) },
    phone: { type: "text", label: "휴대폰번호" }
  };

  const setEmpty = (target, colspan, message) => {
    if (target) target.innerHTML = `<tr><td colspan="${colspan}" class="empty-cell">${message}</td></tr>`;
  };

  const todayText = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const setPopupMessage = (message, type = "error") => {
    const target = document.querySelector("[data-popup-message]");
    if (!target) return;
    target.textContent = message;
    target.dataset.type = type;
    target.hidden = false;
  };

  const clearPopupMessage = () => {
    const target = document.querySelector("[data-popup-message]");
    if (!target) return;
    target.textContent = "";
    target.hidden = true;
  };

  const setDiscountMessage = (message, type = "error") => {
    const target = document.querySelector("[data-discount-message]");
    if (!target) return;
    target.textContent = message;
    target.dataset.type = type;
    target.hidden = false;
  };

  const clearDiscountMessage = () => {
    const target = document.querySelector("[data-discount-message]");
    if (!target) return;
    target.textContent = "";
    target.hidden = true;
  };

  const setPermissionMessage = (message, type = "error") => {
    const target = document.querySelector("[data-permission-message]");
    if (!target) return;
    target.textContent = message;
    target.dataset.type = type;
    target.hidden = !message;
  };

  const setMemberMessage = (message, type = "error") => {
    const target = document.querySelector("[data-member-message]");
    if (!target) return;
    target.textContent = message;
    target.dataset.type = type;
    target.hidden = !message;
  };

  const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

  const syncPermissionActions = () => {
    const actions = document.querySelector("[data-permission-actions]");
    const saveButton = document.querySelector("[data-permission-save]");
    const dirtyText = document.querySelector("[data-permission-dirty]");
    if (actions) actions.hidden = !permissionMode || !permissionUnlocked;
    if (saveButton) saveButton.disabled = pendingRoleChanges.size === 0;
    if (dirtyText) {
      dirtyText.hidden = pendingRoleChanges.size === 0;
      dirtyText.textContent = pendingRoleChanges.size ? `${pendingRoleChanges.size}건 변경 대기` : "";
    }
  };

  const getColumnValue = (item, key) => {
    if (key === "customer") return item.company || item.customer_name || "";
    if (key === "businessType") return item.business_type || "";
    if (key === "processStatus") return item.process_status || "";
    if (key === "manager") return item.manager || "";
    if (key === "phone") return item.phone || "";
    return "";
  };

  const passesColumnFilters = (item) =>
    Object.entries(columnFilters).every(([key, filterValue]) => {
      if (!filterValue) return true;
      const value = getColumnValue(item, key);
      const config = columnFilterConfig[key];
      if (config?.type === "select") return value === filterValue;
      return normalize(value).includes(normalize(filterValue));
    });

  const syncColumnFilterButtons = () => {
    document.querySelectorAll("[data-column-filter]").forEach((button) => {
      const key = button.dataset.columnFilter;
      button.classList.toggle("is-filtered", Boolean(columnFilters[key]));
      button.classList.toggle("is-open", key === activeColumnFilter);
    });
  };

  const closeColumnFilterPanel = () => {
    const panel = document.querySelector("[data-column-filter-panel]");
    if (panel) panel.hidden = true;
    activeColumnFilter = "";
    syncColumnFilterButtons();
  };

  const renderColumnFilterPanel = (key, button) => {
    const config = columnFilterConfig[key];
    const panel = document.querySelector("[data-column-filter-panel]");
    if (!config || !panel) return;
    activeColumnFilter = key;
    const currentValue = columnFilters[key] || "";
    const control = config.type === "select"
      ? `<select data-column-filter-control><option value="">Select One</option>${config.options().map((option) => `<option value="${option}"${option === currentValue ? " selected" : ""}>${option}</option>`).join("")}</select>`
      : `<input type="text" data-column-filter-control value="${currentValue}" placeholder="${config.label}">`;

    panel.innerHTML = `
      <div class="column-filter-control">${control}</div>
      <div class="column-filter-actions">
        <button type="button" data-column-filter-clear>Clear</button>
        <button type="button" data-column-filter-apply>Apply</button>
      </div>
    `;
    panel.hidden = false;
    const rect = button.getBoundingClientRect();
    panel.style.left = `${Math.min(rect.left, window.innerWidth - 250)}px`;
    panel.style.top = `${rect.bottom + 8}px`;
    panel.querySelector("[data-column-filter-control]")?.focus();
    syncColumnFilterButtons();
  };

  const applyColumnFilter = () => {
    if (!activeColumnFilter) return;
    const panel = document.querySelector("[data-column-filter-panel]");
    const control = panel?.querySelector("[data-column-filter-control]");
    columnFilters[activeColumnFilter] = String(control?.value || "").trim();
    closeColumnFilterPanel();
    renderApplications();
  };

  const clearColumnFilter = () => {
    if (!activeColumnFilter) return;
    columnFilters[activeColumnFilter] = "";
    closeColumnFilterPanel();
    renderApplications();
  };

  const renderApplications = () => {
    const body = document.querySelector("[data-admin-all-list]");
    if (!body) return;
    const keyword = getKeyword();
    const serviceFilter = getServiceFilter();
    const processFilter = getProcessFilter();

    const filtered = applications.filter((item) => {
      if (serviceFilter && item.service !== serviceFilter) return false;
      if (processFilter && item.process_status !== processFilter) return false;
      if (!passesColumnFilters(item)) return false;
      if (!keyword) return true;
      return [
        serviceLabel(item.service),
        item.customer_name,
        item.company,
        item.phone,
        item.period,
        item.business_type,
        item.process_status,
        item.payment_status,
        item.manager
      ].some((value) => normalize(value).includes(keyword));
    });

    body.innerHTML = "";
    if (!filtered.length) {
      setEmpty(body, 12, "신청 내역이 없습니다.");
      return;
    }

    filtered.forEach((item) => {
      const row = document.createElement("tr");
      row.dataset.applicationRow = item.id;
      const values = [
        `${serviceLabel(item.service)} / ${item.period || "-"}`,
        item.company || item.customer_name || "-",
        item.business_type || "-",
        item.type || "-",
        item.process_status || "-",
        item.payment_status || "-",
        item.before_deadline,
        core.money(displayFinalAmount(item)),
        item.manager || "-",
        item.phone || "-",
        item.updated_by || "-",
        core.formatDateTime(item.updated_at || item.created_at)
      ];

      values.forEach((value, index) => {
        const cell = document.createElement("td");
        if (index === 0) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "admin-row-link";
          button.dataset.applicationToggle = item.id;
          button.setAttribute("aria-expanded", String(expandedApplicationId === item.id));
          button.textContent = value;
          cell.append(button);
        } else if (index === 6) {
          renderDeliveryIcon(cell, Boolean(value));
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      });
      body.append(row);

      if (expandedApplicationId === item.id) {
        const detailRow = document.createElement("tr");
        detailRow.className = "admin-detail-dropdown-row";
        const detailCell = document.createElement("td");
        detailCell.colSpan = 12;
        const wrapper = document.createElement("div");
        wrapper.className = "admin-detail-dropdown";
        const frame = document.createElement("iframe");
        frame.className = "admin-detail-frame";
        frame.title = `${serviceLabel(item.service)} 신청 상세`;
        frame.src = `application-detail.html?id=${encodeURIComponent(item.id)}&detailVersion=20260501-v9`;
        wrapper.append(frame);
        detailCell.append(wrapper);
        detailRow.append(detailCell);
        body.append(detailRow);
      }
    });
    syncColumnFilterButtons();
  };

  const renderMembers = () => {
    const body = document.querySelector("[data-admin-members-list]");
    if (!body) return;
    const title = document.querySelector("[data-member-panel-title]");
    if (title) {
      title.textContent = permissionMode
        ? "권한 관리"
        : memberRoleFilter === "admin"
          ? "관리자 정보"
          : "고객 정보";
    }
    const guard = document.querySelector("[data-permission-guard]");
    if (guard) guard.hidden = !permissionMode;
    syncPermissionActions();
    const keyword = getKeyword();
    const filtered = members.filter((item) => {
      const role = item.role || "customer";
      if (memberRoleFilter === "admin" && !["admin", "developer"].includes(role)) return false;
      if (memberRoleFilter && memberRoleFilter !== "admin" && role !== memberRoleFilter) return false;
      if (!keyword) return true;
      return [
        role,
        item.user_id,
        item.name,
        item.phone,
        item.business_type,
        item.biz_number
      ].some((value) => normalize(value).includes(keyword));
    });

    body.innerHTML = "";
    if (!filtered.length) {
      setEmpty(body, 10, "회원정보가 없습니다.");
      return;
    }

    filtered.forEach((item) => {
      const row = document.createElement("tr");
      const checkCell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = item.id;
      checkbox.dataset.memberCheck = item.id;
      checkbox.setAttribute("aria-label", `${item.user_id || item.name || "회원"} 선택`);
      checkCell.append(checkbox);
      row.append(checkCell);

      const manageCell = document.createElement("td");
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "member-edit-button";
      editButton.dataset.memberEdit = item.id;
      editButton.setAttribute("aria-label", `${item.user_id || item.name || "회원"} 수정`);
      editButton.textContent = "✎";
      manageCell.append(editButton);
      row.append(manageCell);

      const roleCell = document.createElement("td");
      if (permissionMode && permissionUnlocked) {
        const select = document.createElement("select");
        select.className = "member-role-select";
        select.dataset.memberRoleSelect = item.id;
        const currentRole = pendingRoleChanges.get(item.id) || item.role || "customer";
        const isProtectedDeveloper = normalize(item.user_id) === protectedDeveloperEmail;
        ["customer", "admin", "developer"].forEach((role) => {
          const option = document.createElement("option");
          option.value = role;
          option.textContent = role;
          option.selected = role === currentRole;
          select.append(option);
        });
        select.disabled = isProtectedDeveloper;
        if (pendingRoleChanges.has(item.id)) select.classList.add("is-dirty");
        roleCell.append(select);
        if (isProtectedDeveloper) {
          const lock = document.createElement("span");
          lock.className = "member-role-lock";
          lock.textContent = "고정";
          roleCell.append(lock);
        }
      } else {
        roleCell.textContent = item.role || "customer";
      }
      row.append(roleCell);

      [
        item.user_id || "-",
        item.name || "-",
        item.phone || "-",
        item.business_type || "-",
        item.biz_number || "-",
        core.formatDateTime(item.created_at),
        core.formatDateTime(item.updated_at)
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      body.append(row);
    });
  };

  const openMemberModal = (memberId = "") => {
    const modal = document.querySelector("[data-member-modal]");
    const form = document.querySelector("[data-member-form]");
    if (!modal || !form) return;
    const member = members.find((item) => item.id === memberId);
    form.reset();
    form.dataset.mode = member ? "edit" : "add";
    form.elements.id.value = member?.id || "";
    form.elements.userId.value = member?.user_id || "";
    form.elements.userId.readOnly = Boolean(member);
    form.elements.password.required = !member;
    form.elements.password.value = "";
    form.elements.role.value = member?.role || (memberRoleFilter === "admin" ? "admin" : "customer");
    form.elements.name.value = member?.name || "";
    form.elements.phone.value = member?.phone || "";
    form.elements.birth.value = member?.birth || "";
    form.elements.businessType.value = member?.business_type || "";
    form.elements.bizNumber.value = member?.biz_number || "";
    document.querySelector("[data-member-password-row]").hidden = Boolean(member);
    document.querySelector("[data-member-role-row]").hidden = Boolean(member);
    document.querySelector("[data-member-form-title]").textContent = member ? "회원정보 수정" : "회원 추가";
    modal.hidden = false;
    (member ? form.elements.name : form.elements.userId).focus();
  };

  const closeMemberModal = () => {
    const modal = document.querySelector("[data-member-modal]");
    if (modal) modal.hidden = true;
  };

  const saveMemberProfile = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const id = form.elements.id.value;
    const isAdd = form.dataset.mode === "add";
    const loginId = String(form.elements.userId.value || "").trim().toLowerCase();
    const payload = {
      user_id: loginId,
      name: String(form.elements.name.value || "").trim(),
      phone: onlyDigits(form.elements.phone.value),
      birth: String(form.elements.birth.value || "").trim(),
      business_type: String(form.elements.businessType.value || "").trim(),
      biz_number: onlyDigits(form.elements.bizNumber.value)
    };
    if (!payload.user_id || !payload.name || !payload.phone) {
      setMemberMessage("로그인ID, 이름, 휴대폰번호를 입력해주세요.");
      return;
    }
    if (isAdd && String(form.elements.password.value || "").length < 6) {
      setMemberMessage("비밀번호는 6자리 이상 입력해주세요.");
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    core.setBusy(submitButton, true, "저장 중...");
    try {
      if (isAdd) {
        const { data: sessionData } = await core.getClient().auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error("관리자 로그인이 필요합니다.");
        const response = await fetch(`${window.TAXCOOK_SUPABASE.url}/functions/v1/admin-create-member`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            loginId,
            password: form.elements.password.value,
            role: form.elements.role.value,
            name: payload.name,
            phone: payload.phone,
            birth: payload.birth,
            businessType: payload.business_type,
            bizNumber: payload.biz_number
          })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "회원 추가 중 오류가 발생했습니다.");
        members = [result.profile, ...members];
      } else {
        const { data, error } = await core.getClient()
          .from("profiles")
          .update(payload)
          .eq("id", id)
          .select("*");
        if (error) throw error;
        const saved = Array.isArray(data) ? data[0] : data;
        if (!saved) throw new Error("수정할 회원정보를 찾지 못했습니다.");
        members = members.map((item) => item.id === id ? saved : item);
      }
      closeMemberModal();
      setMemberMessage(isAdd ? "회원이 추가되었습니다." : "회원정보가 저장되었습니다.", "success");
      renderMembers();
    } catch (error) {
      console.error(error);
      setMemberMessage(error.message || "회원정보 저장 중 오류가 발생했습니다.");
    } finally {
      core.setBusy(submitButton, false);
    }
  };

  const downloadMembers = () => {
    const rows = [
      ["권한", "이메일", "이름", "휴대폰번호", "사업자구분", "사업자번호", "가입일", "최종수정일"],
      ...members.map((item) => [
        item.role || "customer",
        item.user_id || "",
        item.name || "",
        item.phone || "",
        item.business_type || "",
        item.biz_number || "",
        core.formatDateTime(item.created_at),
        core.formatDateTime(item.updated_at)
      ])
    ];
    const escapeCell = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const tableRows = rows.map((row, rowIndex) => {
      const tag = rowIndex === 0 ? "th" : "td";
      return `<tr>${row.map((cell) => `<${tag} style="mso-number-format:'\\@';">${escapeCell(cell)}</${tag}>`).join("")}</tr>`;
    }).join("");
    const workbook = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; }
            th, td { border: 1px solid #cbd8eb; padding: 8px; font-family: Pretendard, Arial, sans-serif; }
            th { background: #eef5ff; color: #061f55; font-weight: 700; }
          </style>
        </head>
        <body>
          <table>${tableRows}</table>
        </body>
      </html>`;
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taxcook-members-${todayText()}.xls`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const renderPopups = () => {
    const body = document.querySelector("[data-popup-list]");
    if (!body) return;
    body.innerHTML = "";
    if (popupLoadError) {
      setEmpty(body, 7, popupLoadError);
      return;
    }
    if (!popups.length) {
      setEmpty(body, 7, "등록된 메인 팝업이 없습니다.");
      return;
    }

    popups.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="popup-check-cell"><input type="checkbox" data-popup-check value="${item.id}" aria-label="팝업 선택"></td>
        <td class="popup-edit-cell"><button type="button" data-popup-edit="${item.id}" aria-label="수정">⌕</button></td>
        <td><img class="popup-thumb" src="${item.image_url || ""}" alt=""></td>
        <td>${item.start_date || "-"} ~ ${item.end_date || "-"}</td>
        <td>${item.is_active ? "사용" : "미사용"}</td>
        <td>${item.updated_by || item.created_by || "-"}</td>
        <td>${core.formatDateTime(item.updated_at || item.created_at)}</td>
      `;
      body.append(row);
    });
  };

  const renderDiscounts = () => {
    const body = document.querySelector("[data-discount-list]");
    if (!body) return;
    body.innerHTML = "";
    if (discountLoadError) {
      setEmpty(body, 7, discountLoadError);
      return;
    }
    if (!discounts.length) {
      setEmpty(body, 7, "등록된 할인코드가 없습니다.");
      return;
    }

    discounts.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="popup-check-cell"><input type="checkbox" data-discount-check value="${item.id}" aria-label="할인코드 선택"></td>
        <td class="popup-edit-cell"><button type="button" data-discount-edit="${item.id}" aria-label="수정">⌕</button></td>
        <td>${item.code || "-"}</td>
        <td>${core.money(item.amount)}</td>
        <td>${item.is_active ? "사용" : "미사용"}</td>
        <td>${item.updated_by || item.created_by || "-"}</td>
        <td>${core.formatDateTime(item.updated_at || item.created_at)}</td>
      `;
      body.append(row);
    });
  };

  const renderCurrent = () => {
    if (activeTab === "members") renderMembers();
    else if (activeTab === "popups") renderPopups();
    else if (activeTab === "discounts") renderDiscounts();
    else renderApplications();
  };

  const setTab = (nextTab) => {
    activeTab = nextTab;
    document.querySelectorAll("[data-admin-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.adminTab === activeTab);
    });
    document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.adminPanel !== activeTab;
    });
    document.querySelector("[data-service-filter]")?.toggleAttribute("hidden", activeTab !== "applications");
    document.querySelector("[data-process-filter]")?.toggleAttribute("hidden", activeTab !== "applications");
    renderCurrent();
  };

  const setMemberShortcut = (role = "") => {
    memberRoleFilter = role;
    permissionMode = false;
    permissionUnlocked = false;
    ownerPasscode = "";
    pendingRoleChanges.clear();
    setPermissionMessage("");
    syncPermissionActions();
    setTab("members");
  };

  const setPermissionMode = () => {
    memberRoleFilter = "";
    permissionMode = true;
    permissionUnlocked = false;
    ownerPasscode = "";
    pendingRoleChanges.clear();
    document.querySelector("[data-permission-form]")?.reset();
    setPermissionMessage("");
    syncPermissionActions();
    setTab("members");
  };

  const setServiceShortcut = (service) => {
    const serviceFilter = document.querySelector("[data-service-filter]");
    const processFilter = document.querySelector("[data-process-filter]");
    if (serviceFilter) serviceFilter.value = service || "";
    if (processFilter) processFilter.value = "";
    Object.keys(columnFilters).forEach((key) => {
      columnFilters[key] = "";
    });
    closeColumnFilterPanel();
    setTab("applications");
  };

  const submitPermissionPasscode = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    const passcode = String(form.elements.ownerPasscode.value || "").trim();
    if (!passcode) {
      setPermissionMessage("대표 비밀번호를 입력해주세요.");
      return;
    }
    core.setBusy(submitButton, true, "확인 중...");
    try {
      const { error } = await core.getClient().rpc("verify_owner_passcode", { owner_passcode: passcode });
      if (error) throw error;
      ownerPasscode = passcode;
      permissionUnlocked = true;
      setPermissionMessage("");
      pendingRoleChanges.clear();
      renderMembers();
    } catch (error) {
      console.error(error);
      permissionUnlocked = false;
      ownerPasscode = "";
      setPermissionMessage(error.message || "대표 비밀번호를 확인해주세요.");
    } finally {
      core.setBusy(submitButton, false);
    }
  };

  const updateMemberRole = (event) => {
    const select = event.target.closest("[data-member-role-select]");
    if (!select) return;
    const memberId = select.dataset.memberRoleSelect;
    const nextRole = select.value;
    const member = members.find((item) => item.id === memberId);
    if (!member) return;
    if (normalize(member.user_id) === protectedDeveloperEmail) {
      select.value = "developer";
      setPermissionMessage("고정 developer 계정은 권한을 변경할 수 없습니다.");
      return;
    }
    const currentRole = member.role || "customer";
    if (nextRole === currentRole) {
      pendingRoleChanges.delete(memberId);
    } else {
      pendingRoleChanges.set(memberId, nextRole);
    }
    setPermissionMessage("");
    renderMembers();
  };

  const saveMemberRoles = async () => {
    if (!pendingRoleChanges.size) return;
    const nextRoles = new Map(members.map((item) => [item.id, item.role || "customer"]));
    pendingRoleChanges.forEach((role, id) => nextRoles.set(id, role));
    const developerCount = Array.from(nextRoles.values()).filter((role) => role === "developer").length;
    if (developerCount < 1) {
      setPermissionMessage("developer 권한은 최소 1명 이상이어야 합니다.");
      return;
    }
    const saveButton = document.querySelector("[data-permission-save]");
    core.setBusy(saveButton, true, "저장 중...");
    try {
      for (const [memberId, nextRole] of pendingRoleChanges.entries()) {
        const { error } = await core.getClient().rpc("owner_update_profile_role", {
          target_profile_id: memberId,
          next_role: nextRole,
          owner_passcode: ownerPasscode
        });
        if (error) throw error;
        members = members.map((item) => item.id === memberId ? { ...item, role: nextRole, updated_at: new Date().toISOString() } : item);
      }
      pendingRoleChanges.clear();
      setPermissionMessage("권한이 저장되었습니다.", "success");
      renderMembers();
    } catch (error) {
      console.error(error);
      setPermissionMessage(error.message || "권한 저장 중 오류가 발생했습니다.");
    } finally {
      core.setBusy(saveButton, false);
      syncPermissionActions();
    }
  };

  const load = async (options = {}) => {
    const keepTab = Boolean(options.keepTab);
    const appBody = document.querySelector("[data-admin-all-list]");
    const memberBody = document.querySelector("[data-admin-members-list]");
    const popupBody = document.querySelector("[data-popup-list]");
    const discountBody = document.querySelector("[data-discount-list]");
    setEmpty(appBody, 12, "불러오는 중입니다.");
    setEmpty(memberBody, 10, "불러오는 중입니다.");
    setEmpty(popupBody, 7, "불러오는 중입니다.");
    setEmpty(discountBody, 7, "불러오는 중입니다.");

    try {
      const user = await core.getSessionUser();
      if (!user) {
        window.location.href = "admin-login.html";
        return;
      }
      const profile = await core.getProfile(user);
      if (!["admin", "developer"].includes(profile?.role)) {
        alert("관리자 권한이 필요합니다.");
        window.location.href = "admin-login.html";
        return;
      }
      const admin = { user, profile };
      adminProfile = admin?.profile || null;
      const [applicationResult, memberResult] = await Promise.all([
        core.getClient().from("applications").select("*").order("created_at", { ascending: false }),
        core.getClient().from("profiles").select("*").order("created_at", { ascending: false })
      ]);
      if (applicationResult.error) throw applicationResult.error;
      if (memberResult.error) throw memberResult.error;
      applications = applicationResult.data || [];
      members = memberResult.data || [];

      const popupResult = await core.getClient().from("homepage_popups").select("*").order("created_at", { ascending: false });
      if (popupResult.error) {
        popups = [];
        popupLoadError = "팝업 테이블을 먼저 생성해주세요.";
        setEmpty(popupBody, 7, popupLoadError);
      } else {
        popupLoadError = "";
        popups = popupResult.data || [];
        renderPopups();
      }

      const discountResult = await core.getClient().from("discount_codes").select("*").order("created_at", { ascending: false });
      if (discountResult.error) {
        discounts = [];
        discountLoadError = "할인코드 테이블을 먼저 생성해주세요.";
        setEmpty(discountBody, 7, discountLoadError);
      } else {
        discountLoadError = "";
        discounts = discountResult.data || [];
        renderDiscounts();
      }
      renderApplications();
      renderMembers();
      setTab(keepTab ? activeTab : "applications");
    } catch (error) {
      console.error(error);
      setEmpty(appBody, 12, "관리자 권한 또는 Supabase 설정을 확인해주세요.");
      setEmpty(memberBody, 10, "관리자 권한 또는 Supabase 설정을 확인해주세요.");
      setEmpty(popupBody, 7, "메인 팝업 테이블 또는 Storage 설정을 확인해주세요.");
      setEmpty(discountBody, 7, "할인코드 테이블 설정을 확인해주세요.");
    }
  };

  const popupModal = () => document.querySelector("[data-popup-modal]");
  const popupForm = () => document.querySelector("[data-popup-form]");

  const openPopupModal = (item = null) => {
    const modal = popupModal();
    const form = popupForm();
    if (!modal || !form) return;
    form.reset();
    form.elements.id.value = item?.id || "";
    form.elements.imageUrl.value = item?.image_url || "";
    form.elements.imagePath.value = item?.image_path || "";
    form.elements.startDate.value = item?.start_date || todayText();
    form.elements.endDate.value = item?.end_date || todayText();
    form.elements.isActive.value = String(item?.is_active ?? true);
    document.querySelector("[data-popup-modal-title]").textContent = item ? "모달팝업 수정" : "모달팝업 추가";
    const preview = document.querySelector("[data-popup-preview]");
    if (preview) {
      preview.hidden = !item?.image_url;
      preview.innerHTML = item?.image_url ? `<img src="${item.image_url}" alt="">` : "";
    }
    modal.hidden = false;
  };

  const closePopupModal = () => {
    const modal = popupModal();
    if (modal) modal.hidden = true;
  };

  const selectedPopupIds = () =>
    Array.from(document.querySelectorAll("[data-popup-check]:checked")).map((input) => input.value);

  const uploadPopupImage = async (file) => {
    const extension = file.name.split(".").pop() || "png";
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    const path = `main/${safeName}`;
    const { error } = await core.getClient().storage.from("popup-images").upload(path, file, {
      cacheControl: "31536000",
      upsert: false
    });
    if (error) throw error;
    const { data } = core.getClient().storage.from("popup-images").getPublicUrl(path);
    return { imagePath: path, imageUrl: data.publicUrl };
  };

  const savePopup = async (event) => {
    event.preventDefault();
    clearPopupMessage();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    core.setBusy(submitButton, true, "저장 중...");
    try {
      const file = form.elements.imageFile.files?.[0];
      let imageUrl = form.elements.imageUrl.value;
      let imagePath = form.elements.imagePath.value;
      if (file) {
        const uploaded = await uploadPopupImage(file);
        imageUrl = uploaded.imageUrl;
        imagePath = uploaded.imagePath;
      }
      if (!imageUrl) throw new Error("이미지를 선택해주세요.");

      const row = {
        image_url: imageUrl,
        image_path: imagePath,
        start_date: form.elements.startDate.value,
        end_date: form.elements.endDate.value,
        is_active: form.elements.isActive.value === "true",
        updated_by: adminProfile?.name || adminProfile?.user_id || ""
      };
      if (!row.start_date || !row.end_date) throw new Error("게시기간을 선택해주세요.");

      const id = form.elements.id.value;
      const result = id
        ? await core.getClient().from("homepage_popups").update(row).eq("id", id).select("*").single()
        : await core.getClient().from("homepage_popups").insert({
            ...row,
            created_by: adminProfile?.name || adminProfile?.user_id || ""
          }).select("*").single();
      if (result.error) throw result.error;

      const reload = await core.getClient().from("homepage_popups").select("*").order("created_at", { ascending: false });
      if (reload.error) throw reload.error;
      popups = reload.data || [];
      renderPopups();
      closePopupModal();
      setPopupMessage("저장되었습니다.", "success");
    } catch (error) {
      console.error(error);
      setPopupMessage(error.message || "팝업 저장 중 오류가 발생했습니다.");
    } finally {
      core.setBusy(submitButton, false);
    }
  };

  const deleteSelectedPopups = async () => {
    const ids = selectedPopupIds();
    if (!ids.length) {
      setPopupMessage("삭제할 팝업을 선택해주세요.");
      return;
    }
    if (!confirm("선택한 팝업을 삭제할까요?")) return;
    clearPopupMessage();
    try {
      const targets = popups.filter((item) => ids.includes(item.id));
      const { error } = await core.getClient().from("homepage_popups").delete().in("id", ids);
      if (error) throw error;
      const paths = targets.map((item) => item.image_path).filter(Boolean);
      if (paths.length) await core.getClient().storage.from("popup-images").remove(paths);
      popups = popups.filter((item) => !ids.includes(item.id));
      renderPopups();
      setPopupMessage("삭제되었습니다.", "success");
    } catch (error) {
      console.error(error);
      setPopupMessage(error.message || "삭제 중 오류가 발생했습니다.");
    }
  };

  const discountModal = () => document.querySelector("[data-discount-modal]");
  const discountForm = () => document.querySelector("[data-discount-form]");

  const openDiscountModal = (item = null) => {
    const modal = discountModal();
    const form = discountForm();
    if (!modal || !form) return;
    form.reset();
    form.elements.id.value = item?.id || "";
    form.elements.code.value = item?.code || "";
    form.elements.amount.value = item?.amount || "";
    form.elements.isActive.value = String(item?.is_active ?? true);
    document.querySelector("[data-discount-modal-title]").textContent = item ? "할인코드 수정" : "할인코드 추가";
    modal.hidden = false;
  };

  const closeDiscountModal = () => {
    const modal = discountModal();
    if (modal) modal.hidden = true;
  };

  const selectedDiscountIds = () =>
    Array.from(document.querySelectorAll("[data-discount-check]:checked")).map((input) => input.value);

  const reloadDiscounts = async () => {
    const result = await core.getClient().from("discount_codes").select("*").order("created_at", { ascending: false });
    if (result.error) throw result.error;
    discountLoadError = "";
    discounts = result.data || [];
    renderDiscounts();
  };

  const saveDiscount = async (event) => {
    event.preventDefault();
    clearDiscountMessage();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    core.setBusy(submitButton, true, "저장 중...");
    try {
      const code = String(form.elements.code.value || "").trim();
      const amount = Number(form.elements.amount.value || 0);
      if (!code) throw new Error("할인코드를 입력해주세요.");
      if (!amount || amount < 0) throw new Error("할인금액을 입력해주세요.");

      const row = {
        code,
        amount,
        is_active: form.elements.isActive.value === "true",
        updated_by: adminProfile?.name || adminProfile?.user_id || ""
      };
      const id = form.elements.id.value;
      const result = id
        ? await core.getClient().from("discount_codes").update(row).eq("id", id).select("*").single()
        : await core.getClient().from("discount_codes").insert({
            ...row,
            created_by: adminProfile?.name || adminProfile?.user_id || ""
          }).select("*").single();
      if (result.error) throw result.error;

      await reloadDiscounts();
      closeDiscountModal();
      setDiscountMessage("저장되었습니다.", "success");
    } catch (error) {
      console.error(error);
      setDiscountMessage(error.message || "할인코드 저장 중 오류가 발생했습니다.");
    } finally {
      core.setBusy(submitButton, false);
    }
  };

  const deleteSelectedDiscounts = async () => {
    const ids = selectedDiscountIds();
    if (!ids.length) {
      setDiscountMessage("삭제할 할인코드를 선택해주세요.");
      return;
    }
    if (!confirm("선택한 할인코드를 삭제할까요?")) return;
    clearDiscountMessage();
    try {
      const { error } = await core.getClient().from("discount_codes").delete().in("id", ids);
      if (error) throw error;
      await reloadDiscounts();
      setDiscountMessage("삭제되었습니다.", "success");
    } catch (error) {
      console.error(error);
      setDiscountMessage(error.message || "삭제 중 오류가 발생했습니다.");
    }
  };

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.adminTab === "applications") {
        setServiceShortcut("");
        return;
      }
      if (button.dataset.adminTab === "members") {
        if (button.dataset.permissionMode === "true") {
          setPermissionMode();
          return;
        }
        setMemberShortcut(button.dataset.memberFilter || "");
        return;
      }
      setTab(button.dataset.adminTab);
    });
  });
  document.querySelectorAll("[data-service-shortcut]").forEach((button) => {
    button.addEventListener("click", () => setServiceShortcut(button.dataset.serviceShortcut));
  });
  document.querySelector("[data-admin-refresh]")?.addEventListener("click", async () => {
    const button = document.querySelector("[data-admin-refresh]");
    core.setBusy(button, true, "새로고침 중...");
    try {
      await load({ keepTab: true });
    } finally {
      core.setBusy(button, false);
    }
  });
  document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
    await core.getClient().auth.signOut();
    core.clearSessionProfile?.();
    window.location.href = "login.html";
  });
  document.querySelector("[data-admin-search]")?.addEventListener("input", renderCurrent);
  document.querySelector("[data-service-filter]")?.addEventListener("change", renderApplications);
  document.querySelector("[data-process-filter]")?.addEventListener("change", renderApplications);
  document.querySelector("[data-permission-form]")?.addEventListener("submit", submitPermissionPasscode);
  document.querySelector("[data-admin-members-list]")?.addEventListener("change", updateMemberRole);
  document.querySelector("[data-permission-save]")?.addEventListener("click", saveMemberRoles);
  document.querySelector("[data-member-add]")?.addEventListener("click", () => openMemberModal());
  document.querySelector("[data-member-delete-selected]")?.addEventListener("click", () => {
    setMemberMessage("회원 삭제는 Auth 계정 삭제 정책 연결 후 사용할 수 있습니다.");
  });
  document.querySelector("[data-member-download]")?.addEventListener("click", downloadMembers);
  document.querySelector("[data-member-check-all]")?.addEventListener("change", (event) => {
    document.querySelectorAll("[data-member-check]").forEach((input) => {
      input.checked = event.target.checked;
    });
  });
  document.querySelector("[data-admin-members-list]")?.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-member-edit]");
    if (!edit) return;
    openMemberModal(edit.dataset.memberEdit);
  });
  document.querySelector("[data-member-form]")?.addEventListener("submit", saveMemberProfile);
  document.querySelectorAll("[data-member-modal-close]").forEach((button) => {
    button.addEventListener("click", closeMemberModal);
  });
  document.querySelectorAll("[data-column-filter]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = button.dataset.columnFilter;
      if (activeColumnFilter === key && !document.querySelector("[data-column-filter-panel]")?.hidden) {
        closeColumnFilterPanel();
        return;
      }
      renderColumnFilterPanel(key, button);
    });
  });
  document.querySelector("[data-column-filter-panel]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest("[data-column-filter-apply]")) applyColumnFilter();
    if (event.target.closest("[data-column-filter-clear]")) clearColumnFilter();
  });
  document.querySelector("[data-column-filter-panel]")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyColumnFilter();
    if (event.key === "Escape") closeColumnFilterPanel();
  });
  document.addEventListener("click", closeColumnFilterPanel);
  document.querySelector("[data-admin-all-list]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-application-toggle]");
    if (!button) return;
    expandedApplicationId = expandedApplicationId === button.dataset.applicationToggle ? "" : button.dataset.applicationToggle;
    renderApplications();
  });
  document.querySelector("[data-popup-add]")?.addEventListener("click", () => openPopupModal());
  document.querySelectorAll("[data-popup-close]").forEach((button) => {
    button.addEventListener("click", closePopupModal);
  });
  document.querySelector("[data-popup-file-button]")?.addEventListener("click", () => {
    document.querySelector(".popup-file-input")?.click();
  });
  document.querySelector(".popup-file-input")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const preview = document.querySelector("[data-popup-preview]");
    if (!preview || !file) return;
    preview.hidden = false;
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
  });
  popupForm()?.addEventListener("submit", savePopup);
  document.querySelector("[data-popup-delete-selected]")?.addEventListener("click", deleteSelectedPopups);
  document.querySelector("[data-popup-check-all]")?.addEventListener("change", (event) => {
    document.querySelectorAll("[data-popup-check]").forEach((input) => {
      input.checked = event.target.checked;
    });
  });
  document.querySelector("[data-popup-list]")?.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-popup-edit]");
    if (!edit) return;
    const item = popups.find((popup) => popup.id === edit.dataset.popupEdit);
    if (item) openPopupModal(item);
  });
  document.querySelector("[data-discount-add]")?.addEventListener("click", () => openDiscountModal());
  document.querySelectorAll("[data-discount-close]").forEach((button) => {
    button.addEventListener("click", closeDiscountModal);
  });
  discountForm()?.addEventListener("submit", saveDiscount);
  document.querySelector("[data-discount-delete-selected]")?.addEventListener("click", deleteSelectedDiscounts);
  document.querySelector("[data-discount-check-all]")?.addEventListener("change", (event) => {
    document.querySelectorAll("[data-discount-check]").forEach((input) => {
      input.checked = event.target.checked;
    });
  });
  document.querySelector("[data-discount-list]")?.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-discount-edit]");
    if (!edit) return;
    const item = discounts.find((discount) => discount.id === edit.dataset.discountEdit);
    if (item) openDiscountModal(item);
  });

  load();
})();
