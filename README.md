# 🏈 AI Fantasy Agent

AI Fantasy Agent is a **Progressive Web App (PWA)** that helps you manage fantasy football teams hands-free.  
It connects **Supabase** (for stats, lineups, news) with **Vercel** (for hosting) and **OpenRouter AI models** (for reasoning, advice, start/sit tips).  
Supports:
- 📊 Draft, Roster, Lineups, Weekly Scores
- 📰 News & Injury updates (auto-refreshed via Supabase Functions)
- 🎤 Voice input (speech-to-text)
- 🔊 Voice output (text-to-speech)
- ⚡ PWA installable (Add to Home Screen)

---

## 🚀 Quick Start

### 1. Clone or create repo
On GitHub, create a new repository (public or private). Add these files:
- `index.html`
- `config.js`
- `app.js`
- `manifest.json`
- `sw.js`
- `README.md`
- icons: `icon-192.png`, `icon-512.png`

### 2. Supabase setup
1. Create a Supabase project: <https://supabase.com>
2. Add tables: `players`, `weekly_stats`, `teams_user`, `weekly_lineups`, `team_week_scores`, `news_items`, `share_tokens`  
   (these are filled by the provided Edge Functions)
3. Go to **Project Settings → API**
   - Copy your **Project URL** (`https://xxxx.supabase.co`)
   - Copy your **anon key**
4. Deploy the provided **Edge Functions** (`import_season`, `compute_week_scores`, `refresh_injuries_and_news`, `agent_router`) from the earlier setup.

### 3. Configure app
Edit `config.js` in your repo:
```js
window.APP = {
  SUPABASE_URL: "https://<YOUR-REF>.supabase.co",
  SUPABASE_ANON: "<YOUR-ANON-KEY>",
  FUNCS: "https://<YOUR-REF>.functions.supabase.co",

  LEAGUE_ID: "demo-league-1",
  TEAM_ID: "demo-team-1",
  SEASON_DEFAULT: 2024,
  WEEK_DEFAULT: 1
};
