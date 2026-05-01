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
      throw new Error("Supabase config is missing.");
    }
    client = window.supabase.createClient(config.url, config.anonKey);
    return client;
  };

  const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
  const userIdToEmail = (userId) => `${String(userId || "").trim().toLowerCase()}@taxcook.local`;
  const emailToUserId = (email) => String(email || "").split("@")[0] || "";
  const isValidUserId = (userId) => /^[a-z0-9._-]{4,30}$/.test(String(userId || ""));

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

  const setBusy = (button, busy, busyText = "처리 중...") => {
    if (!button) return;
    button.disabled = busy;
    button.dataset.originalText ||= button.textContent;
    button.textContent = busy ? busyText : button.dataset.originalText;
  };

  const getSessionUser = async () => {
    const { data, error } = await getClient().auth.getUser();
    if (error) throw error;
    return data.user || null;
  };

  const fallbackProfile = (user) => ({
    id: user.id,
    user_id: user.user_metadata?.user_id || emailToUserId(user.email),
    name: user.user_metadata?.name || user.user_metadata?.display_name || "",
    phone: user.user_metadata?.phone || "",
    birth: user.user_metadata?.birth || "",
    business_type: user.user_metadata?.business_type || "",
    biz_number: user.user_metadata?.biz_number || "",
    role: "customer"
  });

  const getProfile = async (user) => {
    if (!user) return null;
    const fallback = fallbackProfile(user);

    try {
      const { data, error } = await getClient()
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data || fallback;
    } catch (error) {
      console.warn("Profile fallback was used.", error);
      return fallback;
    }
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
    userIdToEmail,
    emailToUserId,
    isValidUserId,
    formatDateTime,
    money,
    showMessage,
    setBusy,
    getSessionUser,
    getProfile,
    requireUser,
    requireAdmin,
    fallbackProfile
  };
})();
