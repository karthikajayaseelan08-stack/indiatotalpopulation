import fs from "fs";
import * as cheerio from "cheerio";

const html = fs.readFileSync("data/raw/wikipedia_districts_raw.html", "utf-8");
const $ = cheerio.load(html);

const cleanText = (str) => {
  if (!str) return "";
  return str
    .replace(/\[\w+\]/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\[citation needed\]/gi, "")
    .replace(/‡|†|\*|#/g, "")
    .trim();
};

const cleanNumber = (str) => {
  if (!str) return 0;
  const cleaned = cleanText(str).replace(/,/g, "").replace(/\s+/g, "");
  const match = cleaned.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const tables = $("table.wikitable");
const allDistricts = [];

tables.each((i, table) => {
  // Find preceding heading
  let prev = $(table).prev();
  let headingText = "";
  while (prev.length && !headingText) {
    if (prev.is("h2, h3, h4")) {
      headingText = prev.text().trim().replace(/\[edit\]/g, "");
    } else {
      const h = prev.find("h2, h3, h4");
      if (h.length) {
        headingText = h.first().text().trim().replace(/\[edit\]/g, "");
      }
    }
    prev = prev.prev();
  }
  if (!headingText) {
    const parentPrev = $(table).parent().prev();
    const h = parentPrev.find("h2, h3, h4");
    if (h.length) {
      headingText = h.first().text().trim().replace(/\[edit\]/g, "");
    }
  }

  // Check if this is a state or UT table
  const match = headingText.match(/^([^(]+?)(?:\s*\(([A-Z]{2})\))?$/);
  if (!match) return;

  const rawState = match[1].trim();
  const stateCode = match[2] || "";

  // Normalize state name
  let state = rawState;
  if (state === "National Capital Territory of Delhi") state = "Delhi";
  if (state === "Andaman and Nicobar") state = "Andaman and Nicobar Islands";

  // Skip overview tables
  if (state === "Overview" || state === "Contents" || state === "States" || state === "Union territories") return;

  // Find column indices from the header row
  const headerCells = [];
  $(table).find("tr").first().find("th").each((_, th) => {
    headerCells.push($(th).text().trim().toLowerCase());
  });

  let distCol = -1;
  let hqCol = -1;
  let popCol = -1;
  let areaCol = -1;
  let densityCol = -1;
  let codeCol = -1;

  headerCells.forEach((header, idx) => {
    if (header.includes("district")) distCol = idx;
    else if (header.includes("headquarter")) hqCol = idx;
    else if (header.includes("population")) popCol = idx;
    else if (header.includes("area")) areaCol = idx;
    else if (header.includes("density")) densityCol = idx;
    else if (header.includes("code")) codeCol = idx;
  });

  // Fallbacks if columns weren't matched exactly
  if (distCol === -1) distCol = 2;
  if (hqCol === -1) hqCol = 3;
  if (popCol === -1) popCol = 4;
  if (areaCol === -1) areaCol = 5;
  if (densityCol === -1) densityCol = 6;

  $(table).find("tr").slice(1).each((_, tr) => {
    const cells = $(tr).find("td, th");
    if (cells.length < 3) return;

    const districtName = cleanText($(cells[distCol] || cells[2] || cells[1]).text());
    const hq = hqCol !== -1 && cells[hqCol] ? cleanText($(cells[hqCol]).text()) : "";
    const popRaw = popCol !== -1 && cells[popCol] ? $(cells[popCol]).text() : "";
    const areaRaw = areaCol !== -1 && cells[areaCol] ? $(cells[areaCol]).text() : "";
    const densityRaw = densityCol !== -1 && cells[densityCol] ? $(cells[densityCol]).text() : "";
    const distCode = codeCol !== -1 && cells[codeCol] ? cleanText($(cells[codeCol]).text()) : "";

    const population = cleanNumber(popRaw);
    const area = cleanNumber(areaRaw);
    const density = cleanNumber(densityRaw);

    // Skip empty or total rows
    if (!districtName || districtName.toLowerCase().includes("total") || districtName.toLowerCase().includes("all districts")) {
      return;
    }

    allDistricts.push({
      district: districtName,
      state: state,
      state_code: stateCode,
      district_code: distCode,
      headquarters: hq || districtName,
      population: population,
      area_sq_km: area,
      density_per_sq_km: density,
      population_year: 2011,
      source: "Wikipedia (Census of India 2011)",
      source_url: "https://en.wikipedia.org/wiki/List_of_districts_in_India"
    });
  });
});

console.log(`Parsed total districts: ${allDistricts.length}`);

// Group by state and report
const stateCounts = {};
allDistricts.forEach(d => {
  stateCounts[d.state] = (stateCounts[d.state] || 0) + 1;
});
console.log(`Total States/UTs covered: ${Object.keys(stateCounts).length}`);
console.log("State counts:", stateCounts);
