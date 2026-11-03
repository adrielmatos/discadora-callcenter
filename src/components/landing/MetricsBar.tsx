"use client";

import { siteConfig } from "@/config/site";
import { DollarSign, PhoneCall, TrendingUp, Award } from "lucide-react";

const icons = [DollarSign, PhoneCall, TrendingUp, Award];

export default function MetricsBar() {
  return (
    <section className="relative z-20 -mt-6 sm:-mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {siteConfig.metrics.map((metric, index) => {
          const Icon = icons[index % icons.length];
          return (
            <div
              key={index}
              className="bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl shadow-black/40 hover:border-amber-500/40 hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              {/* Subtle Ambient Glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors">
                  {metric.label}
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shadow-inner">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-1 relative z-10 font-mono">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
                  {metric.value}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-400 font-medium leading-relaxed relative z-10">
                {metric.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
