"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { cn } from "@/lib/utils";
import { STATE_NAMES, regionFillColor } from "@/lib/geo";
import { formatCurrency } from "@/lib/format";
import type { StateDatum } from "@/hooks/use-dashboard-data";

const GEO_URL = "/geo/states-10m.json";

interface WorldMapChartProps {
  stateData: StateDatum[];
}

interface TooltipState {
  x: number;
  y: number;
  stateName: string;
  spend?: number;
  campaignCount?: number;
}

export function WorldMapChart({ stateData }: WorldMapChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build intensity map: stateCode → 0..1
  const intensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    const maxSpend = Math.max(...stateData.map((s) => s.spend), 1);
    for (const s of stateData) {
      map[s.stateCode] = s.spend / maxSpend;
    }
    return map;
  }, [stateData]);

  // State data lookup for tooltips
  const stateDataMap = useMemo(() => {
    const map: Record<string, StateDatum> = {};
    for (const s of stateData) map[s.stateCode] = s;
    return map;
  }, [stateData]);

  const handleMouseEnter = useCallback(
    (stateId: string, event: React.MouseEvent) => {
      setHoveredId(stateId);
      const name = STATE_NAMES[stateId] || stateId;
      const sd = stateDataMap[stateId];
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        stateName: name,
        spend: sd?.spend,
        campaignCount: sd?.campaignCount,
      });
    },
    [stateDataMap]
  );

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: event.clientX, y: event.clientY } : null
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const getFill = useCallback(
    (stateId: string) => {
      const intensity = intensityMap[stateId];
      if (intensity === undefined) return "rgba(255,255,255,0.04)";
      const base = 0.15 + intensity * 0.85;
      const isHovered = stateId === hoveredId;
      return regionFillColor(isHovered ? Math.min(base + 0.2, 1) : base);
    },
    [intensityMap, hoveredId]
  );

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wide">
          US Market — Spend Heat Map
        </h3>
      </div>

      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        width={800}
        height={500}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateId: string = geo.id;
              const fill = getFill(stateId);
              const hasData = intensityMap[stateId] !== undefined;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", cursor: hasData ? "pointer" : "default" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(e) => handleMouseEnter(stateId, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div
            className="rounded-[10px] border border-white/[0.08] px-4 py-3 text-xs text-[#e0e0e0] min-w-[180px]"
            style={{
              backgroundColor: "rgba(20,24,28,0.95)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="font-semibold text-foreground mb-2">
              {tooltip.stateName}
            </div>
            <div className="space-y-1">
              {tooltip.spend !== undefined && (
                <Row label="Spend" value={formatCurrency(tooltip.spend)} />
              )}
              {tooltip.campaignCount !== undefined && (
                <Row label="Campaigns" value={String(tooltip.campaignCount)} />
              )}
              {tooltip.spend === undefined && (
                <Row label="Status" value="No active spend" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", highlight && "text-red-400")}>{value}</span>
    </div>
  );
}
