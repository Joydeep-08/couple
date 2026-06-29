// public/supabaseClient.js
// Loaded as a plain <script> (no bundler), exposes window.sb and helpers.

const SUPABASE_URL = "https://iliakhaufgpjjtwamisn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaWFraGF1Zmdwamp0d2FtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTU0NTMsImV4cCI6MjA5NjQzMTQ1M30.nim8jt-cUhb3IIWjnd0FC3NF6xS_gg8RelBBJG1bIno";

// Loaded via CDN script tag in each HTML file before this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

window.cgHelpers = {
  FUNCTIONS_URL,

  async uploadPhoto(file, cardId, slot) {
    const ext = file.name.split(".").pop();
    const path = `${cardId}/photo${slot}.${ext}`;
    const { error } = await window.sb.storage.from("couplegift-photos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = window.sb.storage.from("couplegift-photos").getPublicUrl(path);
    return data.publicUrl;
  },

  async getCard(id) {
    const { data, error } = await window.sb
      .from("couplegift_cards")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  qs(name) {
    return new URLSearchParams(location.search).get(name);
  },
};
