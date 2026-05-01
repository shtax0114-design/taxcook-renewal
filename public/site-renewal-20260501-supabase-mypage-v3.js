(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const fillText = (selector, value) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value || "-";
    });
  };

  const renderApplications = (applications) => {
    const body = document.querySelector("[data-my-applications]");
    const mobileList = document.querySelector("[data-my-mobile-applications]");
    if (body) body.innerHTML = "";
    if (mobileList) mobileList.innerHTML = "";

    if (!applications.length) {
      if (body) body.innerHTML = '<tr><td colspan="5" class="empty-cell">아직 신청 내역이 없습니다.</td></tr>';
      if (mobileList) mobileList.innerHTML = '<div class="mypage-empty-card">아직 신청 내역이 없습니다.</div>';
      return;
    }

    applications.forEach((application) => {
      const values = [
        ["귀속", application.period || "-"],
        ["신청일자", core.formatDateTime(application.requested_at || application.created_at)],
        ["신고일자", application.reported_at ? core.formatDateTime(application.reported_at) : application.report_date || "-"],
        ["납부(환급)내역", application.payment_summary || application.payment_status || "-"],
        ["고객 안내사항", application.customer_memo || application.process_status || "-"]
      ];

      if (body) {
        const row = document.createElement("tr");
        values.forEach(([, value]) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });
        body.appendChild(row);
      }

      if (mobileList) {
        const card = document.createElement("article");
        card.className = "mypage-mobile-card";
        values.forEach(([label, value], index) => {
          const item = document.createElement("div");
          item.className = index === values.length - 1 ? "mobile-history-item wide" : "mobile-history-item";
          const term = document.createElement("span");
          term.textContent = label;
          const desc = document.createElement("strong");
          desc.textContent = value;
          item.append(term, desc);
          card.appendChild(item);
        });
        mobileList.appendChild(card);
      }
    });
  };

  const paintProfile = (user, profile) => {
    const fallback = core.fallbackProfile(user);
    const merged = { ...fallback, ...(profile || {}) };
    fillText("[data-my-name]", merged.name || merged.user_id || "택스쿡 고객");
    fillText("[data-profile-userid]", merged.user_id || core.emailToUserId(user.email));
    fillText("[data-profile-name]", merged.name || "-");
    fillText("[data-profile-phone]", merged.phone || "-");
    fillText("[data-profile-business]", merged.business_type || "-");
  };

  const boot = async () => {
    let user = null;
    try {
      user = await core.requireUser();
      if (!user) return;

      const profile = await core.getProfile(user);
      paintProfile(user, profile);

      const { data, error } = await core.getClient()
        .from("applications")
        .select("*")
        .eq("uid", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      renderApplications(data || []);
    } catch (error) {
      console.error(error);
      if (user) paintProfile(user, null);
      renderApplications([]);
    }
  };

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await core.getClient().auth.signOut();
    window.location.href = "login.html";
  });

  boot();
})();
