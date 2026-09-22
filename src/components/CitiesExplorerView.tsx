import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Building2,
  Compass,
  MapPin,
  Layers,
  ArrowUpDown,
  Filter,
  ArrowLeftRight
} from "lucide-react";
import { CityRecord, DistrictRecord, PaginationMeta, StateDetail } from "../types";
import { formatIndianNumber } from "./chartSetup";
import { fetchDistricts, fetchCities, fetchDetailedStates } from "../services/dataService";

interface CitiesExplorerViewProps {
  initialStateFilter?: string;
  onNavigateToCompare?: (type: "city" | "district" | "state", itemA?: string, itemB?: string) => void;
}

type ExplorerTab = "districts" | "cities" | "states";

export const CitiesExplorerView: React.FC<CitiesExplorerViewProps> = ({
  initialStateFilter,
  onNavigateToCompare
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>("districts");

  // State metadata list (for dropdowns)
  const [statesList, setStatesList] = useState<StateDetail[]>([]);

  // -------------------------------------------------------------
  // Districts Explorer State
  // -------------------------------------------------------------
  const [districts, setDistricts] = useState<DistrictRecord[]>([]);
  const [districtPagination, setDistrictPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 788,
    total_pages: 32
  });
  const [districtSearch, setDistrictSearch] = useState<string>("");
  const [districtState, setDistrictState] = useState<string>(initialStateFilter || "All");
  const [districtTier, setDistrictTier] = useState<string>("All");
  const [districtSortBy, setDistrictSortBy] = useState<string>("population");
  const [districtSortOrder, setDistrictSortOrder] = useState<string>("desc");
  const [isDistrictsLoading, setIsDistrictsLoading] = useState<boolean>(true);

  // -------------------------------------------------------------
  // Cities Explorer State
  // -------------------------------------------------------------
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [cityPagination, setCityPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 339,
    total_pages: 14
  });
  const [citySearch, setCitySearch] = useState<string>("");
  const [cityState, setCityState] = useState<string>("All");
  const [cityTier, setCityTier] = useState<string>("All");
  const [citySortBy, setCitySortBy] = useState<string>("population");
  const [citySortOrder, setCitySortOrder] = useState<string>("desc");
  const [isCitiesLoading, setIsCitiesLoading] = useState<boolean>(true);

  // -------------------------------------------------------------
  // States Explorer State
  // -------------------------------------------------------------
  const [stateSearch, setStateSearch] = useState<string>("");
  const [stateSortBy, setStateSortBy] = useState<"population" | "districts" | "name">("population");

  // Load detailed states on mount
  useEffect(() => {
    fetchDetailedStates()
      .then(data => setStatesList(data))
      .catch(console.error);
  }, []);

  // Update district state filter if initial filter changes
  useEffect(() => {
    if (initialStateFilter) {
      setDistrictState(initialStateFilter);
      setActiveTab("districts");
    }
  }, [initialStateFilter]);

  // -------------------------------------------------------------
  // Fetch Districts on filter/param changes
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== "districts") return;

    let isCancelled = false;
    setIsDistrictsLoading(true);

    let min_pop: number | undefined = undefined;
    let max_pop: number | undefined = undefined;

    if (districtTier === "mega") {
      min_pop = 5000000;
    } else if (districtTier === "large") {
      min_pop = 2000000;
      max_pop = 4999999;
    } else if (districtTier === "mid") {
      min_pop = 1000000;
      max_pop = 1999999;
    } else if (districtTier === "small") {
      max_pop = 999999;
    }

    fetchDistricts({
      page: districtPagination.page,
      limit: districtPagination.limit,
      sort: districtSortBy,
      order: districtSortOrder as "asc" | "desc",
      search: districtSearch.trim() || undefined,
      state: districtState,
      min_population: min_pop,
      max_population: max_pop
    })
      .then(res => {
        if (!isCancelled) {
          setDistricts(res.data);
          setDistrictPagination(res.pagination);
        }
      })
      .catch(err => {
        if (!isCancelled) console.error("Failed to load districts", err);
      })
      .finally(() => {
        if (!isCancelled) setIsDistrictsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    activeTab,
    districtPagination.page,
    districtPagination.limit,
    districtSortBy,
    districtSortOrder,
    districtState,
    districtTier,
    districtSearch
  ]);

  // -------------------------------------------------------------
  // Fetch Cities on filter/param changes
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== "cities") return;

    let isCancelled = false;
    setIsCitiesLoading(true);

    let min_pop: number | undefined = undefined;
    let max_pop: number | undefined = undefined;

    if (cityTier === "mega") {
      min_pop = 10000000;
    } else if (cityTier === "tier1") {
      min_pop = 5000000;
      max_pop = 9999999;
    } else if (cityTier === "major") {
      min_pop = 1000000;
      max_pop = 4999999;
    } else if (cityTier === "mid") {
      min_pop = 500000;
      max_pop = 999999;
    } else if (cityTier === "emerging") {
      max_pop = 499999;
    }

    fetchCities({
      page: cityPagination.page,
      limit: cityPagination.limit,
      sort: citySortBy,
      order: citySortOrder as "asc" | "desc",
      search: citySearch.trim() || undefined,
      state: cityState,
      min_population: min_pop,
      max_population: max_pop
    })
      .then(res => {
        if (!isCancelled) {
          setCities(res.data);
          setCityPagination(res.pagination);
        }
      })
      .catch(err => {
        if (!isCancelled) console.error("Failed to load cities", err);
      })
      .finally(() => {
        if (!isCancelled) setIsCitiesLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    activeTab,
    cityPagination.page,
    cityPagination.limit,
    citySortBy,
    citySortOrder,
    cityState,
    cityTier,
    citySearch
  ]);

  const resetDistrictFilters = () => {
    setDistrictSearch("");
    setDistrictState("All");
    setDistrictTier("All");
    setDistrictSortBy("population");
    setDistrictSortOrder("desc");
    setDistrictPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetCityFilters = () => {
    setCitySearch("");
    setCityState("All");
    setCityTier("All");
    setCitySortBy("population");
    setCitySortOrder("desc");
    setCityPagination(prev => ({ ...prev, page: 1 }));
  };

  // Filtered & sorted states for States tab
  const filteredStates = statesList
    .filter(
      s =>
        s.state.toLowerCase().includes(stateSearch.toLowerCase()) ||
        (s.state_code && s.state_code.toLowerCase().includes(stateSearch.toLowerCase())) ||
        (s.largest_district && s.largest_district.toLowerCase().includes(stateSearch.toLowerCase()))
    )
    .sort((a, b) => {
      if (stateSortBy === "name") return a.state.localeCompare(b.state);
      if (stateSortBy === "districts") return b.district_count - a.district_count;
      return b.total_district_population - a.total_district_population;
    });

  return (
    <div className="space-y-5">
      {/* Header and Explorer Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="explorerHeading">
            India Population Explorer
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Query, filter, and inspect verified population figures for every district and major city in India
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center shadow-xs">
            <button
              onClick={() => setActiveTab("districts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "districts"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Districts (788)</span>
            </button>
            <button
              onClick={() => setActiveTab("cities")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "cities"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cities (339)</span>
            </button>
            <button
              onClick={() => setActiveTab("states")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "states"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>States & UTs (36)</span>
            </button>
          </div>

          {/* Download Raw CSV */}
          <a
            href={activeTab === "districts" ? "/data/districts.csv" : "/data/cities.csv"}
            download
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-xs transition-colors"
            title={`Download ${activeTab === "districts" ? "districts" : "cities"} CSV`}
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Download</span> CSV
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DISTRICTS OF INDIA (788 DISTRICTS)                                 */}
      {/* ========================================================================= */}
      {activeTab === "districts" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search Field */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search district, state, headquarters..."
                  value={districtSearch}
                  onChange={e => {
                    setDistrictSearch(e.target.value);
                    setDistrictPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* State Filter (All 36 States & UTs with district count) */}
              <div className="lg:col-span-3">
                <select
                  value={districtState}
                  onChange={e => {
                    setDistrictState(e.target.value);
                    setDistrictPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="All">All States & UTs (36 covered)</option>
                  {statesList.map(s => (
                    <option key={s.state} value={s.state}>
                      {s.state} ({s.district_count} districts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Population Tier Filter */}
              <div className="lg:col-span-3">
                <select
                  value={districtTier}
                  onChange={e => {
                    setDistrictTier(e.target.value);
                    setDistrictPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Population Tiers</option>
                  <option value="mega">Megadistricts (&ge; 5,000,000)</option>
                  <option value="large">Large (2,000,000 &ndash; 4,999,999)</option>
                  <option value="mid">Mid-sized (1,000,000 &ndash; 1,999,999)</option>
                  <option value="small">Small / Hill (&lt; 1,000,000)</option>
                </select>
              </div>

              {/* Sort selector */}
              <div className="lg:col-span-2 flex items-center gap-1.5">
                <select
                  value={districtSortBy}
                  onChange={e => setDistrictSortBy(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="population">Pop (Desc)</option>
                  <option value="rank">Rank</option>
                  <option value="state_rank">State Rank</option>
                  <option value="district">Name (A-Z)</option>
                  <option value="state">State</option>
                  <option value="density">Density</option>
                  <option value="area">Area</option>
                </select>
                <button
                  onClick={() => setDistrictSortOrder(prev => (prev === "asc" ? "desc" : "asc"))}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"
                  title={`Order: ${districtSortOrder.toUpperCase()}`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick status bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-slate-800">{districts.length}</strong> of{" "}
                  <strong className="text-slate-800">{districtPagination.total}</strong> districts
                </span>
                {districtState !== "All" && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                    State: {districtState}
                  </span>
                )}
              </div>

              <button
                onClick={resetDistrictFilters}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset filters
              </button>
            </div>
          </div>

          {/* Districts Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">State / UT</th>
                    <th className="py-3 px-4 text-center">State Rank</th>
                    <th className="py-3 px-4">Headquarters</th>
                    <th className="py-3 px-4 text-right">Population (2011)</th>
                    <th className="py-3 px-4 text-right">Density (/km²)</th>
                    <th className="py-3 px-4 text-right">Area (km²)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isDistrictsLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCcw className="w-5 h-5 animate-spin text-blue-600" />
                          <span>Loading Indian districts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : districts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        No districts found matching your criteria. Try adjusting the state or search term.
                      </td>
                    </tr>
                  ) : (
                    districts.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 text-center font-mono text-xs font-semibold text-slate-400">
                          #{d.rank}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {d.district}
                        </td>
                        <td className="py-2.5 px-4">
                          <button
                            onClick={() => {
                              setDistrictState(d.state);
                              setDistrictPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="text-xs text-slate-600 hover:text-blue-600 font-medium underline-offset-2 hover:underline text-left"
                            title={`Filter by ${d.state}`}
                          >
                            {d.state}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700">
                            #{d.state_rank}
                          </span>
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
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => onNavigateToCompare && onNavigateToCompare("district", d.district, "Bangalore Urban")}
                            className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded transition-colors inline-flex items-center gap-1"
                            title={`Compare ${d.district} with another district`}
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

            {/* Pagination Controls */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={districtPagination.limit}
                  onChange={e =>
                    setDistrictPagination(prev => ({
                      ...prev,
                      limit: parseInt(e.target.value, 10),
                      page: 1
                    }))
                  }
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={788}>All (788)</option>
                </select>
                <span>
                  Page {districtPagination.page} of {districtPagination.total_pages}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setDistrictPagination(prev => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1)
                    }))
                  }
                  disabled={districtPagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-semibold text-slate-700">
                  {districtPagination.page} / {districtPagination.total_pages}
                </span>
                <button
                  onClick={() =>
                    setDistrictPagination(prev => ({
                      ...prev,
                      page: Math.min(prev.total_pages, prev.page + 1)
                    }))
                  }
                  disabled={districtPagination.page >= districtPagination.total_pages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CITIES OF INDIA (339 MAJOR CITIES)                                */}
      {/* ========================================================================= */}
      {activeTab === "cities" && (
        <div className="space-y-4">
          {/* City Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search Field */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search city or state..."
                  value={citySearch}
                  onChange={e => {
                    setCitySearch(e.target.value);
                    setCityPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* State Filter */}
              <div className="lg:col-span-3">
                <select
                  value={cityState}
                  onChange={e => {
                    setCityState(e.target.value);
                    setCityPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="All">All States with Class-I Cities</option>
                  {statesList.filter(s => s.city_count > 0).map(s => (
                    <option key={s.state} value={s.state}>
                      {s.state} ({s.city_count} cities)
                    </option>
                  ))}
                </select>
              </div>

              {/* Population Tier Filter */}
              <div className="lg:col-span-3">
                <select
                  value={cityTier}
                  onChange={e => {
                    setCityTier(e.target.value);
                    setCityPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Urban Tiers</option>
                  <option value="mega">Megacities (&ge; 10M)</option>
                  <option value="tier1">Tier 1 (5M &ndash; 10M)</option>
                  <option value="major">Major (1M &ndash; 5M)</option>
                  <option value="mid">Mid-tier (500k &ndash; 1M)</option>
                  <option value="emerging">Emerging (&lt; 500k)</option>
                </select>
              </div>

              {/* Sort selector */}
              <div className="lg:col-span-2 flex items-center gap-1.5">
                <select
                  value={citySortBy}
                  onChange={e => setCitySortBy(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="population">Pop (Desc)</option>
                  <option value="rank">Rank</option>
                  <option value="city">City (A-Z)</option>
                  <option value="state">State</option>
                </select>
                <button
                  onClick={() => setCitySortOrder(prev => (prev === "asc" ? "desc" : "asc"))}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"
                  title={`Order: ${citySortOrder.toUpperCase()}`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <div>
                Showing <strong className="text-slate-800">{cities.length}</strong> of{" "}
                <strong className="text-slate-800">{cityPagination.total}</strong> cities
              </div>
              <button
                onClick={resetCityFilters}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset filters
              </button>
            </div>
          </div>

          {/* Cities Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">State / Territory</th>
                    <th className="py-3 px-4 text-right">Population (2011)</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isCitiesLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCcw className="w-5 h-5 animate-spin text-blue-600" />
                          <span>Loading cities...</span>
                        </div>
                      </td>
                    </tr>
                  ) : cities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No cities found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    cities.map(c => {
                      let tierBadge = "Emerging";
                      let tierColor = "bg-slate-100 text-slate-700";
                      if (c.population >= 10000000) {
                        tierBadge = "Megacity";
                        tierColor = "bg-blue-100 text-blue-800 font-bold";
                      } else if (c.population >= 5000000) {
                        tierBadge = "Tier 1";
                        tierColor = "bg-indigo-100 text-indigo-800 font-semibold";
                      } else if (c.population >= 1000000) {
                        tierBadge = "Major Metropolitan";
                        tierColor = "bg-sky-100 text-sky-800 font-medium";
                      } else if (c.population >= 500000) {
                        tierBadge = "Mid-tier";
                        tierColor = "bg-slate-100 text-slate-700";
                      }

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 text-center font-mono font-semibold text-slate-500 text-xs">
                            #{c.rank}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            {c.city}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {c.state}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatIndianNumber(c.population)}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${tierColor}`}>
                              {tierBadge}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onNavigateToCompare && onNavigateToCompare("city", c.city, "Mumbai")}
                              className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded transition-colors inline-flex items-center gap-1"
                              title={`Compare ${c.city}`}
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>Compare</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* City Pagination Controls */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={cityPagination.limit}
                  onChange={e =>
                    setCityPagination(prev => ({
                      ...prev,
                      limit: parseInt(e.target.value, 10),
                      page: 1
                    }))
                  }
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={339}>All (339)</option>
                </select>
                <span>
                  Page {cityPagination.page} of {cityPagination.total_pages}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCityPagination(prev => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1)
                    }))
                  }
                  disabled={cityPagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-semibold text-slate-700">
                  {cityPagination.page} / {cityPagination.total_pages}
                </span>
                <button
                  onClick={() =>
                    setCityPagination(prev => ({
                      ...prev,
                      page: Math.min(prev.total_pages, prev.page + 1)
                    }))
                  }
                  disabled={cityPagination.page >= cityPagination.total_pages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ALL 36 STATES & UNION TERRITORIES OF INDIA                        */}
      {/* ========================================================================= */}
      {activeTab === "states" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search state, code, or largest district..."
                value={stateSearch}
                onChange={e => setStateSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">SORT BY:</span>
              <button
                onClick={() => setStateSortBy("population")}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                  stateSortBy === "population"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Population
              </button>
              <button
                onClick={() => setStateSortBy("districts")}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                  stateSortBy === "districts"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                District Count
              </button>
              <button
                onClick={() => setStateSortBy("name")}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                  stateSortBy === "name"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Name (A-Z)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">State / Union Territory</th>
                    <th className="py-3 px-4 text-center">Total Districts</th>
                    <th className="py-3 px-4 text-right">District Population</th>
                    <th className="py-3 px-4 text-right">Avg District Size</th>
                    <th className="py-3 px-4">Largest District</th>
                    <th className="py-3 px-4">Densest District</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStates.map((s, idx) => (
                    <tr key={s.state} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-center text-xs font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
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
                          {s.district_count} districts
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatIndianNumber(s.total_district_population)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-500">
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
                          <button
                            onClick={() => {
                              setDistrictState(s.state);
                              setActiveTab("districts");
                            }}
                            className="text-[11px] font-semibold px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                          >
                            Explore Districts
                          </button>
                          <button
                            onClick={() => onNavigateToCompare && onNavigateToCompare("state", s.state, filteredStates[0]?.state !== s.state ? filteredStates[0]?.state : filteredStates[1]?.state)}
                            className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
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
    </div>
  );
};
