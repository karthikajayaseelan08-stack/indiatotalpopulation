import fs from "fs";
import * as cheerio from "cheerio";

const html = fs.readFileSync("data/raw/wikipedia_districts_raw.html", "utf-8");
const $ = cheerio.load(html);

const tables = $("table.wikitable");
console.log(`Found ${tables.length} wikitables in total.`);

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
    // Check parent's previous
    const parentPrev = $(table).parent().prev();
    const h = parentPrev.find("h2, h3, h4");
    if (h.length) {
      headingText = h.first().text().trim().replace(/\[edit\]/g, "");
    }
  }

  const ths = [];
  $(table).find("tr").first().find("th").each((_, th) => {
    ths.push($(th).text().trim().replace(/\s+/g, " "));
  });

  const rowCount = $(table).find("tr").length - 1;
  console.log(`Table ${i}: Heading="${headingText}", Rows=${rowCount}, Columns=[${ths.join(", ")}]`);
});

