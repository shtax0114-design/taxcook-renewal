const appStoreKey = "taxcookPreviewApplications";
const memberStoreKey = "taxcookPreviewMembers";
const sessionKey = "taxcookPreviewSession";

const nowIso = () => new Date().toISOString();

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
      appliedAt: "2024-01-19T10:33:00+09:00",
      customerName: "선하우징",
      applicantName: "선하우징",
      loginId: "sample-vat",
      businessNumber: "203-11-62182",
      phone: "010-7772-0043",
      birthDate: "",
      businessType: "일반사업자",
      taxYear: "2023 년",
      reportType: "일반과세자",
      period: "2023 년 2기확정(7~12월, 익년1/25신고)",
      type: "부가가치세",
      couponCode: "",
      baseFee: 110000,
      discountAmount: 0,
      supplyAmount: 110000,
      finalFee: 110000,
      paymentStatus: "취소",
      bankName: "경남은행",
      paidAmount: 110000,
      orderName: "부가가치세 기본수수료",
      receiptUrl: "https://dashboard.tosspayments.com/receipt/redirection",
      reportDate: "2024-01-20",
      creditDeduction: 0,
      extraPaymentType: "기타",
      extraPaymentAmount: 0,
      paymentDue: 0,
      manager: "",
      incomeExtraType: "소득추가",
      incomeExtraAmount: 0,
      businessExtraType: "사업추가",
      businessExtraAmount: 0,
      etcExtraType: "기타",
      etcExtraAmount: 0,
      lateExtraType: "기한 후 신고",
      lateExtraAmount: 0,
      taxReduction: 0,
      vatAmount: 0,
      totalAmount: 110000,
      calculatedTax: 0,
      prepaidTax: 0,
      finalTaxDue: 0,
      extraPaymentStatus: "추가결제선택",
      processStatus: "신고유형 검토 및 결제",
      beforeDeadline: false,
      customerMemo: "기한 후 신고 추가수수료 55,000원 안내 예정",
      adminMemo: "내부 확인용 메모입니다. 고객에게는 보이지 않습니다.",
      updatedBy: "관리자",
      updatedAt: nowIso()
    },
    {
      id: "GIT-20240502-001",
      service: "gitax",
      appliedAt: "2024-05-02T14:20:00+09:00",
      customerName: "김정수",
      applicantName: "임대충",
      loginId: "sample-gitax",
      businessNumber: "",
      phone: "010-4189-8356",
      birthDate: "1996-04-18",
      businessType: "사업자",
      taxYear: "2024 년",
      reportType: "간편장부A",
      period: "2023 귀속 정기 신고",
      type: "종합소득세",
      couponCode: "",
      baseFee: 50000,
      depositFee: 55000,
      discountAmount: 0,
      supplyAmount: 50000,
      finalFee: 350000,
      vatAmount: 35000,
      totalAmount: 330000,
      paymentStatus: "결제완료",
      bankName: "경남은행",
      paidAmount: 55000,
      orderName: "종합소득세신고 선결제",
      receiptUrl: "https://dashboard.tosspayments.com/receipt/redirection",
      reportDate: "2025-05-28",
      creditDeduction: 0,
      extraPaymentType: "소득추가",
      extraPaymentAmount: 0,
      incomeExtraType: "소득추가",
      incomeExtraAmount: 0,
      businessExtraType: "소득추가",
      businessExtraAmount: 0,
      etcExtraType: "소득추가",
      etcExtraAmount: 50000,
      lateExtraType: "소득추가",
      lateExtraAmount: 0,
      taxReduction: 0,
      calculatedTax: 0,
      prepaidTax: 0,
      finalTaxDue: 0,
      paymentDue: 0,
      manager: "",
      extraPaymentStatus: "추가결제선택",
      processStatus: "신청 접수 및 계약금 결제",
      beforeDeadline: false,
      customerMemo: "자료 검토 후 추가 안내드리겠습니다.",
      adminMemo: "복식/간편장부 여부 확인 필요",
      updatedBy: "관리자",
      updatedAt: nowIso()
    }
  ];

  writeJson(appStoreKey, seeded);
  return seeded;
};

const getApplications = () => seedApplications();

const saveApplication = (nextApplication) => {
  const applications = getApplications();
  const next = applications.map((application) => (application.id === nextApplication.id ? nextApplication : application));
  writeJson(appStoreKey, next);
};

const money = (value) => Number(value || 0).toLocaleString("ko-KR");

const renderApplicationList = () => {
  const body = document.querySelector("[data-application-list]");
  if (!body) return;

  const service = body.dataset.service;
  const applications = getApplications().filter((application) => application.service === service);
  body.innerHTML = "";

  if (!applications.length) {
    body.innerHTML = '<tr><td colspan="11" class="empty-cell">신청 내역이 없습니다.</td></tr>';
    return;
  }

  applications.forEach((application) => {
    const row = document.createElement("tr");
    const cells = [
      application.appliedAt ? formatDateTime(application.appliedAt) : "-",
      application.customerName,
      application.loginId,
      application.phone,
      application.type,
      application.period,
      money(application.finalFee),
      application.paymentStatus,
      application.processStatus,
      application.manager || "-",
      ""
    ];

    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === cells.length - 1) {
        const link = document.createElement("a");
        link.className = "ops-link";
        link.href = `application-detail.html?id=${encodeURIComponent(application.id)}`;
        link.textContent = "상세";
        cell.appendChild(link);
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });

    body.appendChild(row);
  });
};

const renderAdminRealList = () => {
  const body = document.querySelector("[data-admin-real-list]");
  if (!body) return;

  const service = body.dataset.service;
  const applications = getApplications().filter((application) => application.service === service);
  body.innerHTML = "";

  if (!applications.length) {
    body.innerHTML = '<tr><td colspan="12" class="empty-cell">신청 내역이 없습니다.</td></tr>';
    return;
  }

  applications.forEach((application) => {
    const row = document.createElement("tr");
    const rowValues = [
      application.period || "-",
      application.customerName || "-",
      application.businessNumber ? "일반사업자" : "간이사업자",
      application.type || "-",
      application.processStatus || "-",
      application.paymentStatus || "-",
      application.beforeDeadline ? "✓" : "✓",
      `${money(application.finalFee)} 원`,
      application.manager || "",
      application.phone || "-",
      application.updatedBy || "-",
      formatDateTime(application.updatedAt)
    ];

    rowValues.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 0) {
        const link = document.createElement("a");
        link.href = `application-detail.html?id=${encodeURIComponent(application.id)}`;
        link.className = "admin-row-link";
        link.textContent = value;
        cell.appendChild(link);
      } else if (index === 6) {
        const mark = document.createElement("span");
        mark.className = "paid-check";
        mark.textContent = value;
        cell.appendChild(mark);
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });

    body.appendChild(row);
  });
};

const renderDetail = () => {
  const form = document.querySelector("[data-application-detail]");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const application = getApplications().find((item) => item.id === id) || getApplications()[0];
  if (!application) return;

  document.body.dataset.detailService = application.service;

  document.querySelectorAll("[data-detail-text]").forEach((element) => {
    element.textContent = application[element.dataset.detailText] || "-";
  });

  document.querySelectorAll("[data-detail-money]").forEach((element) => {
    element.textContent = money(application[element.dataset.detailMoney]);
  });

  document.querySelectorAll("[data-receipt-open]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!application.receiptUrl) return;
      window.open(application.receiptUrl, "_blank", "noopener");
    });
  });

  form.elements.id.value = application.id;
  Array.from(form.elements).forEach((field) => {
    if (!field.name || field.name === "id") return;
    if (field.type === "checkbox") {
      field.checked = Boolean(application[field.name]);
      return;
    }
    field.value = application[field.name] ?? "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nextApplication = { ...application };

    data.forEach((value, key) => {
      nextApplication[key] = value;
    });

    nextApplication.beforeDeadline = form.elements.beforeDeadline.checked;
    ["creditDeduction", "extraPaymentAmount", "paymentDue", "incomeExtraAmount", "businessExtraAmount", "etcExtraAmount", "lateExtraAmount", "taxReduction", "calculatedTax", "prepaidTax", "finalTaxDue"].forEach((key) => {
      nextApplication[key] = Number(nextApplication[key] || 0);
    });
    nextApplication.updatedBy = "관리자";
    nextApplication.updatedAt = nowIso();
    saveApplication(nextApplication);

    const message = document.querySelector("[data-save-message]");
    if (message) {
      message.hidden = false;
      message.textContent = "저장되었습니다.";
    }
  });
};

const renderMypage = () => {
  const body = document.querySelector("[data-my-applications]");
  if (!body) return;

  const currentUser = localStorage.getItem(sessionKey);
  const members = readJson(memberStoreKey, []);
  const currentMember = members.find((member) => member.loginId === currentUser || member.userId === currentUser);
  const nameTarget = document.querySelector("[data-my-name]");
  if (nameTarget) nameTarget.textContent = currentMember?.name || currentUser || "택스쿡 고객";

  const applications = getApplications().filter((application) => {
    if (!currentUser) return true;
    return application.loginId === currentUser || application.customerName === currentMember?.name;
  });

  body.innerHTML = "";

  applications.forEach((application) => {
    const row = document.createElement("tr");
    [application.type, application.period, application.processStatus, application.paymentStatus, application.customerMemo || "-", formatDateTime(application.updatedAt)].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
};

renderApplicationList();
renderAdminRealList();
renderDetail();
renderMypage();
