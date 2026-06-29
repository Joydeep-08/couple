// public/create.js

const editId = window.cgHelpers.qs("id"); // if present, we're editing an existing unpaid card

["1","2","3"].forEach((n) => {
  const drop = document.getElementById(`drop${n}`);
  const input = document.getElementById(`photo${n}`);
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      drop.innerHTML = `<img src="${e.target.result}" /><input type="file" id="photo${n}" accept="image/*" />`;
      document.getElementById(`photo${n}`).files = input.files; // keep ref (best effort)
    };
    reader.readAsDataURL(file);
  });
});

async function prefillIfEditing() {
  if (!editId) return;
  try {
    const card = await window.cgHelpers.getCard(editId);
    if (card.paid) {
      alert("This one's already paid for / locked. Make a new one instead.");
      return;
    }
    document.getElementById("name1").value = card.name1;
    document.getElementById("name2").value = card.name2;
    document.getElementById("passcode").value = card.passcode;
    document.getElementById("message").value = card.message;
    // Make photo fields optional on edit (keep old ones if not re-uploaded)
    document.getElementById("photo1").required = false;
    document.getElementById("photo2").required = false;
    document.getElementById("photo3").required = false;
  } catch (e) {
    console.error(e);
  }
}
prefillIfEditing();

document.getElementById("cardForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  try {
    const name1 = document.getElementById("name1").value.trim();
    const name2 = document.getElementById("name2").value.trim();
    const passcode = document.getElementById("passcode").value.trim();
    const message = document.getElementById("message").value.trim();

    let cardId = editId;

    if (!cardId) {
      // create the row first so we have an id to upload photos under
      const { data, error } = await window.sb
        .from("cards")
        .insert({ name1, name2, passcode, message })
        .select()
        .single();
      if (error) throw error;
      cardId = data.id;
    } else {
      const { error } = await window.sb
        .from("cards")
        .update({ name1, name2, passcode, message })
        .eq("id", cardId);
      if (error) throw error;
    }

    const updates = {};
    for (const n of [1, 2, 3]) {
      const file = document.getElementById(`photo${n}`).files[0];
      if (file) {
        const url = await window.cgHelpers.uploadPhoto(file, cardId, n);
        updates[`photo${n}_url`] = url;
      }
    }
    if (Object.keys(updates).length) {
      const { error } = await window.sb.from("cards").update(updates).eq("id", cardId);
      if (error) throw error;
    }

    location.href = `preview.html?id=${cardId}`;
  } catch (err) {
    console.error(err);
    alert("Something broke: " + err.message);
    btn.disabled = false;
    btn.textContent = "Preview it →";
  }
});
