// supabase/functions/create-order/index.ts
// Deploy: supabase functions deploy create-order
// Secrets needed (set once):
//   supabase secrets set RAZORPAY_KEY_ID=rzp_live_SzQtvFAXjL2NL5
//   supabase secrets set RAZORPAY_KEY_SECRET=your_actual_secret_from_razorpay_dashboard
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { card_id } = await req.json();
    if (!card_id) throw new Error("card_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: card, error } = await supabase
      .from("couplegift_cards")
      .select("id, amount, paid")
      .eq("id", card_id)
      .single();

    if (error || !card) throw new Error("Card not found");
    if (card.paid) throw new Error("Already paid");

    // Create Razorpay order
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: card.amount, // in paise
        currency: "INR",
        receipt: card.id,
        notes: { card_id: card.id },
      }),
    });

    const order = await rpRes.json();
    if (!rpRes.ok) throw new Error(order?.error?.description || "Razorpay order creation failed");

    // Save order id on the card row
    await supabase.from("couplegift_cards").update({ razorpay_order_id: order.id }).eq("id", card_id);

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
