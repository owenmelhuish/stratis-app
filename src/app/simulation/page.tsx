"use client";

import React from "react";
import { FlaskConical, Sliders, GitBranch, BarChart3, Clock, Sparkles } from "lucide-react";

const FEATURES = [
  { icon: Sliders, title: "Scenario Builder", description: "Model budget shifts, channel mix changes, and timing adjustments to predict outcomes before committing spend." },
  { icon: GitBranch, title: "A/B Forecasting", description: "Compare two or more strategies side-by-side with projected KPIs, risk scores, and confidence intervals." },
  { icon: BarChart3, title: "Monte Carlo Simulations", description: "Run thousands of randomized simulations to stress-test your media plan against market volatility." },
  { icon: Clock, title: "Time-Series Projections", description: "See how your campaigns would perform over 30, 60, or 90 days under different budget and creative scenarios." },
  { icon: Sparkles, title: "AI Recommendations", description: "STRATIS AI suggests optimal scenarios based on your historical data and current market conditions." },
  { icon: FlaskConical, title: "Sandbox Environments", description: "Create isolated test environments to experiment with strategies without affecting live campaign data." },
];

export default function SimulationPage() {
  return (
    <div className="-m-8 flex flex-col h-[calc(100vh-57px)] bg-background overflow-hidden">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal/20 to-emerald-500/10 border border-teal/20 flex items-center justify-center mx-auto mb-6">
            <FlaskConical className="h-8 w-8 text-teal" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Simulation Sandbox</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-3">
            Test media strategies in a risk-free environment. Model scenarios, forecast outcomes, and optimize your plan before a single dollar is spent.
          </p>
          <span className="inline-block text-[10px] font-semibold text-teal/70 bg-teal/10 border border-teal/20 px-3 py-1 rounded-full mb-10">
            Coming Soon
          </span>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-4 rounded-xl bg-card border border-border/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border/20 flex items-center justify-center">
                  <f.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-semibold text-foreground">{f.title}</p>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
