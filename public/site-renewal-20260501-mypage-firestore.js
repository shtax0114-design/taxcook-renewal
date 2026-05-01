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

const toDateValue = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = toDateValue(value);
  if (!date) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
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

const readLocalApplications = (profile) => {
  return readJson(appStoreKey, []).filter((application) => {
    return application.uid === profile.uid || application.loginId === profile.userId || application.customerName === profile.name;
  });
};

const loadApplications = async (db, user, profile) => {
  const fallbackProfile = { ...profile, uid: user.uid };

  if (!db) return readLocalApplications(fallbackProfile);

  try {
    const snapshot = await db.collection("applications").where("uid", "==", user.uid).get();
    const applications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return applications.sort((a, b) => {
      const bTime = toDateValue(b.createdAt || b.requestedAt || b.updatedAt)?.getTime() || 0;
      const aTime = toDateValue(a.createdAt || a.requestedAt || a.updatedAt)?.getTime() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.warn("Applications were loaded from local fallback because Firestore is not ready.", error);
    return readLocalApplications(fallbackProfile);
  }
};

const fillText = (selector, value) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value || "-";
  });
};

const renderApplications = (applications) => {
  const body = document.querySelector("[data-my-applications]");
  const mobileList = document.querySelector("[data-my-mobile-applications]");
  if (!body && !mobileList) return;

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
    const profileWithUid = { ...profile, uid: user.uid };
    const applications = await loadApplications(db, user, profileWithUid);

    fillText("[data-my-name]", profile.name || user.displayName || "택스쿡 고객");
    fillText("[data-profile-userid]", profile.userId || getUserId(user));
    fillText("[data-profile-name]", profile.name || user.displayName || "-");
    fillText("[data-profile-phone]", profile.phone || "-");
    fillText("[data-profile-business]", profile.businessType || "-");
    renderApplications(applications);
  });

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });
};

bootMypage();
