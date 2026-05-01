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

  const getKeyword = () => normalize(document.querySelector("[data-admin-search]")?.value);
  const getServiceFilter = () => document.querySelector("[data-service-filter]")?.value || "";
  const getProcessFilter = () => document.querySelector("[data-process-filter]")?.value || "";

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

  const renderApplications = () => {
    const body = document.querySelector("[data-admin-all-list]");
    if (!body) return;
    const keyword = getKeyword();
    const serviceFilter = getServiceFilter();
    const processFilter = getProcessFilter();

    const filtered = applications.filter((item) => {
      if (serviceFilter && item.service !== serviceFilter) return false;
      if (processFilter && item.process_status !== processFilter) return false;
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
        item.before_deadline ? "전달완료" : "-",
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
  };

  const renderMembers = () => {
    const body = document.querySelector("[data-admin-members-list]");
    if (!body) return;
    const keyword = getKeyword();
    const filtered = members.filter((item) => {
      if (!keyword) return true;
      return [
        item.role,
        item.user_id,
        item.name,
        item.phone,
        item.business_type,
        item.biz_number
      ].some((value) => normalize(value).includes(keyword));
    });

    body.innerHTML = "";
    if (!filtered.length) {
      setEmpty(body, 8, "회원정보가 없습니다.");
      return;
    }

    filtered.forEach((item) => {
      const row = document.createElement("tr");
      [
        item.role || "customer",
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

  const setServiceShortcut = (service) => {
    const serviceFilter = document.querySelector("[data-service-filter]");
    const processFilter = document.querySelector("[data-process-filter]");
    if (serviceFilter) serviceFilter.value = service || "";
    if (processFilter) processFilter.value = "";
    setTab("applications");
  };

  const load = async () => {
    const appBody = document.querySelector("[data-admin-all-list]");
    const memberBody = document.querySelector("[data-admin-members-list]");
    const popupBody = document.querySelector("[data-popup-list]");
    const discountBody = document.querySelector("[data-discount-list]");
    setEmpty(appBody, 12, "불러오는 중입니다.");
    setEmpty(memberBody, 8, "불러오는 중입니다.");
    setEmpty(popupBody, 7, "불러오는 중입니다.");
    setEmpty(discountBody, 7, "불러오는 중입니다.");

    try {
      const admin = await core.requireAdmin();
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
      setTab("applications");
    } catch (error) {
      console.error(error);
      setEmpty(appBody, 12, "관리자 권한 또는 Supabase 설정을 확인해주세요.");
      setEmpty(memberBody, 8, "관리자 권한 또는 Supabase 설정을 확인해주세요.");
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
      setTab(button.dataset.adminTab);
    });
  });
  document.querySelectorAll("[data-service-shortcut]").forEach((button) => {
    button.addEventListener("click", () => setServiceShortcut(button.dataset.serviceShortcut));
  });
  document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
    await core.getClient().auth.signOut();
    core.clearSessionProfile?.();
    window.location.href = "login.html";
  });
  document.querySelector("[data-admin-search]")?.addEventListener("input", renderCurrent);
  document.querySelector("[data-service-filter]")?.addEventListener("change", renderApplications);
  document.querySelector("[data-process-filter]")?.addEventListener("change", renderApplications);
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
