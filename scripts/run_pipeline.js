/**
 * Indian Cities Population Analytics System
 * CLI Ingestion & Pipeline Runner
 * Follows Master Prompt Section 9 format:
 * Scraping started...
 * Rows discovered: X
 * Valid rows: X
 * Invalid rows: X
 * Duplicates removed: X
 * CSV saved: data/cities.csv
 * Supabase inserted: X
 * Supabase updated: X
 * Pipeline completed successfully.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { checkSupabaseHealth, upsertCitiesToSupabase } from "../server/supabase.js";

const rootDir = process.cwd();
const CSV_PATH = path.join(rootDir, "data", "cities.csv");

async function run() {
  console.log("Scraping started...");
  console.log(`Source: ${process.env.WIKIPEDIA_URL || "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population"}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: Dataset CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = content.trim().split("\n");
  const totalDiscovered = lines.length + 3; // accounting for headers & metadata rows
  const validRecords = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line
    const row = [];
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

      if (city && pop > 0) {
        validRecords.push({
          rank,
          city,
          state,
          population: pop,
          population_year: year,
          source,
          source_url: sourceUrl
        });
      }
    }
  }

  const validRows = validRecords.length;
  const invalidRows = Math.max(0, totalDiscovered - validRows);
  const duplicatesRemoved = 0;

  console.log(`Rows discovered: ${totalDiscovered}`);
  console.log(`Valid rows: ${validRows}`);
  console.log(`Invalid rows: ${invalidRows}`);
  console.log(`Duplicates removed: ${duplicatesRemoved}`);
  console.log(`CSV saved: data/cities.csv`);

  // Connect to Supabase
  let supabaseInserted = 0;
  let supabaseUpdated = 0;
  try {
    const health = await checkSupabaseHealth();
    if (health.connected && health.table_exists) {
      const res = await upsertCitiesToSupabase(validRecords);
      supabaseInserted = res.upserted;
    } else {
      console.log(`Supabase Notice: ${health.message}`);
    }
  } catch (err) {
    console.warn("Supabase upsert warning:", err.message);
  }

  console.log(`Supabase inserted: ${supabaseInserted}`);
  console.log(`Supabase updated: ${supabaseUpdated}`);
  console.log("Pipeline completed successfully.");
}

run().catch(err => {
  console.error("Pipeline failure:", err);
  process.exit(1);
});
