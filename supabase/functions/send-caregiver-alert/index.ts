import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { patient_id, medication_name, scheduled_time } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Find caregivers for this patient
    const { data: relationships, error: relError } = await supabase
      .from("caregiver_relationships")
      .select("caregiver_id")
      .eq("patient_id", patient_id);

    if (relError || !relationships?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    const caregiverIds = relationships.map((r) => r.caregiver_id);

    // Get their push subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", caregiverIds);

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { headers: corsHeaders });
    }

    // Get patient name
    const { data: patient } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", patient_id)
      .single();

    const patientName = patient?.email?.split("@")[0] || "המטופל";
    const payload = JSON.stringify({
      title: "⚠️ תרופה לא נלקחה",
      body: `${patientName} לא לקח ${medication_name} (${scheduled_time})`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (err) {
        console.error("Push failed:", err);
      }
    }

    return new Response(JSON.stringify({ sent }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
