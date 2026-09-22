import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Compass,
  ArrowLeftRight,
  MapPin,
  Sparkles,
  TrendingUp,
  Download,
  Menu,
  X,
  Zap,
  Share2,
  Search
} from "lucide-react";
import { IndiaPopulationLogo } from "./components/IndiaPopulationLogo";
import { DashboardView } from "./components/DashboardView";
import { CitiesExplorerView } from "./components/CitiesExplorerView";
import { ComparisonView } from "./components/ComparisonView";
import { StateProfilesView } from "./components/StateProfilesView";
import { DemographicInsightsView } from "./components/DemographicInsightsView";
import { PopulationSimulatorView } from "./components/PopulationSimulatorView";
import { DemographicCopilotModal } from "./components/DemographicCopilotModal";

export type ActiveTab = "dashboard" | "explorer" | "states" | "insights" | "simulator" | "compare";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);

  // Cross-view navigation state
  const [explorerStateFilter, setExplorerStateFilter] = useState<string | undefined>(undefined);
  const [selectedStateForProfile, setSelectedStateForProfile] = useState<string>("Uttar Pradesh");
  const [compareParams, setCompareParams] = useState<{
    type: "city" | "district" | "state";
    itemA?: string;
    itemB?: string;
  }>({
    type: "district",
    itemA: "Bangalore Urban",
    itemB: "Pune"
  });

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K opens AI Copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCopilotOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    { id: "dashboard" as ActiveTab, label: "Dashboard", shortLabel: "Dashboard", icon: BarChart3 },
    { id: "explorer" as ActiveTab, label: "Districts & Cities", shortLabel: "Districts", icon: Compass },
    { id: "states" as ActiveTab, label: "State Profiles", shortLabel: "States", icon: MapPin },
    { id: "insights" as ActiveTab, label: "Demographic Insights", shortLabel: "Insights", icon: Sparkles },
    { id: "simulator" as ActiveTab, label: "2026 Forecaster", shortLabel: "Simulator", icon: TrendingUp },
    { id: "compare" as ActiveTab, label: "Comparison Engine", shortLabel: "Compare", icon: ArrowLeftRight }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-20 sm:pb-0">
      {/* Top Application Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand Logo & Title */}
            <div
              className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 cursor-pointer select-none group"
              onClick={() => setActiveTab("dashboard")}
            >
              <IndiaPopulationLogo size={36} />
              <div className="truncate">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white block truncate group-hover:text-blue-400 transition-colors">
                  India Population
                </span>
                <span className="hidden md:inline-block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Official Census Demographic Intelligence • 36 States &amp; UTs • 788 Districts
                </span>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              {/* AI Copilot Query Button */}
              <button
                onClick={() => setCopilotOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-bold border border-blue-400/40 shadow-xs transition-all hover:scale-[1.02] active:scale-95"
                title="Open Demographic AI Copilot (Shortcut: ⌘K or Ctrl+K)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span className="hidden sm:inline">AI Copilot</span>
                <kbd className="hidden sm:inline-block text-[9px] font-mono bg-blue-950/60 px-1.5 py-0.5 rounded text-blue-200 border border-blue-400/30">
                  ⌘K
                </kbd>
              </button>

              {/* Direct Download Districts CSV */}
              <a
                href="/data/districts.csv"
                download="india_districts_2011.csv"
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs"
                title="Download complete Census dataset of 788 Districts (CSV)"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export CSV</span>
              </a>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 touch-manipulation"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden sm:flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-1 overflow-x-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 py-2.5 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "border-blue-500 text-white bg-slate-800/50 rounded-t-lg"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                  {item.label}
                  {item.id === "simulator" && (
                    <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded">
                      Pro
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 bg-slate-900 px-3 py-2 space-y-1 shadow-lg animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCopilotOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-2"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Open Demographic AI Copilot</span>
              </div>
              <span className="text-[10px] uppercase font-mono bg-blue-900/60 px-1.5 py-0.5 rounded">⌘K</span>
            </button>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <a
              href="/data/districts.csv"
              download="india_districts_2011.csv"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border-t border-slate-800/80 mt-1 pt-2"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Download Districts Dataset (788 CSV)
            </a>
          </div>
        )}
      </header>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {activeTab === "dashboard" && (
          <DashboardView
            onNavigateToCities={() => {
              setExplorerStateFilter(undefined);
              setActiveTab("explorer");
            }}
            onNavigateToDistricts={(stateFilter) => {
              setExplorerStateFilter(stateFilter);
              setActiveTab("explorer");
            }}
            onNavigateToStateProfile={(stateName) => {
              setSelectedStateForProfile(stateName);
              setActiveTab("states");
            }}
            onNavigateToCompare={(type, itemA, itemB) => {
              setCompareParams({
                type: type || "district",
                itemA,
                itemB
              });
              setActiveTab("compare");
            }}
          />
        )}

        {activeTab === "explorer" && (
          <CitiesExplorerView
            initialStateFilter={explorerStateFilter}
            onNavigateToCompare={(type, itemA, itemB) => {
              setCompareParams({ type, itemA, itemB });
              setActiveTab("compare");
            }}
          />
        )}

        {activeTab === "states" && (
          <StateProfilesView
            initialState={selectedStateForProfile}
            onNavigateToCompare={(type, itemA, itemB) => {
              setCompareParams({ type, itemA, itemB });
              setActiveTab("compare");
            }}
            onNavigateToExplorer={(stateFilter) => {
              setExplorerStateFilter(stateFilter);
              setActiveTab("explorer");
            }}
          />
        )}

        {activeTab === "insights" && (
          <DemographicInsightsView
            onNavigateToState={(stateName) => {
              setSelectedStateForProfile(stateName);
              setActiveTab("states");
            }}
            onNavigateToCompare={(type, itemA, itemB) => {
              setCompareParams({ type, itemA, itemB });
              setActiveTab("compare");
            }}
          />
        )}

        {activeTab === "simulator" && (
          <PopulationSimulatorView
            onNavigateToState={(stateName) => {
              setSelectedStateForProfile(stateName);
              setActiveTab("states");
            }}
            onNavigateToCompare={(type, itemA, itemB) => {
              setCompareParams({ type, itemA, itemB });
              setActiveTab("compare");
            }}
          />
        )}

        {activeTab === "compare" && (
          <ComparisonView
            initialType={compareParams.type}
            initialItemA={compareParams.itemA}
            initialItemB={compareParams.itemB}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Persistent, Ergonomic, Touch-Friendly) */}
      <nav
        aria-label="Mobile Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1 flex items-center justify-around shadow-2xl safe-area-bottom"
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium flex-1 touch-manipulation transition-all ${
                isActive
                  ? "text-blue-400 font-bold bg-blue-950/50 scale-105"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              <span className="truncate max-w-[54px] text-center">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* AI Demographic Copilot Modal */}
      <DemographicCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setCopilotOpen(false);
        }}
        onSelectState={(st) => setSelectedStateForProfile(st)}
        onSelectCompare={(type, a, b) => setCompareParams({ type, itemA: a, itemB: b })}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-10 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <IndiaPopulationLogo size={20} />
            <span className="font-bold text-slate-800 text-sm">
              India Population
            </span>
          </div>
          <p className="text-slate-500 text-[11px] sm:text-xs">
            Complete demographic intelligence and 2026 NCP projection engine covering all 36 States &amp; UTs, 788 Districts, and 339 Cities (Census of India).
          </p>
        </div>
      </footer>
    </div>
  );
}
