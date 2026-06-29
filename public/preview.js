// public/preview.js

const id = window.cgHelpers.qs("id");
if (!id) {
  document.body.innerHTML = "<p style='padding:40px;text-align:center;'>No card id given.</p>";
}

document.getElementById("editBtn").href = `index.html?id=${id}`;
document.getElementById("previewFrame").src = `card.html?id=${id}&preview=1`;

// tile the watermark
const wm = document.getElementById("watermark");
for (let i = 0; i < 40; i++) {
  const span = document.createElement("span");
  span.textContent = "PREVIEW";
  wm.appendChild(span);
}

async function init() {
  const card = await window.cgHelpers.getCard(id);
  if (card.paid) {
    // already paid, just show the link straight up
    showResult(`${location.origin}${location.pathname.replace("preview.html","card.html")}?id=${id}`);
  }
}
init();

function showResult(link) {
  document.getElementById("resultModal").style.display = "flex";
  document.getElementById("finalLink").textContent = link;
  document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(link);
    document.getElementById("copyBtn").textContent = "Copied ✓";
  };
}

document.getElementById("generateBtn").addEventListener("click", async () => {
  const btn = document.getElementById("generateBtn");
  btn.disabled = true;
  btn.textContent = "Setting up...";

  try {
    // 1. ask our edge function for a Razorpay order
    const res = await fetch(`${window.cgHelpers.FUNCTIONS_URL}/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: id }),
    });
    const order = await res.json();
    if (order.error) throw new Error(order.error);

    btn.disabled = false;
    btn.textContent = "🔗 Generate link — ₹99";

    // 2. open Razorpay checkout
    const rzp = new Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "Couple Gift Card",
      description: "Unlock your shareable link",
      theme: { color: "#c2185b" },
      handler: async function (response) {
        // 3. verify on the server, then flip paid=true
        const verifyRes = await fetch(`${window.cgHelpers.FUNCTIONS_URL}/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_id: id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const verify = await verifyRes.json();
        if (!verify.success) {
          alert("Payment verification failed: " + verify.error);
          return;
        }
        const link = `${location.origin}${location.pathname.replace("preview.html", "card.html")}?id=${id}`;
        showResult(link);
      },
    });
    rzp.open();
  } catch (err) {
    console.error(err);
    alert("Couldn't start payment: " + err.message);
    btn.disabled = false;
    btn.textContent = "🔗 Generate link — ₹99";
  }
});
