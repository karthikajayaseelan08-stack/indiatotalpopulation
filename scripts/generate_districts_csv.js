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

// Known population estimates for newly carved districts where 2011 table has '-'
const newlyFormedPopulations = {
  "Lepa Rada": 28450,
  "Noney": 38533,
  "Beawar": 852000,
  "Kotputli-Behror": 960000,
  "Phalodi": 750000
};

const tables = $("table.wikitable");
const allDistricts = [];

tables.each((i, table) => {
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

  const match = headingText.match(/^([^(]+?)(?:\s*\(([A-Z]{2})\))?$/);
  if (!match) return;

  const rawState = match[1].trim();
  const stateCode = match[2] || "";

  let state = rawState;
  if (state === "National Capital Territory of Delhi") state = "Delhi";
  if (state === "Andaman and Nicobar") state = "Andaman and Nicobar Islands";

  if (state === "Overview" || state === "Contents" || state === "States" || state === "Union territories") return;

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

    let population = cleanNumber(popRaw);
    if (population === 0 && newlyFormedPopulations[districtName]) {
      population = newlyFormedPopulations[districtName];
    }

    const area = cleanNumber(areaRaw);
    const density = cleanNumber(densityRaw);

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

// Sort by population descending
allDistricts.sort((a, b) => b.population - a.population);

// Assign national rank
allDistricts.forEach((d, index) => {
  d.rank = index + 1;
});

// Group by state and assign state_rank
const stateGroups = {};
allDistricts.forEach(d => {
  if (!stateGroups[d.state]) stateGroups[d.state] = [];
  stateGroups[d.state].push(d);
});

Object.values(stateGroups).forEach(group => {
  group.sort((a, b) => b.population - a.population);
  group.forEach((d, idx) => {
    d.state_rank = idx + 1;
  });
});

// Save to CSV
const csvHeaders = [
  "rank",
  "state_rank",
  "district",
  "state",
  "state_code",
  "headquarters",
  "population",
  "area_sq_km",
  "density_per_sq_km",
  "population_year",
  "source",
  "source_url"
];

const csvRows = [
  csvHeaders.join(","),
  ...allDistricts.map(d => [
    d.rank,
    d.state_rank,
    `"${d.district.replace(/"/g, '""')}"`,
    `"${d.state.replace(/"/g, '""')}"`,
    `"${d.state_code}"`,
    `"${d.headquarters.replace(/"/g, '""')}"`,
    d.population,
    d.area_sq_km,
    d.density_per_sq_km,
    d.population_year,
    `"${d.source}"`,
    `"${d.source_url}"`
  ].join(","))
];

fs.writeFileSync("data/districts.csv", csvRows.join("\n"), "utf-8");
console.log(`Saved ${allDistricts.length} districts to data/districts.csv`);
console.log(`Top 5 populous districts in India:`);
console.table(allDistricts.slice(0, 5).map(d => ({
  rank: d.rank,
  district: d.district,
  state: d.state,
  population: d.population.toLocaleString(),
  density: d.density_per_sq_km
})));
