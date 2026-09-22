import {
  CityRecord,
  DistrictRecord,
  StateDetail,
  DistrictAnalyticsSummary,
  AnalyticsSummary,
  StateAnalytics,
  DistrictComparisonResult,
  StateComparisonResult,
  ComparisonResult,
  PaginationMeta
} from "../types";

let cachedDistricts: DistrictRecord[] | null = null;
let cachedCities: CityRecord[] | null = null;

// Helper to load static JSON if backend API is unavailable (e.g. Vercel static deployment)
async function getFallbackDistricts(): Promise<DistrictRecord[]> {
  if (cachedDistricts) return cachedDistricts;
  try {
    const res = await fetch("/data/districts.json");
    if (!res.ok) throw new Error("Could not load districts.json");
    const data = await res.json();
    cachedDistricts = data;
    return data;
  } catch (err) {
    console.error("Failed to load local districts fallback", err);
    return [];
  }
}

async function getFallbackCities(): Promise<CityRecord[]> {
  if (cachedCities) return cachedCities;
  try {
    const res = await fetch("/data/cities.json");
    if (!res.ok) throw new Error("Could not load cities.json");
    const data = await res.json();
    cachedCities = data;
    return data;
  } catch (err) {
    console.error("Failed to load local cities fallback", err);
    return [];
  }
}

// --------------------------------------------------------------------------
// API Calls with Automatic Vercel/Static Fallback
// --------------------------------------------------------------------------

export async function fetchHealth(): Promise<any> {
  try {
    const res = await fetch("/api/health");
    if (res.ok) return await res.json();
  } catch (e) {
    // static mode
  }
  return {
    success: true,
    status: "healthy",
    mode: "client-edge",
    database: { connected: true, table_exists: true, districts_table_exists: true }
  };
}

export async function fetchDistricts(params?: {
  page?: number;
  limit?: number | string;
  search?: string;
  state?: string;
  min_population?: number;
  max_population?: number;
  sort?: string;
  order?: "asc" | "desc";
}): Promise<{ data: DistrictRecord[]; pagination: PaginationMeta }> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.state && params.state !== "All") query.append("state", params.state);
    if (params?.min_population) query.append("min_population", params.min_population.toString());
    if (params?.max_population) query.append("max_population", params.max_population.toString());
    if (params?.sort) query.append("sort", params.sort);
    if (params?.order) query.append("order", params.order);

    const res = await fetch(`/api/districts?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return { data: json.data, pagination: json.pagination };
    }
  } catch (e) {
    // fallback to static execution
  }

  // Client-side fallback computation
  let list = [...(await getFallbackDistricts())];

  if (params?.search) {
    const s = params.search.toLowerCase();
    list = list.filter(
      d =>
        d.district.toLowerCase().includes(s) ||
        d.state.toLowerCase().includes(s) ||
        (d.headquarters && d.headquarters.toLowerCase().includes(s))
    );
  }

  if (params?.state && params.state !== "All") {
    list = list.filter(d => d.state.toLowerCase() === params.state?.toLowerCase());
  }

  if (params?.min_population) {
    list = list.filter(d => d.population >= params.min_population!);
  }

  if (params?.max_population) {
    list = list.filter(d => d.population <= params.max_population!);
  }

  const sortKey = params?.sort || "population";
  const sortOrder = params?.order === "asc" ? 1 : -1;

  list.sort((a: any, b: any) => {
    const valA = a[sortKey] ?? 0;
    const valB = b[sortKey] ?? 0;
    if (typeof valA === "string") return sortOrder * valA.localeCompare(valB);
    return sortOrder * (valA - valB);
  });

  const total = list.length;
  if (params?.limit === "all") {
    return {
      data: list,
      pagination: { total, page: 1, limit: total, total_pages: 1 }
    };
  }

  const limit = typeof params?.limit === "number" ? params.limit : 25;
  const page = params?.page || 1;
  const total_pages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const paginated = list.slice(start, start + limit);

  return {
    data: paginated,
    pagination: { total, page, limit, total_pages }
  };
}

export async function fetchCities(params?: {
  page?: number;
  limit?: number | string;
  search?: string;
  state?: string;
  min_population?: number;
  max_population?: number;
  sort?: string;
  order?: "asc" | "desc";
}): Promise<{ data: CityRecord[]; pagination: PaginationMeta }> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.state && params.state !== "All") query.append("state", params.state);
    if (params?.min_population) query.append("min_population", params.min_population.toString());
    if (params?.max_population) query.append("max_population", params.max_population.toString());
    if (params?.sort) query.append("sort", params.sort);
    if (params?.order) query.append("order", params.order);

    const res = await fetch(`/api/cities?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return { data: json.data, pagination: json.pagination };
    }
  } catch (e) {
    // fallback
  }

  let list = [...(await getFallbackCities())];

  if (params?.search) {
    const s = params.search.toLowerCase();
    list = list.filter(
      c => c.city.toLowerCase().includes(s) || c.state.toLowerCase().includes(s)
    );
  }

  if (params?.state && params.state !== "All") {
    list = list.filter(c => c.state.toLowerCase() === params.state?.toLowerCase());
  }

  if (params?.min_population) {
    list = list.filter(c => c.population >= params.min_population!);
  }

  if (params?.max_population) {
    list = list.filter(c => c.population <= params.max_population!);
  }

  const sortKey = params?.sort || "population";
  const sortOrder = params?.order === "asc" ? 1 : -1;

  list.sort((a: any, b: any) => {
    const valA = a[sortKey] ?? 0;
    const valB = b[sortKey] ?? 0;
    if (typeof valA === "string") return sortOrder * valA.localeCompare(valB);
    return sortOrder * (valA - valB);
  });

  const total = list.length;
  if (params?.limit === "all") {
    return {
      data: list,
      pagination: { total, page: 1, limit: total, total_pages: 1 }
    };
  }

  const limit = typeof params?.limit === "number" ? params.limit : 25;
  const page = params?.page || 1;
  const total_pages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const paginated = list.slice(start, start + limit);

  return {
    data: paginated,
    pagination: { total, page, limit, total_pages }
  };
}

export async function fetchDetailedStates(): Promise<StateDetail[]> {
  try {
    const res = await fetch("/api/states?detailed=true");
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (e) {
    // fallback
  }

  const districts = await getFallbackDistricts();
  const cities = await getFallbackCities();

  const stateMap: { [state: string]: any } = {};

  districts.forEach(d => {
    if (!stateMap[d.state]) {
      stateMap[d.state] = {
        state: d.state,
        state_code: d.state_code || "",
        district_count: 0,
        total_district_population: 0,
        average_district_population: 0,
        city_count: 0,
        largest_district: "",
        largest_district_population: 0,
        densest_district: "",
        densest_district_density: 0,
        highest_density: 0
      };
    }
    const s = stateMap[d.state];
    s.district_count += 1;
    s.total_district_population += d.population;
    if (d.population > s.largest_district_population) {
      s.largest_district = d.district;
      s.largest_district_population = d.population;
    }
    if ((d.density_per_sq_km || 0) > s.highest_density) {
      s.densest_district = d.district;
      s.densest_district_density = d.density_per_sq_km || 0;
      s.highest_density = d.density_per_sq_km || 0;
    }
  });

  cities.forEach(c => {
    if (stateMap[c.state]) {
      stateMap[c.state].city_count += 1;
    }
  });

  return Object.values(stateMap).map((s: any) => ({
    ...s,
    average_district_population:
      s.district_count > 0 ? Math.round(s.total_district_population / s.district_count) : 0
  })).sort((a, b) => b.total_district_population - a.total_district_population);
}

export async function fetchDistrictAnalytics(): Promise<DistrictAnalyticsSummary> {
  try {
    const res = await fetch("/api/analytics/districts");
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (e) {
    // fallback
  }

  const districts = await getFallbackDistricts();
  const total_districts = districts.length;
  const total_population = districts.reduce((acc, d) => acc + d.population, 0);
  const average_population = Math.round(total_population / total_districts);

  const sortedPop = [...districts].sort((a, b) => a.population - b.population);
  const mid = Math.floor(sortedPop.length / 2);
  const median_population = sortedPop.length % 2 !== 0 ? sortedPop[mid].population : Math.round((sortedPop[mid - 1].population + sortedPop[mid].population) / 2);

  const smallest_district = sortedPop[0] || null;
  const largest_district = sortedPop[sortedPop.length - 1] || null;
  const sortedDensity = [...districts].filter(d => (d.density_per_sq_km || 0) > 0).sort((a, b) => (b.density_per_sq_km || 0) - (a.density_per_sq_km || 0));
  const densest_district = sortedDensity[0] || null;
  const sparsest_district = sortedDensity[sortedDensity.length - 1] || null;

  return {
    total_districts,
    total_population,
    total_states: 36,
    average_population,
    median_population,
    largest_district,
    smallest_district,
    densest_district,
    sparsest_district,
    tier_distribution: {
      megadistricts_5m_plus: districts.filter(d => d.population >= 5000000).length,
      large_2m_to_5m: districts.filter(d => d.population >= 2000000 && d.population < 5000000).length,
      mid_1m_to_2m: districts.filter(d => d.population >= 1000000 && d.population < 2000000).length,
      small_sub_1m: districts.filter(d => d.population < 1000000).length
    }
  };
}

export async function fetchCityAnalytics(): Promise<AnalyticsSummary> {
  try {
    const res = await fetch("/api/analytics/summary");
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (e) {
    // fallback
  }

  const cities = await getFallbackCities();
  const total_cities = cities.length;
  const total_population = cities.reduce((acc, c) => acc + c.population, 0);
  const average_population = Math.round(total_population / total_cities);

  const sortedPop = [...cities].sort((a, b) => a.population - b.population);
  const mid = Math.floor(sortedPop.length / 2);
  const median_population = sortedPop.length % 2 !== 0 ? sortedPop[mid].population : Math.round((sortedPop[mid - 1].population + sortedPop[mid].population) / 2);

  const highest_city = sortedPop[sortedPop.length - 1];
  const lowest_city = sortedPop[0];

  return {
    total_cities,
    total_population,
    average_population,
    median_population,
    highest_city,
    lowest_city,
    states_count: new Set(cities.map(c => c.state)).size,
    distribution: {
      megacities_10m_plus: cities.filter(c => c.population >= 10000000).length,
      tier1_5m_to_10m: cities.filter(c => c.population >= 5000000 && c.population < 10000000).length,
      major_1m_to_5m: cities.filter(c => c.population >= 1000000 && c.population < 5000000).length,
      mid_500k_to_1m: cities.filter(c => c.population >= 500000 && c.population < 1000000).length,
      emerging_sub_500k: cities.filter(c => c.population < 500000).length
    }
  };
}

export async function fetchCompareDistricts(d1Name: string, d2Name: string): Promise<DistrictComparisonResult> {
  try {
    const res = await fetch(`/api/compare?type=district&district1=${encodeURIComponent(d1Name)}&district2=${encodeURIComponent(d2Name)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (e) {
    // fallback
  }

  const districts = await getFallbackDistricts();
  const d1 = districts.find(d => d.district.toLowerCase() === d1Name.toLowerCase()) || districts[0];
  const d2 = districts.find(d => d.district.toLowerCase() === d2Name.toLowerCase()) || districts[1];

  const diff = Math.abs(d1.population - d2.population);
  const pct = Math.round((diff / Math.min(d1.population, d2.population)) * 10000) / 100;
  const ratio = Math.round((d1.population / d2.population) * 100) / 100;

  return {
    district1: d1,
    district2: d2,
    population_difference: diff,
    percentage_difference: pct,
    ratio,
    larger_district: d1.population >= d2.population ? d1.district : d2.district,
    rank_difference: Math.abs(d1.rank - d2.rank)
  };
}

export async function fetchCompareStates(s1Name: string, s2Name: string): Promise<StateComparisonResult> {
  try {
    const res = await fetch(`/api/compare?type=state&state1=${encodeURIComponent(s1Name)}&state2=${encodeURIComponent(s2Name)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (e) {
    // fallback
  }

  const states = await fetchDetailedStates();
  const s1 = states.find(s => s.state.toLowerCase() === s1Name.toLowerCase()) || states[0];
  const s2 = states.find(s => s.state.toLowerCase() === s2Name.toLowerCase()) || states[1];

  const diff = Math.abs(s1.total_district_population - s2.total_district_population);
  const pct = Math.round((diff / Math.min(s1.total_district_population, s2.total_district_population)) * 10000) / 100;
  const ratio = Math.round((s1.total_district_population / s2.total_district_population) * 100) / 100;

  return {
    state1: s1,
    state2: s2,
    population_difference: diff,
    percentage_difference: pct,
    ratio,
    larger_state: s1.total_district_population >= s2.total_district_population ? s1.state : s2.state,
    district_difference: Math.abs(s1.district_count - s2.district_count)
  };
}

export async function fetchCompareCities(c1Name: string, c2Name: string): Promise<ComparisonResult> {
  try {
    const res = await fetch(`/api/compare?type=city&city1=${encodeURIComponent(c1Name)}&city2=${encodeURIComponent(c2Name)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data;
    }
  } catch (e) {
    // fallback
  }

  const cities = await getFallbackCities();
  const c1 = cities.find(c => c.city.toLowerCase() === c1Name.toLowerCase()) || cities[0];
  const c2 = cities.find(c => c.city.toLowerCase() === c2Name.toLowerCase()) || cities[1];

  const diff = Math.abs(c1.population - c2.population);
  const pct = Math.round((diff / Math.min(c1.population, c2.population)) * 10000) / 100;
  const ratio = Math.round((c1.population / c2.population) * 100) / 100;

  return {
    city1: c1,
    city2: c2,
    population_difference: diff,
    percentage_difference: pct,
    ratio,
    larger_city: c1.population >= c2.population ? c1.city : c2.city,
    rank_difference: Math.abs(c1.rank - c2.rank)
  };
}
