(function () {
  const core = window.taxcookSupabase;
  if (!core) return;

  const messageSelector = "[data-password-message]";

  const formatPasswordError = (error) => {
    const message = String(error?.message || "");

    if (/invalid login credentials/i.test(message)) {
      return "현재 비밀번호가 일치하지 않습니다.";
    }

    if (/password/i.test(message)) {
      return "비밀번호 변경에 실패했습니다. 새 비밀번호를 다시 확인해주세요.";
    }

    return "비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  };

  const validatePasswordForm = ({ currentPassword, newPassword, newPasswordConfirm }) => {
    if (!currentPassword) return "현재 비밀번호를 입력해주세요.";
    if (!newPassword) return "새 비밀번호를 입력해주세요.";
    if (newPassword.length < 6) return "새 비밀번호는 6자리 이상 입력해주세요.";
    if (currentPassword === newPassword) return "새 비밀번호는 현재 비밀번호와 다르게 입력해주세요.";
    if (newPassword !== newPasswordConfirm) return "새 비밀번호 확인이 일치하지 않습니다.";
    return "";
  };

  document.querySelector("[data-password-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const newPasswordConfirm = String(formData.get("newPasswordConfirm") || "");
    const validation = validatePasswordForm({ currentPassword, newPassword, newPasswordConfirm });

    core.hideMessage(messageSelector);

    if (validation) {
      core.showMessage(messageSelector, validation);
      return;
    }

    const user = await core.requireUser();
    if (!user) return;

    core.setBusy(button, true, "변경 중...");

    try {
      const supabase = core.getClient();
      const email = user.email;

      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (signInResult.error) throw signInResult.error;

      const updateResult = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateResult.error) throw updateResult.error;

      form.reset();
      core.showMessage(messageSelector, "비밀번호가 변경되었습니다.", "success");
    } catch (error) {
      console.error("Password update failed", error);
      core.showMessage(messageSelector, formatPasswordError(error));
    } finally {
      core.setBusy(button, false);
    }
  });
})();
