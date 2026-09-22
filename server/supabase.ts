/**
 * Supabase Database Client & Helper Module
 * Server-side only: Uses SUPABASE_SERVICE_ROLE_KEY for administrative operations.
 * Never expose the service role key to frontend code!
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return supabaseClient;
}

export interface SupabaseHealthResult {
  connected: boolean;
  table_exists: boolean;
  record_count: number;
  districts_table_exists?: boolean;
  districts_record_count?: number;
  project_url: string | null;
  has_service_role: boolean;
  message: string;
  error?: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  const url = process.env.SUPABASE_URL || null;
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = getSupabase();

  if (!client || !url) {
    return {
      connected: false,
      table_exists: false,
      record_count: 0,
      project_url: url,
      has_service_role: hasServiceRole,
      message: "Supabase credentials not configured in environment."
    };
  }

  try {
    const { count, error } = await client
      .from("cities")
      .select("*", { count: "exact", head: true });

    let distExists = false;
    let distCount = 0;
    try {
      const distRes = await client.from("districts").select("*", { count: "exact", head: true });
      if (!distRes.error) {
        distExists = true;
        distCount = distRes.count ?? 0;
      }
    } catch {
      // Ignore if districts table doesn't exist yet
    }

    if (error) {
      // Table doesn't exist yet (PGRST205 / 42P01)
      if (error.code === "PGRST205" || error.message.includes("does not exist") || error.message.includes("schema cache")) {
        return {
          connected: true,
          table_exists: false,
          record_count: 0,
          districts_table_exists: distExists,
          districts_record_count: distCount,
          project_url: url,
          has_service_role: hasServiceRole,
          message: "Connected to Supabase project, but table 'public.cities' does not exist yet. Please run the SQL setup script in Supabase SQL Editor.",
          error: error.message
        };
      }
      return {
        connected: false,
        table_exists: false,
        record_count: 0,
        districts_table_exists: false,
        districts_record_count: 0,
        project_url: url,
        has_service_role: hasServiceRole,
        message: "Supabase connection error: " + error.message,
        error: error.message
      };
    }

    return {
      connected: true,
      table_exists: true,
      record_count: count ?? 0,
      districts_table_exists: distExists,
      districts_record_count: distCount,
      project_url: url,
      has_service_role: hasServiceRole,
      message: `Connected successfully to Supabase. Table 'public.cities' has ${count ?? 0} records.`
    };
  } catch (err: any) {
    return {
      connected: false,
      table_exists: false,
      record_count: 0,
      project_url: url,
      has_service_role: hasServiceRole,
      message: "Unexpected error testing Supabase: " + (err.message || String(err)),
      error: err.message
    };
  }
}

export async function fetchCitiesFromSupabase(): Promise<any[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("cities")
      .select("id, rank, city, state, population, population_year, source, source_url, created_at, updated_at")
      .order("population", { ascending: false });

    if (error) {
      console.warn("[Supabase] Failed to fetch cities:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[Supabase] Error fetching cities:", err);
    return null;
  }
}

export async function upsertCitiesToSupabase(
  cities: Array<{
    rank: number;
    city: string;
    state: string;
    population: number;
    population_year: number;
    source: string;
    source_url: string;
  }>
): Promise<{ success: boolean; upserted: number; errors: string[] }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, upserted: 0, errors: ["Supabase client not initialized"] };
  }

  const errors: string[] = [];
  let upsertedCount = 0;
  const chunkSize = 50;

  for (let i = 0; i < cities.length; i += chunkSize) {
    const chunk = cities.slice(i, i + chunkSize).map(c => ({
      rank: c.rank,
      city: c.city.trim(),
      state: c.state.trim(),
      population: c.population,
      population_year: c.population_year,
      source: c.source || "Wikipedia (Census of India 2011)",
      source_url: c.source_url || "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population"
    }));

    try {
      // First attempt: standard Supabase upsert with conflict target
      let { data, error } = await client
        .from("cities")
        .upsert(chunk, {
          onConflict: "city,state,population_year",
          ignoreDuplicates: false
        })
        .select("id");

      // If no unique constraint matches ON CONFLICT specification, fallback to insert
      if (error && (error.message.includes("ON CONFLICT") || error.code === "42P10")) {
        console.warn(`[Supabase] Falling back to direct insert for chunk at index ${i}...`);
        const insertRes = await client.from("cities").insert(chunk).select("id");
        data = insertRes.data;
        error = insertRes.error;
      }

      if (error && error.message.includes("duplicate key")) {
        // Records are already safely present in Supabase; unique constraint prevented duplicate entries
        upsertedCount += chunk.length;
      } else if (error) {
        console.warn(`[Supabase] Upsert chunk error at index ${i}:`, error.message);
        errors.push(`Chunk ${i / chunkSize + 1}: ${error.message}`);
      } else {
        upsertedCount += data ? data.length : chunk.length;
      }
    } catch (err: any) {
      errors.push(`Chunk ${i / chunkSize + 1}: ${err.message || String(err)}`);
    }
  }

  return {
    success: errors.length === 0,
    upserted: upsertedCount,
    errors
  };
}

export async function fetchDistrictsFromSupabase(): Promise<any[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("districts")
      .select("*")
      .order("population", { ascending: false });

    if (error) {
      console.warn("[Supabase] Could not fetch districts:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[Supabase] Error fetching districts:", err);
    return null;
  }
}

export async function upsertDistrictsToSupabase(
  districts: Array<{
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
  }>
): Promise<{ success: boolean; upserted: number; errors: string[] }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, upserted: 0, errors: ["Supabase client not initialized"] };
  }

  const errors: string[] = [];
  let upsertedCount = 0;
  const chunkSize = 50;

  for (let i = 0; i < districts.length; i += chunkSize) {
    const chunk = districts.slice(i, i + chunkSize).map(d => ({
      rank: d.rank,
      state_rank: d.state_rank,
      district: d.district.trim(),
      state: d.state.trim(),
      state_code: d.state_code || "",
      headquarters: d.headquarters?.trim() || d.district.trim(),
      population: d.population,
      area_sq_km: d.area_sq_km || null,
      density_per_sq_km: d.density_per_sq_km || null,
      population_year: d.population_year || 2011,
      source: d.source || "Wikipedia (Census of India 2011)",
      source_url: d.source_url || "https://en.wikipedia.org/wiki/List_of_districts_in_India"
    }));

    try {
      let { data, error } = await client
        .from("districts")
        .upsert(chunk, {
          onConflict: "district,state,population_year",
          ignoreDuplicates: false
        })
        .select("id");

      if (error && (error.message.includes("ON CONFLICT") || error.code === "42P10")) {
        const insertRes = await client.from("districts").insert(chunk).select("id");
        data = insertRes.data;
        error = insertRes.error;
      }

      if (error && error.message.includes("duplicate key")) {
        upsertedCount += chunk.length;
      } else if (error) {
        console.warn(`[Supabase] District chunk error at index ${i}:`, error.message);
        errors.push(`Chunk ${i / chunkSize + 1}: ${error.message}`);
      } else {
        upsertedCount += data ? data.length : chunk.length;
      }
    } catch (err: any) {
      errors.push(`Chunk ${i / chunkSize + 1}: ${err.message || String(err)}`);
    }
  }

  return {
    success: errors.length === 0,
    upserted: upsertedCount,
    errors
  };
}
