import React, { useState, useEffect } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Compass,
  TrendingUp,
  MapPin,
  Layers,
  Sparkles,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Globe2,
  Building,
  CheckCircle2
} from "lucide-react";
import { DistrictRecord, StateDetail } from "../types";
import { formatIndianNumber } from "./chartSetup";
import { fetchDistricts, fetchDetailedStates } from "../services/dataService";

interface DemographicInsightsViewProps {
  onNavigateToCompare?: (type: "district" | "state" | "city", itemA?: string, itemB?: string) => void;
  onNavigateToState?: (stateName: string) => void;
}

const ZONE_MAPPING: { [state: string]: string } = {
  "Uttar Pradesh": "Northern",
  "Rajasthan": "Northern",
  "Punjab": "Northern",
  "Haryana": "Northern",
  "Uttarakhand": "Northern",
  "Himachal Pradesh": "Northern",
  "Jammu and Kashmir": "Northern",
  "Ladakh": "Northern",
  "Delhi": "Northern",
  "Chandigarh": "Northern",
  "Maharashtra": "Western",
  "Gujarat": "Western",
  "Goa": "Western",
  "Dadra and Nagar Haveli and Daman and Diu": "Western",
  "Tamil Nadu": "Southern",
  "Karnataka": "Southern",
  "Kerala": "Southern",
  "Andhra Pradesh": "Southern",
  "Telangana": "Southern",
  "Puducherry": "Southern",
  "Lakshadweep": "Southern",
  "West Bengal": "Eastern",
  "Bihar": "Eastern",
  "Odisha": "Eastern",
  "Jharkhand": "Eastern",
  "Andaman and Nicobar Islands": "Eastern",
  "Madhya Pradesh": "Central",
  "Chhattisgarh": "Central",
  "Assam": "North-Eastern",
  "Tripura": "North-Eastern",
  "Meghalaya": "North-Eastern",
  "Manipur": "North-Eastern",
  "Nagaland": "North-Eastern",
  "Arunachal Pradesh": "North-Eastern",
  "Mizoram": "North-Eastern",
  "Sikkim": "North-Eastern"
};

export const DemographicInsightsView: React.FC<DemographicInsightsViewProps> = ({
  onNavigateToCompare,
  onNavigateToState
}) => {
  const [districts, setDistricts] = useState<DistrictRecord[]>([]);
  const [states, setStates] = useState<StateDetail[]>([]);
  const [activeTab, setActiveTab] = useState<"zones" | "density" | "tiers" | "top15">("zones");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchDistricts({ limit: "all", sort: "population", order: "desc" }),
      fetchDetailedStates()
    ])
      .then(([distRes, statesRes]) => {
        setDistricts(distRes.data);
        setStates(statesRes);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalNationalPopulation = districts.reduce((acc, d) => acc + d.population, 0) || 1210854977;

  // 1. Zone analytics computation
  const zoneStats: { [zone: string]: { population: number; districts: number; states: Set<string> } } = {
    Northern: { population: 0, districts: 0, states: new Set() },
    Southern: { population: 0, districts: 0, states: new Set() },
    Western: { population: 0, districts: 0, states: new Set() },
    Eastern: { population: 0, districts: 0, states: new Set() },
    Central: { population: 0, districts: 0, states: new Set() },
    "North-Eastern": { population: 0, districts: 0, states: new Set() }
  };

  districts.forEach(d => {
    const zone = ZONE_MAPPING[d.state] || "Northern";
    if (zoneStats[zone]) {
      zoneStats[zone].population += d.population;
      zoneStats[zone].districts += 1;
      zoneStats[zone].states.add(d.state);
    }
  });

  const zoneNames = Object.keys(zoneStats);
  const zoneChartData = {
    labels: zoneNames.map(z => `${z} Zone`),
    datasets: [
      {
        data: zoneNames.map(z => zoneStats[z].population),
        backgroundColor: [
          "#2563eb", // Northern (Blue)
          "#059669", // Southern (Emerald)
          "#d97706", // Western (Amber)
          "#7c3aed", // Eastern (Violet)
          "#dc2626", // Central (Red)
          "#0891b2"  // North-Eastern (Cyan)
        ],
        borderWidth: 2,
        borderColor: "#ffffff"
      }
    ]
  };

  // 2. Density Extremes
  const densestDistricts = [...districts]
    .filter(d => (d.density_per_sq_km || 0) > 0)
    .sort((a, b) => (b.density_per_sq_km || 0) - (a.density_per_sq_km || 0))
    .slice(0, 10);

  const leastDenseDistricts = [...districts]
    .filter(d => (d.density_per_sq_km || 0) > 0)
    .sort((a, b) => (a.density_per_sq_km || 0) - (b.density_per_sq_km || 0))
    .slice(0, 10);

  // 3. Demographic Tiers
  const megadistricts = districts.filter(d => d.population >= 5000000);
  const largeDistricts = districts.filter(d => d.population >= 2000000 && d.population < 5000000);
  const midDistricts = districts.filter(d => d.population >= 1000000 && d.population < 2000000);
  const smallDistricts = districts.filter(d => d.population < 1000000);

  const tierChartData = {
    labels: ["Megadistricts (5M+)", "Large (2M-5M)", "Mid-Sized (1M-2M)", "Small/Hill (<1M)"],
    datasets: [
      {
        label: "Number of Districts",
        data: [megadistricts.length, largeDistricts.length, midDistricts.length, smallDistricts.length],
        backgroundColor: ["#7c3aed", "#2563eb", "#059669", "#d97706"],
        borderRadius: 6
      }
    ]
  };

  // 4. Top 15 districts
  const top15Districts = districts.slice(0, 15);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900" id="insightsPageHeading">
          Demographic Insights &amp; National Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Macro-demographic analysis of India's 1.21 Billion citizens across geographic zones, extreme population densities, and administrative tiers
        </p>
      </div>

      {/* Top 4 Macro Insight Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Evaluated Population</span>
            <Globe2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono pt-1">
            {formatIndianNumber(totalNationalPopulation)}
          </div>
          <p className="text-[11px] text-slate-500">
            100% official Census 2011 coverage across 788 districts
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Highest Density Point</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 font-mono pt-1">
            19,652 <span className="text-xs font-normal text-slate-500">/km²</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Mumbai City (Maharashtra) &bull; 3.14M people in 157 km²
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Most Expansive Frontier</span>
            <Compass className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono pt-1">
            1 <span className="text-xs font-normal text-slate-500">person/km²</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Dibang Valley (Arunachal Pradesh) &bull; 8,004 people in 9,129 km²
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top 50 Concentration</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600 font-mono pt-1">
            29.4%
          </div>
          <p className="text-[11px] text-slate-500">
            The top 50 districts host nearly 30% of India's population
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs for Insights */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("zones")}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "zones"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Geographic Zones (6 Regions)
        </button>
        <button
          onClick={() => setActiveTab("density")}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "density"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Density Extremes (Top &amp; Lowest)
        </button>
        <button
          onClick={() => setActiveTab("tiers")}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "tiers"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Administrative Tiers (Megadistricts)
        </button>
        <button
          onClick={() => setActiveTab("top15")}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "top15"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Top 15 Most Populous Districts
        </button>
      </div>

      {/* TAB 1: GEOGRAPHIC ZONES */}
      {activeTab === "zones" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Doughnut */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
              <h3 className="text-sm font-bold text-slate-900 self-start mb-1">
                Regional Population Distribution
              </h3>
              <p className="text-xs text-slate-500 self-start mb-4">
                Share of national population across India's 6 geopolitical zones
              </p>
              <div className="w-56 h-56 sm:w-64 sm:h-64 relative">
                <Doughnut
                  data={zoneChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { font: { size: 10 } } }
                    }
                  }}
                />
              </div>
            </div>

            {/* Zone Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {zoneNames.map(zone => {
                const z = zoneStats[zone];
                const pct = ((z.population / totalNationalPopulation) * 100).toFixed(1);
                return (
                  <div
                    key={zone}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          {zone} Zone
                        </span>
                        <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {pct}% of India
                        </span>
                      </div>
                      <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                        {formatIndianNumber(z.population)}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>{z.districts} Administrative Districts</span>
                      <span>{z.states.size} States &amp; UTs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DENSITY EXTREMES */}
      {activeTab === "density" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 Densest */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-rose-50/60 border-b border-rose-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  Top 10 Most Densely Populated Districts
                </h3>
                <p className="text-xs text-rose-800">
                  Highest concentration of citizens per square kilometer
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">District</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Density (/km²)</th>
                    <th className="py-2.5 px-3 text-right">Population</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {densestDistricts.map((d, i) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-rose-600">#{i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{d.district}</td>
                      <td className="py-2 px-3 text-slate-500">{d.state}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {formatIndianNumber(d.density_per_sq_km)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatIndianNumber(d.population)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 10 Least Dense */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-emerald-50/60 border-b border-emerald-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                  Top 10 Most Spatially Expansive / Least Dense
                </h3>
                <p className="text-xs text-emerald-800">
                  Frontier districts with vast land area and low demographic density
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">District</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Density (/km²)</th>
                    <th className="py-2.5 px-3 text-right">Area (km²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leastDenseDistricts.map((d, i) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-emerald-600">#{i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{d.district}</td>
                      <td className="py-2 px-3 text-slate-500">{d.state}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {d.density_per_sq_km}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {d.area_sq_km ? formatIndianNumber(d.area_sq_km) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADMINISTRATIVE TIERS */}
      {activeTab === "tiers" && (
        <div className="space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              District Population Tier Breakdown
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Distribution of India's 788 administrative districts across population brackets
            </p>
            <div className="h-64 sm:h-72 w-full">
              <Bar
                data={tierChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Megadistricts (5M+)
              </div>
              <div className="text-2xl font-bold font-mono text-purple-950 mt-1">
                {megadistricts.length} Districts
              </div>
              <p className="text-xs text-purple-700 mt-1">
                North 24 Parganas, Bangalore Urban, Pune, Thane, Mumbai Suburban, Chennai, Ahmedabad, etc.
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Large (2M - 5M)
              </div>
              <div className="text-2xl font-bold font-mono text-blue-950 mt-1">
                {largeDistricts.length} Districts
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Major regional administrative hubs, industrial corridors, and secondary urban centers.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Mid-Sized (1M - 2M)
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950 mt-1">
                {midDistricts.length} Districts
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                Typical agrarian and mixed rural-urban district centers across the heartland.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Small &amp; Hill (&lt;1M)
              </div>
              <div className="text-2xl font-bold font-mono text-amber-950 mt-1">
                {smallDistricts.length} Districts
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Himalayan, North-Eastern, island territories, and sparse geographic frontier zones.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TOP 15 DISTRICTS */}
      {activeTab === "top15" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">
              Top 15 Most Populous Administrative Districts in India
            </h3>
            <p className="text-xs text-slate-500">
              The 15 largest demographic powerhouses ranked by 2011 Census counts
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                  <th className="py-2.5 px-4">District</th>
                  <th className="py-2.5 px-4">State</th>
                  <th className="py-2.5 px-4">Headquarters</th>
                  <th className="py-2.5 px-4 text-right">Population</th>
                  <th className="py-2.5 px-4 text-right">% of India</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {top15Districts.map(d => {
                  const share = ((d.population / totalNationalPopulation) * 100).toFixed(2);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-xs text-blue-600">
                        #{d.rank}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {d.district}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {d.state}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">
                        {d.headquarters || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatIndianNumber(d.population)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-blue-700 font-semibold">
                        {share}%
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() =>
                            onNavigateToCompare &&
                            onNavigateToCompare(
                              "district",
                              d.district,
                              d.district === "Bangalore Urban" ? "Pune" : "Bangalore Urban"
                            )
                          }
                          className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded transition-colors"
                        >
                          Compare
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
