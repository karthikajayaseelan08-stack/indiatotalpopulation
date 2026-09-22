/**
 * Type Definitions for Indian Cities Population Analytics System
 */

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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AnalyticsSummary {
  total_cities: number;
  total_population: number;
  average_population: number;
  median_population: number;
  states_count?: number;
  highest_city: CityRecord | null;
  lowest_city: CityRecord | null;
  population_year?: number;
  source?: string;
  source_url?: string;
  distribution: {
    megacities_10m_plus: number;
    tier1_5m_to_10m: number;
    major_1m_to_5m: number;
    mid_500k_to_1m: number;
    emerging_sub_500k: number;
  };
}

export interface DistrictAnalyticsSummary {
  total_districts: number;
  total_states: number;
  total_population: number;
  average_population: number;
  median_population: number;
  largest_district: DistrictRecord | null;
  smallest_district: DistrictRecord | null;
  densest_district: DistrictRecord | null;
  sparsest_district: DistrictRecord | null;
  tier_distribution: {
    megadistricts_5m_plus: number;
    large_2m_to_5m: number;
    mid_1m_to_2m: number;
    small_sub_1m: number;
  };
}

export interface StateDetail {
  state: string;
  state_code: string;
  district_count: number;
  city_count: number;
  total_district_population: number;
  average_district_population: number;
  total_city_population: number;
  largest_district: string;
  largest_district_population: number;
  densest_district: string;
  densest_district_density: number;
  districts?: DistrictRecord[];
}

export interface StateAnalytics {
  state: string;
  city_count: number;
  total_population: number;
  average_population: number;
  highest_city: string | null;
  highest_city_population: number | null;
}

export interface ComparisonResult {
  city1: CityRecord;
  city2: CityRecord;
  population_difference: number;
  percentage_difference: number;
  ratio: number;
  larger_city: string;
  rank_difference: number;
}

export interface DistrictComparisonResult {
  district1: DistrictRecord;
  district2: DistrictRecord;
  population_difference: number;
  percentage_difference: number;
  ratio: number;
  larger_district: string;
  rank_difference: number;
  density_difference?: number;
  area_difference?: number;
}

export interface StateComparisonResult {
  state1: StateDetail;
  state2: StateDetail;
  population_difference: number;
  percentage_difference: number;
  ratio: number;
  larger_state: string;
  district_difference: number;
}

export interface PipelineSummary {
  success: boolean;
  timestamp: string;
  elapsed_seconds: number;
  total_valid_cities: number;
  processing_telemetry: {
    workers_configured: number;
    distinct_threads_active: number;
    active_thread_names: string[];
    records_per_second: number;
  };
  validation_report: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows: number;
    missing_city_values: number;
    missing_state_values: number;
    invalid_population_values: number;
    suspicious_records: number;
  };
  db_summary: {
    inserted: number;
    updated: number;
    unchanged: number;
  };
  csv_path: string;
}
