import React, { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  TrendingUp,
  Users,
  Building2,
  Award,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  Compass,
  ArrowRight,
  Filter
} from "lucide-react";
import {
  AnalyticsSummary,
  StateAnalytics,
  CityRecord,
  DistrictRecord,
  DistrictAnalyticsSummary,
  StateDetail
} from "../types";
import { formatIndianNumber } from "./chartSetup";
import {
  fetchCityAnalytics,
  fetchCities,
  fetchDistrictAnalytics,
  fetchDistricts,
  fetchDetailedStates
} from "../services/dataService";

interface DashboardViewProps {
  onNavigateToCities: () => void;
  onNavigateToCompare: (type?: "city" | "district" | "state", itemA?: string, itemB?: string) => void;
  onNavigateToDistricts?: (stateFilter?: string) => void;
  onNavigateToStateProfile?: (stateName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToCities,
  onNavigateToCompare,
  onNavigateToDistricts,
  onNavigateToStateProfile
}) => {
  const [activeScope, setActiveScope] = useState<"districts" | "cities">("districts");

  // Cities Analytics State
  const [citySummary, setCitySummary] = useState<AnalyticsSummary | null>(null);
  const [cityStates, setCityStates] = useState<StateAnalytics[]>([]);
  const [topCities, setTopCities] = useState<CityRecord[]>([]);
  const [cityTopLimit, setCityTopLimit] = useState<number>(10);

  // Districts Analytics State
  const [districtSummary, setDistrictSummary] = useState<DistrictAnalyticsSummary | null>(null);
  const [detailedStates, setDetailedStates] = useState<StateDetail[]>([]);
  const [topDistricts, setTopDistricts] = useState<DistrictRecord[]>([]);
  const [districtTopLimit, setDistrictTopLimit] = useState<number>(10);
  const [stateSearch, setStateSearch] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [citySum, topCitiesRes, distSum, distTopRes, statesDetailed] =
        await Promise.all([
          fetchCityAnalytics(),
          fetchCities({ limit: cityTopLimit, sort: "population", order: "desc" }),
          fetchDistrictAnalytics(),
          fetchDistricts({ limit: districtTopLimit, sort: "population", order: "desc" }),
          fetchDetailedStates()
        ]);

      setCitySummary(citySum);
      setTopCities(topCitiesRes.data);
      setDistrictSummary(distSum);
      setTopDistricts(distTopRes.data);
      setDetailedStates(statesDetailed);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cityTopLimit, districtTopLimit]);

  // ----------------------------------------------------------------------
  // Chart Configs: Districts
  // ----------------------------------------------------------------------
  const topDistrictsChartData = {
    labels: topDistricts.map(d => `${d.district} (${d.state_code || d.state.slice(0, 3)})`),
    datasets: [
      {
        label: "Population (2011 Census)",
        data: topDistricts.map(d => d.population),
        backgroundColor: "#2563eb",
        borderRadius: 4
      }
    ]
  };

  const topDistrictsChartOptions: any = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `District Population: ${formatIndianNumber(ctx.raw)}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          callback: (val: number) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val)
        }
      },
      y: {
        grid: { display: false }
      }
    }
  };

  const districtTierData = districtSummary?.tier_distribution;
  const districtTierChartData = {
    labels: [
      "Megadistricts (5M+)",
      "Large (2M - 5M)",
      "Mid-sized (1M - 2M)",
      "Small / Hill (< 1M)"
    ],
    datasets: [
      {
        data: [
          districtTierData?.megadistricts_5m_plus || 0,
          districtTierData?.large_2m_to_5m || 0,
          districtTierData?.mid_1m_to_2m || 0,
          districtTierData?.small_sub_1m || 0
        ],
        backgroundColor: ["#1e3a8a", "#2563eb", "#60a5fa", "#cbd5e1"],
        borderWidth: 1
      }
    ]
  };

  // ----------------------------------------------------------------------
  // Chart Configs: Cities
  // ----------------------------------------------------------------------
  const topCitiesChartData = {
    labels: topCities.map(c => c.city),
    datasets: [
      {
        label: "Population (2011 Census)",
        data: topCities.map(c => c.population),
        backgroundColor: "#0ea5e9",
        borderRadius: 4
      }
    ]
  };

  const topCitiesChartOptions: any = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Population: ${formatIndianNumber(ctx.raw)}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          callback: (val: number) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val)
        }
      },
      y: {
        grid: { display: false }
      }
    }
  };

  const cityTierData = citySummary?.distribution;
  const cityTierChartData = {
    labels: [
      "Megacities (10M+)",
      "Tier 1 (5M - 10M)",
      "Major (1M - 5M)",
      "Mid-tier (500k - 1M)",
      "Emerging (< 500k)"
    ],
    datasets: [
      {
        data: [
          cityTierData?.megacities_10m_plus || 0,
          cityTierData?.tier1_5m_to_10m || 0,
          cityTierData?.major_1m_to_5m || 0,
          cityTierData?.mid_500k_to_1m || 0,
          cityTierData?.emerging_sub_500k || 0
        ],
        backgroundColor: ["#1e3a8a", "#0284c7", "#38bdf8", "#93c5fd", "#cbd5e1"],
        borderWidth: 1
      }
    ]
  };

  // Filtered detailed states for table
  const filteredDetailedStates = detailedStates.filter(
    s =>
      s.state.toLowerCase().includes(stateSearch.toLowerCase()) ||
      (s.state_code && s.state_code.toLowerCase().includes(stateSearch.toLowerCase())) ||
      (s.largest_district && s.largest_district.toLowerCase().includes(stateSearch.toLowerCase()))
  );

  if (isLoading && !districtSummary && !citySummary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-600" />
        <p className="text-base font-medium">Loading All-India Districts & Cities Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl my-4">
        <p className="font-semibold">Error Loading Analytics</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner & Scope Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="dashHeading">
            India Population Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete demographic data covering all 36 States & UTs, 788 Districts, and 339 Major Cities (Census of India 2011)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Districts (All India) vs Cities */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center shadow-xs">
            <button
              onClick={() => setActiveScope("districts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeScope === "districts"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>All 788 Districts & States</span>
            </button>
            <button
              onClick={() => setActiveScope("cities")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeScope === "cities"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>339 Major Cities</span>
            </button>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 shadow-xs"
            title="Reload dataset statistics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: ALL-INDIA DISTRICTS & STATES DASHBOARD                           */}
      {/* ========================================================================= */}
      {activeScope === "districts" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Districts */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Districts</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Compass className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {districtSummary?.total_districts || 788}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">100% of Indian Districts</p>
              </div>
            </div>

            {/* States & UTs */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">States & UTs</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {districtSummary?.total_states || 36}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">28 States + 8 UTs</p>
              </div>
            </div>

            {/* Total Population */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Population</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {formatIndianNumber(districtSummary?.total_population)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">1.21 Billion (Census 2011)</p>
              </div>
            </div>

            {/* Average District Pop */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Avg District Pop</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {formatIndianNumber(districtSummary?.average_population)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Med: {formatIndianNumber(districtSummary?.median_population)}
                </p>
              </div>
            </div>

            {/* Largest District */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Largest District</span>
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {districtSummary?.largest_district?.district || "Thane"}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {districtSummary?.largest_district?.state} ({formatIndianNumber(districtSummary?.largest_district?.population)})
                </p>
              </div>
            </div>

            {/* Densest District */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Densest District</span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {districtSummary?.densest_district?.district || "Mumbai City"}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {formatIndianNumber(districtSummary?.densest_district?.density_per_sq_km)} /km²
                </p>
              </div>
            </div>
          </div>

          {/* Row 1: Top Districts Horizontal Bar & Tier Doughnut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Most Populated Districts in India
                  </h2>
                  <p className="text-xs text-slate-500">
                    Top administrative districts ranked by total population (2011 Census)
                  </p>
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setDistrictTopLimit(10)}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      districtTopLimit === 10
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Top 10
                  </button>
                  <button
                    onClick={() => setDistrictTopLimit(20)}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      districtTopLimit === 20
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Top 20
                  </button>
                </div>
              </div>
              <div className="h-[360px] w-full">
                <Bar data={topDistrictsChartData} options={topDistrictsChartOptions} />
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
              <h2 className="text-base font-bold text-slate-900 mb-1">District Population Tiers</h2>
              <p className="text-xs text-slate-500 mb-4">Distribution across demographic size tiers</p>
              <div className="h-[280px] w-full flex items-center justify-center my-auto">
                <Doughnut
                  data={districtTierChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Comprehensive State-by-State Breakdown Table (All 36 States & UTs) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  All 36 Indian States & Union Territories Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete district counts, cumulative population, and primary administrative centers for every state
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter state or district..."
                  value={stateSearch}
                  onChange={e => setStateSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">State / UT</th>
                    <th className="py-2.5 px-4 text-center">Districts</th>
                    <th className="py-2.5 px-4 text-right">Total Population</th>
                    <th className="py-2.5 px-4 text-right">Avg District Pop</th>
                    <th className="py-2.5 px-4">Largest District</th>
                    <th className="py-2.5 px-4">Densest District</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDetailedStates.map((s, idx) => (
                    <tr key={s.state} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-center text-xs font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{s.state}</span>
                          {s.state_code && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono rounded">
                              {s.state_code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {s.district_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                        {formatIndianNumber(s.total_district_population)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500 text-xs">
                        {formatIndianNumber(s.average_district_population)}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-blue-600 text-xs">
                          {s.largest_district}
                        </div>
                        {s.largest_district_population > 0 && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {formatIndianNumber(s.largest_district_population)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-800 text-xs">
                          {s.densest_district}
                        </div>
                        {s.densest_district_density > 0 && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {formatIndianNumber(s.densest_district_density)}/km²
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onNavigateToStateProfile && (
                            <button
                              onClick={() => onNavigateToStateProfile(s.state)}
                              className="text-[11px] font-semibold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-colors"
                              title={`View deep-dive profile of ${s.state}`}
                            >
                              Profile
                            </button>
                          )}
                          {onNavigateToDistricts && (
                            <button
                              onClick={() => onNavigateToDistricts(s.state)}
                              className="text-[11px] font-semibold px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                              title={`View all ${s.district_count} districts in ${s.state}`}
                            >
                              Explore ({s.district_count})
                            </button>
                          )}
                          <button
                            onClick={() => onNavigateToCompare("state", s.state, filteredDetailedStates[0]?.state !== s.state ? filteredDetailedStates[0]?.state : filteredDetailedStates[1]?.state)}
                            className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                            title={`Compare ${s.state}`}
                          >
                            Compare
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: CITIES OVERVIEW DASHBOARD                                       */}
      {/* ========================================================================= */}
      {activeScope === "cities" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Total Cities */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Cities</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {formatIndianNumber(citySummary?.total_cities)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Class-I municipal corporations</p>
              </div>
            </div>

            {/* Total Population */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Urban Population</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {formatIndianNumber(citySummary?.total_population)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Total urban represented</p>
              </div>
            </div>

            {/* States & UTs */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">States Covered</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {citySummary?.states_count || cityStates.length || 29}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Civic entities mapped</p>
              </div>
            </div>

            {/* Average Population */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Avg City Pop</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {formatIndianNumber(citySummary?.average_population)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Med: <span className="font-semibold text-slate-700">{formatIndianNumber(citySummary?.median_population)}</span>
                </p>
              </div>
            </div>

            {/* Highest Population City */}
            <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Largest City</span>
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-slate-900 truncate">
                  {citySummary?.highest_city?.city || "—"}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {citySummary?.highest_city?.state} ({formatIndianNumber(citySummary?.highest_city?.population)})
                </p>
              </div>
            </div>
          </div>

          {/* Row 1: Top Cities Bar Chart & Urban Tier Doughnut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Top Ranked Cities by Population</h2>
                  <p className="text-xs text-slate-500">Horizontal breakdown of India's largest civic corporations</p>
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setCityTopLimit(10)}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      cityTopLimit === 10 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Top 10
                  </button>
                  <button
                    onClick={() => setCityTopLimit(20)}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      cityTopLimit === 20 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Top 20
                  </button>
                </div>
              </div>
              <div className="h-[360px] w-full">
                <Bar data={topCitiesChartData} options={topCitiesChartOptions} />
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
              <h2 className="text-base font-bold text-slate-900 mb-1">Urban Population Tiers</h2>
              <p className="text-xs text-slate-500 mb-4">Distribution across metropolitan size bands</p>
              <div className="h-[280px] w-full flex items-center justify-center my-auto">
                <Doughnut
                  data={cityTierChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: State-wise Cities Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">City Breakdown by State</h2>
                <p className="text-xs text-slate-500">Urban center aggregation by state</p>
              </div>
              <button
                onClick={onNavigateToCities}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Explore all 339 cities</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">State / Union Territory</th>
                    <th className="py-2.5 px-4 text-center">Cities</th>
                    <th className="py-2.5 px-4 text-right">Total Population</th>
                    <th className="py-2.5 px-4 text-right">Average City Pop</th>
                    <th className="py-2.5 px-4">Largest Urban Center</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cityStates.map(s => (
                    <tr key={s.state} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-900">{s.state}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {s.city_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium">
                        {formatIndianNumber(s.total_population)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500 text-xs">
                        {formatIndianNumber(s.average_population)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-blue-600">{s.highest_city || "—"}</span>
                        {s.highest_city_population && (
                          <span className="text-xs text-slate-400 ml-1.5 font-mono">
                            ({formatIndianNumber(s.highest_city_population)})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
