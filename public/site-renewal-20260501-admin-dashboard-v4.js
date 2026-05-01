(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  let applications = [];
  let members = [];
  let activeTab = "applications";

  const serviceLabel = (service) => service === "gitax" ? "종합소득세" : "부가가치세";
  const normalize = (value) => String(value || "").toLowerCase();

  const getKeyword = () => normalize(document.querySelector("[data-admin-search]")?.value);
  const getServiceFilter = () => document.querySelector("[data-service-filter]")?.value || "";
  const getProcessFilter = () => document.querySelector("[data-process-filter]")?.value || "";

  const setEmpty = (target, colspan, message) => {
    if (target) target.innerHTML = `<tr><td colspan="${colspan}" class="empty-cell">${message}</td></tr>`;
  };

  const detailValue = (value) => value || "-";

  const inlineDetailHtml = (item) => `
    <div class="admin-inline-detail">
      <div class="admin-inline-item"><span>신청자</span><strong>${detailValue(item.customer_name)}</strong></div>
      <div class="admin-inline-item"><span>업체명</span><strong>${detailValue(item.company)}</strong></div>
      <div class="admin-inline-item"><span>사업자번호</span><strong>${detailValue(item.biz_number)}</strong></div>
      <div class="admin-inline-item"><span>쿠폰</span><strong>${detailValue(item.coupon)}</strong></div>
      <div class="admin-inline-item"><span>신청일자</span><strong>${core.formatDateTime(item.requested_at || item.created_at)}</strong></div>
      <div class="admin-inline-item"><span>신고일자</span><strong>${item.report_date || "-"}</strong></div>
      <div class="admin-inline-item"><span>추가결제</span><strong>${detailValue(item.extra_payment_type)} / ${core.money(item.extra_payment_amount)}</strong></div>
      <div class="admin-inline-item"><span>주문상품</span><strong>${detailValue(item.order_name)}</strong></div>
      <div class="admin-inline-item wide"><span>고객 안내 메모</span><strong>${detailValue(item.customer_memo)}</strong></div>
      <div class="admin-inline-item wide"><span>관리자 내부 메모</span><strong>${item.admin_memo ? "있음" : "없음"}</strong></div>
      <div class="admin-inline-item wide"><span>상세 처리</span><strong><a class="ops-button" href="application-detail.html?id=${encodeURIComponent(item.id)}">상세 열기</a></strong></div>
    </div>
  `;

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
        core.money(item.final_payment_amount || item.payment_due || item.final_tax_due),
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
          button.className = "admin-expand-button";
          button.setAttribute("aria-expanded", "false");
          button.innerHTML = `<span class="admin-expand-caret" aria-hidden="true"></span><span>${value}</span>`;
          button.addEventListener("click", () => {
            const expanded = button.getAttribute("aria-expanded") === "true";
            document.querySelectorAll(".admin-detail-row").forEach((detailRow) => detailRow.remove());
            document.querySelectorAll(".admin-expand-button[aria-expanded='true']").forEach((openButton) => {
              openButton.setAttribute("aria-expanded", "false");
            });
            if (expanded) return;
            button.setAttribute("aria-expanded", "true");
            const detailRow = document.createElement("tr");
            detailRow.className = "admin-detail-row";
            detailRow.innerHTML = `<td colspan="12">${inlineDetailHtml(item)}</td>`;
            row.after(detailRow);
          });
          cell.append(button);
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      });
      body.append(row);
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

  const renderCurrent = () => {
    if (activeTab === "members") renderMembers();
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
    setEmpty(appBody, 12, "불러오는 중입니다.");
    setEmpty(memberBody, 8, "불러오는 중입니다.");

    try {
      await core.requireAdmin();
      const [applicationResult, memberResult] = await Promise.all([
        core.getClient().from("applications").select("*").order("created_at", { ascending: false }),
        core.getClient().from("profiles").select("*").order("created_at", { ascending: false })
      ]);
      if (applicationResult.error) throw applicationResult.error;
      if (memberResult.error) throw memberResult.error;
      applications = applicationResult.data || [];
      members = memberResult.data || [];
      renderApplications();
      renderMembers();
      setTab("applications");
    } catch (error) {
      console.error(error);
      setEmpty(appBody, 12, "관리자 권한 또는 Supabase 설정을 확인해주세요.");
      setEmpty(memberBody, 8, "관리자 권한 또는 Supabase 설정을 확인해주세요.");
    }
  };

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.adminTab));
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

  load();
})();
