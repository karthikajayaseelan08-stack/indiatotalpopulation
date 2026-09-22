import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  ArrowLeftRight,
  TrendingUp,
  Scale,
  Award,
  Layers,
  MapPin,
  Building2,
  Compass,
  CheckCircle2
} from "lucide-react";
import {
  CityRecord,
  DistrictRecord,
  StateDetail,
  DistrictComparisonResult,
  StateComparisonResult,
  ComparisonResult
} from "../types";
import { formatIndianNumber } from "./chartSetup";
import {
  fetchDistricts,
  fetchDetailedStates,
  fetchCities,
  fetchCompareDistricts,
  fetchCompareStates,
  fetchCompareCities
} from "../services/dataService";

interface ComparisonViewProps {
  initialType?: "district" | "state" | "city";
  initialItemA?: string;
  initialItemB?: string;
}

type CompareCategory = "district" | "state" | "city";

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  initialType = "district",
  initialItemA,
  initialItemB
}) => {
  const [category, setCategory] = useState<CompareCategory>(initialType);

  // -------------------------------------------------------------
  // District Comparison State
  // -------------------------------------------------------------
  const [allDistricts, setAllDistricts] = useState<DistrictRecord[]>([]);
  const [districtFilterStateA, setDistrictFilterStateA] = useState<string>("All");
  const [districtFilterStateB, setDistrictFilterStateB] = useState<string>("All");
  const [districtA, setDistrictA] = useState<string>(initialItemA || "Bangalore Urban");
  const [districtB, setDistrictB] = useState<string>(initialItemB || "Pune");
  const [districtComparison, setDistrictComparison] = useState<DistrictComparisonResult | null>(null);

  // -------------------------------------------------------------
  // State Comparison State
  // -------------------------------------------------------------
  const [allStates, setAllStates] = useState<StateDetail[]>([]);
  const [stateA, setStateA] = useState<string>(
    initialType === "state" && initialItemA ? initialItemA : "Maharashtra"
  );
  const [stateB, setStateB] = useState<string>(
    initialType === "state" && initialItemB ? initialItemB : "Uttar Pradesh"
  );
  const [stateComparison, setStateComparison] = useState<StateComparisonResult | null>(null);

  // -------------------------------------------------------------
  // City Comparison State
  // -------------------------------------------------------------
  const [allCities, setAllCities] = useState<CityRecord[]>([]);
  const [cityA, setCityA] = useState<string>(
    initialType === "city" && initialItemA ? initialItemA : "Mumbai"
  );
  const [cityB, setCityB] = useState<string>(
    initialType === "city" && initialItemB ? initialItemB : "Delhi"
  );
  const [cityComparison, setCityComparison] = useState<ComparisonResult | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load lists on mount
  useEffect(() => {
    // 1. Load all 788 districts
    fetchDistricts({ limit: "all", sort: "population", order: "desc" })
      .then(res => setAllDistricts(res.data))
      .catch(console.error);

    // 2. Load all 36 states detailed
    fetchDetailedStates()
      .then(data => setAllStates(data))
      .catch(console.error);

    // 3. Load cities
    fetchCities({ limit: 339, sort: "population", order: "desc" })
      .then(res => setAllCities(res.data))
      .catch(console.error);
  }, []);

  // Update category and selection if props change
  useEffect(() => {
    if (initialType) setCategory(initialType);
    if (initialType === "district") {
      if (initialItemA) setDistrictA(initialItemA);
      if (initialItemB) setDistrictB(initialItemB);
    } else if (initialType === "state") {
      if (initialItemA) setStateA(initialItemA);
      if (initialItemB) setStateB(initialItemB);
    } else if (initialType === "city") {
      if (initialItemA) setCityA(initialItemA);
      if (initialItemB) setCityB(initialItemB);
    }
  }, [initialType, initialItemA, initialItemB]);

  // -------------------------------------------------------------
  // Fetch Comparison whenever category or pair selections change
  // -------------------------------------------------------------
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (category === "district") {
      if (!districtA || !districtB) return;
      fetchCompareDistricts(districtA, districtB)
        .then(data => setDistrictComparison(data))
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    } else if (category === "state") {
      if (!stateA || !stateB) return;
      fetchCompareStates(stateA, stateB)
        .then(data => setStateComparison(data))
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    } else {
      if (!cityA || !cityB) return;
      fetchCompareCities(cityA, cityB)
        .then(data => setCityComparison(data))
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [category, districtA, districtB, stateA, stateB, cityA, cityB]);

  const handleSwap = () => {
    if (category === "district") {
      const temp = districtA;
      setDistrictA(districtB);
      setDistrictB(temp);
    } else if (category === "state") {
      const temp = stateA;
      setStateA(stateB);
      setStateB(temp);
    } else {
      const temp = cityA;
      setCityA(cityB);
      setCityB(temp);
    }
  };

  // Unique state names for district filter helper
  const uniqueStateNames = Array.from(new Set(allDistricts.map(d => d.state))).sort();

  const filteredDistrictsA =
    districtFilterStateA === "All"
      ? allDistricts
      : allDistricts.filter(d => d.state === districtFilterStateA);

  const filteredDistrictsB =
    districtFilterStateB === "All"
      ? allDistricts
      : allDistricts.filter(d => d.state === districtFilterStateB);

  // -------------------------------------------------------------
  // Chart configs
  // -------------------------------------------------------------
  const chartOptions: any = {
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
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val: number) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val)
        }
      }
    }
  };

  const districtChartData = districtComparison
    ? {
        labels: [
          `${districtComparison.district1.district} (${districtComparison.district1.state_code || districtComparison.district1.state.slice(0, 3)})`,
          `${districtComparison.district2.district} (${districtComparison.district2.state_code || districtComparison.district2.state.slice(0, 3)})`
        ],
        datasets: [
          {
            label: "Population (2011 Census)",
            data: [
              districtComparison.district1.population,
              districtComparison.district2.population
            ],
            backgroundColor: ["#2563eb", "#06b6d4"],
            borderRadius: 6
          }
        ]
      }
    : null;

  const stateChartData = stateComparison
    ? {
        labels: [stateComparison.state1.state, stateComparison.state2.state],
        datasets: [
          {
            label: "Cumulative District Population",
            data: [
              stateComparison.state1.total_district_population,
              stateComparison.state2.total_district_population
            ],
            backgroundColor: ["#4f46e5", "#10b981"],
            borderRadius: 6
          }
        ]
      }
    : null;

  const cityChartData = cityComparison
    ? {
        labels: [cityComparison.city1.city, cityComparison.city2.city],
        datasets: [
          {
            label: "Population (2011 Census)",
            data: [cityComparison.city1.population, cityComparison.city2.population],
            backgroundColor: ["#2563eb", "#06b6d4"],
            borderRadius: 6
          }
        ]
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="comparisonTitle">
            Comparative Demographic Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Side-by-side divergence analysis across Indian Districts (788), States (36), or Major Cities (339)
          </p>
        </div>

        {/* Category Toggle */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center shadow-xs">
          <button
            onClick={() => setCategory("district")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              category === "district"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Districts (788)</span>
          </button>
          <button
            onClick={() => setCategory("state")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              category === "state"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>States & UTs (36)</span>
          </button>
          <button
            onClick={() => setCategory("city")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              category === "city"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Cities (339)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CATEGORY 1: DISTRICT COMPARISON                                            */}
      {/* ========================================================================= */}
      {category === "district" && (
        <div className="space-y-6">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">POPULAR COMPARISONS:</span>
            {[
              { a: "Bangalore Urban", b: "Pune", label: "Bangalore Urban vs Pune" },
              { a: "Thane", b: "North 24 Parganas", label: "Thane vs North 24 Parganas" },
              { a: "Chennai", b: "Mumbai City", label: "Chennai vs Mumbai City" },
              { a: "Ahmedabad", b: "Jaipur", label: "Ahmedabad vs Jaipur" },
              { a: "South 24 Parganas", b: "Murshidabad", label: "South 24 Parganas vs Murshidabad" }
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  setDistrictA(preset.a);
                  setDistrictB(preset.b);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors shadow-2xs font-medium"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Selectors Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              {/* District A */}
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    District A
                  </label>
                  <select
                    value={districtFilterStateA}
                    onChange={e => setDistrictFilterStateA(e.target.value)}
                    className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 focus:outline-none"
                  >
                    <option value="All">Filter by State (All)</option>
                    {uniqueStateNames.map(s => (
                      <option key={`state-a-${s}`} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={districtA}
                  onChange={e => setDistrictA(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold bg-blue-50/60 border border-blue-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  {filteredDistrictsA.map(d => (
                    <option key={`da-${d.id}`} value={d.district}>
                      #{d.rank} {d.district} ({d.state_code || d.state}) &mdash; {formatIndianNumber(d.population)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center py-2 md:py-0">
                <button
                  onClick={handleSwap}
                  className="p-3 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-all shadow-xs border border-slate-200"
                  title="Swap Selection"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* District B */}
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    District B
                  </label>
                  <select
                    value={districtFilterStateB}
                    onChange={e => setDistrictFilterStateB(e.target.value)}
                    className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 focus:outline-none"
                  >
                    <option value="All">Filter by State (All)</option>
                    {uniqueStateNames.map(s => (
                      <option key={`state-b-${s}`} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={districtB}
                  onChange={e => setDistrictB(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold bg-cyan-50/60 border border-cyan-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                >
                  {filteredDistrictsB.map(d => (
                    <option key={`db-${d.id}`} value={d.district}>
                      #{d.rank} {d.district} ({d.state_code || d.state}) &mdash; {formatIndianNumber(d.population)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {districtComparison && (
            <div className="space-y-6">
              {/* Divergence Stat Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Larger District
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-blue-600 mt-1 truncate">
                    {districtComparison.larger_district}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Leading demographic weight</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Population Delta
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {formatIndianNumber(districtComparison.population_difference)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {districtComparison.percentage_difference}% variance
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Population Ratio
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {districtComparison.ratio}x
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">District A / District B</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Rank Divergence
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {districtComparison.rank_difference} ranks
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">National standing gap</p>
                </div>
              </div>

              {/* Side-by-Side Detailed Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* District A Specs */}
                <div className="bg-white rounded-xl border-2 border-blue-200/80 p-5 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    DISTRICT A
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {districtComparison.district1.district}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                      {districtComparison.district1.state}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">2011 Population:</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {formatIndianNumber(districtComparison.district1.population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">All-India Rank:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        #{districtComparison.district1.rank} of 788
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">State Rank:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        #{districtComparison.district1.state_rank} in {districtComparison.district1.state}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Headquarters:</span>
                      <span className="font-medium text-slate-800">
                        {districtComparison.district1.headquarters || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Population Density:</span>
                      <span className="font-mono text-slate-800">
                        {districtComparison.district1.density_per_sq_km
                          ? `${formatIndianNumber(districtComparison.district1.density_per_sq_km)} /km²`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Area:</span>
                      <span className="font-mono text-slate-800">
                        {districtComparison.district1.area_sq_km
                          ? `${formatIndianNumber(districtComparison.district1.area_sq_km)} km²`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* District B Specs */}
                <div className="bg-white rounded-xl border-2 border-cyan-200/80 p-5 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    DISTRICT B
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {districtComparison.district2.district}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded font-semibold">
                      {districtComparison.district2.state}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">2011 Population:</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {formatIndianNumber(districtComparison.district2.population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">All-India Rank:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        #{districtComparison.district2.rank} of 788
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">State Rank:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        #{districtComparison.district2.state_rank} in {districtComparison.district2.state}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Headquarters:</span>
                      <span className="font-medium text-slate-800">
                        {districtComparison.district2.headquarters || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Population Density:</span>
                      <span className="font-mono text-slate-800">
                        {districtComparison.district2.density_per_sq_km
                          ? `${formatIndianNumber(districtComparison.district2.density_per_sq_km)} /km²`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Area:</span>
                      <span className="font-mono text-slate-800">
                        {districtComparison.district2.area_sq_km
                          ? `${formatIndianNumber(districtComparison.district2.area_sq_km)} km²`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Bar Comparison Chart */}
              {districtChartData && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Visual Population Comparison
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Comparison of official Census 2011 population figures
                  </p>
                  <div className="h-[280px] w-full">
                    <Bar data={districtChartData} options={chartOptions} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 2: STATE COMPARISON                                               */}
      {/* ========================================================================= */}
      {category === "state" && (
        <div className="space-y-6">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">POPULAR STATE COMPARISONS:</span>
            {[
              { a: "Maharashtra", b: "Uttar Pradesh", label: "Maharashtra vs Uttar Pradesh" },
              { a: "Tamil Nadu", b: "Karnataka", label: "Tamil Nadu vs Karnataka" },
              { a: "Gujarat", b: "Rajasthan", label: "Gujarat vs Rajasthan" },
              { a: "Kerala", b: "Punjab", label: "Kerala vs Punjab" },
              { a: "Bihar", b: "West Bengal", label: "Bihar vs West Bengal" }
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  setStateA(preset.a);
                  setStateB(preset.b);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors shadow-2xs font-medium"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Selectors Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  State / UT A
                </label>
                <select
                  value={stateA}
                  onChange={e => setStateA(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold bg-indigo-50/60 border border-indigo-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {allStates.map(s => (
                    <option key={`sa-${s.state}`} value={s.state}>
                      {s.state} ({s.district_count} districts) &mdash; {formatIndianNumber(s.total_district_population)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1 flex justify-center py-2 md:py-0">
                <button
                  onClick={handleSwap}
                  className="p-3 rounded-full bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 transition-all shadow-xs border border-slate-200"
                  title="Swap States"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  State / UT B
                </label>
                <select
                  value={stateB}
                  onChange={e => setStateB(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold bg-emerald-50/60 border border-emerald-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {allStates.map(s => (
                    <option key={`sb-${s.state}`} value={s.state}>
                      {s.state} ({s.district_count} districts) &mdash; {formatIndianNumber(s.total_district_population)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* State Comparison Results */}
          {stateComparison && (
            <div className="space-y-6">
              {/* Divergence Stat Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    More Populous State
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-indigo-600 mt-1 truncate">
                    {stateComparison.larger_state}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cumulative district population</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Population Difference
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {formatIndianNumber(stateComparison.population_difference)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {stateComparison.percentage_difference}% variance
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Population Ratio
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {stateComparison.ratio}x
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">State A / State B</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    District Count Gap
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {stateComparison.district_difference} districts
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Administrative partition gap</p>
                </div>
              </div>

              {/* Side-by-Side Detailed State Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* State A */}
                <div className="bg-white rounded-xl border-2 border-indigo-200/80 p-5 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    STATE A
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {stateComparison.state1.state}
                  </h3>
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Cumulative Population:</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {formatIndianNumber(stateComparison.state1.total_district_population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Total Districts:</span>
                      <span className="font-mono font-bold text-indigo-700">
                        {stateComparison.state1.district_count} districts
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Average District Size:</span>
                      <span className="font-mono text-slate-800">
                        {formatIndianNumber(stateComparison.state1.average_district_population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Largest District:</span>
                      <span className="font-semibold text-blue-600">
                        {stateComparison.state1.largest_district} ({formatIndianNumber(stateComparison.state1.largest_district_population)})
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Densest District:</span>
                      <span className="font-medium text-slate-800">
                        {stateComparison.state1.densest_district} ({formatIndianNumber(stateComparison.state1.densest_district_density)}/km²)
                      </span>
                    </div>
                  </div>
                </div>

                {/* State B */}
                <div className="bg-white rounded-xl border-2 border-emerald-200/80 p-5 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    STATE B
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {stateComparison.state2.state}
                  </h3>
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Cumulative Population:</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {formatIndianNumber(stateComparison.state2.total_district_population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Total Districts:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {stateComparison.state2.district_count} districts
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Average District Size:</span>
                      <span className="font-mono text-slate-800">
                        {formatIndianNumber(stateComparison.state2.average_district_population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Largest District:</span>
                      <span className="font-semibold text-blue-600">
                        {stateComparison.state2.largest_district} ({formatIndianNumber(stateComparison.state2.largest_district_population)})
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Densest District:</span>
                      <span className="font-medium text-slate-800">
                        {stateComparison.state2.densest_district} ({formatIndianNumber(stateComparison.state2.densest_district_density)}/km²)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* State Chart */}
              {stateChartData && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    State Population Visual Comparison
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Cumulative population across all respective districts (2011 Census)
                  </p>
                  <div className="h-[280px] w-full">
                    <Bar data={stateChartData} options={chartOptions} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY 3: CITY COMPARISON                                                */}
      {/* ========================================================================= */}
      {category === "city" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  City A
                </label>
                <select
                  value={cityA}
                  onChange={e => setCityA(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold bg-blue-50/60 border border-blue-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {allCities.map(c => (
                    <option key={`ca-${c.id}`} value={c.city}>
                      #{c.rank} {c.city} ({c.state}) &mdash; {formatIndianNumber(c.population)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1 flex justify-center py-2 md:py-0">
                <button
                  onClick={handleSwap}
                  className="p-3 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-all shadow-xs border border-slate-200"
                  title="Swap Cities"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  City B
                </label>
                <select
                  value={cityB}
                  onChange={e => setCityB(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold bg-cyan-50/60 border border-cyan-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {allCities.map(c => (
                    <option key={`cb-${c.id}`} value={c.city}>
                      #{c.rank} {c.city} ({c.state}) &mdash; {formatIndianNumber(c.population)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* City Comparison Results */}
          {cityComparison && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Larger City
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-blue-600 mt-1 truncate">
                    {cityComparison.larger_city}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Municipal lead</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Population Delta
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {formatIndianNumber(cityComparison.population_difference)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {cityComparison.percentage_difference}% divergence
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Population Ratio
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {cityComparison.ratio}x
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">City A / City B</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Rank Divergence
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                    {cityComparison.rank_difference} ranks
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Standing gap</p>
                </div>
              </div>

              {/* Side-by-side City Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white rounded-xl border-2 border-blue-200/80 p-5 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    CITY A
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {cityComparison.city1.city}
                  </h3>
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Population (2011):</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {formatIndianNumber(cityComparison.city1.population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Rank:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        #{cityComparison.city1.rank} of 339
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">State:</span>
                      <span className="font-semibold text-slate-800">
                        {cityComparison.city1.state}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-cyan-200/80 p-5 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    CITY B
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {cityComparison.city2.city}
                  </h3>
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Population (2011):</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {formatIndianNumber(cityComparison.city2.population)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Rank:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        #{cityComparison.city2.rank} of 339
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">State:</span>
                      <span className="font-semibold text-slate-800">
                        {cityComparison.city2.state}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* City Chart */}
              {cityChartData && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    City Population Visual Comparison
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Comparison of urban municipality populations (2011 Census)
                  </p>
                  <div className="h-[280px] w-full">
                    <Bar data={cityChartData} options={chartOptions} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
