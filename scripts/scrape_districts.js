import fs from "fs";
import * as cheerio from "cheerio";

async function main() {
  const url = "https://en.wikipedia.org/wiki/List_of_districts_in_India";
  console.log("Fetching", url);
  const resp = await fetch(url, {
    headers: { "User-Agent": "IndianCitiesPopulationAnalytics/1.0 (Census Research)" }
  });
  const html = await resp.text();
  console.log("Fetched HTML length:", html.length);
  fs.writeFileSync("data/raw/wikipedia_districts_raw.html", html);

  const $ = cheerio.load(html);
  const headings = [];
  $("h2, h3").each((_, el) => {
    const text = $(el).text().trim().replace(/\[edit\]/g, "");
    if (text) headings.push(text);
  });
  console.log("Found headings:", headings.slice(0, 45));
}

main().catch(console.error);
