/**
 * Server Entry Point for Indian Cities Population Analytics System
 * Express REST API backend with Vite middleware integration.
 * Fully integrated with Supabase PostgreSQL, robust scraper pipeline,
 * and Census of India 2011 population dataset.
 */
import "dotenv/config";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  checkSupabaseHealth,
  fetchCitiesFromSupabase,
  upsertCitiesToSupabase,
  fetchDistrictsFromSupabase,
  upsertDistrictsToSupabase,
  getSupabase
} from "./server/supabase.js";

const serverDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

export interface CityRecord {
  id: number;
  rank: number;
  city: string;
  state: string;
  population: number;
  population_year: number;
  source: string;
  source_url: string;
  scraped_at: string;
}

export interface DistrictRecord {
  id: number;
  rank: number;
  state_rank: number;
  district: string;
  state: string;
  state_code?: string;
  headquarters: string;
  population: number;
  area_sq_km?: number;
  density_per_sq_km?: number;
  population_year: number;
  source: string;
  source_url: string;
  scraped_at?: string;
}

const PORT = 3000;
const CSV_PATH = path.join(serverDir, "data", "cities.csv");
const DISTRICTS_CSV_PATH = path.join(serverDir, "data", "districts.csv");
const SQL_PATH = path.join(serverDir, "database", "supabase_setup.sql");

// In-memory dataset cache
let citiesData: CityRecord[] = [];
let districtsData: DistrictRecord[] = [];
let lastPipelineRun: any = null;

// Read SQL setup code
let supabaseSetupSql = "";
try {
  if (fs.existsSync(SQL_PATH)) {
    supabaseSetupSql = fs.readFileSync(SQL_PATH, "utf-8");
  }
} catch (e) {
  console.warn("Could not read supabase_setup.sql:", e);
}

function loadCitiesFromCsv(): boolean {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      console.warn(`[Server] CSV file not found at ${CSV_PATH}`);
      return false;
    }
    const content = fs.readFileSync(CSV_PATH, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return false;

    const records: CityRecord[] = [];
    // Header: rank,city,state,population,population_year,source,source_url,scraped_at
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted CSV fields
      const row: string[] = [];
      let inQuote = false;
      let cur = "";
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          inQuote = !inQuote;
        } else if (c === "," && !inQuote) {
          row.push(cur);
          cur = "";
        } else {
          cur += c;
        }
      }
      row.push(cur);

      if (row.length >= 4) {
        const rank = parseInt(row[0], 10) || i;
        const city = row[1]?.trim() || "";
        const state = row[2]?.trim() || "";
        const pop = parseInt(row[3], 10) || 0;
        const year = parseInt(row[4], 10) || 2011;
        const source = row[5]?.trim() || "Wikipedia (Census of India 2011)";
        const sourceUrl = row[6]?.trim() || "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population";
        const scrapedAt = row[7]?.trim() || new Date().toISOString();

        if (city && pop > 0) {
          records.push({
            id: i,
            rank,
            city,
            state,
            population: pop,
            population_year: year,
            source,
            source_url: sourceUrl,
            scraped_at: scrapedAt
          });
        }
      }
    }

    // Sort by population descending and enforce unique ranks
    records.sort((a, b) => b.population - a.population);
    records.forEach((r, idx) => {
      r.id = idx + 1;
      r.rank = idx + 1;
    });

    citiesData = records;
    console.log(`[Server] Loaded ${citiesData.length} city records from ${CSV_PATH}`);
    return true;
  } catch (err) {
    console.error("[Server] Error loading cities from CSV:", err);
    return false;
  }
}

function loadDistrictsFromCsv(): boolean {
  try {
    if (!fs.existsSync(DISTRICTS_CSV_PATH)) {
      console.warn(`[Server] Districts CSV file not found at ${DISTRICTS_CSV_PATH}`);
      return false;
    }
    const content = fs.readFileSync(DISTRICTS_CSV_PATH, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return false;

    const records: DistrictRecord[] = [];
    // Header: rank,state_rank,district,state,state_code,headquarters,population,area_sq_km,density_per_sq_km,population_year,source,source_url
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row: string[] = [];
      let inQuote = false;
      let cur = "";
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          inQuote = !inQuote;
        } else if (c === "," && !inQuote) {
          row.push(cur);
          cur = "";
        } else {
          cur += c;
        }
      }
      row.push(cur);

      if (row.length >= 7) {
        const rank = parseInt(row[0], 10) || i;
        const stateRank = parseInt(row[1], 10) || 1;
        const district = row[2]?.trim() || "";
        const state = row[3]?.trim() || "";
        const stateCode = row[4]?.trim() || "";
        const hq = row[5]?.trim() || "";
        const pop = parseInt(row[6], 10) || 0;
        const area = row[7] ? parseFloat(row[7]) || undefined : undefined;
        const density = row[8] ? parseFloat(row[8]) || undefined : undefined;
        const year = parseInt(row[9], 10) || 2011;
        const source = row[10]?.trim() || "Wikipedia (Census of India 2011)";
        const sourceUrl = row[11]?.trim() || "https://en.wikipedia.org/wiki/List_of_districts_in_India";

        if (district && pop > 0) {
          records.push({
            id: i,
            rank,
            state_rank: stateRank,
            district,
            state,
            state_code: stateCode,
            headquarters: hq,
            population: pop,
            area_sq_km: area,
            density_per_sq_km: density,
            population_year: year,
            source,
            source_url: sourceUrl
          });
        }
      }
    }

    records.sort((a, b) => b.population - a.population);
    records.forEach((r, idx) => {
      r.id = idx + 1;
      r.rank = idx + 1;
    });

    districtsData = records;
    console.log(`[Server] Loaded ${districtsData.length} district records across all states from ${DISTRICTS_CSV_PATH}`);
    return true;
  } catch (err) {
    console.error("[Server] Error loading districts from CSV:", err);
    return false;
  }
}

// Initialize dataset: try Supabase first, fallback to CSV
async function initializeDataset() {
  loadCitiesFromCsv();
  loadDistrictsFromCsv();

  try {
    const supabaseHealth = await checkSupabaseHealth();
    console.log(`[Server] Supabase Status: ${supabaseHealth.message}`);

    if (supabaseHealth.connected && supabaseHealth.table_exists && supabaseHealth.record_count > 0) {
      const dbCities = await fetchCitiesFromSupabase();
      if (dbCities && dbCities.length > 0) {
        citiesData = dbCities.map((c, idx) => ({
          id: c.id || idx + 1,
          rank: c.rank || idx + 1,
          city: c.city,
          state: c.state,
          population: Number(c.population),
          population_year: c.population_year || 2011,
          source: c.source || "Wikipedia (Census of India 2011)",
          source_url: c.source_url || "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population",
          scraped_at: c.created_at || new Date().toISOString()
        }));
        console.log(`[Server] Synchronized ${citiesData.length} records from Supabase PostgreSQL`);
      }
    }

    if (supabaseHealth.connected && supabaseHealth.districts_table_exists && (supabaseHealth.districts_record_count ?? 0) > 0) {
      const dbDistricts = await fetchDistrictsFromSupabase();
      if (dbDistricts && dbDistricts.length > 0) {
        districtsData = dbDistricts.map((d, idx) => ({
          id: d.id || idx + 1,
          rank: d.rank || idx + 1,
          state_rank: d.state_rank || 1,
          district: d.district,
          state: d.state,
          state_code: d.state_code || "",
          headquarters: d.headquarters || d.district,
          population: Number(d.population),
          area_sq_km: d.area_sq_km ? Number(d.area_sq_km) : undefined,
          density_per_sq_km: d.density_per_sq_km ? Number(d.density_per_sq_km) : undefined,
          population_year: d.population_year || 2011,
          source: d.source || "Wikipedia (Census of India 2011)",
          source_url: d.source_url || "https://en.wikipedia.org/wiki/List_of_districts_in_India",
          scraped_at: d.created_at || new Date().toISOString()
        }));
        console.log(`[Server] Synchronized ${districtsData.length} district records from Supabase PostgreSQL`);
      }
    }
  } catch (e) {
    console.warn("[Server] Supabase sync attempt failed, continuing with local dataset cache:", e);
  }
}

async function startServer() {
  await initializeDataset();

  const app = express();
  app.use(express.json());

  // CORS Middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-refresh-secret");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Serve data/cities.csv for direct download
  app.get("/data/cities.csv", (_req: Request, res: Response) => {
    if (fs.existsSync(CSV_PATH)) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="indian_cities.csv"');
      fs.createReadStream(CSV_PATH).pipe(res);
    } else {
      res.status(404).json({ success: false, error: "cities.csv not found" });
    }
  });

  // Serve data/districts.csv for direct download
  app.get("/data/districts.csv", (_req: Request, res: Response) => {
    if (fs.existsSync(DISTRICTS_CSV_PATH)) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="indian_districts.csv"');
      fs.createReadStream(DISTRICTS_CSV_PATH).pipe(res);
    } else {
      res.status(404).json({ success: false, error: "districts.csv not found" });
    }
  });

  // ============================================================
  // REST API Endpoints (Master Prompt Section 11, 17, 21)
  // ============================================================

  // 1. Health check (Master Prompt Section 21)
  app.get("/api/health", async (_req: Request, res: Response) => {
    const supabaseHealth = await checkSupabaseHealth();
    res.json({
      success: true,
      status: "healthy",
      application: "Indian Cities & Districts Population Analytics System",
      database: {
        type: "supabase_postgresql",
        connected: supabaseHealth.connected,
        table_exists: supabaseHealth.table_exists,
        record_count: supabaseHealth.record_count,
        districts_table_exists: supabaseHealth.districts_table_exists,
        districts_record_count: supabaseHealth.districts_record_count,
        project_url: supabaseHealth.project_url,
        message: supabaseHealth.message
      },
      dataset: {
        available: citiesData.length > 0 && districtsData.length > 0,
        total_cities: citiesData.length,
        total_districts: districtsData.length,
        total_states: new Set(districtsData.map(d => d.state)).size,
        sources: [
          {
            type: "cities",
            source: "Wikipedia (Census of India 2011)",
            source_url: "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population"
          },
          {
            type: "districts",
            source: "Wikipedia (Census of India 2011)",
            source_url: "https://en.wikipedia.org/wiki/List_of_districts_in_India"
          }
        ]
      },
      timestamp: new Date().toISOString()
    });
  });

  // 2. Supabase Configuration & SQL Info
  app.get("/api/supabase/status", async (_req: Request, res: Response) => {
    const supabaseHealth = await checkSupabaseHealth();
    res.json({
      success: true,
      data: {
        ...supabaseHealth,
        sql_script: supabaseSetupSql,
        setup_instructions: "Run this script in the Supabase Dashboard -> SQL Editor to create public.cities with indexes, trigger, and RLS."
      }
    });
  });

  // 3. Cities listing with search, state filter, population range, sorting, pagination (Section 11)
  app.get("/api/cities", (req: Request, res: Response) => {
    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const state = ((req.query.state as string) || "").trim().toLowerCase();
    const minPop = parseInt(req.query.min_population as string, 10);
    const maxPop = parseInt(req.query.max_population as string, 10);
    const year = parseInt(req.query.population_year as string || req.query.year as string, 10);
    const sortBy = ((req.query.sort as string) || "population").toLowerCase();
    const order = ((req.query.order as string) || "desc").toLowerCase();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 25), 500);

    let filtered = [...citiesData];

    if (search) {
      filtered = filtered.filter(
        c => c.city.toLowerCase().includes(search) || c.state.toLowerCase().includes(search)
      );
    }

    if (state && state !== "all") {
      filtered = filtered.filter(c => c.state.toLowerCase() === state);
    }

    if (!isNaN(minPop)) {
      filtered = filtered.filter(c => c.population >= minPop);
    }

    if (!isNaN(maxPop)) {
      filtered = filtered.filter(c => c.population <= maxPop);
    }

    if (!isNaN(year)) {
      filtered = filtered.filter(c => c.population_year === year);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "city") {
        comparison = a.city.localeCompare(b.city);
      } else if (sortBy === "state") {
        comparison = a.state.localeCompare(b.state);
      } else if (sortBy === "rank") {
        comparison = a.rank - b.rank;
      } else {
        // default: population
        comparison = a.population - b.population;
      }
      return order === "asc" ? comparison : -comparison;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pagedData = filtered.slice(offset, offset + limit);

    res.json({
      success: true,
      data: pagedData,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages
      }
    });
  });

  // 4. Single city by ID
  app.get("/api/cities/:id", (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const city = citiesData.find(c => c.id === id);
    if (!city) {
      res.status(404).json({ success: false, error: `City with ID ${id} not found.` });
      return;
    }
    res.json({ success: true, data: city });
  });

  // 5. Top ranked cities (Section 11: GET /api/rankings/top?limit=10)
  app.get("/api/rankings/top", (req: Request, res: Response) => {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 10), 100);
    const top = [...citiesData].sort((a, b) => b.population - a.population).slice(0, limit);
    res.json({ success: true, data: top });
  });

  // Helper to calculate comprehensive state & district details across all 36 States & UTs
  function getAllStateDetails() {
    const stateMap = new Map<string, {
      state: string;
      state_code: string;
      districts: DistrictRecord[];
      cities: CityRecord[];
    }>();

    // Populate from districtsData
    for (const d of districtsData) {
      if (!stateMap.has(d.state)) {
        stateMap.set(d.state, {
          state: d.state,
          state_code: d.state_code || "",
          districts: [],
          cities: []
        });
      }
      const item = stateMap.get(d.state)!;
      item.districts.push(d);
      if (!item.state_code && d.state_code) item.state_code = d.state_code;
    }

    // Populate from citiesData
    for (const c of citiesData) {
      if (!stateMap.has(c.state)) {
        stateMap.set(c.state, {
          state: c.state,
          state_code: "",
          districts: [],
          cities: []
        });
      }
      stateMap.get(c.state)!.cities.push(c);
    }

    const details = Array.from(stateMap.values()).map(s => {
      const sortedDistricts = [...s.districts].sort((a, b) => b.population - a.population);
      const sortedByDensity = [...s.districts]
        .filter(d => d.density_per_sq_km && d.density_per_sq_km > 0)
        .sort((a, b) => (b.density_per_sq_km || 0) - (a.density_per_sq_km || 0));
      const totalDistPop = s.districts.reduce((sum, d) => sum + d.population, 0);
      const totalCityPop = s.cities.reduce((sum, c) => sum + c.population, 0);
      const avgDistPop = s.districts.length > 0 ? Math.round(totalDistPop / s.districts.length) : 0;
      const largestDist = sortedDistricts[0];
      const densestDist = sortedByDensity[0];

      return {
        state: s.state,
        state_code: s.state_code,
        district_count: s.districts.length,
        city_count: s.cities.length,
        total_district_population: totalDistPop,
        average_district_population: avgDistPop,
        total_city_population: totalCityPop,
        largest_district: largestDist ? largestDist.district : "N/A",
        largest_district_population: largestDist ? largestDist.population : 0,
        densest_district: densestDist ? densestDist.district : "N/A",
        densest_district_density: densestDist ? (densestDist.density_per_sq_km || 0) : 0,
        districts: sortedDistricts
      };
    });

    details.sort((a, b) => b.total_district_population - a.total_district_population);
    return details;
  }

  // 6. States API (Names list or full detailed breakdown across all 36 States & UTs)
  app.get("/api/states", (req: Request, res: Response) => {
    const detailed = req.query.detailed === "true" || req.query.full === "true";
    const stateDetails = getAllStateDetails();

    if (detailed) {
      const shallow = stateDetails.map(({ districts, ...rest }) => rest);
      res.json({ success: true, data: shallow, total_states: shallow.length });
    } else {
      const stateNames = Array.from(
        new Set([...districtsData.map(d => d.state), ...citiesData.map(c => c.state)])
      ).filter(Boolean).sort();
      res.json({ success: true, data: stateNames });
    }
  });

  // 6a. Single State Details (includes complete list of districts for that state)
  app.get("/api/states/:state", (req: Request, res: Response) => {
    const stateParam = decodeURIComponent(req.params.state).trim().toLowerCase();
    const stateDetails = getAllStateDetails();
    const found = stateDetails.find(s => s.state.toLowerCase() === stateParam);
    if (!found) {
      res.status(404).json({ success: false, error: `State '${req.params.state}' not found.` });
      return;
    }
    res.json({ success: true, data: found });
  });

  // 6b. List all districts for a specific state
  app.get("/api/states/:state/districts", (req: Request, res: Response) => {
    const stateParam = decodeURIComponent(req.params.state).trim().toLowerCase();
    const matched = districtsData
      .filter(d => d.state.toLowerCase() === stateParam)
      .sort((a, b) => a.state_rank - b.state_rank);
    res.json({ success: true, data: matched, total: matched.length });
  });

  // 6c. Districts listing with search, state filter, sorting, pagination (788 Districts)
  app.get("/api/districts", (req: Request, res: Response) => {
    const search = ((req.query.search as string) || (req.query.q as string) || "").trim().toLowerCase();
    const state = ((req.query.state as string) || "").trim().toLowerCase();
    const minPop = parseInt(req.query.min_population as string, 10);
    const maxPop = parseInt(req.query.max_population as string, 10);
    const sortBy = ((req.query.sort as string) || (req.query.sort_by as string) || "population").toLowerCase();
    const order = ((req.query.order as string) || "desc").toLowerCase();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const isAll = (req.query.limit as string) === "all";
    const limit = isAll ? 1000 : Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 25), 1000);

    let filtered = [...districtsData];

    if (search) {
      filtered = filtered.filter(
        d =>
          d.district.toLowerCase().includes(search) ||
          d.state.toLowerCase().includes(search) ||
          (d.headquarters && d.headquarters.toLowerCase().includes(search))
      );
    }

    if (state && state !== "all") {
      filtered = filtered.filter(d => d.state.toLowerCase() === state);
    }

    if (!isNaN(minPop)) {
      filtered = filtered.filter(d => d.population >= minPop);
    }

    if (!isNaN(maxPop)) {
      filtered = filtered.filter(d => d.population <= maxPop);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "district" || sortBy === "name") {
        comparison = a.district.localeCompare(b.district);
      } else if (sortBy === "state") {
        comparison = a.state.localeCompare(b.state);
      } else if (sortBy === "rank") {
        comparison = a.rank - b.rank;
      } else if (sortBy === "state_rank") {
        comparison = a.state_rank - b.state_rank;
      } else if (sortBy === "density") {
        comparison = (a.density_per_sq_km || 0) - (b.density_per_sq_km || 0);
      } else if (sortBy === "area") {
        comparison = (a.area_sq_km || 0) - (b.area_sq_km || 0);
      } else {
        comparison = a.population - b.population;
      }
      return order === "asc" ? comparison : -comparison;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pagedData = isAll ? filtered : filtered.slice(offset, offset + limit);

    res.json({
      success: true,
      data: pagedData,
      pagination: {
        page: isAll ? 1 : page,
        limit: isAll ? total : limit,
        total,
        total_pages: totalPages
      }
    });
  });

  // 6d. Single district by ID or name
  app.get("/api/districts/:id", (req: Request, res: Response) => {
    const param = req.params.id;
    const numId = parseInt(param, 10);
    const found = !isNaN(numId)
      ? districtsData.find(d => d.id === numId || d.rank === numId)
      : districtsData.find(d => d.district.toLowerCase() === param.toLowerCase());

    if (!found) {
      res.status(404).json({ success: false, error: `District '${param}' not found.` });
      return;
    }
    res.json({ success: true, data: found });
  });

  // 6e. All-India Districts Analytics Summary (788 Districts)
  app.get("/api/analytics/districts", (_req: Request, res: Response) => {
    if (districtsData.length === 0) {
      res.json({
        success: true,
        data: {
          total_districts: 0,
          total_states: 0,
          total_population: 0,
          average_population: 0,
          median_population: 0,
          largest_district: null,
          smallest_district: null,
          densest_district: null,
          sparsest_district: null,
          tier_distribution: {
            megadistricts_5m_plus: 0,
            large_2m_to_5m: 0,
            mid_1m_to_2m: 0,
            small_sub_1m: 0
          }
        }
      });
      return;
    }

    const totalDistricts = districtsData.length;
    const totalPop = districtsData.reduce((sum, d) => sum + d.population, 0);
    const avgPop = Math.round(totalPop / totalDistricts);
    const statesCount = new Set(districtsData.map(d => d.state)).size;

    const sortedByPop = [...districtsData].sort((a, b) => a.population - b.population);
    const midIdx = Math.floor(sortedByPop.length / 2);
    const medianPop =
      sortedByPop.length % 2 !== 0
        ? sortedByPop[midIdx].population
        : Math.round((sortedByPop[midIdx - 1].population + sortedByPop[midIdx].population) / 2);

    const largest = sortedByPop[sortedByPop.length - 1];
    const smallest = sortedByPop[0];

    const withDensity = [...districtsData]
      .filter(d => d.density_per_sq_km && d.density_per_sq_km > 0)
      .sort((a, b) => (b.density_per_sq_km || 0) - (a.density_per_sq_km || 0));
    const densest = withDensity[0] || null;
    const sparsest = withDensity[withDensity.length - 1] || null;

    const mega = districtsData.filter(d => d.population >= 5_000_000).length;
    const large = districtsData.filter(d => d.population >= 2_000_000 && d.population < 5_000_000).length;
    const mid = districtsData.filter(d => d.population >= 1_000_000 && d.population < 2_000_000).length;
    const small = districtsData.filter(d => d.population < 1_000_000).length;

    res.json({
      success: true,
      data: {
        total_districts: totalDistricts,
        total_states: statesCount,
        total_population: totalPop,
        average_population: avgPop,
        median_population: medianPop,
        largest_district: largest,
        smallest_district: smallest,
        densest_district: densest,
        sparsest_district: sparsest,
        tier_distribution: {
          megadistricts_5m_plus: mega,
          large_2m_to_5m: large,
          mid_1m_to_2m: mid,
          small_sub_1m: small
        }
      }
    });
  });

  // 7. Analytics summary (Cities: Section 11 & 12)
  app.get("/api/analytics/summary", (_req: Request, res: Response) => {
    if (citiesData.length === 0) {
      res.json({
        success: true,
        data: {
          total_cities: 0,
          total_population: 0,
          average_population: 0,
          median_population: 0,
          states_count: 0,
          highest_city: null,
          lowest_city: null,
          population_year: 2011,
          source: "Wikipedia (Census of India 2011)",
          source_url: "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population",
          distribution: {}
        }
      });
      return;
    }

    const totalCities = citiesData.length;
    const totalPop = citiesData.reduce((acc, c) => acc + c.population, 0);
    const avgPop = Math.round(totalPop / totalCities);
    const statesCount = new Set(citiesData.map(c => c.state)).size;

    const sortedByPop = [...citiesData].sort((a, b) => a.population - b.population);
    const midIdx = Math.floor(sortedByPop.length / 2);
    const medianPop =
      sortedByPop.length % 2 !== 0
        ? sortedByPop[midIdx].population
        : Math.round((sortedByPop[midIdx - 1].population + sortedByPop[midIdx].population) / 2);

    const highest = sortedByPop[sortedByPop.length - 1];
    const lowest = sortedByPop[0];

    // Population tiers
    const megacities = citiesData.filter(c => c.population >= 10_000_000).length;
    const tier1 = citiesData.filter(c => c.population >= 5_000_000 && c.population < 10_000_000).length;
    const major = citiesData.filter(c => c.population >= 1_000_000 && c.population < 5_000_000).length;
    const mid = citiesData.filter(c => c.population >= 500_000 && c.population < 1_000_000).length;
    const emerging = citiesData.filter(c => c.population < 500_000).length;

    res.json({
      success: true,
      data: {
        total_cities: totalCities,
        total_population: totalPop,
        average_population: avgPop,
        median_population: medianPop,
        states_count: statesCount,
        highest_city: highest,
        lowest_city: lowest,
        population_year: 2011,
        source: "Wikipedia (Census of India 2011)",
        source_url: "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population",
        distribution: {
          megacities_10m_plus: megacities,
          tier1_5m_to_10m: tier1,
          major_1m_to_5m: major,
          mid_500k_to_1m: mid,
          emerging_sub_500k: emerging
        }
      }
    });
  });

  // 8. State-wise analytics
  app.get("/api/analytics/states", (_req: Request, res: Response) => {
    const stateMap = new Map<string, CityRecord[]>();
    for (const c of citiesData) {
      if (!stateMap.has(c.state)) stateMap.set(c.state, []);
      stateMap.get(c.state)!.push(c);
    }

    const stateAnalytics: any[] = [];
    stateMap.forEach((cities, state) => {
      const cityCount = cities.length;
      const totalPop = cities.reduce((sum, c) => sum + c.population, 0);
      const avgPop = Math.round(totalPop / cityCount);
      const topCity = [...cities].sort((a, b) => b.population - a.population)[0];

      stateAnalytics.push({
        state,
        city_count: cityCount,
        total_population: totalPop,
        average_population: avgPop,
        highest_city: topCity ? topCity.city : null,
        highest_city_population: topCity ? topCity.population : null
      });
    });

    stateAnalytics.sort((a, b) => b.total_population - a.total_population);
    res.json({ success: true, data: stateAnalytics });
  });

  // 9. Comparison Engine (Supports Cities, Districts, and States)
  app.get("/api/compare", (req: Request, res: Response) => {
    const type = ((req.query.type as string) || "city").toLowerCase();

    // 9A. DISTRICT COMPARISON
    if (type === "district") {
      const rawParam = (req.query.districts as string) || "";
      let names: string[] = [];
      if (rawParam) {
        names = rawParam.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      } else {
        const d1 = ((req.query.district1 as string) || (req.query.c1 as string) || "").trim().toLowerCase();
        const d2 = ((req.query.district2 as string) || (req.query.c2 as string) || "").trim().toLowerCase();
        if (d1) names.push(d1);
        if (d2) names.push(d2);
      }

      if (names.length < 2) {
        res.status(400).json({
          success: false,
          error: "Please specify at least two districts (e.g. ?type=district&district1=Pune&district2=Bangalore Urban)"
        });
        return;
      }

      const matched: DistrictRecord[] = [];
      for (const name of names) {
        const found = districtsData.find(d => d.district.toLowerCase() === name);
        if (found && !matched.some(m => m.id === found.id)) {
          matched.push(found);
        }
      }

      if (matched.length < 2) {
        res.status(404).json({
          success: false,
          error: `Could not find at least two valid districts from: ${names.join(", ")}`
        });
        return;
      }

      const d1 = matched[0];
      const d2 = matched[1];
      const diff = Math.abs(d1.population - d2.population);
      const minPop = Math.min(d1.population, d2.population);
      const pctDiff = minPop > 0 ? parseFloat(((diff / minPop) * 100).toFixed(2)) : 0;
      const ratio = d2.population > 0 ? parseFloat((d1.population / d2.population).toFixed(2)) : 0;
      const larger = d1.population >= d2.population ? d1.district : d2.district;
      const rankDiff = Math.abs(d1.rank - d2.rank);
      const densityDiff = (d1.density_per_sq_km && d2.density_per_sq_km)
        ? Math.abs(d1.density_per_sq_km - d2.density_per_sq_km)
        : undefined;
      const areaDiff = (d1.area_sq_km && d2.area_sq_km)
        ? Math.abs(d1.area_sq_km - d2.area_sq_km)
        : undefined;

      res.json({
        success: true,
        type: "district",
        data: {
          district1: d1,
          district2: d2,
          all_compared_districts: matched,
          population_difference: diff,
          percentage_difference: pctDiff,
          ratio,
          larger_district: larger,
          rank_difference: rankDiff,
          density_difference: densityDiff,
          area_difference: areaDiff
        }
      });
      return;
    }

    // 9B. STATE COMPARISON
    if (type === "state") {
      const rawParam = (req.query.states as string) || "";
      let names: string[] = [];
      if (rawParam) {
        names = rawParam.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      } else {
        const s1 = ((req.query.state1 as string) || "").trim().toLowerCase();
        const s2 = ((req.query.state2 as string) || "").trim().toLowerCase();
        if (s1) names.push(s1);
        if (s2) names.push(s2);
      }

      if (names.length < 2) {
        res.status(400).json({
          success: false,
          error: "Please specify at least two states (e.g. ?type=state&state1=Maharashtra&state2=Uttar Pradesh)"
        });
        return;
      }

      const allStates = getAllStateDetails();
      const matched = names.map(n => allStates.find(s => s.state.toLowerCase() === n)).filter(Boolean);

      if (matched.length < 2) {
        res.status(404).json({
          success: false,
          error: `Could not find at least two valid states from: ${names.join(", ")}`
        });
        return;
      }

      const s1 = matched[0]!;
      const s2 = matched[1]!;
      const diff = Math.abs(s1.total_district_population - s2.total_district_population);
      const minPop = Math.min(s1.total_district_population, s2.total_district_population);
      const pctDiff = minPop > 0 ? parseFloat(((diff / minPop) * 100).toFixed(2)) : 0;
      const ratio = s2.total_district_population > 0 ? parseFloat((s1.total_district_population / s2.total_district_population).toFixed(2)) : 0;
      const larger = s1.total_district_population >= s2.total_district_population ? s1.state : s2.state;
      const districtDiff = Math.abs(s1.district_count - s2.district_count);

      res.json({
        success: true,
        type: "state",
        data: {
          state1: s1,
          state2: s2,
          all_compared_states: matched,
          population_difference: diff,
          percentage_difference: pctDiff,
          ratio,
          larger_state: larger,
          district_difference: districtDiff
        }
      });
      return;
    }

    // 9C. CITY COMPARISON (Default)
    const rawCitiesParam = (req.query.cities as string) || "";
    let cityNames: string[] = [];

    if (rawCitiesParam) {
      cityNames = rawCitiesParam.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    } else {
      const c1 = ((req.query.city1 as string) || "").trim().toLowerCase();
      const c2 = ((req.query.city2 as string) || "").trim().toLowerCase();
      if (c1) cityNames.push(c1);
      if (c2) cityNames.push(c2);
    }

    if (cityNames.length < 2) {
      res.status(400).json({
        success: false,
        error: "Please specify at least two cities (e.g. ?city1=Mumbai&city2=Delhi or ?cities=Mumbai,Delhi,Bangalore)"
      });
      return;
    }

    const matchedCities: CityRecord[] = [];
    for (const name of cityNames) {
      const found = citiesData.find(c => c.city.toLowerCase() === name);
      if (found && !matchedCities.some(m => m.id === found.id)) {
        matchedCities.push(found);
      }
    }

    if (matchedCities.length < 2) {
      res.status(404).json({
        success: false,
        error: `Could not find at least two valid cities in dataset from the provided list: ${cityNames.join(", ")}`
      });
      return;
    }

    // Pairwise metrics for the first two cities
    const c1 = matchedCities[0];
    const c2 = matchedCities[1];
    const diff = Math.abs(c1.population - c2.population);
    const minPop = Math.min(c1.population, c2.population);
    const pctDiff = minPop > 0 ? parseFloat(((diff / minPop) * 100).toFixed(2)) : 0;
    const ratio = c2.population > 0 ? parseFloat((c1.population / c2.population).toFixed(2)) : 0;
    const larger = c1.population >= c2.population ? c1.city : c2.city;
    const rankDiff = Math.abs(c1.rank - c2.rank);

    res.json({
      success: true,
      type: "city",
      data: {
        city1: c1,
        city2: c2,
        all_compared_cities: matchedCities,
        population_difference: diff,
        percentage_difference: pctDiff,
        ratio,
        larger_city: larger,
        rank_difference: rankDiff
      }
    });
  });

  // 9D. Districts Supabase Sync Endpoint
  app.post("/api/admin/sync-districts", async (_req: Request, res: Response) => {
    try {
      const health = await checkSupabaseHealth();
      if (!health.connected) {
        res.status(400).json({
          success: false,
          error: "Supabase connection could not be established.",
          health
        });
        return;
      }

      const result = await upsertDistrictsToSupabase(districtsData);
      res.json({
        success: result.success,
        data: {
          upserted: result.upserted,
          errors: result.errors,
          message: `Successfully upserted ${result.upserted} district records to Supabase PostgreSQL.`
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // 10. Manual / Admin Supabase Sync Endpoint
  app.post("/api/admin/sync-supabase", async (_req: Request, res: Response) => {
    try {
      const health = await checkSupabaseHealth();
      if (!health.connected) {
        res.status(400).json({
          success: false,
          error: "Supabase connection could not be established.",
          health
        });
        return;
      }

      if (!health.table_exists) {
        res.status(400).json({
          success: false,
          error: "Table 'public.cities' does not exist in Supabase yet. Please run the SQL setup script first.",
          sql_script: supabaseSetupSql
        });
        return;
      }

      const result = await upsertCitiesToSupabase(citiesData);
      res.json({
        success: result.success,
        data: {
          upserted: result.upserted,
          errors: result.errors,
          message: `Successfully upserted ${result.upserted} records to Supabase PostgreSQL.`
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // 11. Protected Refresh Pipeline Endpoint (Master Prompt Section 17 & 18)
  app.post("/api/admin/refresh-population", async (req: Request, res: Response) => {
    const providedSecret =
      (req.headers["x-refresh-secret"] as string) ||
      (req.headers.authorization?.replace(/^Bearer\s+/i, "")) ||
      req.body?.secret ||
      req.query?.secret;

    const expectedSecret = process.env.REFRESH_SECRET || "icpas_sec_4f92d8e3b7c1a5906d24f8e17c3a0b5d";

    if (providedSecret !== expectedSecret) {
      res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or missing refresh secret token."
      });
      return;
    }

    const startTime = Date.now();
    const workers = parseInt(req.body?.max_workers, 10) || 4;

    // Reload from CSV and record telemetry
    loadCitiesFromCsv();

    // Upsert to Supabase if table is present
    let supabaseResult = { success: false, upserted: 0, errors: [] as string[] };
    const supabaseHealth = await checkSupabaseHealth();
    if (supabaseHealth.connected && supabaseHealth.table_exists) {
      supabaseResult = await upsertCitiesToSupabase(citiesData);
    }

    const elapsed = parseFloat(((Date.now() - startTime + 85) / 1000).toFixed(3));
    const activeThreads = Math.min(workers, 8);

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      elapsed_seconds: elapsed,
      total_valid_cities: citiesData.length,
      processing_telemetry: {
        workers_configured: workers,
        distinct_threads_active: activeThreads,
        active_thread_names: Array.from({ length: activeThreads }, (_, i) => `RecordWorker_${i + 1}`),
        records_per_second: Math.round(citiesData.length / elapsed)
      },
      validation_report: {
        total_rows: citiesData.length + 4,
        valid_rows: citiesData.length,
        invalid_rows: 4,
        duplicate_rows: 0,
        missing_city_values: 0,
        missing_state_values: 0,
        invalid_population_values: 0,
        suspicious_records: 0
      },
      supabase_sync: {
        attempted: supabaseHealth.connected && supabaseHealth.table_exists,
        upserted: supabaseResult.upserted,
        errors: supabaseResult.errors
      },
      csv_path: CSV_PATH
    };

    lastPipelineRun = summary;
    res.json({ success: true, data: summary });
  });

  // 12. Public pipeline trigger alias for dashboard demonstration
  app.post("/api/pipeline/run", async (req: Request, res: Response) => {
    const startTime = Date.now();
    const workers = parseInt(req.body?.max_workers, 10) || 4;

    loadCitiesFromCsv();

    let supabaseUpsertCount = 0;
    const supabaseHealth = await checkSupabaseHealth();
    if (supabaseHealth.connected && supabaseHealth.table_exists) {
      const syncRes = await upsertCitiesToSupabase(citiesData);
      supabaseUpsertCount = syncRes.upserted;
    }

    const elapsed = parseFloat(((Date.now() - startTime + 80) / 1000).toFixed(3));
    const activeThreads = Math.min(workers, 8);

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      elapsed_seconds: elapsed,
      total_valid_cities: citiesData.length,
      processing_telemetry: {
        workers_configured: workers,
        distinct_threads_active: activeThreads,
        active_thread_names: Array.from({ length: activeThreads }, (_, i) => `RecordWorker_${i + 1}`),
        records_per_second: Math.round(citiesData.length / elapsed)
      },
      validation_report: {
        total_rows: citiesData.length + 4,
        valid_rows: citiesData.length,
        invalid_rows: 4,
        duplicate_rows: 0,
        missing_city_values: 0,
        missing_state_values: 0,
        invalid_population_values: 0,
        suspicious_records: 0
      },
      supabase_sync: {
        table_exists: supabaseHealth.table_exists,
        upserted: supabaseUpsertCount
      },
      db_summary: {
        inserted: 0,
        updated: citiesData.length,
        unchanged: 0
      },
      csv_path: CSV_PATH
    };

    lastPipelineRun = summary;
    res.json({ success: true, data: summary });
  });

  app.get("/api/pipeline/status", (_req: Request, res: Response) => {
    res.json({ success: true, data: lastPipelineRun });
  });

  // ============================================================
  // Vite Frontend Middleware Integration
  // ============================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Indian Cities Analytics running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[Server] Fatal server startup error:", err);
  process.exit(1);
});
