// Supabase client (uses values from window.APP set in config.js)
const supabase = window.supabase ??
  window.supabase = window.createClient(
    window.APP.SUPABASE_URL,
    window.APP.SUPABASE_ANON
  );

// Dev helper: a pseudo user id for now (replaced by real auth later)
async function getUserId() {
  // TODO: replace with real Supabase Auth later
  let id = localStorage.getItem('dev_user_id');
  if (!id) {
    // quick uuid-ish
    id = ([1e7]+-1e3+-4e3+-8e3+-1e11)
      .replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    localStorage.setItem('dev_user_id', id);
  }
  return id;
}

  // Dev mode fallback: keep a stable anonymous uuid in localStorage
  let id = localStorage.getItem('dev_user_id');
  if (!id) {
    // cheap uuid v4-ish
    id = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
    localStorage.setItem('dev_user_id', id);
  }
  return id;
}
// ---------- Supabase Init ----------
const A = window.APP; // holds your env vars from Vercel
const supabase = window.supabase.createClient(
  A.SUPABASE_URL,
  A.SUPABASE_ANON
);

// Optional: headers (if you need fetch calls instead of supabase-js)
const hdrs = {
  "Content-Type": "application/json",
  "apikey": A.SUPABASE_ANON,
  "Authorization": "Bearer " + A.SUPABASE_ANON
};

// ---------- Tabs ----------
const el = s => document.querySelector(s);
const $ = s => Array.from(document.querySelectorAll(s));

$(".tabbtn").forEach(b => {
  b.onclick = () => {
    $(".tabbtn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    const name = b.dataset.t;
    ["draft","roster","lineup","scores"].forEach(t =>
      el(`#tab-${t}`).classList.toggle("hidden", t !== name)
    );
  };
}); 
if (t === 'roster') {
  async function saveSource() {
  const platform = document.getElementById('srcPlatform')?.value?.trim();
  const handle   = document.getElementById('srcHandle')?.value?.trim();
  const notes    = document.getElementById('srcNotes')?.value?.trim();

  if (!platform || !handle) {
    alert('Platform and Handle are required');
    return;
  }

  const user_id = await getUserId();
  const { error } = await supabase
    .from('team_sources')
    .insert([{ user_id, platform, handle, notes }]);

  if (error) {
    alert('Save failed: ' + error.message);
    return;
  }

  document.getElementById('srcPlatform').value = '';
  document.getElementById('srcHandle').value   = '';
  document.getElementById('srcNotes').value    = '';
  await loadSources();
}

  async function loadSources() {
  const user_id = await getUserId();
  const list = document.getElementById('linkedSources');
  if (!list) return;

  list.innerHTML = 'Loading...';

  const { data, error } = await supabase
    .from('team_sources')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = 'Error: ' + error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<i>No saved platforms yet.</i>';
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="row" style="justify-content:space-between;align-items:center;margin:.5rem 0;">
      <div>
        <b>${r.platform}</b> — ${r.handle}
        ${r.notes ? `<div style="opacity:.7;font-size:.9em">${r.notes}</div>` : ''}
      </div>
      <button class="btn muted" data-id="${r.id}" disabled>⋯</button>
    </div>
  `).join('');
}
// ---------- Team Sources (per TEAM) ----------
async function saveSource() {
  const team_id = window.APP.TEAM_ID;               // from config.js
  const platform = document.getElementById('srcPlatform').value.trim();
  const handle   = document.getElementById('srcHandle').value.trim();
  const notes    = document.getElementById('srcNotes').value.trim();

  if (!platform || !handle) {
    alert('Platform and Handle are required');
    return;
  }

  const { error } = await supabase
    .from('team_sources')
    .insert([{ team_id, platform, handle, notes }]);

  if (error) {
    alert('Save failed: ' + error.message);
    return;
  }
  document.getElementById('srcPlatform').value = '';
  document.getElementById('srcHandle').value   = '';
  document.getElementById('srcNotes').value    = '';
  await loadSources(); // refresh list
}

async function loadSources() {
  const team_id = window.APP.TEAM_ID;
  const list = document.getElementById('sourcesList');
  list.innerHTML = 'Loading...';

  const { data, error } = await supabase
    .from('team_sources')
    .select('*')
    .eq('team_id', team_id)
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = 'Error: ' + error.message;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<i>No saved platforms yet.</i>';
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="row" style="justify-content:space-between">
      <div>
        <b>${r.platform}</b> — ${r.handle}
        ${r.notes ? `<div style="opacity:.8">${r.notes}</div>` : ''}
      </div>
      <button class="btn muted" data-id="${r.id}" onclick="deleteSource('${r.id}')">Delete</button>
    </div>
  `).join('');
}

async function deleteSource(id) {
  const { error } = await supabase.from('team_sources').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); return; }
  await loadSources();
}

// wire up button and load on page/tabs
document.getElementById('btnAddSource').onclick = saveSource;
// call loadSources() either on page load or when the Roster tab becomes active:
loadSources();
// ---------- Selectors ----------
const years = [2020,2021,2022,2023,2024];
const seasonSel = el("#season");
seasonSel.innerHTML = years.map(y => `<option>${y}</option>`).join("");

const weekSel = el("#week");
weekSel.innerHTML = Array.from({length: 18}, (_, i) => 
  `<option>Week ${i+1}</option>`
).join("");
document.getElementById('btnAddSource')?.addEventListener('click', async () => {
  const platform = (document.getElementById('srcPlatform')?.value || '').trim();
  const handle   = (document.getElementById('srcHandle')?.value || '').trim();
  const notes    = (document.getElementById('srcNotes')?.value || '').trim();
  if (!platform || !handle) { alert('Platform and handle are required'); return; }

  const user_id = await getUserId();
  const { error } = await supabase.from('team_sources').insert([{ user_id, platform, handle, notes }]);
  if (error) { alert('Save failed: ' + error.message); return; }

  // clear inputs and refresh the list
  document.getElementById('srcPlatform').value = '';
  document.getElementById('srcHandle').value   = '';
  document.getElementById('srcNotes').value    = '';
  await loadSources();
});
// ---------- Realtime subscription for team points ----------
function subscribeTeamPoints() {
  const team_id = window.APP.TEAM_ID;

  const channel = supabase.channel('team-points-' + team_id)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'fantasy_points', filter: `team_id=eq.${team_id}` },
      payload => {
        // Re-render your points UI here.
        // For example, re-fetch team totals or append the new row:
        refreshTeamPoints();
      }
    )
    .subscribe();
}

async function refreshTeamPoints() {
  const team_id = window.APP.TEAM_ID;
  const { data, error } = await supabase
    .from('fantasy_points')
    .select('*')
    .eq('team_id', team_id)
    .order('created_at', { ascending: false })
    .limit(50);

if (error) {
    if (box) box.innerHTML = 'Error: ' + error.message;
    return;
  }

  // Render into the SCORES tab container:
  if (box) {
    box.innerHTML = (data && data.length)
      ? data.map(r => `
          <div class="row" style="justify-content:space-between">
            <div>${r.player_id}</div>
            <div><b>${Number(r.total_points).toFixed(1)}</b></div>
          </div>
        `).join('')
      : '<i>No scores yet.</i>';
  }
}
async function computeScores({ week, season, team_id }) {
  // any of these can be optional; your function can pick defaults
  const payload = { week, season, team_id };
  const { data, error } = await supabase.functions.invoke('compute-scores', {
    body: payload
  });
  if (error) {
    alert('Compute failed: ' + error.message);
    return;
  }
  alert('Scoring job started.');
}
document.getElementById('computeBtn')?.addEventListener('click', async () => {
  // put your own current week/season/team logic here
  const week = Number(document.getElementById('weekSelect')?.value || 1);
  const season = Number(new Date().getFullYear());
  const team_id = window.APP?.TEAM_ID || 'demo-team-1';
  await computeScores({ week, season, team_id });
});
  // call once on load and keep the realtime subscription active
subscribeTeamPoints();
refreshTeamPoints();
document.getElementById('srcSaveBtn')?.addEventListener('click', saveSource);

// If you have tab buttons, call loadSources() when "Roster" is shown.
// Or just:
window.addEventListener('DOMContentLoaded', () => {
  loadSources(); // optional to show immediately
});
  /* ---------- Helpers ---------- */
const qs = p => Object.entries(p).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join("&");
const get = (url) => fetch(url, { headers: hdrs }).then(r=>r.json());
const post = (url, body={}) => fetch(url,{ method:"POST", headers: hdrs, body: JSON.stringify(body)}).then(r=>r.json());
const patch = (url, body={}) => fetch(url,{ method:"PATCH", headers: hdrs, body: JSON.stringify(body)}).then(r=>r.json());

/* ---------- Voice (STT + TTS) ---------- */
let TTS_ENABLED = false;
let recognizing = false;
let recognition = null;

function speak(text) {
  try {
    if (!TTS_ENABLED) return;
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; u.volume = 1; u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}
function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "en-US";
  r.interimResults = true;
  r.continuous = true;
  r.maxAlternatives = 1;

  r.onstart = () => { recognizing = true; el("#voiceStatus").textContent = "Listening…"; };
  r.onend   = () => { recognizing = false; el("#voiceStatus").textContent = "Mic idle"; };
  r.onerror = (e) => { recognizing = false; el("#voiceStatus").textContent = `Mic error: ${e.error}`; };

  let finalText = "";
  r.onresult = (ev) => {
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interim += res[0].transcript;
    }
    el("#agentInput").value = (finalText + " " + interim).trim();
  };
  return r;
}
function startListening() {
  if (!recognition) recognition = setupRecognition();
  if (!recognition) {
    el("#voiceStatus").textContent = "Speech input not supported on this browser.";
    return;
  }
  try { recognition.start(); } catch {}
}
function stopListening() { try { recognition && recognition.stop(); } catch {} }

el("#btnTTS").onclick = () => {
  TTS_ENABLED = !TTS_ENABLED;
  el("#btnTTS").textContent = TTS_ENABLED ? "🔊 Speak: On" : "🔈 Speak: Off";
  if (TTS_ENABLED) speak("Speech enabled.");
};
const micBtn = el("#btnMic");
micBtn.addEventListener("touchstart", (e) => { e.preventDefault(); startListening(); micBtn.textContent = "🎙️ Listening"; }, {passive:false});
micBtn.addEventListener("touchend",   (e) => { e.preventDefault(); micBtn.textContent = "🎤 Hold"; stopListening(); sendAgentIfReady(); }, {passive:false});
micBtn.addEventListener("mousedown",  ()  => { startListening(); micBtn.textContent = "🎙️ Listening"; });
micBtn.addEventListener("mouseup",    ()  => { micBtn.textContent = "🎤 Hold"; stopListening(); sendAgentIfReady(); });
function sendAgentIfReady(){ const msg = el("#agentInput").value.trim(); if(msg) el("#btnAsk").click(); }

/* ---------- Data Loads ---------- */
async function loadDraft() {
  const season = Number(seasonSel.value), week = Number(weekSel.value);
  const url = `${A.SUPABASE_URL}/rest/v1/weekly_stats?` + qs({
    select:"player_id,position,team_id,season,week,fantasy_ppr,players(player_name)",
    "sport":"eq:nfl", "season":"eq:"+season, "week":"eq:"+week,
    "order":"fantasy_ppr.desc", "limit":200
  });
  const data = await get(url);
  el("#draftCount").textContent = data.length;
  el("#draftList").innerHTML = data.map(row=>`
    <div class="card">
      <div class="row spread">
        <div>
          <div><b>${row.players?.player_name||row.player_id}</b></div>
          <div class="badge">${row.team_id||""} · ${row.position||""}</div>
        </div>
        <div style="text-align:right">
          <div><b>${Number(row.fantasy_ppr||0).toFixed(2)}</b> PPR</div>
          <button class="btn muted" data-add="${row.player_id}" data-pos="${row.position||""}">Add</button>
        </div>
      </div>
    </div>`).join("");
  $("#draftList .btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const player_id = btn.dataset.add, position = btn.dataset.pos;
      const url = `${A.SUPABASE_URL}/rest/v1/team_roster`;
      const body = { team_id:A.TEAM_ID, season:Number(seasonSel.value), player_id, position, acquired:"draft" };
      await fetch(url,{method:"POST", headers:hdrs, body:JSON.stringify(body)});
      await loadRoster();
      alert("Added to roster");
    };
  });
}
async function loadRoster() {
  const url = `${A.SUPABASE_URL}/rest/v1/team_roster?` + qs({
    select:"player_id,position,players(player_name,team_id,position)",
    "team_id":"eq:"+A.TEAM_ID, "season":"eq:"+Number(seasonSel.value)
  });
  const data = await get(url);
  el("#rosterCount").textContent = data.length;
  el("#rosterList").innerHTML = data.map(r=>`
    <div class="card">
      <div class="row spread">
        <div>
          <div><b>${r.players?.player_name||r.player_id}</b></div>
          <div class="badge">${r.players?.team_id||""} · ${r.position||""}</div>
        </div>
        <div class="row" style="gap:6px">
          <button class="btn" data-starter="${r.player_id}">Starter</button>
          <button class="btn muted" data-bench="${r.player_id}">Bench</button>
        </div>
      </div>
    </div>`).join("");
  $("#rosterList [data-starter]").forEach(b=> b.onclick = ()=>{ starters.add(b.dataset.starter); bench.delete(b.dataset.starter); renderLineup(); });
  $("#rosterList [data-bench]").forEach(b=> b.onclick = ()=>{ bench.add(b.dataset.bench); starters.delete(b.dataset.bench); renderLineup(); });
}

/* ---------- Lineup ---------- */
const starters = new Set();
const bench = new Set();
function renderLineup(){
  el("#starters").innerHTML = Array.from(starters).map(id=>`<div class="badge">${id}</div>`).join("") || `<div class="badge">No starters selected</div>`;
  el("#bench").innerHTML    = Array.from(bench).map(id=>`<div class="badge">${id}</div>`).join("")    || `<div class="badge">No bench selected</div>`;
}
el("#btnSaveLineup").onclick = async ()=>{
  const url = `${A.SUPABASE_URL}/rest/v1/weekly_lineups?` + qs({
    "team_id":"eq:"+A.TEAM_ID, "season":"eq:"+Number(seasonSel.value), "week":"eq:"+Number(weekSel.value)
  });
  const body = { starters: Array.from(starters), bench: Array.from(bench) };
  await patch(url, body);
  alert("Lineup saved");
};

/* ---------- Scores ---------- */
async function loadScores(){
  const url = `${A.SUPABASE_URL}/rest/v1/team_week_scores?` + qs({
    select:"team_id,season,week,points,breakdown",
    "season":"eq:"+Number(seasonSel.value), "week":"eq:"+Number(weekSel.value)
  });
  const data = await get(url);
  el("#scoresList").innerHTML = data.map(r=>`
    <div class="card">
      <div class="row spread"><b>${r.team_id}</b><b>${Number(r.points||0).toFixed(2)}</b></div>
      <div class="badge">${Object.entries(r.breakdown||{}).slice(0,6).map(([pid,pts])=>`${pid}:${Number(pts).toFixed(1)}`).join(" · ")}</div>
    </div>`).join("");
}
el("#btnCompute").onclick = async ()=>{
  await post(`${A.FUNCS}/compute_week_scores`, {
    league_id: A.LEAGUE_ID,
    season: Number(seasonSel.value),
    week: Number(weekSel.value)
  });
  await loadScores();
};

/* ---------- News ---------- */
el("#btnRefreshNews").onclick = async ()=>{
  await post(`${A.FUNCS}/refresh_injuries_and_news`, {}).catch(()=>{});
  await loadNews();
};
async function loadNews(){
  const url = `${A.SUPABASE_URL}/rest/v1/news_items?` + qs({
    select:"published_at,source,title,url,impact_tag", "order":"published_at.desc", "limit":100
  });
  const data = await get(url);
  el("#newsList").innerHTML = data.map(n=>`
    <a class="card" href="${n.url}" target="_blank" rel="noopener">
      <div><b>${n.source}</b> — <span class="badge">${new Date(n.published_at).toLocaleString()}</span></div>
      <div>${n.title}</div>
      <div class="badge">${n.impact_tag||"GENERAL"}</div>
    </a>`).join("");
}

/* ---------- Agent ---------- */
el("#btnAsk").onclick = async ()=>{
  const msg = el("#agentInput").value.trim();
  if(!msg) return;
  const thinking = "Thinking…";
  el("#agentReply").textContent = thinking;
  speak(thinking);
  const res = await post(`${A.FUNCS}/agent_router`, {
    message: msg,
    sport: "nfl",
    season: Number(seasonSel.value),
    week: Number(weekSel.value),
    task: "reason"
  });
  const reply = (res && (res.reply || res.message || res.text)) || "No reply.";
  el("#agentReply").textContent = reply;
  speak(reply);
};
// Add external source (per-user)
document.getElementById('btnAddSource').onclick = async () => {
  const platform = document.getElementById('srcPlatform').value.trim();
  const handle   = document.getElementById('srcHandle').value.trim();
  const notes    = document.getElementById('srcNotes').value.trim();

  if (!platform || !handle) {
    alert('Platform and Handle are required.');
    return;
  }

  const user_id = await getUserId();

  const { error } = await supabase
    .from('team_sources')
    .insert([{ user_id, platform, handle, notes }]);

  if (error) {
    alert('Save failed: ' + error.message);
  } else {
    document.getElementById('srcPlatform').value = '';
    document.getElementById('srcHandle').value = '';
    document.getElementById('srcNotes').value = '';
    await loadSources(); // refresh list
  }
};
/* ---------- Init ---------- */
(async function init(){
  await loadDraft();
  await loadRoster();
  await loadScores();
  await loadNews().catch(()=>{});
  seasonSel.onchange = ()=>{ loadDraft(); loadRoster(); loadScores(); };
  weekSel.onchange   = ()=>{ loadDraft(); loadScores(); };
})();
// ---------- Profile Upload (add this at the END of app.js) ----------
document.getElementById("uploadProfile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Preview before upload
  const url = URL.createObjectURL(file);
  document.getElementById("profilePreview").src = url;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("profile-pics")
    .upload(`users/${Date.now()}-${file.name}`, file);

  if (error) {
    alert("Upload failed: " + error.message);
  } else {
    alert("Profile saved!");
  }
});
document.getElementById("saveTeam").addEventListener("click", async () => {
  const platform = document.getElementById("platform").value;
  const leagueId = document.getElementById("leagueId").value;
  const teamName = document.getElementById("teamName").value;

  const { data, error } = await supabase.from("teams_user").insert([
    { platform, league_id: leagueId, team_name: teamName, user_id: (await supabase.auth.getUser()).data.user.id }
  ]);

  if (error) {
    alert("Error saving team: " + error.message);
  } else {
    alert("Team saved!");
  }
});
document.getElementById('avatarFile').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const supa = window._supa(); // createClient already provided in app.js
  const path = `${Date.now()}-${f.name.replace(/\s+/g,'_')}`;
  const { error } = await supa.storage.from('avatars').upload(path, f, { upsert: true });
  if (error) return toast(error.message);
  const { data } = supa.storage.from('avatars').getPublicUrl(path);
  document.getElementById('avatarPreview').src = data.publicUrl;

  // optionally persist to a user/team table
  // await supa.from('teams_user').update({ avatar_url: data.publicUrl }).eq('team_id', APP.TEAM_ID);
});
// ---------- External Platform Sources (Roster tab) ----------

// helper: render list of sources for this team
async function loadSources() {
  const list = document.getElementById("sourcesList");
  list.innerHTML = "Loading...";
// simple user id placeholder (swap for Auth later)
async function getUserId() {
  let id = localStorage.getItem('user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('user_id', id);
  }
  return id;
}

window.deleteSource = async (id) => {
  const { error } = await supabase.from('team_sources').delete().eq('id', id);
  if (error) alert('Delete failed: ' + error.message);
  else await loadSources();
};
  const { data, error } = await supabase
    .from("team_sources")
    .select("*")
    .eq("team_id", A.TEAM_ID)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<div class="badge" style="color:#ff6666">Load failed: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="badge">No sources yet.</div>`;
    return;
  }

  list.innerHTML = data.map(row => `
    <div class="row" style="justify-content:space-between; margin:6px 0; gap:8px">
      <div>
        <b>${row.platform}</b> &mdash; ${row.handle}
        ${row.notes ? `<div class="badge">${row.notes}</div>` : ""}
      </div>
      <button class="btn muted" data-del="${row.id}" style="padding:6px 10px">Delete</button>
    </div>
  `).join("");

  // attach delete handlers
  list.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const { error: delErr } = await supabase.from("team_sources").delete().eq("id", id);
      if (delErr) {
        alert("Delete failed: " + delErr.message);
      } else {
        loadSources();
      }
    });
  });
}

// add handler for the add button
document.getElementById("btnAddSource").addEventListener("click", async () => {
  const platform = document.getElementById("srcPlatform").value.trim();
  const handle   = document.getElementById("srcHandle").value.trim();
  const notes    = document.getElementById("srcNotes").value.trim();
  const status   = document.getElementById("srcStatus");

  if (!platform || !handle) {
    status.textContent = "Platform and handle required.";
    return;
  }

  status.textContent = "Saving...";

  const { error } = await supabase.from("team_sources").insert({
    team_id: A.TEAM_ID,
    platform,
    handle,
    notes
  });

  if (error) {
    status.textContent = "Save failed: " + error.message;
  } else {
    status.textContent = "Saved!";
    document.getElementById("srcHandle").value = "";
    document.getElementById("srcNotes").value = "";
    loadSources();
    setTimeout(() => status.textContent = "", 1500);
  }
});

// load sources when the page initializes
loadSources();
// --- Live fantasy points subscription -------------------------------

async function getUserId() {
  // TEMP: until Auth is added. If you switched schema to user_id, use whatever
  // stable per-user id you’re using. Otherwise return null to listen to all.
  // Example: a device-based UUID in localStorage.
  let uid = localStorage.getItem('afa_user_id');
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('afa_user_id', uid);
  }
  return uid;
}

function updatePointsInDOM(row) {
  // row must have: player_id, total_points (or points)
  const pid = row.player_id || row.playerid || row.pid;
  if (!pid) return;

  const node = document.querySelector(`[data-player-id="${pid}"] .pts`);
  if (!node) return;

  const pts = row.total_points ?? row.points ?? row.fantasy_points ?? 0;
  node.textContent = Number(pts).toFixed(1);
}

let fpChannel = null;

async function subscribeFantasyPoints() {
  // avoid double subscriptions
  if (fpChannel) return;

  const userId = await getUserId();

  // Build a filter. If your table has user_id, use it. Otherwise, filter by season/week if you like.
  const filter = userId ? `user_id=eq.${userId}` : undefined;

  fpChannel = supabase
    .channel('realtime:fantasy_points')
    .on(
      'postgres_changes',
      {
        event: '*',             // insert | update | delete | '*'
        schema: 'public',
        table: 'fantasy_points',
        ...(filter ? { filter } : {})
      },
      (payload) => {
        // payload.new on INSERT/UPDATE; payload.old on DELETE
        const row = payload.new ?? payload.old;
        if (!row) return;
        updatePointsInDOM(row);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to fantasy_points');
      }
    });

  // Optional: seed current points once on load
  seedCurrentPoints(userId).catch(console.error);

  // Clean up on page close
  window.addEventListener('beforeunload', () => {
    if (fpChannel) {
      supabase.removeChannel(fpChannel);
      fpChannel = null;
    }
  });
}

async function seedCurrentPoints(userId) {
  // Initial load to populate existing values before realtime updates roll in.
  let q = supabase.from('fantasy_points').select('*');
  if (userId) q = q.eq('user_id', userId);

  const { data, error } = await q.limit(1000);
  if (error) {
    console.warn('seedCurrentPoints error', error);
    return;
  }
  (data || []).forEach(updatePointsInDOM);
}

// Call this once when your app starts (e.g., after your DOM is ready)
subscribeFantasyPoints();
const activeSeason = window.APP.SEASON_DEFAULT;
const activeWeek = window.APP.WEEK_DEFAULT;

const filterParts = [];
if (userId) filterParts.push(`user_id=eq.${userId}`);
filterParts.push(`season=eq.${activeSeason}`);
filterParts.push(`week=eq.${activeWeek}`);

const filter = filterParts.join('&'); // e.g. "user_id=eq.X&season=eq.2024&week=eq.1"
