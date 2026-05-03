import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const normalizeLoginId = (value: unknown) => String(value || "").trim().toLowerCase();
const onlyDigits = (value: unknown) => String(value || "").replace(/\D/g, "");
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidUserId = (value: string) => /^[a-z0-9._-]{4,30}$/.test(value);
const loginIdToEmail = (loginId: string) => loginId.includes("@") ? loginId : `${loginId}@taxcook.local`;

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
  if (!accessToken) return json({ error: "로그인이 필요합니다." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "로그인이 필요합니다." }, 401);

  const { data: requester, error: requesterError } = await adminClient
    .from("profiles")
    .select("id, name, user_id, role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (requesterError) return json({ error: requesterError.message }, 500);
  if (!["admin", "developer"].includes(requester?.role || "")) {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }

  const input = await req.json().catch(() => ({}));
  const loginId = normalizeLoginId(input.loginId);
  const email = loginIdToEmail(loginId);
  const password = String(input.password || "");
  const role = String(input.role || "customer");
  const name = String(input.name || "").trim();
  const phone = onlyDigits(input.phone);
  const birth = String(input.birth || "").trim();
  const businessType = String(input.businessType || "").trim();
  const bizNumber = onlyDigits(input.bizNumber);

  if (!loginId) return json({ error: "로그인ID를 입력해 주세요." }, 400);
  if (loginId.includes("@") ? !isValidEmail(loginId) : !isValidUserId(loginId)) {
    return json({ error: "로그인ID는 이메일 또는 영문 소문자, 숫자, 점, 밑줄, 하이픈 4~30자로 입력해 주세요." }, 400);
  }
  if (password.length < 6) return json({ error: "비밀번호는 6자리 이상 입력해 주세요." }, 400);
  if (!["customer", "admin", "developer"].includes(role)) return json({ error: "권한 값이 올바르지 않습니다." }, 400);
  if (role === "developer" && requester?.role !== "developer") {
    return json({ error: "developer 계정은 developer만 추가할 수 있습니다." }, 403);
  }
  if (!name) return json({ error: "이름을 입력해 주세요." }, 400);
  if (!phone) return json({ error: "휴대폰번호를 입력해 주세요." }, 400);

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("user_id", loginId)
    .maybeSingle();
  if (existingProfileError) return json({ error: existingProfileError.message }, 500);
  if (existingProfile) return json({ error: "이미 사용 중인 로그인ID입니다." }, 409);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      login_id: loginId,
      name,
      phone,
      birth,
      business_type: businessType,
      biz_number: bizNumber,
    },
  });
  if (createError || !created.user) {
    return json({ error: createError?.message || "계정을 만들지 못했습니다." }, 400);
  }

  const row = {
    id: created.user.id,
    user_id: loginId,
    name,
    phone,
    birth,
    business_type: businessType,
    biz_number: bizNumber,
    role,
  };

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (profileError) return json({ error: profileError.message }, 500);

  return json({ profile });
});
