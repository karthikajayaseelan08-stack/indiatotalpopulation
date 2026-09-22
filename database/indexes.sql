-- ============================================================
-- Indian Cities Population Analytics System
-- Indexes for High Performance Queries
-- ============================================================

USE indian_cities_db;

-- Optimized indexes for searching, sorting, and state aggregations
CREATE INDEX IF NOT EXISTS idx_cities_city ON cities (city);
CREATE INDEX IF NOT EXISTS idx_cities_state ON cities (state);
CREATE INDEX IF NOT EXISTS idx_cities_population ON cities (population DESC);
CREATE INDEX IF NOT EXISTS idx_cities_rank ON cities (rank);
CREATE INDEX IF NOT EXISTS idx_cities_state_pop ON cities (state, population DESC);
