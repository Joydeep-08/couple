// public/card.js

const id = window.cgHelpers.qs("id");
const isPreview = window.cgHelpers.qs("preview") === "1";
let card = null;
let enteredCode = "";

const screens = ["Landing", "Passcode", "Gifts", "Cake", "Photos", "Letter"];
function show(name) {
  screens.forEach((s) => {
    document.getElementById("screen" + s).style.display = s === name ? "flex" : "none";
  });
}

async function boot() {
  if (!id) {
    document.body.innerHTML = "<p style='padding:40px;text-align:center;'>No card id given.</p>";
    return;
  }
  try {
    card = await window.cgHelpers.getCard(id);
  } catch (e) {
    document.body.innerHTML = "<p style='padding:40px;text-align:center;'>Couldn't find this card.</p>";
    return;
  }

  if (!card.paid && !isPreview) {
    document.body.innerHTML =
      "<p style='padding:40px;text-align:center;'>This link isn't active yet. Ask whoever sent it to finish generating it.</p>";
    return;
  }

  // fill dynamic copy
  document.getElementById("landingTitle").textContent = `Hey ${card.name2}`;
  document.getElementById("landingLine").textContent =
    `${card.name1} made something just for you, wdw — want to see it?`;
  document.getElementById("giftsTitle").textContent = `For ${card.name2} 🎁`;
  document.getElementById("hintLine").textContent = "hint - it's our fav code";

  document.getElementById("photosGrid").innerHTML = [card.photo2_url, card.photo1_url, card.photo3_url]
    .filter(Boolean)
    .map((url) => `<img src="${url}" />`)
    .join("");

  document.getElementById("letterBody").innerHTML = `
    ${[card.photo3_url].filter(Boolean).map((u) => `<img src="${u}" style="width:100%;border-radius:10px;margin-bottom:14px;" />`).join("")}
    <p>${card.message.replace(/\n/g, "<br/>")}</p>
    <p class="from">— ${card.name1}</p>
  `;

  buildKeypad();
}

document.getElementById("yesBtn").addEventListener("click", () => show("Passcode"));
document.getElementById("noBtn").addEventListener("click", () => {
  document.getElementById("landingLine").textContent = "okay... but you know you want to 👀";
});

function buildKeypad() {
  const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","OK"];
  const pad = document.getElementById("keypad");
  pad.innerHTML = "";
  keys.forEach((k) => {
    const b = document.createElement("button");
    b.textContent = k;
    b.addEventListener("click", () => handleKey(k));
    pad.appendChild(b);
  });
}

function handleKey(k) {
  if (k === "⌫") {
    enteredCode = enteredCode.slice(0, -1);
  } else if (k === "OK") {
    checkCode();
    return;
  } else {
    if (enteredCode.length < 4) enteredCode += k;
  }
  renderDots();
  if (enteredCode.length === 4) checkCode();
}

function renderDots() {
  const dots = document.querySelectorAll("#dots .dot");
  dots.forEach((d, i) => d.classList.toggle("filled", i < enteredCode.length));
}

function checkCode() {
  if (enteredCode === card.passcode) {
    show("Gifts");
  } else {
    const box = document.getElementById("screenPasscode");
    box.classList.add("error-shake");
    setTimeout(() => box.classList.remove("error-shake"), 400);
    enteredCode = "";
    renderDots();
  }
}

document.querySelectorAll(".gift-box").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target === "cake") show("Cake");
    if (target === "photos") show("Photos");
    if (target === "letter") show("Letter");
  });
});

document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => show("Gifts"));
});

document.getElementById("blowBtn").addEventListener("click", () => {
  document.querySelectorAll(".candle").forEach((c, i) => {
    setTimeout(() => c.classList.add("blown"), i * 150);
  });
  document.getElementById("cakeWishLine").style.display = "block";
  document.getElementById("blowBtn").disabled = true;
});

boot();
