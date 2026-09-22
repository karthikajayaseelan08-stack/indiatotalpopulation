/**
 * City Comparison Controller Script
 * Populates dropdowns from live cities API, executes comparative analytics,
 * and renders side-by-side Chart.js comparison charts.
 */

let comparisonChartInstance = null;

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN").format(num);
}

// Populate city select options
async function loadCityOptions() {
  try {
    const res = await fetch("/api/cities?limit=200&sort=population&order=desc");
    const json = await res.json();
    if (!json.success) return;

    const selectA = document.getElementById("selectCityA");
    const selectB = document.getElementById("selectCityB");

    json.data.forEach(c => {
      const optA = document.createElement("option");
      optA.value = c.city;
      optA.textContent = `${c.city} (${c.state}) — Pop: ${formatNumber(c.population)}`;
      selectA.appendChild(optA);

      const optB = document.createElement("option");
      optB.value = c.city;
      optB.textContent = `${c.city} (${c.state}) — Pop: ${formatNumber(c.population)}`;
      selectB.appendChild(optB);
    });

    // Default selection: Mumbai and Delhi
    selectA.value = "Mumbai";
    selectB.value = "Delhi";
    executeComparison();
  } catch (err) {
    console.error("Failed to load comparison dropdowns:", err);
  }
}

async function executeComparison() {
  const cityA = document.getElementById("selectCityA").value;
  const cityB = document.getElementById("selectCityB").value;

  const resultArea = document.getElementById("comparisonResultArea");
  const promptCard = document.getElementById("comparisonPromptCard");

  if (!cityA || !cityB) {
    resultArea.classList.add("d-none");
    promptCard.classList.remove("d-none");
    return;
  }

  promptCard.classList.add("d-none");
  resultArea.classList.remove("d-none");

  try {
    const res = await fetch(`/api/compare?city1=${encodeURIComponent(cityA)}&city2=${encodeURIComponent(cityB)}`);
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "Comparison failed");
      return;
    }

    const data = json.data;
    const c1 = data.city1;
    const c2 = data.city2;

    // Metric Summary Cards
    document.getElementById("diffPopulationVal").textContent = formatNumber(data.population_difference);
    document.getElementById("largerCityNote").textContent = `${data.larger_city} has higher recorded population`;
    document.getElementById("diffPercentVal").textContent = `${data.percentage_difference}%`;
    document.getElementById("ratioNote").textContent = `Ratio: ${data.ratio}:1`;
    document.getElementById("diffRankVal").textContent = `${data.rank_difference} ranks`;

    // Detailed Table
    document.getElementById("colHeaderCityA").textContent = c1.city;
    document.getElementById("colHeaderCityB").textContent = c2.city;

    document.getElementById("tableCityAName").textContent = c1.city;
    document.getElementById("tableCityBName").textContent = c2.city;

    document.getElementById("tableCityAState").textContent = c1.state;
    document.getElementById("tableCityBState").textContent = c2.state;

    document.getElementById("tableCityAPop").textContent = formatNumber(c1.population);
    document.getElementById("tableCityBPop").textContent = formatNumber(c2.population);

    document.getElementById("tableCityARank").textContent = `#${c1.rank || "—"}`;
    document.getElementById("tableCityBRank").textContent = `#${c2.rank || "—"}`;

    document.getElementById("tableCityAYear").textContent = c1.population_year || 2011;
    document.getElementById("tableCityBYear").textContent = c2.population_year || 2011;

    document.getElementById("tableCityASource").textContent = c1.source;
    document.getElementById("tableCityBSource").textContent = c2.source;

    // Render Side-by-Side Bar Chart
    renderComparisonChart(c1, c2);

  } catch (err) {
    console.error("Comparison execution error:", err);
  }
}

function renderComparisonChart(c1, c2) {
  const ctx = document.getElementById("comparisonChart").getContext("2d");
  if (comparisonChartInstance) {
    comparisonChartInstance.destroy();
  }

  comparisonChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [c1.city, c2.city],
      datasets: [{
        label: "Population (2011 Census)",
        data: [c1.population, c2.population],
        backgroundColor: ["#3b82f6", "#06b6d4"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Population: ${formatNumber(ctx.raw)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val
          }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCityOptions();

  document.getElementById("selectCityA").addEventListener("change", executeComparison);
  document.getElementById("selectCityB").addEventListener("change", executeComparison);

  // Swap button
  document.getElementById("btnSwapCities").addEventListener("click", () => {
    const selA = document.getElementById("selectCityA");
    const selB = document.getElementById("selectCityB");
    const temp = selA.value;
    selA.value = selB.value;
    selB.value = temp;
    executeComparison();
  });
});
