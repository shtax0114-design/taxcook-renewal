const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.dataset.open === "true";
    nav.dataset.open = String(!isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });
}

const appStoreKey = "taxcookPreviewApplications";
const profileFallbackKey = (uid) => `taxcookProfile:${uid}`;

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const seedApplications = () => {
  const existing = readJson(appStoreKey, []);
  if (existing.length) return existing;

  const seeded = [
    {
      id: "VAT-20240119-001",
      service: "vatax",
      loginId: "sample-vat",
      customerName: "선하우징",
      period: "2023 년 2기확정(7~12월, 익년1/25신고)",
      type: "부가가치세",
      paymentStatus: "취소",
      processStatus: "신고유형 검토 및 결제",
      customerMemo: "기한 후 신고 추가수수료 55,000원 안내 예정",
      requestedAt: new Date().toISOString(),
      reportedAt: "",
      paymentSummary: "취소",
      updatedAt: new Date().toISOString()
    },
    {
      id: "GIT-20240502-001",
      service: "gitax",
      loginId: "sample-gitax",
      customerName: "김정수",
      period: "2023 귀속 정기 신고",
      type: "종합소득세",
      paymentStatus: "결제완료",
      processStatus: "신청 접수 및 계약금 결제",
      customerMemo: "자료 검토 후 추가 안내드리겠습니다.",
      requestedAt: new Date().toISOString(),
      reportedAt: "",
      paymentSummary: "계약금 결제완료",
      updatedAt: new Date().toISOString()
    }
  ];

  writeJson(appStoreKey, seeded);
  return seeded;
};

const getUserId = (user) => (user?.email || "").split("@")[0] || "";

const getProfile = async (db, user) => {
  const fallback = readJson(profileFallbackKey(user.uid), {});

  if (!db) {
    return {
      userId: getUserId(user),
      name: user.displayName || fallback.name || "택스쿡 고객",
      ...fallback
    };
  }

  try {
    const snapshot = await db.collection("members").doc(user.uid).get();
    return {
      userId: getUserId(user),
      name: user.displayName || "택스쿡 고객",
      ...fallback,
      ...(snapshot.exists ? snapshot.data() : {})
    };
  } catch (error) {
    console.warn("Profile was loaded from local fallback because Firestore is not ready.", error);
    return {
      userId: getUserId(user),
      name: user.displayName || fallback.name || "택스쿡 고객",
      ...fallback
    };
  }
};

const fillText = (selector, value) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value || "-";
  });
};

const renderApplications = (profile) => {
  const body = document.querySelector("[data-my-applications]");
  const mobileList = document.querySelector("[data-my-mobile-applications]");
  if (!body && !mobileList) return;

  const applications = seedApplications().filter((application) => {
    return application.loginId === profile.userId || application.customerName === profile.name;
  });

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
      ["신청일자", formatDateTime(application.requestedAt || application.createdAt || application.updatedAt)],
      ["신고일자", application.reportedAt ? formatDateTime(application.reportedAt) : "-"],
      ["납부(환급)내역", application.paymentSummary || application.paymentStatus || "-"],
      ["안내사항", application.customerMemo || "-"]
    ];

    const row = document.createElement("tr");
    values.forEach(([, value]) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    body?.appendChild(row);

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

const bootMypage = () => {
  if (!window.firebase?.apps?.length) {
    window.location.replace("login.html");
    return;
  }

  const auth = window.firebase.auth();
  const db = window.firebase.firestore?.();

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    const profile = await getProfile(db, user);
    fillText("[data-my-name]", profile.name || user.displayName || "택스쿡 고객");
    fillText("[data-profile-userid]", profile.userId || getUserId(user));
    fillText("[data-profile-name]", profile.name || user.displayName || "-");
    fillText("[data-profile-phone]", profile.phone || "-");
    fillText("[data-profile-business]", profile.businessType || "-");
    renderApplications(profile);
  });

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });
};

bootMypage();
