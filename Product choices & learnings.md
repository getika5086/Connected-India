Here's the full collation of every meaningful product and UX decision made:

---

## 🏠 Homepage

**Headline reframe: "Find the village your family came from"**
The original framing was data-explorer style ("Explore rural connectivity"). Changed to a personal, emotional hook because most public users have a family connection to a village — that's the entry point, not curiosity about policy data.

**Search as the primary action**
Big, centred search bar is the first interactive element. No onboarding, no instructions — just start typing a village name.

**"Don't have a village in mind?" + Surprise Me**
Added as a second entry point below search. Reduces blank-canvas paralysis for users who are curious but don't have a specific village. Deliberately low-key — prompt text is small, button is secondary.

**Three curated story cards**
Server-rendered, rotate on every page load (random from top 50). Three archetypes chosen deliberately:
- *Fastest to light up* — celebration, positive story
- *Among the last connected* — empathy, late-arriving justice
- *From darkness to light* — visual drama, before/after contrast

Each card has a specific one-line hook (e.g. "Night light grew +340% after the road arrived") — not generic descriptions.

**"What you'll discover" + Scale strip above the footer**
Moved from bottom to a more prominent position after realising users weren't scrolling that far. Three-column strips explain the three data layers (road year, satellite lights, village census) without technical jargon.

**Footer with data attribution**
Kept minimal — just data sources (SHRUG, PMGSY, Census 2011). No legal clutter.

---

## 🏘️ Village Page

**Narrative headline over raw data**
Each village page opens with a generated sentence that has a human tone, not a data dump. Five tone variants based on night light growth: explosive growth, strong growth, modest growth, no data yet, pre-programme village.

**Breadcrumb navigation: Home → State → District → Village**
State and district are clickable links, so discovery flows naturally upward. You can explore the district after finding a village.

**"Compare" button in nav**
Placed in the top-right of every village page, pre-loaded with that village as Village A. Makes comparing effortless — no need to go back to a search page.

**Section 3.2 "Seen from Space" as a dark hero card**
Night light data presented in a dark (`bg-gray-950`) card with BEFORE / AFTER numbers and growth % in `text-green-400`. Deliberate contrast — it feels more dramatic visually, matching the satellite imagery theme.

**Narrative above the chart**
One paragraph of plain-English explanation sits above the line chart, telling the story of what happened. The chart is secondary evidence, not the lead.

**"What is night light brightness?" explainer**
Added below the chart explaining the 0–63 NOAA scale and why researchers use it as a proxy for economic activity. Assumes zero prior knowledge.

**Green shaded area on night light chart**
Marks the 5 years after road arrival — draws the eye to the "story zone" of the chart without requiring any interpretation from the user.

**Economic census section with before/after framing**
Non-farm workers, enterprises, output shown as before/after road, not just raw numbers. The comparison is the story.

**Amenities as a factual grid**
Schools, hospitals, banks, post offices — shown as a simple count grid from 2011 census. No benchmarking or scoring — just facts.

**Share button**
Simple share that copies the URL. Tracked as a telemetry event so we know which villages get shared most.

---

## 🗺️ District Page

**Year-by-year bar chart as the entry point**
Shows how many villages in the district got connected each year. Clicking a bar filters the village list below — so the chart is navigation, not just display.

**Village chips below the chart**
Compact, clickable chips grouped by selected year. Keeps the page fast and scannable without a dense table.

---

## 🏆 Leaderboard Page

**Three ranked lists, not one**
Villages Connected (volume), Night Light Growth (impact), Earliest Movers (pioneer spirit) — each tells a different story about which states led. A single ranking would flatten nuance.

**Medal emojis for top 3**
🥇🥈🥉 — small touch but makes the top spots feel meaningful without heavy design.

**Mini bars alongside numbers**
Proportional bars next to each state's count make relative differences scannable without having to parse numbers.

**National totals as context**
1.7 lakh villages, 7.4 lakh km of roads, 25 years — shown at the top to anchor the scale before users drill into state-by-state numbers.

---

## ⚖️ Compare Two Villages Page

**URL-based state (`?a=slug&b=slug`)**
Shareable by design — the comparison URL can be sent to someone and they see the same two villages. This was a deliberate product decision, not a technical convenience.

**Two-colour system: blue vs amber**
Village A always blue, Village B always amber — consistent across search slots, chart lines, reference lines, and winner highlights. No ambiguity about which village is which.

**Pre-loaded from village page**
Clicking "Compare" on any village page opens the compare page with that village already in Slot A. Reduces friction to zero for the most natural flow (find a village, then compare it).

**Road year race as the lead stat**
The first thing you see is which village got its road first and by how many years. Simple, clear, immediately interesting.

**Winner checkmark ✓ in the metrics table**
Each row in the comparison table highlights the better-performing village. Makes scanning fast — you don't need to read every number.

**Night light before/after cards + overlapping chart**
Two data views: the summary card (BEFORE / AFTER numbers) for quick reading, and the overlapping line chart for the full time series. Different users get what they need.

---

## 📊 Analytics Dashboard

**Internal-only, no auth**
Built at `/analytics` — not linked from the public nav. Simple security through obscurity for an MVP. Gives raw insight into real user behaviour without building a full admin system.

**8 stat cards + top villages + daily activity chart**
Covers the questions that matter for a new product: How many people came? What did they do? Which villages are popular? What features are being used?

---

## 🧭 Navigation & Information Architecture

**Three top-level destinations in the nav**
Compare Villages and State Rankings are the only two nav items alongside the logo. Kept deliberately sparse — no hamburger menus, no dropdowns.

**Discovery flows in both directions**
Search → Village → District → State (drill up), or Leaderboard → State → Village (drill down). Both paths are supported without making either feel primary.

**Consistent green colour language**
Green = road connectivity, growth, positive change. Used for the road year reference line, growth percentages, the PMGSY theme colour throughout. One colour, one meaning.

---

## 🎯 Overall Philosophy

**One data story per section, not raw tables**
Every section was designed around a question a human would ask ("When did the road arrive?" "Did it make a difference?") not around what data was available.

**Assume zero knowledge**
Every metric has a plain-English explanation nearby. Night light scale explained. PMGSY acronym never used without context. Census year always stated explicitly.

**Emotional entry, evidence exit**
Users arrive through a personal hook (family village) and leave having seen real satellite and census data. The emotional entry makes the evidence feel relevant rather than abstract.