import React from "react";
import { Link } from "react-router-dom";

export function PageShell({ children }) {
  return (
    <div className="min-h-screen text-slate-200 bg-[#0b0e14]">
      {children}
    </div>
  );
}

export function PageHeader({ icon, accent = "text-rose-400", label, title, subtitle }) {
  return (
    <div className="mb-8 pb-5 border-b border-slate-800/80">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-sm">{icon}</span>}
        <span className={`text-[11px] font-bold uppercase tracking-wider ${accent}`}>
          {label}
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="text-slate-400 text-xs sm:text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

export function Grid({ children }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
      {children}
    </div>
  );
}

export function AnimeCard({ to, image, title, type, badge, children }) {
  return (
    <Link to={to} className="group block">
      {/* Poster Container */}
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800/80 group-hover:border-rose-500/40 shadow-sm transition-all duration-300 group-hover:-translate-y-1">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/placeholder-anime.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        {/* Top Badges */}
        {badge && (
          <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm border border-white/10 text-amber-400 text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            {badge}
          </div>
        )}
        {type && (
          <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 text-slate-300 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">
            {type}
          </div>
        )}
      </div>

      {/* Title & Metadata Details */}
      <div className="mt-2.5">
        <h3 className="font-semibold text-slate-200 text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-rose-400 transition-colors">
          {title}
        </h3>
        <div className="space-y-0.5 mt-1">{children}</div>
      </div>
    </Link>
  );
}

export function Row({ label, value, color = "text-slate-400" }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className={`${color} font-medium`}>{value ?? "N/A"}</span>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2.5 py-12 text-slate-400 text-xs">
      <span className="w-4 h-4 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      <span>Loading titles...</span>
    </div>
  );
}

export function EndMsg({ count }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14">
      <div className="w-16 h-px bg-slate-800" />
      <p className="text-slate-500 text-xs font-medium">{count} titles loaded · end of catalog</p>
    </div>
  );
}
