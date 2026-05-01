(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const serviceLabel = (service) => service === "gitax" ? "종합소득세" : "부가가치세";
  let applications = [];
  let expandedApplicationId = "";
  const defaultVataxFee = (businessType = "") => businessType.includes("일반") ? 110000 : 88000;
  const displayFinalAmount = (application) => {
    if (application.service === "vatax") return defaultVataxFee(application.business_type);
    if (application.final_payment_amount || application.payment_due || application.final_tax_due) {
      return application.final_payment_amount || application.payment_due || application.final_tax_due;
    }
    return null;
  };

  const normalize = (value) => String(value || "").toLowerCase();

  const renderRows = () => {
    const body = document.querySelector("[data-admin-real-list]");
    if (!body) return;

    const keyword = normalize(document.querySelector("[data-admin-search]")?.value);
    const filtered = applications.filter((item) => {
      if (!keyword) return true;
      return [
        item.customer_name,
        item.company,
        item.phone,
        item.period,
        item.process_status,
        item.payment_status,
        item.manager
      ].some((value) => normalize(value).includes(keyword));
    });

    body.innerHTML = "";
    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="12" class="empty-cell">신청 내역이 없습니다.</td></tr>';
      return;
    }

    filtered.forEach((application) => {
      const row = document.createElement("tr");
      const values = [
        `${serviceLabel(application.service)} / ${application.period || "-"}`,
        application.company || application.customer_name || "-",
        application.business_type || "-",
        application.type || "-",
        application.process_status || "-",
        application.payment_status || "-",
        application.before_deadline ? "전달완료" : "-",
        core.money(displayFinalAmount(application)),
        application.manager || "-",
        application.phone || "-",
        application.updated_by || "-",
        core.formatDateTime(application.updated_at || application.created_at)
      ];

      values.forEach((value, index) => {
        const cell = document.createElement("td");
        if (index === 0) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "admin-row-link";
          button.dataset.applicationToggle = application.id;
          button.setAttribute("aria-expanded", String(expandedApplicationId === application.id));
          button.textContent = value;
          cell.append(button);
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      });
      body.append(row);

      if (expandedApplicationId === application.id) {
        const detailRow = document.createElement("tr");
        detailRow.className = "admin-detail-dropdown-row";
        const detailCell = document.createElement("td");
        detailCell.colSpan = 12;
        const wrapper = document.createElement("div");
        wrapper.className = "admin-detail-dropdown";
        const frame = document.createElement("iframe");
        frame.className = "admin-detail-frame";
        frame.title = `${serviceLabel(application.service)} 신청 상세`;
        frame.src = `application-detail.html?id=${encodeURIComponent(application.id)}&detailVersion=20260501-v9`;
        wrapper.append(frame);
        detailCell.append(wrapper);
        detailRow.append(detailCell);
        body.append(detailRow);
      }
    });
  };

  const renderList = async () => {
    const body = document.querySelector("[data-admin-real-list]");
    if (!body) return;

    const service = body.dataset.service;
    body.innerHTML = '<tr><td colspan="12" class="empty-cell">불러오는 중입니다.</td></tr>';

    try {
      await core.requireAdmin();
      const { data, error } = await core.getClient()
        .from("applications")
        .select("*")
        .eq("service", service)
        .order("created_at", { ascending: false });
      if (error) throw error;
      applications = data || [];
      renderRows();
    } catch (error) {
      console.error(error);
      body.innerHTML = '<tr><td colspan="12" class="empty-cell">관리자 권한 또는 Supabase 설정을 확인해주세요.</td></tr>';
    }
  };

  document.querySelector("[data-admin-search]")?.addEventListener("input", renderRows);
  document.querySelector("[data-admin-real-list]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-application-toggle]");
    if (!button) return;
    expandedApplicationId = expandedApplicationId === button.dataset.applicationToggle ? "" : button.dataset.applicationToggle;
    renderRows();
  });
  renderList();
})();
