# STRATIS — Porsche Prototype

A clickable, data-rich prototype demonstrating that **all data lives in one place** across regions and channels. Built for agency operators managing global automotive brand campaigns.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the Campaign Dashboard (Brand View).

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui** for components
- **Recharts** + **react-simple-maps** for data visualization
- **Zustand** for state management
- **Deterministic mock data** — seeded PRNG generating 180 days of time series across 25 campaigns, 6 regions, 40 countries, 5 channels

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Campaign Dashboard with Brand / Region / Campaign drill-down views |
| `/news` | Aggregated news feed — competitor, platform, category, and macro signals |
| `/insights` | AI-derived insights with human-in-the-loop approval workflow |
| `/creative-studio` | Creative Studio for asset management and review (coming soon) |
| `/assistant` | STRATIS Assistant — conversational AI for campaign analysis (coming soon) |
| `/simulation` | Simulation Sandbox — scenario modeling and A/B forecasting (coming soon) |

## Demo Script (Wow Flow)

1. **Brand View** (default): See global KPI strip (14 metrics), performance trends, interactive world map with spend/ROAS choropleth, regional table, channel mix donut, and anomaly alerts. Within 5 seconds you understand global performance.

2. **Enable Compare**: Toggle "Compare" in the header. All KPI cards now show delta vs previous period. Top Improving / Declining region panels populate.

3. **Filter by Region & Country**: Open the Region filter — check "North America" to see country checkboxes expand inline. Check "United States" to narrow data to US campaigns only. The map auto-zooms to the region.

4. **Drill to Region**: Click any region row in the table (e.g., "Europe"). The view scopes to Europe's campaigns — KPIs, trends, and channel mix all update. The map zooms to show country-level shading. Campaigns table shows objective, fatigue index, and budget pacing.

5. **Drill to Campaign**: Click a campaign (e.g., "EU 911 Heritage"). See channel-level performance table, creative fatigue chart, and optimization opportunities from the Insights engine.

6. **Navigate to Insights**: Click sidebar "Insights". Browse 60+ AI-generated insights. Expand any card to see evidence bullets, confidence meter, and recommended action.

7. **Approve an Insight**: Click "Approve" on a high-confidence insight, optionally add rationale. It moves to Approved status and appears in the "Approved Actions" drawer.

8. **Check Dashboard Indicator**: Return to Dashboard. Notice the "Simulated plan updated (N approved actions)" badge — demonstrating the human-in-the-loop loop closing back to the dashboard.

9. **News Feed**: Visit `/news`. Filter by tag (Competitor, Platform), region, or urgency. Click "Generate Insight" on any news item to link it to the Insights engine.

## Key Features

- **Hierarchy Navigation**: Porsche > Region > Campaign via breadcrumbs
- **Interactive World Map**: Choropleth with region zoom, country-level spend/ROAS shading, and click-to-drill
- **Cascading Filters**: Region > Country > Campaign > Channel — selecting a region reveals nested country checkboxes; narrowing propagates downstream
- **14+ KPIs** with customizable display (Customize KPIs modal)
- **Time Controls**: Last 7/14/30/90 days, YTD, with period-over-period comparison
- **Attribution Model**: Last Click, First Click, Linear, Data-Driven (shifts conversion metrics)
- **Role Toggle**: Agency Operator / Brand Exec (changes default KPI emphasis)
- **Channel Mix**: Instagram, Facebook, TikTok, Google Search, The Trade Desk
- **Anomaly Detection**: Z-score based detection populating alerts and linked insights
- **Insight Workflow**: New > Reviewed > Approved/Dismissed/Snoozed with full Action Log
- **localStorage Persistence**: Filters, date range, KPI customization, and approval states persist across sessions
- **Loading Skeletons**: Simulated loading for production feel
- **Dark Mode**: Default dark theme with teal accent

## Mock Data

All data is generated deterministically from a seeded PRNG (seed: 42). No external APIs. The generator produces:

- 25 campaigns across 6 regions and ~40 countries
- 180 days of daily metrics per campaign per channel
- Country-level spend allocation for choropleth map shading
- Channel-specific distributions (Search = high intent, TikTok = volatile, TTD = high reach)
- Seasonality + 6 "events" creating anomalies (product launches, competitive surges, macro shifts)
- 80 news items and 60+ insights with evidence and impact estimates
