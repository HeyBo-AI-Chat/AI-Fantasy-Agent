/* =========================
   Config & Supabase client
   ========================= */
const APP = window.APP || {};
const supaCreate =
  (window.supabase && window.supabase.createClient) || window.createClient;
if (!supaCreate) console.warn('Supabase library not found. Include supabase-js.');
const supabase =
  (window._supabaseClient ||= supaCreate?.(APP.SUPABASE_URL, APP.SUPABASE_ANON));

/* ==============
   Small helpers
   ============== */
const $id  = (id, root = document) => root.getElementById(id);
const $$   = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const qs   = (p) => Object.entries(p).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
const hdrs = {
  'Content-Type': 'application/json',
  'apikey': APP.SUPABASE_ANON,
  'Authorization': `Bearer ${APP.SUPABASE_ANON}`
};

/* =========================
   Dev-only user id (no Auth)
   ========================= */
async function getUserId() {
  let id = localStorage.getItem('dev_user_id');
  if (!id) {
    id = (crypto?.randomUUID && crypto.randomUUID()) ||
         ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
           (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
         );
    localStorage.setItem('dev_user_id', id);
  }
  return id;
}

/* =======================================
   Dropdown data & population (fixed)
   ======================================= */
let seasonSel, weekSel;

function fillSelect(sel, items, placeholder = 'Select…') {
  if (!sel) return;
  sel.innerHTML =
    `<option value="">${placeholder}</option>` +
    items.map(v => `<option value="${v}">${v}</option>`).join('');
}

// Returns { type: 'regular'|'playoff', value: number|string }
function getSelectedWeek() {
  const raw = (weekSel?.value || '').trim();
  const n = Number(raw);
  if (!raw) return { type: 'regular', value: 1 };
  if (!Number.isNaN(n) && n >= 1 && n <= 18) return { type: 'regular', value: n };
  return { type: 'playoff', value: raw }; // 'WC' | 'DIV' | 'CONF' | 'SB'
}

function initDropdowns() {
  seasonSel = $id('season');
  weekSel   = $id('week');

  // Seasons (exactly 2020–2024)
  fillSelect(seasonSel, [2024, 2023, 2022, 2021, 2020], 'Select Season');

  // Week / Round (Regular + Playoffs)
  if (weekSel) {
    weekSel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Select Week / Round';
    weekSel.appendChild(ph);

    const ogReg = document.createElement('optgroup');
    ogReg.label = 'Regular Season';
    for (let w = 1; w <= 18; w++) {
      const opt = document.createElement('option');
      opt.value = String(w);
      opt.textContent = `Week ${w}`;
      ogReg.appendChild(opt);
    }
    weekSel.appendChild(ogReg);

    const ogPO = document.createElement('optgroup');
    ogPO.label = 'Playoffs';
    [
      { value: 'WC',  label: 'Wild Card' },
      { value: 'DIV', label: 'Divisional' },
      { value: 'CONF',label: 'Conference Championship' },
      { value: 'SB',  label: 'Super Bowl' },
    ].forEach(({value, label}) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      ogPO.appendChild(opt);
    });
    weekSel.appendChild(ogPO);
  }

  fillSelect($id('srcPlatform'),
    ['DraftKings','FanDuel','Yahoo','ESPN','Sleeper','Other'],
    'Select Platform'
  );
}

/* =========
   Tabs init
   ========= */
function initTabs() {
  const sections = {
    draft:  $id('tab-draft'),
    roster: $id('tab-roster'),
    lineup: $id('tab-lineup'),
    scores: $id('tab-scores'),
    news:   $id('tab-news'),
    agent:  $id('tab-agent')
  };

  function showTab(name) {
    Object.entries(sections).forEach(([k, el]) => el && el.classList.toggle('hidden', k !== name));
    $$('.tabbtn').forEach(b => b.classList.toggle('active', b.dataset.t === name));
    localStorage.setItem('active_tab', name);

    if (name === 'roster') loadSources().catch(()=>{});
    if (name === 'scores') refreshTeamPoints().catch(()=>{});
  }

  $$('.tabbtn').forEach(b => b.addEventListener('click', () => showTab(b.dataset.t)));
  showTab(localStorage.getItem('active_tab') || 'draft');
}

/* =========================
   Linked Sources (per user)
   ========================= */
async function loadSources() {
  const list = $id('linkedSources') || $id('sourcesList');
  if (!list) return;

  list.innerHTML = 'Loading…';
  const user_id = await getUserId();

  const { data, error } = await supabase
    .from('team_sources')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = `<div class="badge" style="color:#ff6b6b">Error: ${error.message}</div>`;
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
        ${r.notes ? `<div class="badge" style="opacity:.8">${r.notes}</div>` : ''}
      </div>
      <button class="btn muted" data-del="${r.id}">Delete</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del');
      const { error: delErr } = await // in addSource(), right before supabase.from('team_sources')...
console.log('addSource payload:', {
  platform, handle, notes,
  user_id: await getUserId(),
  team_id: APP.TEAM_ID
});supabase.from('team_sources').delete().eq('id', id);
      if (delErr) alert('Delete failed: ' + delErr.message);
      else loadSources();
    });
  });
}

async function addSource() {
  const platform = ($id('srcPlatform')?.value || '').trim();
  const handle   = ($id('srcHandle')?.value   || '').trim();
  const notes    = ($id('srcNotes')?.value    || '').trim();

  if (!platform || !handle) {
    alert('Platform and Handle / League ID are required');
    return;
  }

  const user_id = await getUserId();
  const team_id = APP.TEAM_ID || 'demo-team-1';  // <-- important

  const { error } = await supabase
    .from('team_sources')
    .insert([{ user_id, team_id, platform, handle, notes }]);

  if (error) {
    alert('Save failed: ' + error.message);
    return;
  }

  if ($id('srcHandle')) $id('srcHandle').value = '';
  if ($id('srcNotes'))  $id('srcNotes').value  = '';

  await loadSources();
}
/* ========================
   Draft / Roster / Lineup
   ======================== */
async function getJSON(url) {
  const r = await fetch(url, { headers: hdrs });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function loadDraft() {
  const season = Number(seasonSel?.value || new Date().getFullYear());
  const wk = getSelectedWeek();
  if (wk.type !== 'regular') {
    // No weekly_stats for playoff rounds; clear list politely
    const list = $id('draftList');
    const count = $id('draftCount');
    if (list) list.innerHTML = `<div class="badge">Draft list not available for playoff rounds.</div>`;
    if (count) count.textContent = '0';
    return;
  }
  const week = wk.value;

  const url = `${APP.SUPABASE_URL}/rest/v1/weekly_stats?` + qs({
    select: "player_id,position,team_id,season,week,fantasy_ppr,players(player_name)",
    sport: "eq:nfl",
    season: "eq:"+season,
    week: "eq:"+week,
    order: "fantasy_ppr.desc",
    limit: 200
  });

  const data = await getJSON(url).catch(()=>[]);
  const list = $id('draftList');
  const count = $id('draftCount');
  if (count) count.textContent = data.length;
  if (!list) return;

  list.innerHTML = data.map(row => `
    <div class="card">
      <div class="row spread">
        <div>
          <div><b>${row.players?.player_name || row.player_id}</b></div>
          <div class="badge">${row.team_id || ''} · ${row.position || ''}</div>
        </div>
        <div style="text-align:right">
          <div><b>${Number(row.fantasy_ppr||0).toFixed(2)}</b> PPR</div>
          <button class="btn muted" data-add="${row.player_id}" data-pos="${row.position||''}">Add</button>
        </div>
      </div>
    </div>
  `).join('');

  $$('#draftList [data-add]').forEach(btn => {
    btn.addEventListener('click', async () => {
      alert('Add-to-roster not wired to a table yet.');
    });
  });
}

async function loadRoster() {
  const list = $id('rosterList');
  const count = $id('rosterCount');
  if (list) list.innerHTML = '';
  if (count) count.textContent = '0';
}

const starters = new Set();
const bench    = new Set();

function renderLineup() {
  const startersBox = $id('starters');
  const benchBox    = $id('bench');
  if (startersBox) startersBox.innerHTML = Array.from(starters).map(id => `<div class="badge">${id}</div>`).join('') || `<div class="badge">No starters selected</div>`;
  if (benchBox)    benchBox.innerHTML    = Array.from(bench).map(id => `<div class="badge">${id}</div>`).join('')    || `<div class="badge">No bench selected</div>`;
}

/* =======
   Scores
   ======= */
async function loadScores() {
  const season = Number(seasonSel?.value || new Date().getFullYear());
  const wk = getSelectedWeek();
  const params = {
    select: "team_id,season,week,points,breakdown",
    season: "eq:" + season
  };
  if (wk.type === 'regular') params.week = "eq:" + wk.value;
  // (If playoffs, your RPC/edge function can read a "round" later)

  const url = `${APP.SUPABASE_URL}/rest/v1/team_week_scores?` + qs(params);
  const data = await getJSON(url).catch(()=>[]);
  const list = $id('scoresList');
  if (!list) return;

  list.innerHTML = data.map(r => `
    <div class="card">
      <div class="row spread"><b>${r.team_id}</b><b>${Number(r.points||0).toFixed(2)}</b></div>
      <div class="badge">${
        Object.entries(r.breakdown || {})
          .slice(0, 6)
          .map(([pid, pts]) => `${pid}: ${Number(pts).toFixed(1)}`)
          .join(' · ')
      }</div>
    </div>
  `).join('');
}

async function refreshTeamPoints() {
  await loadScores();
}

/* =====
   News
   ===== */
async function loadNews() {
  const url = `${APP.SUPABASE_URL}/rest/v1/news_items?` + qs({
    select: "published_at,source,title,url,impact_tag",
    order:  "published_at.desc",
    limit:  100
  });
  const data = await getJSON(url).catch(()=>[]);
  const list = $id('newsList');
  if (!list) return;
  list.innerHTML = data.map(n => `
    <a class="card" href="${n.url}" target="_blank" rel="noopener">
      <div><b>${n.source}</b> — <span class="badge">${new Date(n.published_at).toLocaleString()}</span></div>
      <div>${n.title}</div>
      <div class="badge">${n.impact_tag || "GENERAL"}</div>
    </a>
  `).join('');
}

/* ==============
   Compute (improved)
   ============== */
async function computeNow() {
  const season = Number(seasonSel?.value) || (APP.SEASON_DEFAULT || new Date().getFullYear());
  const wk = getSelectedWeek();
  const payload = {
    team_id: APP.TEAM_ID || 'demo-team-1',
    season,
    week:  wk.type === 'regular' ? wk.value : null,
    round: wk.type === 'playoff' ? wk.value : null,
  };

  const functionsBase =
    (APP && APP.FUNCS) ||
    (APP?.SUPABASE_URL ? `${APP.SUPABASE_URL}/functions/v1` : '');

  if (!functionsBase) {
    alert('Compute failed: Functions base URL missing (APP.FUNCS).');
    return;
  }

  try {
    const url = `${functionsBase}/compute-scores`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': APP.SUPABASE_ANON,
        'Authorization': `Bearer ${APP.SUPABASE_ANON}`
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text(); // show server message verbatim
    if (!res.ok) {
      console.error('compute-scores error', res.status, text);
      alert(`Compute failed: ${res.status} ${text || '(no body)'}`);
      return;
    }

    alert(`Compute finished: ${text || res.status}`);
    await loadScores();
  } catch (e) {
    console.error('compute-scores fetch threw', e);
    alert('Compute failed: ' + (e?.message || e));
  }
}
/* ======
   Agent
   ====== */
let TTS_ENABLED = false;
function speak(text) {
  try {
    if (!TTS_ENABLED || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; u.volume = 1; u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

$id('btnTTS')?.addEventListener('click', () => {
  TTS_ENABLED = !TTS_ENABLED;
  $id('btnTTS').textContent = TTS_ENABLED ? "🔊 Speak: On" : "🔈 Speak: Off";
  if (TTS_ENABLED) speak("Speech enabled.");
});

$id('btnAsk')?.addEventListener('click', async () => {
  const msg = ($id('agentInput')?.value || '').trim();
  if (!msg) return;
  const thinking = "Thinking…";
  if ($id('agentReply')) $id('agentReply').textContent = thinking;
  speak(thinking);
  try {
    const wk = getSelectedWeek();
    const r = await fetch(`${APP.FUNCS}/agent_router`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        message: msg,
        sport: "nfl",
        season: Number(seasonSel?.value || new Date().getFullYear()),
        week: wk.type === 'regular' ? wk.value : null,
        round: wk.type === 'playoff' ? wk.value : null,
        task: "reason"
      })
    });
    const res = await r.json().catch(()=> ({}));
    const reply = res.reply || res.message || res.text || "No reply.";
    if ($id('agentReply')) $id('agentReply').textContent = reply;
    speak(reply);
  } catch {
    if ($id('agentReply')) $id('agentReply').textContent = 'Error contacting agent.';
  }
});

/* =================
   Button wiring
   ================= */
function bindButtons() {
  const addBtns = [
    document.getElementById('btnAddSource'),
    document.getElementById('addSourceBtn'),
    document.querySelector('[data-action="add-source"]'),
  ].filter(Boolean);

  const computeBtns = [
    document.getElementById('btnCompute'),
    document.getElementById('computeBtn'),
    document.querySelector('[data-action="compute"]'),
  ].filter(Boolean);

  addBtns.forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await addSource();
    });
  });

  computeBtns.forEach((btn) => {
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await computeNow();
    });
  });
}

document.addEventListener('click', async (e) => {
  const add = e.target.closest('#btnAddSource, #addSourceBtn, [data-action="add-source"]');
  const comp = e.target.closest('#btnCompute, #computeBtn, [data-action="compute"]');
  if (add) { e.preventDefault(); await addSource(); }
  if (comp) { e.preventDefault(); await computeNow(); }
});

/* =================
   Boot
   ================= */
document.addEventListener('DOMContentLoaded', async () => {
  // Remove any leftover demo line
  const demo = Array.from(document.querySelectorAll('*'))
    .find(n => n.childNodes && [...n.childNodes].some(c =>
      c.nodeType === 3 && /Stefon\s+Diggs[\s\S]*Pts:\s*0\.0/i.test(c.textContent || '')
    ));
  if (demo) demo.remove();

  initDropdowns();
  initTabs();
  bindButtons();

  await loadDraft();
  await loadRoster();
  await loadScores();
  await loadNews().catch(()=>{});

  seasonSel?.addEventListener('change', () => { loadDraft(); loadRoster(); loadScores(); });
  weekSel?.addEventListener('change',   () => { loadDraft();                  loadScores(); });

  // Realtime subscription for fantasy_points
  supabase
    .channel('custom-all-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'fantasy_points' },
      payload => {
        console.log('New fantasy update:', payload);
        refreshTeamPoints().catch(()=>{});
      }
    )
    .subscribe();
});
