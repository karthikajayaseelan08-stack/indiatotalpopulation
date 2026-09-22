import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  MapPin,
  Users,
  Compass,
  TrendingUp,
  Award,
  Layers,
  ArrowLeftRight,
  Search,
  ExternalLink,
  ChevronRight,
  Building2
} from "lucide-react";
import { DistrictRecord, StateDetail } from "../types";
import { formatIndianNumber } from "./chartSetup";
import { fetchDetailedStates, fetchDistricts } from "../services/dataService";

interface StateProfilesViewProps {
  initialState?: string;
  onNavigateToCompare?: (type: "district" | "state" | "city", itemA?: string, itemB?: string) => void;
  onNavigateToExplorer?: (stateFilter?: string) => void;
}

// Geographic zone mapping for Indian States & UTs
const STATE_ZONES: { [state: string]: string } = {
  "Uttar Pradesh": "Northern India",
  "Rajasthan": "Northern India",
  "Punjab": "Northern India",
  "Haryana": "Northern India",
  "Uttarakhand": "Northern India",
  "Himachal Pradesh": "Northern India",
  "Jammu and Kashmir": "Northern India",
  "Ladakh": "Northern India",
  "Delhi": "Northern India",
  "Chandigarh": "Northern India",
  "Maharashtra": "Western India",
  "Gujarat": "Western India",
  "Goa": "Western India",
  "Dadra and Nagar Haveli and Daman and Diu": "Western India",
  "Tamil Nadu": "Southern India",
  "Karnataka": "Southern India",
  "Kerala": "Southern India",
  "Andhra Pradesh": "Southern India",
  "Telangana": "Southern India",
  "Puducherry": "Southern India",
  "Lakshadweep": "Southern India",
  "West Bengal": "Eastern India",
  "Bihar": "Eastern India",
  "Odisha": "Eastern India",
  "Jharkhand": "Eastern India",
  "Andaman and Nicobar Islands": "Eastern India",
  "Madhya Pradesh": "Central India",
  "Chhattisgarh": "Central India",
  "Assam": "North-Eastern India",
  "Tripura": "North-Eastern India",
  "Meghalaya": "North-Eastern India",
  "Manipur": "North-Eastern India",
  "Nagaland": "North-Eastern India",
  "Arunachal Pradesh": "North-Eastern India",
  "Mizoram": "North-Eastern India",
  "Sikkim": "North-Eastern India"
};

export const StateProfilesView: React.FC<StateProfilesViewProps> = ({
  initialState = "Tamil Nadu",
  onNavigateToCompare,
  onNavigateToExplorer
}) => {
  const [states, setStates] = useState<StateDetail[]>([]);
  const [selectedStateName, setSelectedStateName] = useState<string>(initialState);
  const [stateDistricts, setStateDistricts] = useState<DistrictRecord[]>([]);
  const [districtSearch, setDistrictSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load state list
  useEffect(() => {
    fetchDetailedStates()
      .then(data => {
        setStates(data);
        if (data.length > 0 && !data.some(s => s.state === selectedStateName)) {
          setSelectedStateName(data[0].state);
        }
      })
      .catch(console.error);
  }, []);

  // Load districts for selected state
  useEffect(() => {
    if (!selectedStateName) return;
    setIsLoading(true);
    fetchDistricts({
      state: selectedStateName,
      limit: "all",
      sort: "population",
      order: "desc"
    })
      .then(res => {
        setStateDistricts(res.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedStateName]);

  const currentState = states.find(s => s.state === selectedStateName) || states[0];
  const allIndiaPopulation = 1210854977;
  const stateShare = currentState
    ? ((currentState.total_district_population / allIndiaPopulation) * 100).toFixed(2)
    : "0";

  // Filtered districts within state
  const filteredDistricts = stateDistricts.filter(
    d =>
      d.district.toLowerCase().includes(districtSearch.toLowerCase()) ||
      (d.headquarters && d.headquarters.toLowerCase().includes(districtSearch.toLowerCase()))
  );

  // Chart data: Top districts in this state
  const chartDistricts = stateDistricts.slice(0, 15);
  const chartData = {
    labels: chartDistricts.map(d => d.district),
    datasets: [
      {
        label: "Population (2011 Census)",
        data: chartDistricts.map(d => d.population),
        backgroundColor: "#2563eb",
        borderRadius: 4
      }
    ]
  };

  const chartOptions: any = {
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
        ticks: {
          callback: (val: number) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val)
        }
      },
      y: {
        ticks: { font: { size: 11 } }
      }
    }
  };

  const popularStates = [
    "Tamil Nadu",
    "Maharashtra",
    "Uttar Pradesh",
    "Karnataka",
    "Kerala",
    "Gujarat",
    "West Bengal",
    "Rajasthan",
    "Bihar",
    "Delhi"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900" id="stateProfilesHeading">
            State &amp; Territory Demographic Profiles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Deep-dive demographic analysis, administrative partitioning, and complete district directories across all 36 Indian States &amp; UTs
          </p>
        </div>

        {/* State Dropdown Selector */}
        <div className="w-full md:w-72">
          <select
            value={selectedStateName}
            onChange={e => setSelectedStateName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {states.map(s => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.district_count} districts)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick State Pills Bar (Touch Friendly & Responsive) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] whitespace-nowrap mr-1">
          Quick Jump:
        </span>
        {popularStates.map(stateName => (
          <button
            key={stateName}
            onClick={() => setSelectedStateName(stateName)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all text-xs ${
              selectedStateName === stateName
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {stateName}
          </button>
        ))}
      </div>

      {/* Selected State Hero Card */}
      {currentState && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-7 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {STATE_ZONES[currentState.state] || "Territory of India"}
                </span>
                {currentState.state_code && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-white/10 text-white">
                    CODE: {currentState.state_code}
                  </span>
                )}
                <span className="text-xs text-slate-300">
                  {stateShare}% of India's Total Population
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {currentState.state}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Total statutory administrative territory partitioned into{" "}
                <strong className="text-white font-bold">{currentState.district_count} districts</strong>, representing a cumulative 2011 Census population of{" "}
                <strong className="text-white font-bold">{formatIndianNumber(currentState.total_district_population)}</strong> citizens.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() =>
                  onNavigateToCompare &&
                  onNavigateToCompare(
                    "state",
                    currentState.state,
                    currentState.state === "Maharashtra" ? "Uttar Pradesh" : "Maharashtra"
                  )
                }
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Compare State</span>
              </button>
              {onNavigateToExplorer && (
                <button
                  onClick={() => onNavigateToExplorer(currentState.state)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Open in Explorer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* State Metric KPIs */}
      {currentState && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Population</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                {formatIndianNumber(currentState.total_district_population)}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Census 2011 verified</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Districts</span>
              <Compass className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {currentState.district_count}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Administrative divisions</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg District Pop</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                {formatIndianNumber(currentState.average_district_population)}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Mean per district</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Largest District</span>
              <Award className="w-4 h-4 text-violet-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {currentState.largest_district}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                {formatIndianNumber(currentState.largest_district_population)} people
              </p>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Densest District</span>
              <Layers className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {currentState.densest_district}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {formatIndianNumber(currentState.densest_district_density)} /km²
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Row: Visual Chart of Districts in State */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              District Population Hierarchy &mdash; {selectedStateName}
            </h3>
            <p className="text-xs text-slate-500">
              Top districts in {selectedStateName} ranked by demographic size
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
            {stateDistricts.length} Districts Total
          </span>
        </div>
        <div className="h-[320px] sm:h-[380px] w-full">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Complete District Directory for Selected State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Complete District Directory ({stateDistricts.length} Districts)
            </h3>
            <p className="text-xs text-slate-500">
              Official population, headquarters, area, and density metrics for all districts in {selectedStateName}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search districts in this state..."
              value={districtSearch}
              onChange={e => setDistrictSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">State Rank</th>
                <th className="py-2.5 px-4">District</th>
                <th className="py-2.5 px-4">Headquarters</th>
                <th className="py-2.5 px-4 text-right">Population (2011)</th>
                <th className="py-2.5 px-4 text-right">Density (/km²)</th>
                <th className="py-2.5 px-4 text-right">Area (km²)</th>
                <th className="py-2.5 px-4 text-center">National Rank</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Loading districts for {selectedStateName}...
                  </td>
                </tr>
              ) : filteredDistricts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No districts found matching "{districtSearch}".
                  </td>
                </tr>
              ) : (
                filteredDistricts.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-xs text-blue-600">
                      #{d.state_rank}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {d.district}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">
                      {d.headquarters || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatIndianNumber(d.population)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600">
                      {d.density_per_sq_km ? `${formatIndianNumber(d.density_per_sq_km)}` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-500">
                      {d.area_sq_km ? `${formatIndianNumber(d.area_sq_km)}` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-400">
                      #{d.rank} of 788
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() =>
                          onNavigateToCompare &&
                          onNavigateToCompare(
                            "district",
                            d.district,
                            stateDistricts[0]?.district !== d.district
                              ? stateDistricts[0]?.district
                              : stateDistricts[1]?.district
                          )
                        }
                        className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded transition-colors inline-flex items-center gap-1"
                        title={`Compare ${d.district}`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Compare</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
