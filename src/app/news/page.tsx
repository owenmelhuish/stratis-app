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
    sources: ["JP Morgan Newsroom", "Financial Times", "Bloomberg", "Reuters"],
    filterFn: (item) => item.tags.includes("brand"),
  },
  {
    id: "competitor",
    title: "Competitor Watch",
    sources: ["Goldman Sachs", "Morgan Stanley", "Bank of America", "Citigroup"],
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
  {
    id: "audience",
    title: "Audience Behaviour",
    sources: ["McKinsey", "Deloitte Insights", "Accenture"],
    filterFn: (item) => item.tags.includes("audience"),
  },
  {
    id: "regulation",
    title: "Regulation & Policy",
    sources: ["SEC", "FCA", "European Commission"],
    filterFn: (item) => item.tags.includes("regulation"),
  },
  {
    id: "tech",
    title: "Technological Disruption",
    sources: ["TechCrunch", "Wired", "MIT Technology Review"],
    filterFn: (item) => item.tags.includes("tech-disruption"),
  },
  {
    id: "macro",
    title: "Macroeconomic Signals",
    sources: ["Federal Reserve", "IMF", "World Bank"],
    filterFn: (item) => item.tags.includes("macroeconomic"),
  },
];

// ─── Contextual image URL from article title ────────────────────────────────

const CURATED_IMAGES: Array<{ match: RegExp; photos: string[] }> = [
  // ── Brand News (JP Morgan-specific articles) ──
  { match: /Record Q1 Revenue|Reports Record/i, photos: ["photo-1526628953301-3e589a6a8b74"] },
  { match: /Sapphire Reserve Card|Next.Gen Sapphire/i, photos: ["photo-1556740738-b6a63e27c4df"] },
  { match: /Surpasses \$4 Trillion|\$4 Trillion.*Client/i, photos: ["photo-1553729459-efe14ef6055d"] },
  { match: /Best Digital Bank|World.*Best.*Digital/i, photos: ["photo-1660732106134-f3009a1e90ea"] },
  { match: /Jamie Dimon|CEO.*Annual.*Letter|Shareholder Letter/i, photos: ["photo-1553484771-4e29a68540f4"] },
  { match: /Southeast Asia|Singapore.*Bangkok.*Jakarta/i, photos: ["photo-1525625293386-3f8f99389edd"] },
  { match: /Mobile Banking.*Users|23%.*Increase.*Mobile/i, photos: ["photo-1730818027542-b4e1896f653b"] },
  { match: /Foundation.*\$500M|Affordable Housing Initiative/i, photos: ["photo-1746171002636-c4e3f621acb4"] },
  { match: /Innovation Hub.*Dallas|Commercial Banking.*Dallas/i, photos: ["photo-1563219125-60d10ffe8877"] },
  { match: /Formula E|Electric.*Motorsport|Banking Partner/i, photos: ["photo-1648077894231-d222a5e69304"] },
  // ── Competitor banks ──
  { match: /Goldman/i, photos: [
    "photo-1552958700-7004a2c5cb60",
    "photo-1704303677039-5fcae8cf3601",
    "photo-1486406146926-c627a92ad1ab",
  ]},
  { match: /Morgan Stanley/i, photos: [
    "photo-1496442226666-8d4d0e62e6e9",
    "photo-1538970272646-f61fabb3a8a2",
    "photo-1704303677039-5fcae8cf3601",
  ]},
  { match: /Bank of America/i, photos: [
    "photo-1632198740387-394dd254b658",
    "photo-1664990600404-b89f1801f29d",
    "photo-1668483689415-5a1131fc0735",
  ]},
  { match: /Citigroup/i, photos: [
    "photo-1684128168757-52608e165011",
    "photo-1486406146926-c627a92ad1ab",
    "photo-1704303677039-5fcae8cf3601",
  ]},
  { match: /Wells Fargo/i, photos: [
    "photo-1680672306353-4b3ae6523e56",
    "photo-1616482789264-4d40fc690a61",
    "photo-1588592378201-4a1aee5ab493",
  ]},
  { match: /JP Morgan|JPMorgan/i, photos: [
    "photo-1486406146926-c627a92ad1ab",
    "photo-1554469384-e58fac16e23a",
    "photo-1560520653-9e0e4c89eb11",
  ]},
  { match: /Digital Banking|fintech|adoption/i, photos: [
    "photo-1607697987724-fc9f8b225223",
    "photo-1556742049-0cfed4f6a45d",
    "photo-1551288049-bebda4e38f71",
  ]},
  { match: /banking|wealth/i, photos: [
    "photo-1551836022-deb4988cc6c0",
    "photo-1573745851773-b0998acd8adb",
    "photo-1460925895917-afdab827c52f",
  ]},
  { match: /TikTok|Reels|video/i, photos: [
    "photo-1611162616305-c69b3fa7fbe0",
    "photo-1611162618071-b39a2ec055fb",
    "photo-1600096194534-95cf5ece04cf",
  ]},
  { match: /Meta|Facebook|Instagram/i, photos: [
    "photo-1611162617474-5b21e879e113",
    "photo-1671459922221-be8beec5c9fa",
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
  { match: /luxury|premium/i, photos: [
    "photo-1486406146926-c627a92ad1ab",
    "photo-1560520653-9e0e4c89eb11",
    "photo-1554469384-e58fac16e23a",
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
  { match: /open.banking|digital.banking/i, photos: [
    "photo-1607697987724-fc9f8b225223",
    "photo-1551836022-deb4988cc6c0",
    "photo-1460925895917-afdab827c52f",
  ]},
  // ── Audience Behaviour (per-article) ──
  { match: /Gen Z.*Brokerage/i, photos: [
    "photo-1758598303866-743838235b41",
    "photo-1645226880663-81561dcab0ae",
  ]},
  { match: /HNW.*Mobile|Mobile.*First.*Financial/i, photos: [
    "photo-1681826291722-70bd7e9e6fc3",
    "photo-1726137065539-1aa2cb315e80",
  ]},
  { match: /Affluent.*Trust.*Traditional|Trust.*Bank.*Rebound/i, photos: [
    "photo-1462216150495-f0bac6474243",
    "photo-1551735084-34054d4a1372",
  ]},
  { match: /Cross.Border.*Wealth|Wealth.*Transfer.*Millennial/i, photos: [
    "photo-1429903084855-dade91f38f39",
    "photo-1457583221838-6bf5ad5ea874",
  ]},
  // ── Regulation & Policy (per-article) ──
  { match: /SEC.*Finalizes|SEC.*Digital.*Advertising/i, photos: [
    "photo-1518701094052-4dcc60086bec",
    "photo-1633059050703-0f1b50828402",
  ]},
  { match: /MiCA.*Regulation|Crypto.*Marketing.*Restriction/i, photos: [
    "photo-1594811815859-c354d5afc3dc",
    "photo-1698191310487-9fc33b0e266a",
  ]},
  { match: /FCA.*Tightens|FCA.*Social.*Media/i, photos: [
    "photo-1642764984366-08735318f351",
    "photo-1513635269975-59663e0ac1ad",
  ]},
  { match: /APAC.*Regulat|Harmonize.*Cross.Border.*Data/i, photos: [
    "photo-1549448270-ef54eadd61fc",
    "photo-1566475922470-2740a2d7e17b",
  ]},
  // ── Technological Disruption (per-article) ──
  { match: /Robo.Advisor|AI.Powered.*Wealth/i, photos: [
    "photo-1684369175809-f9642140a1bd",
    "photo-1493599124325-e628361046af",
  ]},
  { match: /Blockchain.*Identity|Blockchain.*Verification/i, photos: [
    "photo-1664526937033-fe2c11f1be25",
    "photo-1518546305927-5a555bb7020d",
  ]},
  { match: /Voice.*Banking|Smart.*Speaker.*Penetration/i, photos: [
    "photo-1558089687-f282ffcbc126",
    "photo-1603684560609-57feb6c6e3df",
  ]},
  { match: /Real.Time.*Payment|Payment.*Network.*Reshape/i, photos: [
    "photo-1456983933114-c22026990f4b",
    "photo-1726137065539-1aa2cb315e80",
  ]},
  // ── Macroeconomic Signals (per-article) ──
  { match: /Fed.*Signal|Fed.*Rate.*Hold/i, photos: [
    "photo-1633059050703-0f1b50828402",
    "photo-1526304640581-d334cdbbf45e",
  ]},
  { match: /M&A.*Activity|M&A.*Surge|Merger.*Acquisition/i, photos: [
    "photo-1595874199826-7f0e8edece14",
    "photo-1462216150495-f0bac6474243",
  ]},
  { match: /Emerging.*Market.*GDP|GDP.*Growth.*Outpace/i, photos: [
    "photo-1678799200184-a813e6039df1",
    "photo-1609860850812-86de933acace",
  ]},
  { match: /Dollar.*Strength|Dollar.*Headwind/i, photos: [
    "photo-1526304640581-d334cdbbf45e",
    "photo-1631514623720-7f0996f87b75",
  ]},
  { match: /campaign|budget|spend/i, photos: [
    "photo-1460925895917-afdab827c52f",
    "photo-1551288049-bebda4e38f71",
    "photo-1504868584819-f8e8b4b6d7e3",
  ]},
];

const FALLBACK_PHOTOS = [
  "photo-1486406146926-c627a92ad1ab",
  "photo-1554469384-e58fac16e23a",
  "photo-1460925895917-afdab827c52f",
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
  brand: "Brand News",
  competitor: "Competitive Intelligence",
  category: "Market Category",
  platform: "Platform Update",
  macro: "Macro Trend",
  audience: "Audience Behaviour",
  regulation: "Regulation & Policy",
  "tech-disruption": "Tech Disruption",
  macroeconomic: "Macroeconomic Signal",
};

function generateInsight(item: NewsItem): { impact: string; actions: Array<{ icon: React.ElementType; title: string; description: string }> } {
  const tag = item.tags[0];
  const h = hashId(item.id);

  if (tag === "brand") {
    return {
      impact: "This JP Morgan news has direct implications for how the brand is perceived in the market. Public communications, product launches, and corporate announcements shape consumer sentiment and should be reflected in campaign messaging. Aligning paid media with earned media momentum maximizes the halo effect from positive press coverage.",
      actions: [
        { icon: TrendingUp, title: "Amplify With Paid Media", description: "Boost awareness campaigns in regions where this news is most relevant. Align ad creative with the narrative to create a cohesive brand experience across earned and paid touchpoints." },
        { icon: Target, title: "Update Campaign Messaging", description: "Refresh ad copy and landing pages to reflect this development. Incorporate key proof points from the announcement into Sapphire Reserve and Private Banking creative." },
        { icon: Shield, title: "Monitor Sentiment & SOV", description: "Track brand sentiment and share of voice in the 48 hours following this news. Flag any negative commentary for rapid response and adjust messaging if sentiment shifts." },
      ],
    };
  }
  if (tag === "competitor") {
    return {
      impact: `This signals a direct competitive move that could affect JP Morgan's positioning in key markets. ${item.competitor ? `${item.competitor}'s` : "Competitor"} actions suggest an aggressive push for market share, particularly among high-net-worth individuals. If left unaddressed, this could erode JP Morgan's share of voice and brand consideration among affluent financial decision-makers.`,
      actions: [
        { icon: Shield, title: "Deploy Defensive Campaigns", description: `Launch brand defense campaigns in affected markets targeting ${item.competitor || "competitor"} prospects with JP Morgan's heritage and trust messaging. Estimated budget: $45-65K over 2 weeks.` },
        { icon: Target, title: "Increase Conquest Targeting", description: `Activate conquest audiences on Google and Meta targeting users researching ${item.competitor || "competitor"} services. Focus on Sapphire Reserve vs. competitor comparison content.` },
        { icon: TrendingUp, title: "Boost Brand Search Bids", description: "Increase branded search bid caps by 20% in affected regions to protect brand SERP presence and prevent competitor conquesting." },
      ],
    };
  }
  if (tag === "platform") {
    return {
      impact: "This platform update presents both an opportunity and a risk for JP Morgan's digital campaigns. Early adoption of new features typically yields a 15-25% efficiency advantage before competition saturates the format. However, existing campaign structures may need adjustment to fully leverage the changes.",
      actions: [
        { icon: Target, title: "Test New Ad Formats", description: "Allocate 10% of platform budget to test the new features with Sapphire Reserve and Private Banking creative. Run A/B tests against current top performers for 2 weeks." },
        { icon: TrendingUp, title: "Update Bidding Strategy", description: "Review and adjust bidding strategies to align with the platform's updated algorithm. Consider switching to value-based bidding where available." },
        { icon: Shield, title: "Monitor Performance Metrics", description: "Set up daily monitoring dashboards to track any performance shifts. Flag campaigns with >10% CPA increase for immediate review." },
      ],
    };
  }
  if (tag === "macro") {
    return {
      impact: "This macroeconomic development has direct implications for JP Morgan's media investment strategy. Market conditions are shifting in ways that could affect investor confidence, media costs, and regional performance dynamics. Proactive budget reallocation can turn this into a competitive advantage.",
      actions: [
        { icon: TrendingUp, title: "Reallocate Regional Budget", description: "Shift 8-12% of budget from underperforming regions toward markets showing positive momentum. Focus on markets with favorable economic dynamics and investor confidence." },
        { icon: Target, title: "Adjust Messaging Strategy", description: "Update ad copy and creative to resonate with current market sentiment. Emphasize stability, heritage, and trusted advisory positioning." },
        { icon: Shield, title: "Diversify Channel Mix", description: "Reduce dependency on any single channel by spreading investment. Increase upper-funnel awareness spend to maintain brand salience during market shifts." },
      ],
    };
  }
  if (tag === "audience") {
    return {
      impact: "This shift in audience behaviour has direct implications for JP Morgan's targeting and messaging strategy. Changing demographics and preferences among key wealth segments require proactive adjustments to campaign creative, channel mix, and audience definitions to maintain engagement and conversion rates.",
      actions: [
        { icon: Target, title: "Update Audience Segments", description: "Refresh lookalike and interest-based audiences to reflect shifting demographics. Prioritize mobile-first, digitally-native affluent segments in prospecting campaigns." },
        { icon: TrendingUp, title: "Test New Creative Angles", description: "Develop creative variants that speak to evolving audience preferences — test heritage vs. innovation messaging across age cohorts." },
        { icon: Shield, title: "Expand Channel Testing", description: "Allocate 10-15% of budget to test emerging channels and formats favored by the shifting audience profile, particularly short-form video and social commerce." },
      ],
    };
  }
  if (tag === "regulation") {
    return {
      impact: "This regulatory development requires immediate attention from JP Morgan's marketing and compliance teams. Non-compliance could result in enforcement action, campaign takedowns, or reputational damage. However, early compliance can become a competitive advantage as competitors scramble to adapt.",
      actions: [
        { icon: Shield, title: "Audit Active Campaigns", description: "Conduct an immediate compliance audit of all active ad creatives in affected markets. Flag any campaigns that may need updated disclaimers or disclosures." },
        { icon: Target, title: "Update Creative Templates", description: "Work with legal to create pre-approved creative templates that meet new regulatory requirements. Build a compliance-ready asset library for rapid deployment." },
        { icon: TrendingUp, title: "Leverage Compliance as Positioning", description: "Position JP Morgan's regulatory compliance as a trust signal in campaigns. Emphasize security, transparency, and regulatory standing in messaging." },
      ],
    };
  }
  if (tag === "tech-disruption") {
    return {
      impact: "This technological shift presents both a threat and an opportunity for JP Morgan's marketing operations. Early adoption of new technologies in campaign strategy typically yields a first-mover advantage, while failure to adapt could result in lost market share to more agile competitors and fintech challengers.",
      actions: [
        { icon: TrendingUp, title: "Pilot New Technology Integration", description: "Launch a pilot program integrating this technology into the campaign funnel. Measure impact on conversion rates, CPA, and customer lifetime value over 60 days." },
        { icon: Target, title: "Differentiate Through Innovation", description: "Update campaign messaging to highlight JP Morgan's technology leadership. Position the firm's digital capabilities as a key differentiator against both traditional banks and fintechs." },
        { icon: Shield, title: "Monitor Competitive Adoption", description: "Track competitor adoption of this technology through creative intelligence tools. Set alerts for competitor messaging changes that reference similar capabilities." },
      ],
    };
  }
  if (tag === "macroeconomic") {
    return {
      impact: "This macroeconomic signal has direct implications for JP Morgan's media investment strategy and campaign messaging. Economic conditions influence client behavior, product demand, and the competitive landscape. Proactive budget and messaging adjustments can turn macro shifts into a strategic advantage.",
      actions: [
        { icon: TrendingUp, title: "Adjust Regional Budget Allocation", description: "Reallocate 10-15% of budget based on updated macroeconomic outlook. Shift investment toward markets with favorable conditions and growing wealth creation." },
        { icon: Target, title: "Update Product Messaging", description: "Adapt campaign messaging to reflect current economic conditions. Emphasize relevant JP Morgan products — safe haven positioning in uncertainty, growth positioning in expansion." },
        { icon: Shield, title: "Scenario Plan Budget Flexibility", description: "Build 3 budget scenarios (bullish, neutral, bearish) for the next quarter. Pre-approve contingency reallocations to enable rapid response to further macro shifts." },
      ],
    };
  }
  // category / default
  return {
    impact: "This industry trend validates JP Morgan's positioning in the premium financial services segment. Growing category demand creates a favorable environment for scaling performance campaigns while maintaining efficiency. The key is to capture incremental demand before competitors increase their investment.",
    actions: [
      { icon: TrendingUp, title: "Scale Top Performers", description: `Increase budget on top 5 campaigns by 15-20% to capture rising demand. Current top ROAS campaigns have headroom before hitting diminishing returns.` },
      { icon: Target, title: "Expand Audience Targeting", description: "Broaden prospecting audiences to capture new HNW prospects entering the market. Test lookalike audiences based on recent converters." },
      { icon: Shield, title: "Accelerate Creative Production", description: "Fast-track 3-5 new creative variants to test against rising demand. Focus on product-specific messaging for Sapphire Reserve, Private Banking, and Wealth Management." },
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
                      <span className="font-semibold text-red-400">Competitor Alert:</span> This article involves <span className="font-semibold">{selectedArticle.competitor}</span>, a direct competitor in the premium financial services segment.
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
                    <p className="text-[10px] text-muted-foreground/60">What this means for JP Morgan</p>
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
