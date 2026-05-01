const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.dataset.open === "true";
    nav.dataset.open = String(!isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });
}

const storeKey = "taxcookPreviewMembers";
const sessionKey = "taxcookPreviewSession";

const readMembers = () => {
  try {
    return JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch (error) {
    return [];
  }
};

const writeMembers = (members) => {
  localStorage.setItem(storeKey, JSON.stringify(members));
};

const onlyDigits = (value) => value.replace(/\D/g, "");

const showAuthMessage = (message, type = "error") => {
  const target = document.querySelector("[data-auth-message]");
  if (!target) return;
  target.textContent = message;
  target.dataset.type = type;
  target.hidden = false;
};

const setNumericInput = (input) => {
  if (!input) return;
  input.inputMode = "numeric";
  input.pattern = "[0-9]*";
  input.addEventListener("input", () => {
    const max = Number(input.maxLength) || 99;
    input.value = onlyDigits(input.value).slice(0, max);
  });
};

document.querySelectorAll("[data-numeric]").forEach(setNumericInput);

document.querySelectorAll("[data-biz-select]").forEach((select) => {
  const form = select.closest("form");
  const row = form?.querySelector("[data-biznum-row]");
  const inputs = row ? Array.from(row.querySelectorAll("input")) : [];

  const sync = () => {
    const isBusiness = select.value === "사업자";
    if (row) row.hidden = !isBusiness;
    inputs.forEach((input) => {
      input.disabled = !isBusiness;
      if (!isBusiness) input.value = "";
    });
  };

  select.addEventListener("change", sync);
  sync();
});

document.querySelectorAll(".biznum-grid input").forEach((input, index, inputs) => {
  input.addEventListener("input", () => {
    if (input.value.length === Number(input.maxLength) && inputs[index + 1]) {
      inputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
      inputs[index - 1].focus();
    }
  });
});

const fillBirthSelects = () => {
  const year = document.querySelector('select[name="birthYear"]');
  const month = document.querySelector('select[name="birthMonth"]');
  const date = document.querySelector('select[name="birthDate"]');
  const currentYear = new Date().getFullYear();

  if (year && year.options.length === 1) {
    for (let value = currentYear; value >= currentYear - 100; value -= 1) {
      year.add(new Option(String(value), String(value)));
    }
  }

  if (month && month.options.length === 1) {
    for (let value = 1; value <= 12; value += 1) {
      const label = String(value).padStart(2, "0");
      month.add(new Option(label, label));
    }
  }

  if (date && date.options.length === 1) {
    for (let value = 1; value <= 31; value += 1) {
      const label = String(value).padStart(2, "0");
      date.add(new Option(label, label));
    }
  }
};

fillBirthSelects();

const signupForm = document.querySelector("[data-signup-form]");

if (signupForm) {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(signupForm);
    const userId = String(data.get("userId") || "").trim();
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");
    const name = String(data.get("name") || "").trim();
    const phone = onlyDigits(String(data.get("phone") || ""));
    const birthYear = String(data.get("birthYear") || "");
    const birthMonth = String(data.get("birthMonth") || "");
    const birthDate = String(data.get("birthDate") || "");
    const businessType = String(data.get("businessType") || "");
    const bizNumber = ["biznum1", "biznum2", "biznum3"].map((key) => String(data.get(key) || "")).join("");
    const members = readMembers();

    if (!userId) return showAuthMessage("아이디를 입력해주세요.");
    if (members.some((member) => member.userId === userId)) return showAuthMessage("이미 가입된 아이디입니다.");
    if (password.length < 6) return showAuthMessage("비밀번호는 6자리 이상 입력해주세요.");
    if (password !== passwordConfirm) return showAuthMessage("비밀번호 확인이 일치하지 않습니다.");
    if (!name) return showAuthMessage("성명을 입력해주세요.");
    if (!/^\d{10,11}$/.test(phone)) return showAuthMessage("휴대폰번호를 숫자만 10~11자리로 입력해주세요.");
    if (!birthYear || !birthMonth || !birthDate) return showAuthMessage("생년월일을 선택해주세요.");
    if (!businessType) return showAuthMessage("사업자구분을 선택해주세요.");
    if (businessType === "사업자" && !/^\d{10}$/.test(bizNumber)) return showAuthMessage("사업자번호를 3자리, 2자리, 5자리로 입력해주세요.");

    members.push({
      userId,
      password,
      name,
      phone,
      birth: `${birthYear}-${birthMonth}-${birthDate}`,
      businessType,
      bizNumber: businessType === "사업자" ? bizNumber : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: name
    });

    writeMembers(members);
    localStorage.setItem(sessionKey, userId);
    showAuthMessage("회원가입이 완료되었습니다. 회원관리 페이지로 이동합니다.", "success");
    window.setTimeout(() => {
      window.location.href = "members.html";
    }, 700);
  });
}

const loginForm = document.querySelector("[data-login-form]");

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(loginForm);
    const userId = String(data.get("userId") || "").trim();
    const password = String(data.get("password") || "");
    const member = readMembers().find((item) => item.userId === userId && item.password === password);

    if (!member) return showAuthMessage("아이디 또는 비밀번호를 확인해주세요.");

    localStorage.setItem(sessionKey, userId);
    showAuthMessage("로그인되었습니다.", "success");
    window.setTimeout(() => {
      window.location.href = "members.html";
    }, 500);
  });
}

const membersBody = document.querySelector("[data-members-body]");

if (membersBody) {
  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  const renderMembers = () => {
    const members = readMembers();
    const currentUser = localStorage.getItem(sessionKey);
    const currentUserLabel = document.querySelector("[data-current-user]");

    if (currentUserLabel) {
      currentUserLabel.textContent = currentUser ? `${currentUser} 로그인 중` : "로그인 전";
    }

    membersBody.innerHTML = "";

    if (!members.length) {
      membersBody.innerHTML = '<tr><td colspan="10" class="empty-cell">아직 가입된 회원이 없습니다.</td></tr>';
      return;
    }

    const appendCell = (row, value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    };

    members.forEach((member) => {
      const row = document.createElement("tr");
      const checkCell = document.createElement("td");
      checkCell.className = "check-cell";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.memberSelect = member.userId;
      checkbox.setAttribute("aria-label", `${member.userId} 선택`);
      checkCell.appendChild(checkbox);
      row.appendChild(checkCell);

      const editCell = document.createElement("td");
      editCell.className = "edit-cell";
      const editLink = document.createElement("a");
      editLink.href = `signup.html?edit=${encodeURIComponent(member.userId)}`;
      editLink.className = "edit-link";
      editLink.setAttribute("aria-label", `${member.userId} 수정`);
      editLink.textContent = "∕";
      editCell.appendChild(editLink);
      row.appendChild(editCell);

      appendCell(row, "고객");
      appendCell(row, "비밀번호");
      appendCell(row, member.userId);
      appendCell(row, "****");
      appendCell(row, member.name);
      appendCell(row, member.phone);
      appendCell(row, member.updatedBy || member.name || "-");
      appendCell(row, formatDateTime(member.updatedAt || member.createdAt));

      membersBody.appendChild(row);
    });
  };

  membersBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-member]");
    if (!button) return;

    const userId = button.dataset.deleteMember;
    const members = readMembers().filter((member) => member.userId !== userId);
    writeMembers(members);

    if (localStorage.getItem(sessionKey) === userId) {
      localStorage.removeItem(sessionKey);
    }

    renderMembers();
  });

  document.querySelector("[data-select-all]")?.addEventListener("change", (event) => {
    membersBody.querySelectorAll("[data-member-select]").forEach((checkbox) => {
      checkbox.checked = event.target.checked;
    });
  });

  document.querySelector("[data-delete-selected]")?.addEventListener("click", () => {
    const selected = Array.from(membersBody.querySelectorAll("[data-member-select]:checked")).map((checkbox) => checkbox.dataset.memberSelect);
    if (!selected.length) return;

    writeMembers(readMembers().filter((member) => !selected.includes(member.userId)));
    if (selected.includes(localStorage.getItem(sessionKey))) {
      localStorage.removeItem(sessionKey);
    }
    renderMembers();
  });

  document.querySelector("[data-download-members]")?.addEventListener("click", () => {
    const rows = [
      ["권한", "유형", "로그인ID", "비밀번호", "이름", "휴대폰번호", "최종수정자", "최종수정일"],
      ...readMembers().map((member) => [
        "고객",
        "비밀번호",
        member.userId,
        "****",
        member.name,
        member.phone,
        member.updatedBy || member.name || "",
        formatDateTime(member.updatedAt || member.createdAt)
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "taxcook-members.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    localStorage.removeItem(sessionKey);
    renderMembers();
  });

  renderMembers();
}
