import React, { useState, useMemo } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  MapPin,
  ArrowUpRight,
  Sliders,
  RotateCcw,
  Info,
  Calendar,
  Zap,
  Building,
  Users
} from "lucide-react";
import { StateDetail, DistrictRecord } from "../types";
import { formatIndianNumber } from "./chartSetup";

interface PopulationSimulatorProps {
  onNavigateToState?: (stateName: string) => void;
  onNavigateToCompare?: (type: "state" | "district" | "city", itemA?: string, itemB?: string) => void;
}

// Official MoHFW / National Commission on Population Decadal Growth Rates (approx. 2011-2026 extrapolated)
const STATE_GROWTH_FACTORS: { [state: string]: { decadal_rate: number; tfr: number; zone: string } } = {
  "Bihar": { decadal_rate: 21.4, tfr: 3.0, zone: "Eastern" },
  "Uttar Pradesh": { decadal_rate: 19.6, tfr: 2.7, zone: "Northern" },
  "Rajasthan": { decadal_rate: 18.2, tfr: 2.4, zone: "Northern" },
  "Madhya Pradesh": { decadal_rate: 17.5, tfr: 2.6, zone: "Central" },
  "Jharkhand": { decadal_rate: 18.0, tfr: 2.5, zone: "Eastern" },
  "Chhattisgarh": { decadal_rate: 16.2, tfr: 2.2, zone: "Central" },
  "Haryana": { decadal_rate: 15.8, tfr: 2.1, zone: "Northern" },
  "Gujarat": { decadal_rate: 14.8, tfr: 1.9, zone: "Western" },
  "Maharashtra": { decadal_rate: 13.6, tfr: 1.7, zone: "Western" },
  "Uttarakhand": { decadal_rate: 14.2, tfr: 1.8, zone: "Northern" },
  "Assam": { decadal_rate: 14.5, tfr: 1.9, zone: "North-Eastern" },
  "Odisha": { decadal_rate: 11.5, tfr: 1.8, zone: "Eastern" },
  "West Bengal": { decadal_rate: 11.2, tfr: 1.6, zone: "Eastern" },
  "Karnataka": { decadal_rate: 11.2, tfr: 1.7, zone: "Southern" },
  "Andhra Pradesh": { decadal_rate: 9.8, tfr: 1.7, zone: "Southern" },
  "Telangana": { decadal_rate: 10.4, tfr: 1.7, zone: "Southern" },
  "Punjab": { decadal_rate: 10.2, tfr: 1.6, zone: "Northern" },
  "Himachal Pradesh": { decadal_rate: 9.5, tfr: 1.6, zone: "Northern" },
  "Jammu and Kashmir": { decadal_rate: 14.0, tfr: 1.9, zone: "Northern" },
  "Tamil Nadu": { decadal_rate: 7.2, tfr: 1.6, zone: "Southern" },
  "Kerala": { decadal_rate: 4.8, tfr: 1.5, zone: "Southern" },
  "Delhi": { decadal_rate: 23.5, tfr: 1.6, zone: "Northern" },
  "Goa": { decadal_rate: 8.5, tfr: 1.3, zone: "Western" },
  "Tripura": { decadal_rate: 11.0, tfr: 1.7, zone: "North-Eastern" },
  "Meghalaya": { decadal_rate: 21.0, tfr: 2.9, zone: "North-Eastern" },
  "Manipur": { decadal_rate: 15.0, tfr: 1.8, zone: "North-Eastern" },
  "Nagaland": { decadal_rate: 8.0, tfr: 1.7, zone: "North-Eastern" },
  "Arunachal Pradesh": { decadal_rate: 19.5, tfr: 2.1, zone: "North-Eastern" },
  "Mizoram": { decadal_rate: 16.5, tfr: 2.2, zone: "North-Eastern" },
  "Sikkim": { decadal_rate: 9.0, tfr: 1.2, zone: "North-Eastern" },
  "Puducherry": { decadal_rate: 18.0, tfr: 1.6, zone: "Southern" },
  "Chandigarh": { decadal_rate: 15.0, tfr: 1.6, zone: "Northern" },
  "Andaman and Nicobar Islands": { decadal_rate: 7.0, tfr: 1.5, zone: "Eastern" },
  "Dadra and Nagar Haveli and Daman and Diu": { decadal_rate: 22.0, tfr: 1.8, zone: "Western" },
  "Ladakh": { decadal_rate: 9.0, tfr: 1.6, zone: "Northern" },
  "Lakshadweep": { decadal_rate: 6.0, tfr: 1.4, zone: "Southern" }
};

// Base 2011 population data for all 36 States & UTs
const BASE_STATES_2011: { state: string; pop2011: number; districts: number }[] = [
  { state: "Uttar Pradesh", pop2011: 199812341, districts: 75 },
  { state: "Maharashtra", pop2011: 112374333, districts: 36 },
  { state: "Bihar", pop2011: 104099452, districts: 38 },
  { state: "West Bengal", pop2011: 91276115, districts: 23 },
  { state: "Madhya Pradesh", pop2011: 72626809, districts: 55 },
  { state: "Tamil Nadu", pop2011: 72147030, districts: 38 },
  { state: "Rajasthan", pop2011: 68548437, districts: 50 },
  { state: "Karnataka", pop2011: 61095297, districts: 31 },
  { state: "Gujarat", pop2011: 60439692, districts: 33 },
  { state: "Andhra Pradesh", pop2011: 49577103, districts: 26 },
  { state: "Odisha", pop2011: 41974218, districts: 30 },
  { state: "Telangana", pop2011: 35003674, districts: 33 },
  { state: "Kerala", pop2011: 33406061, districts: 14 },
  { state: "Jharkhand", pop2011: 32988134, districts: 24 },
  { state: "Assam", pop2011: 31205576, districts: 35 },
  { state: "Punjab", pop2011: 27743338, districts: 23 },
  { state: "Chhattisgarh", pop2011: 25545198, districts: 33 },
  { state: "Haryana", pop2011: 25351462, districts: 22 },
  { state: "Delhi", pop2011: 16787941, districts: 11 },
  { state: "Jammu and Kashmir", pop2011: 12267032, districts: 20 },
  { state: "Uttarakhand", pop2011: 10086292, districts: 13 },
  { state: "Himachal Pradesh", pop2011: 6864602, districts: 12 },
  { state: "Tripura", pop2011: 3673917, districts: 8 },
  { state: "Meghalaya", pop2011: 2966889, districts: 12 },
  { state: "Manipur", pop2011: 2855794, districts: 16 },
  { state: "Nagaland", pop2011: 1978502, districts: 16 },
  { state: "Goa", pop2011: 1458545, districts: 2 },
  { state: "Arunachal Pradesh", pop2011: 1383727, districts: 26 },
  { state: "Puducherry", pop2011: 1247953, districts: 4 },
  { state: "Mizoram", pop2011: 1097206, districts: 11 },
  { state: "Chandigarh", pop2011: 1055450, districts: 1 },
  { state: "Sikkim", pop2011: 610577, districts: 6 },
  { state: "Dadra and Nagar Haveli and Daman and Diu", pop2011: 586956, districts: 3 },
  { state: "Andaman and Nicobar Islands", pop2011: 380581, districts: 3 },
  { state: "Ladakh", pop2011: 274289, districts: 2 },
  { state: "Lakshadweep", pop2011: 64473, districts: 1 }
];

export const PopulationSimulatorView: React.FC<PopulationSimulatorProps> = ({
  onNavigateToState,
  onNavigateToCompare
}) => {
  // Simulator State Controls
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [scenario, setScenario] = useState<"standard" | "high_urban" | "low_fertility">("standard");
  const [urbanBonus, setUrbanBonus] = useState<number>(0);
  const [filterZone, setFilterZone] = useState<string>("All");
  const [searchState, setSearchState] = useState<string>("");

  // Calculate year factor: from 2011 baseline (0 years) to selectedYear (e.g. 2026 is 15 years = 1.5 decades)
  const decadeProgress = useMemo(() => {
    return (selectedYear - 2011) / 10;
  }, [selectedYear]);

  // Projected State Data
  const projectedStates = useMemo(() => {
    return BASE_STATES_2011.map(item => {
      const config = STATE_GROWTH_FACTORS[item.state] || { decadal_rate: 14.0, tfr: 2.0, zone: "Other" };
      let effectiveRate = config.decadal_rate;

      if (scenario === "high_urban") {
        // High urban migration boosts states with major tech/industrial hubs (Delhi, Maharashtra, Karnataka, Telangana, Gujarat, TN)
        if (["Delhi", "Maharashtra", "Karnataka", "Telangana", "Gujarat", "Tamil Nadu", "Haryana"].includes(item.state)) {
          effectiveRate += 4.5;
        }
      } else if (scenario === "low_fertility") {
        // Accelerated fertility decline dampens rates, especially in high TFR states
        effectiveRate = Math.max(2.0, effectiveRate * 0.78);
      }

      // Add user custom fine-tuning
      if (urbanBonus !== 0) {
        effectiveRate += urbanBonus;
      }

      // Compound/Exponential growth calculation: P(t) = P0 * (1 + r/100)^decadeProgress
      const growthFactor = Math.pow(1 + effectiveRate / 100, decadeProgress);
      const projectedPop = Math.round(item.pop2011 * growthFactor);
      const netGain = projectedPop - item.pop2011;
      const percentageGrowth = ((projectedPop - item.pop2011) / item.pop2011) * 100;

      return {
        state: item.state,
        pop2011: item.pop2011,
        districts: item.districts,
        zone: config.zone,
        tfr: config.tfr,
        decadal_rate: effectiveRate,
        projectedPop,
        netGain,
        percentageGrowth
      };
    });
  }, [decadeProgress, scenario, urbanBonus]);

  // Aggregate Totals
  const total2011 = useMemo(() => {
    return BASE_STATES_2011.reduce((sum, s) => sum + s.pop2011, 0);
  }, []);

  const totalProjected = useMemo(() => {
    return projectedStates.reduce((sum, s) => sum + s.projectedPop, 0);
  }, [projectedStates]);

  const nationalNetGain = totalProjected - total2011;
  const nationalGrowthPct = ((totalProjected - total2011) / total2011) * 100;
  const projectedDensity = Math.round(totalProjected / 3287263); // India land area approx 3,287,263 km²

  // Filtered list for table
  const filteredList = useMemo(() => {
    return projectedStates
      .filter(s => {
        const matchesZone = filterZone === "All" || s.zone === filterZone;
        const matchesSearch = s.state.toLowerCase().includes(searchState.toLowerCase());
        return matchesZone && matchesSearch;
      })
      .sort((a, b) => b.projectedPop - a.projectedPop);
  }, [projectedStates, filterZone, searchState]);

  // Top 8 Growth States for Chart
  const topGrowthChartData = useMemo(() => {
    const sorted = [...projectedStates].sort((a, b) => b.projectedPop - a.projectedPop).slice(0, 8);
    return {
      labels: sorted.map(s => s.state),
      datasets: [
        {
          label: "Census 2011 Baseline",
          data: sorted.map(s => s.pop2011),
          backgroundColor: "#94a3b8",
          borderRadius: 4
        },
        {
          label: `${selectedYear} Projected`,
          data: sorted.map(s => s.projectedPop),
          backgroundColor: "#2563eb",
          borderRadius: 4
        }
      ]
    };
  }, [projectedStates, selectedYear]);

  // Regional Shares Doughnut
  const regionalSharesData = useMemo(() => {
    const zones: { [zone: string]: number } = {};
    projectedStates.forEach(s => {
      zones[s.zone] = (zones[s.zone] || 0) + s.projectedPop;
    });

    const labels = Object.keys(zones);
    const data = Object.values(zones);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "#2563eb", // Northern
            "#059669", // Southern
            "#d97706", // Western
            "#dc2626", // Eastern
            "#7c3aed", // Central
            "#0891b2"  // North-Eastern
          ],
          borderWidth: 1
        }
      ]
    };
  }, [projectedStates]);

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Pro-Level Demographic Forecaster • NCP MoHFW Model</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              India Population Forecaster &amp; Growth Simulator
            </h1>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Explore dynamic multi-scenario population trajectories from Census 2011 to {selectedYear}.
              Powered by National Commission on Population (MoHFW) state-level fertility (TFR), replacement shifts, and urbanization models.
            </p>
          </div>

          {/* Quick Simulation Parameter Sliders */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-xl p-4 sm:p-5 flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Projection Year
              </span>
              <span className="text-base font-extrabold text-blue-400 font-mono">
                {selectedYear}
              </span>
            </div>

            {/* Year Selector Buttons */}
            <div className="grid grid-cols-5 gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700">
              {[2011, 2016, 2021, 2026, 2031].map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`py-1 rounded text-xs font-bold transition-all ${
                    selectedYear === yr
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Growth Scenario Switcher */}
            <div className="pt-2 border-t border-slate-700/60">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-emerald-400" />
                Demographic Scenario
              </label>
              <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold">
                <button
                  onClick={() => setScenario("standard")}
                  className={`py-1.5 px-2 rounded transition-colors text-center ${
                    scenario === "standard"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-900/60 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="Official MoHFW demographic projection standard"
                >
                  MoHFW
                </button>
                <button
                  onClick={() => setScenario("high_urban")}
                  className={`py-1.5 px-2 rounded transition-colors text-center ${
                    scenario === "high_urban"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900/60 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="High metro migration to top economic hubs"
                >
                  High Urban
                </button>
                <button
                  onClick={() => setScenario("low_fertility")}
                  className={`py-1.5 px-2 rounded transition-colors text-center ${
                    scenario === "low_fertility"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900/60 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="Accelerated drop in fertility rates"
                >
                  Low TFR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Comparison Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Baseline 2011 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            2011 Census Baseline
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 font-mono">
            {formatIndianNumber(total2011)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">1.21 Billion (Official Census)</p>
        </div>

        {/* Projected Total */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {selectedYear} Projected Pop
            </span>
            <span className="text-xs font-mono font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
              +{nationalGrowthPct.toFixed(1)}%
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-950 mt-1 font-mono">
            {formatIndianNumber(totalProjected)}
          </div>
          <p className="text-[11px] text-blue-700 mt-0.5 font-medium">
            {(totalProjected / 1000000000).toFixed(3)} Billion People
          </p>
        </div>

        {/* Net Population Added */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Net Population Added
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
            +{formatIndianNumber(nationalNetGain)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            +{(nationalNetGain / 1000000).toFixed(1)} Million Increase
          </p>
        </div>

        {/* Projected Density */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {selectedYear} Density Est.
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {projectedDensity}/km²
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Up from 368/km² in 2011</p>
        </div>
      </div>

      {/* Visual Analytics Row: Top 8 States Growth + Regional Share Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Top States Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Top 8 Most Populous States: 2011 vs {selectedYear} Projection
              </h3>
              <p className="text-xs text-slate-500">
                Direct comparative volume shift showing projected decadal accumulation
              </p>
            </div>
          </div>
          <div className="h-[290px] w-full">
            <Bar
              data={topGrowthChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
                  tooltip: {
                    callbacks: {
                      label: (ctx: any) => `${ctx.dataset.label}: ${formatIndianNumber(ctx.raw)}`
                    }
                  }
                },
                scales: {
                  x: { grid: { display: false } },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (v: any) => (Number(v) >= 1000000 ? `${(Number(v) / 1000000).toFixed(0)}M` : v)
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Right (1 col): Regional Share of Population */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Regional Population Share ({selectedYear})
            </h3>
            <p className="text-xs text-slate-500">
              Distribution across India's 6 demographic macro-zones
            </p>
          </div>
          <div className="h-[240px] w-full flex items-center justify-center my-auto">
            <Doughnut
              data={regionalSharesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } }
                }
              }}
            />
          </div>
          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Northern &amp; Eastern India account for over 52% of national total
          </div>
        </div>
      </div>

      {/* Comprehensive State Simulation Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              All 36 States &amp; UTs Projected Demographic Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulated population, decadal rate, net gain, and total fertility rate (TFR)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Zone Filter */}
            <select
              value={filterZone}
              onChange={e => setFilterZone(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="All">All Geographic Zones</option>
              <option value="Northern">Northern</option>
              <option value="Southern">Southern</option>
              <option value="Western">Western</option>
              <option value="Eastern">Eastern</option>
              <option value="Central">Central</option>
              <option value="North-Eastern">North-Eastern</option>
            </select>

            {/* State Search */}
            <input
              type="text"
              placeholder="Search state..."
              value={searchState}
              onChange={e => setSearchState(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">State / UT</th>
                <th className="py-2.5 px-4 text-center">Zone</th>
                <th className="py-2.5 px-4 text-right">Census 2011</th>
                <th className="py-2.5 px-4 text-center">TFR</th>
                <th className="py-2.5 px-4 text-right">Decadal Rate</th>
                <th className="py-2.5 px-4 text-right font-bold text-blue-900">{selectedYear} Projected</th>
                <th className="py-2.5 px-4 text-right font-semibold text-emerald-700">Net Increase</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.map((s, idx) => (
                <tr key={s.state} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-center text-xs font-mono text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                    <span>{s.state}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                      ({s.districts} dist)
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {s.zone}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                    {formatIndianNumber(s.pop2011)}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        s.tfr > 2.1
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {s.tfr.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs">
                    +{s.decadal_rate.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                    {formatIndianNumber(s.projectedPop)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-600 text-xs font-semibold">
                    +{formatIndianNumber(s.netGain)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onNavigateToState && (
                        <button
                          onClick={() => onNavigateToState(s.state)}
                          className="text-[11px] font-semibold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-colors"
                        >
                          Profile
                        </button>
                      )}
                      {onNavigateToCompare && (
                        <button
                          onClick={() => onNavigateToCompare("state", s.state)}
                          className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                        >
                          Compare
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
