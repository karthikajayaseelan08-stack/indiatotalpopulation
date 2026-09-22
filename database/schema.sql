-- ============================================================
-- Indian Cities Population Analytics System
-- Database Schema for MySQL 8+
-- ============================================================

CREATE DATABASE IF NOT EXISTS indian_cities_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE indian_cities_db;

CREATE TABLE IF NOT EXISTS cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rank INT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    population BIGINT NOT NULL,
    population_year INT NULL,
    source VARCHAR(255) NOT NULL,
    source_url VARCHAR(500) NULL,
    scraped_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_city_state UNIQUE (city, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
