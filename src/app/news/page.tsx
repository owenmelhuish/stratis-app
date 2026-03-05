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
    title: "Emerging Conversation",
    sources: ["Reddit", "Twitter / X", "TikTok Comments", "Letterboxd"],
    filterFn: (item) => item.tags.includes("brand"),
  },
  {
    id: "cast",
    title: "Cast & Talent Signals",
    sources: ["Variety", "People", "Entertainment Weekly", "Collider"],
    filterFn: (item) => item.tags.includes("cast"),
  },
  {
    id: "competitor",
    title: "Competitor Watch — Devil Wears Prada 2",
    sources: ["Deadline", "Reddit", "Variety", "Box Office Mojo"],
    filterFn: (item) => item.tags.includes("competitor"),
  },
  {
    id: "genre",
    title: "Genre & Theme Signals",
    sources: ["Google Trends", "Social Listening", "Reddit", "TikTok Trending"],
    filterFn: (item) => item.tags.includes("genre"),
  },
  {
    id: "platform",
    title: "Platform & Ad Tech Updates",
    sources: ["TechCrunch", "AdExchanger", "Digiday", "Marketing Dive"],
    filterFn: (item) => item.tags.includes("platform"),
  },
];

// ─── Contextual image URL from article title ────────────────────────────────

const CURATED_IMAGES: Array<{ match: RegExp; photos: string[] }> = [
  // ── Cast & Talent (TMDB actor photos — must be first to match before "Deep Water" catch-all) ──
  { match: /Aaron Eckhart|Eckhart/i, photos: ["https://image.tmdb.org/t/p/w500/u5JjnRMr9zKEVvOP7k3F6gdcwT6.jpg"] },
  { match: /Kelly Gale|Gale/i, photos: ["https://image.tmdb.org/t/p/w500/bU9w5FITuN7TUa9VxFH3whhXFkP.jpg"] },
  { match: /Ben Kingsley|Kingsley/i, photos: ["https://image.tmdb.org/t/p/w500/vQtBqpF2HDdzbfXHDzR4u37i1Ac.jpg"] },
  // ── Emerging Conversation (each article gets a unique image) ──
  { match: /r\/movies.*practical|Jaws vibes/i, photos: ["photo-1478720568477-152d9b164e26"] },
  { match: /Subway Takeover|OOH|station takeover/i, photos: ["photo-1534430480872-3498386e7856"] },
  { match: /r\/boxoffice.*pre-sale/i, photos: ["photo-1489599849927-2ee91cede3ba"] },
  // ── Competing Movies (Devil Wears Prada 2 — must be before generic trailer/ticket matchers) ──
  { match: /Prada 2 Trailer|Meryl Streep Return/i, photos: ["photo-1469334031218-e382a71b716b"] },
  { match: /r\/movies.*Prada|megathread.*Prada/i, photos: ["photo-1509631179647-0177331693ae"] },
  { match: /Prada 2 Fandango|Pre-Sales Track/i, photos: ["photo-1445205170230-053b83016050"] },
  // ── Film & Brand (general Deep Water fallback) ──
  { match: /trailer|teaser|first look/i, photos: ["photo-1536440136628-849c177e76a1", "photo-1485846234645-a62644f84728"] },
  { match: /premiere|red carpet|opening night/i, photos: ["photo-1598899134739-24c46f58b8c0", "photo-1594909122845-11baa439b7bf"] },
  { match: /ticket|pre.?sale|Fandango/i, photos: ["photo-1517604931442-7e0c8ed2963c", "photo-1489599849927-2ee91cede3ba"] },
  { match: /Deep Water|deep water/i, photos: ["photo-1551244072-5d12893278ab", "photo-1507525428034-b723cf961d3e", "photo-1544551763-46a013bb70d5"] },
  { match: /Tonight Show|talk show|interview/i, photos: ["photo-1594909122845-11baa439b7bf", "photo-1478720568477-152d9b164e26"] },
  { match: /press tour|media tour|junket/i, photos: ["photo-1598899134739-24c46f58b8c0", "photo-1524712245354-2c4e5e7121c0"] },
  // ── Genre & Theme (each article unique — must be before generic ocean/shark matchers) ──
  { match: /SharkTok|shark.*TikTok|340%/i, photos: ["photo-1560275619-4662e36fa65c"] },
  { match: /Underwater Thriller Genre.*28%/i, photos: ["photo-1551244072-5d12893278ab"] },
  { match: /Ocean Survival Podcasts|Maritime Peril Trend/i, photos: ["photo-1478737270239-2f02b77fc618"] },
  { match: /shark|ocean|underwater|sea/i, photos: ["photo-1544551763-46a013bb70d5", "photo-1507525428034-b723cf961d3e"] },
  { match: /thriller|suspense|survival/i, photos: ["photo-1536440136628-849c177e76a1", "photo-1478720568477-152d9b164e26"] },
  // ── Reviews & Sentiment ──
  { match: /Rotten Tomatoes|critics|review/i, photos: ["photo-1489599849927-2ee91cede3ba", "photo-1517604931442-7e0c8ed2963c"] },
  { match: /IMDb|rating|score/i, photos: ["photo-1517604931442-7e0c8ed2963c", "photo-1485846234645-a62644f84728"] },
  { match: /Letterboxd|social sentiment|buzz/i, photos: ["photo-1478720568477-152d9b164e26", "photo-1594909122845-11baa439b7bf"] },
  { match: /search volume|Google Trends|trending/i, photos: ["photo-1460925895917-afdab827c52f", "photo-1551288049-bebda4e38f71"] },
  // ── Platform & Ad Tech ──
  { match: /TikTok|Reels|short.?form/i, photos: ["photo-1611162616305-c69b3fa7fbe0", "photo-1611162618071-b39a2ec055fb"] },
  { match: /Meta|Facebook|Instagram/i, photos: ["photo-1611162617474-5b21e879e113", "photo-1432888622747-4eb9a8efeb07"] },
  { match: /Google|showtime|search ads/i, photos: ["photo-1573804633927-bfcbcd909acd", "photo-1616499370260-485b3e5ed653"] },
  { match: /Trade Desk|CTV|programmatic/i, photos: ["photo-1593784991095-a205069470b6", "photo-1611532736597-de2d4265fba3"] },
  // ── Audience Behaviour ──
  { match: /Gen Z|young audience|18.?24/i, photos: ["photo-1524712245354-2c4e5e7121c0", "photo-1611162616305-c69b3fa7fbe0"] },
  { match: /group ticket|social movie|friend/i, photos: ["photo-1489599849927-2ee91cede3ba", "photo-1517604931442-7e0c8ed2963c"] },
  // ── Box Office & Industry ──
  { match: /box office|domestic gross|weekend/i, photos: ["photo-1517604931442-7e0c8ed2963c", "photo-1489599849927-2ee91cede3ba"] },
  { match: /IMAX|premium format|Dolby/i, photos: ["photo-1536440136628-849c177e76a1", "photo-1489599849927-2ee91cede3ba"] },
  { match: /theatrical window|streaming|VOD/i, photos: ["photo-1593784991095-a205069470b6", "photo-1611532736597-de2d4265fba3"] },
  { match: /summer|blockbuster|ad cost/i, photos: ["photo-1507525428034-b723cf961d3e", "photo-1544551763-46a013bb70d5"] },
  { match: /campaign|budget|spend/i, photos: ["photo-1460925895917-afdab827c52f", "photo-1551288049-bebda4e38f71"] },
];

const FALLBACK_PHOTOS = [
  "photo-1536440136628-849c177e76a1",
  "photo-1489599849927-2ee91cede3ba",
  "photo-1517604931442-7e0c8ed2963c",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function photoToUrl(photo: string, w: number, h: number): string {
  if (photo.startsWith("http")) return photo;
  return `https://images.unsplash.com/${photo}?w=${w}&h=${h}&fit=crop&auto=format`;
}

function articleImageUrl(title: string, id: string): string {
  const idx = hashId(id);
  for (const entry of CURATED_IMAGES) {
    if (entry.match.test(title)) {
      const photo = entry.photos[idx % entry.photos.length];
      return photoToUrl(photo, 640, 400);
    }
  }
  const photo = FALLBACK_PHOTOS[idx % FALLBACK_PHOTOS.length];
  return photoToUrl(photo, 640, 400);
}

// Larger version for the modal hero
function articleImageUrlLarge(title: string, id: string): string {
  const idx = hashId(id);
  for (const entry of CURATED_IMAGES) {
    if (entry.match.test(title)) {
      const photo = entry.photos[idx % entry.photos.length];
      return photoToUrl(photo, 1200, 500);
    }
  }
  const photo = FALLBACK_PHOTOS[idx % FALLBACK_PHOTOS.length];
  return photoToUrl(photo, 1200, 500);
}

// ─── AI Insight generator (deterministic from article) ──────────────────────

const TAG_LABELS: Record<NewsTag, string> = {
  brand: "Film & Brand",
  cast: "Cast & Talent",
  competitor: "Competing Release",
  genre: "Genre & Themes",
  sentiment: "Reviews & Sentiment",
  platform: "Platform Update",
  audience: "Audience Behaviour",
  macro: "Box Office & Industry",
};

function generateInsight(item: NewsItem): { impact: string; actions: Array<{ icon: React.ElementType; title: string; description: string }> } {
  const tag = item.tags[0];

  if (tag === "brand") {
    return {
      impact: "Organic social conversation about Deep Water is building momentum across Reddit and TikTok. Grassroots buzz from real users is the most credible form of social proof and drives outsized word-of-mouth. Amplifying this emerging conversation through paid channels compounds the organic momentum at a fraction of the cost of generating awareness from scratch.",
      actions: [
        { icon: TrendingUp, title: "Boost UGC-Style Creative", description: "Create paid social ads that mirror the look and tone of organic user posts — reaction-style videos, comment screenshots, and community quotes drive 2-3x higher engagement than polished studio assets." },
        { icon: Target, title: "Target Community Lookalikes", description: "Build custom audiences from users engaging with Deep Water Reddit threads and TikTok comments. Layer with movie-intent signals for high-conversion prospecting at scale." },
        { icon: Shield, title: "Monitor Conversation Velocity", description: "Track mention volume and sentiment across Reddit, TikTok, and Twitter/X in real time. If the conversation accelerates, immediately increase spend to ride the organic wave before it peaks." },
      ],
    };
  }
  if (tag === "cast") {
    return {
      impact: "Cast visibility drives outsized awareness for theatrical releases. Talk show appearances, social media posts, and press tour coverage create high-engagement moments that should be captured and amplified in paid campaigns. Talent-led creative typically outperforms standard studio assets by 30-50% on social platforms.",
      actions: [
        { icon: TrendingUp, title: "Create Talent-Led Creative", description: "Cut 15- and 30-second social clips from this appearance for Instagram Reels and TikTok. Talent-driven content drives 2-3x higher engagement than standard trailer cuts." },
        { icon: Target, title: "Activate Fan Targeting", description: "Build custom audiences around the talent's existing fanbase — followers, lookalikes, and interest segments. Layer with movie-intent signals for high-conversion prospecting." },
        { icon: Shield, title: "Track Engagement Velocity", description: "Monitor engagement rate and share velocity on talent-related content. If a clip goes viral, immediately increase spend allocation to ride the organic momentum." },
      ],
    };
  }
  if (tag === "competitor") {
    return {
      impact: "Devil Wears Prada 2 is commanding massive attention across social media, Reddit, and ticket pre-sales. The sequel's built-in fanbase and nostalgia factor give it outsized share of voice that could overshadow Deep Water during the critical release window. However, the audience overlap is limited — DWP2 skews female 25-44 comedy while Deep Water targets thriller/action audiences — creating opportunities for strategic counter-programming.",
      actions: [
        { icon: Shield, title: "Boost Brand Search Defense", description: "Increase Deep Water branded search bid caps by 25%. Add 'Devil Wears Prada 2' as a negative keyword on broad campaigns to prevent budget leakage to non-target audiences." },
        { icon: Target, title: "Lean Into Counter-Programming", description: "Position Deep Water as the alternative for audiences not interested in DWP2. Target male 18-34 and thriller enthusiasts with messaging that emphasises adrenaline, practical stunts, and edge-of-your-seat tension." },
        { icon: TrendingUp, title: "Surge Spend in Overlapping DMAs", description: "Increase budget by 20% in NY, LA, and Chicago where DWP2 pre-sales are strongest. Focus on CTV and YouTube pre-roll to maintain visibility alongside the DWP2 marketing blitz." },
      ],
    };
  }
  if (tag === "genre") {
    return {
      impact: "Rising cultural interest in ocean, shark, and survival content signals a favourable environment for Deep Water's genre positioning. Trending topics create organic search and social demand that paid campaigns can intercept and amplify at lower CPAs.",
      actions: [
        { icon: TrendingUp, title: "Intercept Trending Interest", description: "Launch Google Search campaigns targeting trending genre keywords — shark movies, ocean thriller, survival films. Capture high-intent searchers while CPCs remain efficient." },
        { icon: Target, title: "Align Creative With Trends", description: "Produce TikTok and Reels content that ties Deep Water's narrative to trending cultural moments. Use trending audio and hashtags to maximise organic amplification." },
        { icon: Shield, title: "Monitor Trend Lifecycle", description: "Track Google Trends and TikTok trending data daily. If genre interest peaks, immediately scale spend; if it fades, reallocate to brand and ticket-drive campaigns." },
      ],
    };
  }
  if (tag === "sentiment") {
    return {
      impact: "Critic scores and audience sentiment are the strongest predictors of theatrical hold and word-of-mouth multiplier. Positive reviews should be weaponised in paid creative immediately, while any negative signals require rapid messaging adjustments to protect opening weekend projections.",
      actions: [
        { icon: TrendingUp, title: "Feature Review Scores in Creative", description: "Update all display, social, and video ads to include the latest Rotten Tomatoes and IMDb scores. Critic-endorsed creative drives 20-35% higher click-through rates." },
        { icon: Target, title: "Target Review-Reading Audiences", description: "Activate audiences who visit Rotten Tomatoes, IMDb, and Letterboxd. These high-intent moviegoers are closest to ticket purchase and respond to social proof." },
        { icon: Shield, title: "Set Up Sentiment Alerts", description: "Configure real-time monitoring for sentiment shifts across social platforms and review aggregators. If sentiment drops below 70% positive, trigger messaging pivot to emphasise action and spectacle." },
      ],
    };
  }
  if (tag === "platform") {
    return {
      impact: "This platform update presents an opportunity for Deep Water's digital campaigns. Early adoption of new ad formats typically yields a 15-25% efficiency advantage before competition saturates. Movie campaigns benefit disproportionately from ticket-integration and shoppable formats.",
      actions: [
        { icon: Target, title: "Test New Ad Formats", description: "Allocate 10% of platform budget to pilot the new feature with Deep Water trailer and ticket-drive creative. Run A/B tests against current top performers for 7 days." },
        { icon: TrendingUp, title: "Optimise for Ticket Conversions", description: "If the format supports direct purchase or link-out, connect it to Fandango/AMC ticket pages. Track cost-per-ticket-sale as the primary KPI." },
        { icon: Shield, title: "Monitor Performance Impact", description: "Set up daily monitoring to track any performance shifts from the platform change. Flag campaigns with >10% CPA increase for immediate creative or targeting adjustments." },
      ],
    };
  }
  if (tag === "audience") {
    return {
      impact: "Shifting audience behaviour — from how Gen Z discovers movies to the rise of group ticket purchases — has direct implications for Deep Water's targeting, creative, and channel strategy. Adapting to these signals ensures campaign efficiency and maximises opening weekend attendance.",
      actions: [
        { icon: Target, title: "Update Audience Segments", description: "Refresh lookalike and interest-based audiences to reflect evolving movie-discovery behaviour. Prioritise social-first, mobile-native audience segments in prospecting campaigns." },
        { icon: TrendingUp, title: "Test Social-First Creative", description: "Develop vertical video, meme-style, and UGC-inspired creative variants that match how the target audience discovers and shares movie content." },
        { icon: Shield, title: "Expand Channel Testing", description: "Allocate 10-15% of budget to test emerging channels and formats favoured by the target audience — TikTok Spark Ads, Instagram Broadcast Channels, and Reddit promoted posts." },
      ],
    };
  }
  if (tag === "macro") {
    return {
      impact: "Box office trends and industry dynamics directly impact Deep Water's release strategy. Strong overall theatrical demand creates a rising tide, while compressed windows or premium-format competition require tactical spend adjustments to protect screen share and opening weekend performance.",
      actions: [
        { icon: TrendingUp, title: "Adjust DMA Budget Allocation", description: "Reallocate 10-15% of budget based on market-level box office performance data. Shift investment toward DMAs showing strongest theatrical demand and away from underperforming markets." },
        { icon: Target, title: "Emphasise Premium Formats", description: "If IMAX/Dolby demand is rising, increase creative featuring premium format messaging. Partner with exhibitors for co-branded campaigns driving premium ticket sales." },
        { icon: Shield, title: "Scenario Plan for Window Changes", description: "Build 3 spend scenarios based on different theatrical window outcomes. Pre-approve contingency budgets to extend campaigns if the film holds well or pivot to VOD if the window compresses." },
      ],
    };
  }
  // default
  return {
    impact: "This development has implications for Deep Water's marketing strategy. Staying ahead of industry shifts and cultural moments ensures campaign relevance and maximises the efficiency of the $9.3M media investment across the release window.",
    actions: [
      { icon: TrendingUp, title: "Scale Top Performers", description: "Increase budget on the top 3 campaigns by 15-20% to capture rising demand. Current best-performing creative has headroom before hitting frequency caps." },
      { icon: Target, title: "Expand Audience Targeting", description: "Broaden prospecting audiences to capture new moviegoer segments entering the consideration set. Test lookalike audiences based on recent ticket purchasers." },
      { icon: Shield, title: "Accelerate Creative Production", description: "Fast-track 3-5 new creative variants to maintain freshness across the release window. Focus on behind-the-scenes, cast-led, and review-score creative angles." },
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
                      <span className="font-semibold text-red-400">Competitor Alert:</span> This article involves <span className="font-semibold">{selectedArticle.competitor}</span>, a competing theatrical release in Deep Water&apos;s marketing window.
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
                    <p className="text-[10px] text-muted-foreground/60">What this means for Deep Water</p>
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
