(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const fillText = (selector, value) => {
    const target = document.querySelector(selector);
    if (target) target.textContent = value || "-";
  };

  const setValue = (selector, value) => {
    const target = document.querySelector(selector);
    if (target) target.value = value || "";
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
        row.innerHTML = values.map(([, value]) => `<td>${value}</td>`).join("");
        body.append(row);
      }

      if (mobileList) {
        const card = document.createElement("article");
        card.className = "mypage-mobile-card";
        card.innerHTML = values.map(([label, value], index) => (
          `<div class="mobile-history-item${index === 4 ? " wide" : ""}"><span>${label}</span><strong>${value}</strong></div>`
        )).join("");
        mobileList.append(card);
      }
    });
  };

  const paintProfile = (user, profile) => {
    const merged = { ...core.fallbackProfile(user), ...(profile || {}) };
    const displayName = merged.name || "택스쿡 고객";
    fillText("[data-my-name]", displayName);
    fillText("[data-profile-email]", merged.email || user.email);
    fillText("[data-profile-name]", merged.name || "-");
    fillText("[data-profile-phone]", merged.phone || "-");
    fillText("[data-profile-business]", merged.business_type || "-");
    fillText("[data-profile-biznum]", merged.biz_number || "-");

    setValue('[name="name"]', merged.name);
    setValue('[name="phone"]', merged.phone);
    setValue('[name="businessType"]', merged.business_type);
    setValue('[name="bizNumber"]', merged.biz_number);
  };

  const validateProfile = (profile) => {
    if (!profile.name) return "성명을 입력해주세요.";
    if (!/^\d{10,11}$/.test(profile.phone)) return "휴대폰번호는 숫자만 10~11자리로 입력해주세요.";
    if (!profile.business_type) return "사업자구분을 선택해주세요.";
    return "";
  };

  const load = async () => {
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

  document.querySelector("[data-profile-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const user = await core.requireUser();
    if (!user) return;

    const formData = new FormData(form);
    const profile = {
      name: String(formData.get("name") || "").trim(),
      phone: core.onlyDigits(formData.get("phone")),
      business_type: String(formData.get("businessType") || ""),
      biz_number: core.onlyDigits(formData.get("bizNumber"))
    };
    const validation = validateProfile(profile);

    core.hideMessage("[data-profile-message]");
    if (validation) return core.showMessage("[data-profile-message]", validation);

    core.setBusy(button, true, "저장 중...");
    try {
      const saved = await core.saveProfile(user, profile);
      paintProfile(user, saved);
      core.showMessage("[data-profile-message]", "고객정보를 저장했습니다.", "success");
    } catch (error) {
      console.error("Profile save failed", error);
      core.showMessage("[data-profile-message]", "고객정보 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      core.setBusy(button, false);
    }
  });

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await core.getClient().auth.signOut();
    core.clearSessionProfile();
    window.location.href = "login.html";
  });

  load();
})();
