"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { generateAllData } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, X, Sparkles, AlertTriangle, TrendingUp, Shield, Target, ArrowRight, ExternalLink, Bookmark, Share2 } from 'lucide-react';
import { type NewsItem, type NewsTag } from '@/types';
import { cn } from '@/lib/utils';

// ─── Section definitions ────────────────────────────────────────────────────

interface FeedSection {
  id: string;
  title: string;
  sources: string[];
  filterFn: (item: { tags: NewsTag[]; competitor?: string }) => boolean;
}

const FEED_SECTIONS: FeedSection[] = [
  {
    id: "brand",
    title: "Brand News",
    sources: ["Porsche", "Porsche Newsroom", "Automotive News"],
    filterFn: (item) => !item.tags.includes("competitor") && (item.tags.includes("category") || item.tags.includes("platform")),
  },
  {
    id: "competitor",
    title: "Competitor Watch",
    sources: ["BMW", "Mercedes-Benz", "Audi", "Tesla"],
    filterFn: (item) => item.tags.includes("competitor"),
  },
  {
    id: "trend",
    title: "Trend Radar",
    sources: ["Google Trends", "Social Listening", "Industry Reports"],
    filterFn: (item) => item.tags.includes("platform"),
  },
  {
    id: "market",
    title: "Market Sentiment",
    sources: ["Reuters", "Bloomberg", "CNBC"],
    filterFn: (item) => item.tags.includes("macro"),
  },
];

// ─── Contextual image URL from article title ────────────────────────────────

const CURATED_IMAGES: Array<{ match: RegExp; photos: string[] }> = [
  { match: /BMW/i, photos: [
    "photo-1555215695-3004980ad54e",
    "photo-1617814076367-b759c7d7e738",
    "photo-1556189250-72ba954cfc2b",
  ]},
  { match: /Mercedes/i, photos: [
    "photo-1618843479313-40f8afb4b4d8",
    "photo-1609521263047-f8f205293f24",
    "photo-1606016159991-dfe4f2746ad5",
  ]},
  { match: /Audi/i, photos: [
    "photo-1606664515524-ed2f786a0bd6",
    "photo-1603584173870-7f23fdae1b7a",
    "photo-1614200187524-dc4b892acf16",
  ]},
  { match: /Tesla/i, photos: [
    "photo-1560958089-b8a1929cea89",
    "photo-1617788138017-80ad40651399",
    "photo-1571987502227-9231b837d92a",
  ]},
  { match: /Lexus/i, photos: [
    "photo-1621993202323-f438eec934ff",
    "photo-1619405399517-d7fce0f13302",
    "photo-1583121274602-3e2820c69888",
  ]},
  { match: /Porsche/i, photos: [
    "photo-1614162118720-fee56ece5803",
    "photo-1503376780353-7e6692767b70",
    "photo-1611859266238-4b98091d9d9b",
  ]},
  { match: /EV|electric.vehicle/i, photos: [
    "photo-1560958089-b8a1929cea89",
    "photo-1611859266238-4b98091d9d9b",
    "photo-1617788138017-80ad40651399",
  ]},
  { match: /TikTok|Reels|video/i, photos: [
    "photo-1611162616305-c69b3fa7fbe0",
    "photo-1611162618071-b39a2ec055fb",
    "photo-1600096194534-95cf5ece04cf",
  ]},
  { match: /Meta|Facebook|Instagram/i, photos: [
    "photo-1611162617474-5b21e879e113",
    "photo-1563986768609-322da13575f2",
    "photo-1432888622747-4eb9a8efeb07",
  ]},
  { match: /Google/i, photos: [
    "photo-1573804633927-bfcbcd909acd",
    "photo-1616499370260-485b3e5ed653",
    "photo-1551808525-51a94da548ce",
  ]},
  { match: /Trade Desk|CTV|programmatic/i, photos: [
    "photo-1593784991095-a205069470b6",
    "photo-1611532736597-de2d4265fba3",
    "photo-1522869635100-9f4c5e86aa37",
  ]},
  { match: /privacy|regulation/i, photos: [
    "photo-1563013544-824ae1b704d3",
    "photo-1614064641938-3bbee52942c7",
    "photo-1558494949-ef010cbdcc31",
  ]},
  { match: /luxury/i, photos: [
    "photo-1583121274602-3e2820c69888",
    "photo-1492144534655-ae79c964c9d7",
    "photo-1619405399517-d7fce0f13302",
  ]},
  { match: /Middle East/i, photos: [
    "photo-1512453979798-5ea266f8880c",
    "photo-1518684079-3c830dcef090",
    "photo-1526495124232-a04e1849168c",
  ]},
  { match: /APAC|Asia/i, photos: [
    "photo-1540959733332-eab4deabeeaf",
    "photo-1536098561742-ca998e48cbcc",
    "photo-1493976040374-85c8e12f0c0e",
  ]},
  { match: /UK|Europe|EU/i, photos: [
    "photo-1513635269975-59663e0ac1ad",
    "photo-1486299267070-83823f5448dd",
    "photo-1505761671935-60b3a7427bad",
  ]},
  { match: /LATAM|Latin/i, photos: [
    "photo-1516306580123-e6e52b1b7b5f",
    "photo-1543059080-f9b1272213d5",
    "photo-1551288049-bebda4e38f71",
  ]},
  { match: /currency|market|forecast/i, photos: [
    "photo-1611974789855-9c2a0a7236a3",
    "photo-1590283603385-17ffb3a7f29f",
    "photo-1634542984003-e0fb8e200e91",
  ]},
  { match: /connected.car/i, photos: [
    "photo-1549399542-7e3f8b79c341",
    "photo-1558618666-fcd25c85f82e",
    "photo-1619642751034-765dfdf7c58e",
  ]},
  { match: /campaign|budget|spend/i, photos: [
    "photo-1460925895917-afdab827c52f",
    "photo-1551288049-bebda4e38f71",
    "photo-1504868584819-f8e8b4b6d7e3",
  ]},
];

const FALLBACK_PHOTOS = [
  "photo-1492144534655-ae79c964c9d7",
  "photo-1583121274602-3e2820c69888",
  "photo-1503376780353-7e6692767b70",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function articleImageUrl(title: string, id: string): string {
  const idx = hashId(id);
  for (const entry of CURATED_IMAGES) {
    if (entry.match.test(title)) {
      const photo = entry.photos[idx % entry.photos.length];
      return `https://images.unsplash.com/${photo}?w=640&h=400&fit=crop&auto=format`;
    }
  }
  const photo = FALLBACK_PHOTOS[idx % FALLBACK_PHOTOS.length];
  return `https://images.unsplash.com/${photo}?w=640&h=400&fit=crop&auto=format`;
}

// Larger version for the modal hero
function articleImageUrlLarge(title: string, id: string): string {
  const idx = hashId(id);
  for (const entry of CURATED_IMAGES) {
    if (entry.match.test(title)) {
      const photo = entry.photos[idx % entry.photos.length];
      return `https://images.unsplash.com/${photo}?w=1200&h=500&fit=crop&auto=format`;
    }
  }
  const photo = FALLBACK_PHOTOS[idx % FALLBACK_PHOTOS.length];
  return `https://images.unsplash.com/${photo}?w=1200&h=500&fit=crop&auto=format`;
}

// ─── AI Insight generator (deterministic from article) ──────────────────────

const TAG_LABELS: Record<NewsTag, string> = {
  competitor: "Competitive Intelligence",
  category: "Market Category",
  platform: "Platform Update",
  macro: "Macro Trend",
};

function generateInsight(item: NewsItem): { impact: string; actions: Array<{ icon: React.ElementType; title: string; description: string }> } {
  const tag = item.tags[0];
  const h = hashId(item.id);

  if (tag === "competitor") {
    return {
      impact: `This signals a direct competitive move that could affect Porsche's positioning in key markets. ${item.competitor ? `${item.competitor}'s` : "Competitor"} actions suggest an aggressive push for market share, particularly among luxury EV intenders. If left unaddressed, this could erode Porsche's share of voice and brand consideration in the 30-45 high-income demographic.`,
      actions: [
        { icon: Shield, title: "Deploy Defensive Campaigns", description: `Launch brand defense campaigns in affected markets targeting ${item.competitor || "competitor"} intenders with Porsche's heritage and performance messaging. Estimated budget: $45-65K over 2 weeks.` },
        { icon: Target, title: "Increase Conquest Targeting", description: `Activate conquest audiences on Google and Meta targeting users researching ${item.competitor || "competitor"} models. Focus on Taycan vs. competitor comparison content.` },
        { icon: TrendingUp, title: "Boost Brand Search Bids", description: "Increase branded search bid caps by 20% in affected regions to protect brand SERP presence and prevent competitor conquesting." },
      ],
    };
  }
  if (tag === "platform") {
    return {
      impact: "This platform update presents both an opportunity and a risk for Porsche's digital campaigns. Early adoption of new features typically yields a 15-25% efficiency advantage before competition saturates the format. However, existing campaign structures may need adjustment to fully leverage the changes.",
      actions: [
        { icon: Target, title: "Test New Ad Formats", description: "Allocate 10% of platform budget to test the new features with Taycan and 911 creative. Run A/B tests against current top performers for 2 weeks." },
        { icon: TrendingUp, title: "Update Bidding Strategy", description: "Review and adjust bidding strategies to align with the platform's updated algorithm. Consider switching to value-based bidding where available." },
        { icon: Shield, title: "Monitor Performance Metrics", description: "Set up daily monitoring dashboards to track any performance shifts. Flag campaigns with >10% CPA increase for immediate review." },
      ],
    };
  }
  if (tag === "macro") {
    return {
      impact: "This macroeconomic development has direct implications for Porsche's media investment strategy. Market conditions are shifting in ways that could affect consumer purchasing confidence, media costs, and regional performance dynamics. Proactive budget reallocation can turn this into a competitive advantage.",
      actions: [
        { icon: TrendingUp, title: "Reallocate Regional Budget", description: "Shift 8-12% of budget from underperforming regions toward markets showing positive momentum. Focus on markets with favorable currency dynamics and consumer confidence." },
        { icon: Target, title: "Adjust Messaging Strategy", description: "Update ad copy and creative to resonate with current market sentiment. Emphasize value retention, heritage, and investment-quality positioning." },
        { icon: Shield, title: "Diversify Channel Mix", description: "Reduce dependency on any single channel by spreading investment. Increase upper-funnel awareness spend to maintain brand salience during market shifts." },
      ],
    };
  }
  // category / default
  return {
    impact: "This industry trend validates Porsche's positioning in the luxury automotive segment. Growing category demand creates a favorable environment for scaling performance campaigns while maintaining efficiency. The key is to capture incremental demand before competitors increase their investment.",
    actions: [
      { icon: TrendingUp, title: "Scale Top Performers", description: `Increase budget on top 5 campaigns by 15-20% to capture rising demand. Current top ROAS campaigns have headroom before hitting diminishing returns.` },
      { icon: Target, title: "Expand Audience Targeting", description: "Broaden prospecting audiences to capture new luxury intenders entering the market. Test lookalike audiences based on recent converters." },
      { icon: Shield, title: "Accelerate Creative Production", description: "Fast-track 3-5 new creative variants to test against rising demand. Focus on model-specific messaging for Taycan, 911, and Cayenne." },
    ],
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const store = useMemo(() => generateAllData(), []);
  const newsItems = store.newsItems;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedArticle(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const sections = useMemo(() => {
    const used = new Set<string>();
    return FEED_SECTIONS.map((section) => {
      const items = newsItems.filter((item) => {
        if (used.has(item.id)) return false;
        if (section.filterFn(item)) {
          used.add(item.id);
          return true;
        }
        return false;
      });
      return { ...section, items: items.slice(0, 6) };
    }).filter((s) => s.items.length > 0);
  }, [newsItems]);

  if (loading) {
    return (
      <div className="space-y-10 px-2">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-3">
                  <Skeleton className="h-44 rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const insight = selectedArticle ? generateInsight(selectedArticle) : null;

  return (
    <>
      <div className="space-y-12 px-2">
        {sections.map((section) => {
          const sourcesDisplay = section.sources.slice(0, 3).join(", ");
          const moreCount = Math.max(0, section.sources.length - 3);
          const unreadCount = section.items.length;

          return (
            <div key={section.id}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-lg font-bold">{section.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monitoring: {sourcesDisplay}
                    {moreCount > 0 && <>, and {moreCount} more</>}
                    .{" "}
                    <button className="text-foreground underline underline-offset-2 hover:text-teal transition-colors">Edit</button>
                  </p>
                </div>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1">
                  View all ({unreadCount} unread) <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-5 mt-4">
                {section.items.slice(0, 3).map((item) => {
                  const date = new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedArticle(item)}
                      className="group rounded-xl border border-border/40 bg-card overflow-hidden hover:border-border/60 hover:shadow-lg hover:shadow-black/10 transition-all cursor-pointer"
                    >
                      <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={articleImageUrl(item.title, item.id)}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold leading-snug mb-2 line-clamp-2 group-hover:text-teal transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                          <span className="font-medium text-muted-foreground/80">{item.source}</span>
                          {" "}• {date} • {item.summary}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Article Detail Modal ─── */}
      {selectedArticle && insight && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border/40 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hero image */}
            <div className="relative h-56 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={articleImageUrlLarge(selectedArticle.title, selectedArticle.id)}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

              {/* Close button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Tags */}
              <div className="absolute bottom-4 left-6 flex items-center gap-2">
                {selectedArticle.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold text-white/90 bg-white/15 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full">
                    {TAG_LABELS[tag]}
                  </span>
                ))}
                <span className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm",
                  selectedArticle.urgency === "high" ? "text-red-300 bg-red-500/20 border border-red-500/20" :
                  selectedArticle.urgency === "medium" ? "text-amber-300 bg-amber-500/20 border border-amber-500/20" :
                  "text-white/70 bg-white/10 border border-white/10"
                )}>
                  {selectedArticle.urgency.charAt(0).toUpperCase() + selectedArticle.urgency.slice(1)} Priority
                </span>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              {/* Article header */}
              <div className="pt-4 pb-5">
                <h2 className="text-xl font-bold leading-tight mb-3">{selectedArticle.title}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{selectedArticle.source}</span>
                  <span>•</span>
                  <span>{new Date(selectedArticle.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>

              {/* Article body */}
              <div className="space-y-4 mb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedArticle.summary}</p>
                {selectedArticle.competitor && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300/80">
                      <span className="font-semibold text-red-400">Competitor Alert:</span> This article involves <span className="font-semibold">{selectedArticle.competitor}</span>, a direct competitor in the luxury automotive segment.
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border/30 my-6" />

              {/* STRATIS Insight */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal/20 to-emerald-500/10 border border-teal/20 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-teal" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">STRATIS Insight</h3>
                    <p className="text-[10px] text-muted-foreground/60">What this means for Porsche</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-2">{insight.impact}</p>

                {/* Why it matters callout */}
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-teal/5 border border-teal/10 mb-6">
                  <TrendingUp className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                  <p className="text-xs text-teal/80">
                    <span className="font-semibold text-teal">Why it matters:</span> {selectedArticle.whyItMatters}
                  </p>
                </div>

                {/* Recommended actions */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50 mb-3">Recommended Actions</h4>
                <div className="space-y-3">
                  {insight.actions.map((action, i) => (
                    <div key={i} className="group/action flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-teal/20 hover:bg-teal/5 transition-all cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                        <action.icon className="h-4 w-4 text-teal" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-semibold">{action.title}</h5>
                          <ArrowRight className="h-3 w-3 text-teal opacity-0 group-hover/action:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{action.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="shrink-0 border-t border-border/30 px-6 py-3 flex items-center justify-between bg-card">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <Bookmark className="h-3.5 w-3.5" /> Save
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Source
                </button>
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal/90 transition-colors">
                <Sparkles className="h-3.5 w-3.5" /> Generate Insight Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
