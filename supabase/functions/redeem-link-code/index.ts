// redeem-link-code — DATABASE_SCHEMA.md §3.5/§3.6/§5.4.
//
// The child's phone has no Supabase Auth account yet (Decision 7: the child
// is never an email/password user). The parent hands it a one-time code
// (`device_link_codes`); this function is what the app calls to trade that
// code for a real session. It has to be an Edge Function rather than a plain
// `security definer` SQL function (like `submit_answer`, see
// supabase/migrations/20260909200006_functions_and_triggers.sql) because
// creating the anonymous Supabase Auth user requires the Auth API — there is
// no SQL-level equivalent.
//
// verify_jwt is OFF for this function: the device has no JWT to present yet.
// The one-time code IS the credential; everything below is written to only
// trust a code that is unused and unexpired.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: { code?: string; device_name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const deviceName = (body.device_name ?? "").trim().slice(0, 200);
  if (!code) return json({ error: "code is required" }, 400);

  // Service-role client: device_link_codes' RLS only lets family members
  // read/insert (DATABASE_SCHEMA.md §4 policy matrix — "created_by/family:
  // create/read; — (redeemed via Edge Function)"). This function is the one
  // trusted path that redeems a code on behalf of an unauthenticated device.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: linkCode, error: lookupError } = await admin
    .from("device_link_codes")
    .select("id, student_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (lookupError) {
    console.error("device_link_codes lookup failed", lookupError);
    return json({ error: "lookup failed" }, 500);
  }
  if (!linkCode) return json({ error: "invalid code" }, 404);
  if (linkCode.used_at) return json({ error: "code already used" }, 409);
  if (new Date(linkCode.expires_at) < new Date()) return json({ error: "code expired" }, 410);

  // Creating the anonymous auth user has to go through the regular auth
  // client (anon key) — the Admin API has no "create anonymous user" call.
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signInData, error: signInError } = await authClient.auth.signInAnonymously();

  if (signInError || !signInData?.session || !signInData.user) {
    console.error("anonymous sign-in failed", signInError);
    return json({ error: "could not create device session" }, 500);
  }

  const { error: deviceError } = await admin.from("student_devices").insert({
    student_id: linkCode.student_id,
    device_name: deviceName,
    auth_user_id: signInData.user.id,
  });

  if (deviceError) {
    // Don't leave an orphan anonymous auth user behind if linking failed.
    await admin.auth.admin.deleteUser(signInData.user.id).catch(() => {});
    console.error("student_devices insert failed", deviceError);
    return json({ error: "could not link device" }, 500);
  }

  const { error: markUsedError } = await admin
    .from("device_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", linkCode.id);
  if (markUsedError) {
    // Non-fatal: the device is already linked and usable; the code just
    // wasn't marked used. Log it rather than failing the whole redemption.
    console.error("device_link_codes.used_at update failed", markUsedError);
  }

  const { data: student } = await admin
    .from("students")
    .select("first_name, language, settings")
    .eq("id", linkCode.student_id)
    .maybeSingle();

  return json({
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      expires_at: signInData.session.expires_at,
    },
    student: student
      ? { first_name: student.first_name, language: student.language, settings: student.settings }
      : null,
  });
});
