// supabase/functions/verify-payment/index.ts
// Deploy: supabase functions deploy verify-payment
// Uses same RAZORPAY_KEY_SECRET secret as create-order.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { card_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!card_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing fields");
    }

    const expected = await hmacSha256Hex(
      RAZORPAY_KEY_SECRET,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );

    if (expected !== razorpay_signature) {
      throw new Error("Signature mismatch — payment not verified");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("couplegift_cards")
      .update({
        paid: true,
        razorpay_payment_id,
      })
      .eq("id", card_id)
      .eq("razorpay_order_id", razorpay_order_id); // extra safety: order must match

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, success: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
