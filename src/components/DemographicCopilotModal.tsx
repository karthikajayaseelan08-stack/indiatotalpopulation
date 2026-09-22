import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Search,
  X,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building2,
  Compass,
  CheckCircle2,
  Layers,
  Zap,
  HelpCircle
} from "lucide-react";
import { DistrictRecord, StateDetail } from "../types";
import { formatIndianNumber } from "./chartSetup";

interface DemographicCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: "dashboard" | "explorer" | "states" | "insights" | "simulator" | "compare") => void;
  onSelectState?: (stateName: string) => void;
  onSelectCompare?: (type: "state" | "district" | "city", itemA?: string, itemB?: string) => void;
}

interface QueryPreset {
  id: string;
  title: string;
  tag: string;
  prompt: string;
  answerSummary: string;
  keyStats: { label: string; value: string }[];
  targetTab: "dashboard" | "explorer" | "states" | "insights" | "simulator" | "compare";
  actionLabel: string;
  actionParam?: string;
}

const PRESETS: QueryPreset[] = [
  {
    id: "megadistricts",
    title: "All Megadistricts in India (5M+ Population)",
    tag: "High Density",
    prompt: "Which districts in India have a population exceeding 5 Million?",
    answerSummary:
      "There are 17 Megadistricts in India with populations over 5 Million as per the Census. The single largest district is Thane (Maharashtra) with 11.06 Million people, followed by North 24 Parganas (West Bengal, 10.01M) and Bangalore Urban (Karnataka, 9.62M).",
    keyStats: [
      { label: "Total Megadistricts", value: "17" },
      { label: "#1 District", value: "Thane (11.06M)" },
      { label: "Combined Pop", value: "~118 Million" }
    ],
    targetTab: "explorer",
    actionLabel: "View in Districts Explorer"
  },
  {
    id: "north_vs_south",
    title: "North vs South Demographic Divergence",
    tag: "Regional Shift",
    prompt: "How does population growth and TFR differ between North and South India?",
    answerSummary:
      "Southern states (Kerala, Tamil Nadu, Karnataka, AP, Telangana) have all reached below-replacement fertility (TFR 1.5 - 1.7) and decadal growth of 4.8% to 11.2%. Conversely, Northern/Eastern states (Bihar, UP, Rajasthan, MP) have TFR between 2.4 - 3.0, driving over 52% of national decadal population additions.",
    keyStats: [
      { label: "South Avg TFR", value: "1.6 (Below 2.1)" },
      { label: "North Avg TFR", value: "2.6 (Above 2.1)" },
      { label: "Demographic Shift", value: "+17.9% to North" }
    ],
    targetTab: "simulator",
    actionLabel: "Open 2026 Simulator"
  },
  {
    id: "density_extremes",
    title: "Highest & Lowest Density Districts",
    tag: "Urban Extremes",
    prompt: "Which district is the most congested and which has the lowest density in India?",
    answerSummary:
      "North East Delhi is India's densest administrative district with 36,155 people per sq.km (occupying just 62 km² for 2.24M residents). At the opposite extreme, Dibang Valley (Arunachal Pradesh) is the sparsest with only 1 person per sq.km (8,004 people across 9,129 km²).",
    keyStats: [
      { label: "Densest", value: "North East Delhi (36,155/km²)" },
      { label: "Sparsest", value: "Dibang Valley (1/km²)" },
      { label: "Ratio", value: "36,000 : 1" }
    ],
    targetTab: "insights",
    actionLabel: "Inspect in Demographic Insights"
  },
  {
    id: "up_vs_brazil",
    title: "Uttar Pradesh Demographic Scale",
    tag: "State Giant",
    prompt: "How does Uttar Pradesh compare to entire sovereign nations?",
    answerSummary:
      "With 199.81 Million people (Census 2011) and an estimated 238+ Million in 2026 across 75 districts, Uttar Pradesh alone is more populous than Brazil, Pakistan, or Russia, making it the world's most populous subnational administrative entity.",
    keyStats: [
      { label: "Census 2011", value: "199.81 Million" },
      { label: "2026 NCP Est", value: "238.9 Million" },
      { label: "Districts", value: "75 (All mapped)" }
    ],
    targetTab: "states",
    actionLabel: "View Uttar Pradesh Profile",
    actionParam: "Uttar Pradesh"
  },
  {
    id: "fastest_growers",
    title: "Fastest Growing Urban Metropolitan Centers",
    tag: "Urbanization",
    prompt: "Which cities and districts expanded most rapidly due to tech and industrial corridors?",
    answerSummary:
      "Bangalore Urban (+47.2%), Pune (+30.3%), Surat (+42.2%), and Gurgaon/Gurugram recorded the highest decadal urban inflows, driven by technology corridors, manufacturing clusters, and service sector employment.",
    keyStats: [
      { label: "Top Tech Hub", value: "Bangalore Urban" },
      { label: "Industrial Hub", value: "Surat & Pune" },
      { label: "Avg Urban Growth", value: "31.8%" }
    ],
    targetTab: "explorer",
    actionLabel: "Explore 339 Cities"
  }
];

export const DemographicCopilotModal: React.FC<DemographicCopilotModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onSelectState,
  onSelectCompare
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<QueryPreset>(PRESETS[0]);

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return PRESETS;
    const q = searchQuery.toLowerCase();
    return PRESETS.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.answerSummary.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                India Demographic AI Copilot
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  Hackathon Edition
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Instant statistical queries and national demographic synthesis across all 788 Districts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Copilot (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Query Input */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Ask anything (e.g. 'megadistricts', 'density extremes', 'Uttar Pradesh', 'TFR rates')..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-400 hover:text-slate-600 px-1.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Content Body: Presets list (Left/Top) + Answer Card (Right/Bottom) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Preset Buttons Column */}
          <div className="md:col-span-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-1">
              Curated Queries ({filteredPresets.length})
            </span>
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredPresets.map(preset => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1 ${
                      isSelected
                        ? "bg-blue-50 border-blue-300 text-blue-950 font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {preset.tag}
                      </span>
                      {isSelected && <Zap className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <span className="text-slate-900 line-clamp-1">{preset.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Answer Card Display */}
          <div className="md:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {selectedPreset.tag}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Census 2011 Verified
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-2">
                {selectedPreset.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedPreset.answerSummary}
              </p>

              {/* Key Statistics Matrix */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {selectedPreset.keyStats.map(stat => (
                  <div key={stat.label} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {stat.label}
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono mt-0.5 block truncate">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Action Link */}
            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Dive deeper in the dedicated module
              </span>
              <button
                onClick={() => {
                  onClose();
                  if (selectedPreset.actionParam && onSelectState) {
                    onSelectState(selectedPreset.actionParam);
                  }
                  onNavigateToTab(selectedPreset.targetTab);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <span>{selectedPreset.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-100/70 border-t border-slate-200 px-4 py-2.5 text-center text-[11px] text-slate-500 flex items-center justify-between">
          <span>Tip: Press ESC or click outside to dismiss</span>
          <span className="font-semibold text-slate-700">Official Census of India Demographic Nexus</span>
        </div>
      </div>
    </div>
  );
};
