import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const protectedDeveloperEmail = "chaewoon83@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Supabase function environment is not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken) return json({ error: "관리자 로그인이 필요합니다." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "관리자 로그인이 필요합니다." }, 401);

  const { data: requester, error: requesterError } = await adminClient
    .from("profiles")
    .select("id, user_id, role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (requesterError) return json({ error: requesterError.message }, 500);
  if (requester?.role !== "developer") {
    return json({ error: "회원 삭제는 developer만 가능합니다." }, 403);
  }

  const input = await req.json().catch(() => ({}));
  const ids = Array.isArray(input.ids)
    ? Array.from(new Set(input.ids.map((id: unknown) => String(id || "").trim()).filter(Boolean)))
    : [];
  if (!ids.length) return json({ error: "삭제할 회원을 선택해주세요." }, 400);

  const { data: targets, error: targetError } = await adminClient
    .from("profiles")
    .select("id, user_id, name, role")
    .in("id", ids);
  if (targetError) return json({ error: targetError.message }, 500);

  const protectedIds = new Set<string>([authData.user.id]);
  const deletable = (targets || []).filter((profile) => {
    if (protectedIds.has(profile.id)) return false;
    if (normalize(profile.user_id) === protectedDeveloperEmail) return false;
    return true;
  });
  const skipped = ids.length - deletable.length;
  if (!deletable.length) {
    return json({ error: "삭제 가능한 회원이 없습니다. 고정 developer 또는 본인 계정은 삭제할 수 없습니다." }, 400);
  }

  const deletedIds: string[] = [];
  const errors: Array<{ id: string; message: string }> = [];

  for (const profile of deletable) {
    const { error } = await adminClient.auth.admin.deleteUser(profile.id);
    if (error) {
      errors.push({ id: profile.id, message: error.message });
      continue;
    }
    deletedIds.push(profile.id);
  }

  if (errors.length) {
    return json({ deletedIds, skipped, errors, error: "일부 회원을 삭제하지 못했습니다." }, 207);
  }

  return json({ deletedIds, skipped });
});
