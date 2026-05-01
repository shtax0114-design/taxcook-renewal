(function () {
  const config = window.TAXCOOK_SUPABASE || {};
  const hideKeyPrefix = "taxcookHomePopupClosed:";

  const todayText = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getClient = () => {
    if (!config.url || !config.anonKey || !window.supabase?.createClient) return null;
    return window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  };

  const showPopup = (popup) => {
    if (!popup?.image_url) return;
    const key = `${hideKeyPrefix}${popup.id}:${todayText()}`;
    if (localStorage.getItem(key) === "1") return;

    const backdrop = document.createElement("div");
    backdrop.className = "home-popup-backdrop";
    backdrop.innerHTML = `
      <div class="home-popup-dialog" role="dialog" aria-modal="true" aria-label="택스쿡 안내 팝업">
        <img src="${popup.image_url}" alt="택스쿡 안내">
        <div class="home-popup-actions">
          <button type="button" data-popup-close-today>오늘 하루 보지 않기</button>
          <button type="button" data-popup-close>닫기</button>
        </div>
      </div>
    `;
    const close = () => backdrop.remove();
    backdrop.querySelector("[data-popup-close]")?.addEventListener("click", close);
    backdrop.querySelector("[data-popup-close-today]")?.addEventListener("click", () => {
      localStorage.setItem(key, "1");
      close();
    });
    document.body.append(backdrop);
  };

  const load = async () => {
    const client = getClient();
    if (!client) return;
    const today = todayText();
    const { data, error } = await client
      .from("homepage_popups")
      .select("id,image_url,start_date,end_date,is_active")
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data?.length) return;
    showPopup(data[0]);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
