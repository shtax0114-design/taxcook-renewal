(function () {
  const menuButton = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-nav]");

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const isOpen = nav.dataset.open === "true";
      nav.dataset.open = String(!isOpen);
      menuButton.setAttribute("aria-expanded", String(!isOpen));
    });
  }

  const config = window.TAXCOOK_SUPABASE || {};
  let client = null;

  const getClient = () => {
    if (client) return client;
    if (!config.url || !config.anonKey || !window.supabase?.createClient) {
      throw new Error("Supabase 설정을 찾을 수 없습니다.");
    }
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  };

  const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
  const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  const userIdToEmail = (value) => {
    const text = normalizeEmail(value);
    return text.includes("@") ? text : `${text}@taxcook.local`;
  };
  const emailToUserId = (email) => String(email || "").split("@")[0] || "";
  const isValidUserId = (value) => /^[a-z0-9._-]{4,30}$/.test(String(value || ""));
  const sessionProfileKey = "taxcookSessionProfile";

  const readSessionProfile = () => {
    try {
      return JSON.parse(sessionStorage.getItem(sessionProfileKey) || localStorage.getItem(sessionProfileKey) || "null");
    } catch (error) {
      return null;
    }
  };

  const writeSessionProfile = (profile) => {
    if (!profile) return;
    const value = JSON.stringify(profile);
    sessionStorage.setItem(sessionProfileKey, value);
    localStorage.setItem(sessionProfileKey, value);
  };

  const clearSessionProfile = () => {
    sessionStorage.removeItem(sessionProfileKey);
    localStorage.removeItem(sessionProfileKey);
  };

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

  const money = (value) => {
    const number = Number(value || 0);
    if (!number) return "-";
    return `${number.toLocaleString("ko-KR")}원`;
  };

  const showMessage = (selector, message, type = "error") => {
    const target = document.querySelector(selector);
    if (!target) return;
    target.textContent = message;
    target.dataset.type = type;
    target.hidden = false;
  };

  const hideMessage = (selector) => {
    const target = document.querySelector(selector);
    if (!target) return;
    target.textContent = "";
    target.hidden = true;
  };

  const setBusy = (button, busy, busyText = "처리 중...") => {
    if (!button) return;
    button.disabled = busy;
    button.dataset.originalText ||= button.textContent;
    button.textContent = busy ? busyText : button.dataset.originalText;
  };

  const fallbackProfile = (user) => {
    const stored = readSessionProfile();
    const email = normalizeEmail(user?.email || stored?.email);

    return {
      id: user?.id || stored?.id || "",
      uid: user?.id || stored?.uid || stored?.id || "",
      email,
      user_id: stored?.user_id || email,
      name: user?.user_metadata?.name || stored?.name || "",
      phone: user?.user_metadata?.phone || stored?.phone || "",
      birth: user?.user_metadata?.birth || stored?.birth || "",
      business_type: user?.user_metadata?.business_type || stored?.business_type || "",
      biz_number: user?.user_metadata?.biz_number || stored?.biz_number || "",
      role: stored?.role || "customer"
    };
  };

  const getSessionUser = async () => {
    const supabase = getClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) return sessionData.session.user;

    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user || null;
  };

  const getProfile = async (user) => {
    if (!user) return readSessionProfile();
    const fallback = fallbackProfile(user);

    try {
      const { data, error } = await getClient()
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      const profile = { ...fallback, ...(data || {}) };
      writeSessionProfile(profile);
      return profile;
    } catch (error) {
      console.warn("Profile fallback was used.", error);
      writeSessionProfile(fallback);
      return fallback;
    }
  };

  const saveProfile = async (user, profile) => {
    const email = normalizeEmail(user?.email || profile?.email);
    const row = {
      id: user.id,
      user_id: email,
      name: String(profile.name || "").trim(),
      phone: onlyDigits(profile.phone),
      birth: profile.birth || "",
      business_type: profile.business_type || "",
      biz_number: onlyDigits(profile.biz_number),
      role: profile.role || "customer"
    };

    const { error } = await getClient().from("profiles").upsert(row);
    if (error) throw error;
    const saved = { ...fallbackProfile(user), ...row, email };
    writeSessionProfile(saved);
    return saved;
  };

  const requireUser = async () => {
    const user = await getSessionUser();
    if (!user) {
      window.location.href = "login.html";
      return null;
    }
    return user;
  };

  const requireAdmin = async () => {
    const user = await requireUser();
    if (!user) return null;
    const profile = await getProfile(user);
    if (profile?.role !== "admin") {
      alert("관리자 권한이 필요합니다.");
      window.location.href = "mypage.html";
      return null;
    }
    return { user, profile };
  };

  window.taxcookSupabase = {
    getClient,
    onlyDigits,
    normalizeEmail,
    isValidEmail,
    userIdToEmail,
    emailToUserId,
    isValidUserId,
    formatDateTime,
    money,
    showMessage,
    hideMessage,
    setBusy,
    getSessionUser,
    getProfile,
    saveProfile,
    requireUser,
    requireAdmin,
    fallbackProfile,
    readSessionProfile,
    writeSessionProfile,
    clearSessionProfile
  };
})();
