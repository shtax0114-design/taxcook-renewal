(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const serviceLabel = (service) => service === "gitax" ? "종합소득세" : "부가가치세";

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

      const applications = data || [];
      body.innerHTML = "";
      if (!applications.length) {
        body.innerHTML = '<tr><td colspan="12" class="empty-cell">신청 내역이 없습니다.</td></tr>';
        return;
      }

      applications.forEach((application) => {
        const row = document.createElement("tr");
        const detailHref = `application-detail.html?id=${encodeURIComponent(application.id)}`;
        const values = [
          serviceLabel(application.service),
          application.company || application.customer_name || "-",
          application.business_type || "-",
          application.type || "-",
          application.process_status || "-",
          application.payment_status || "-",
          application.payment_summary || "-",
          core.money(application.final_payment_amount || application.payment_due || application.final_tax_due),
          application.manager || "-",
          application.phone || "-",
          application.updated_by || "-",
          core.formatDateTime(application.updated_at || application.created_at)
        ];

        values.forEach((value, index) => {
          const cell = document.createElement("td");
          if (index === 0) {
            const link = document.createElement("a");
            link.href = detailHref;
            link.textContent = value;
            cell.appendChild(link);
          } else {
            cell.textContent = value;
          }
          row.appendChild(cell);
        });
        body.appendChild(row);
      });
    } catch (error) {
      console.error(error);
      body.innerHTML = '<tr><td colspan="12" class="empty-cell">관리자 권한 또는 Supabase 설정을 확인해주세요.</td></tr>';
    }
  };

  renderList();
})();
