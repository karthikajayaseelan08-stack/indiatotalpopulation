/**
 * Dashboard Controller Script
 * Fetches analytics summaries, feeds Chart.js instances, and coordinates pipeline refreshes.
 */

// Global Chart Instances for safe destruction/recreation
let topCitiesChartInstance = null;
let tierChartInstance = null;
let statePopChartInstance = null;
let stateCityCountChartInstance = null;
let currentTopLimit = 10;

// Utility: Number formatter
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN").format(num);
}

// Utility: Safe API Fetcher
async function fetchApi(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Fetch failed for ${endpoint}:`, err);
    throw err;
  }
}

// 1. Load Metric Summary Cards
async function loadSummaryCards() {
  try {
    const res = await fetchApi("/api/analytics/summary");
    if (!res.success) return;
    const data = res.data;

    document.getElementById("cardTotalCities").textContent = formatNumber(data.total_cities);
    document.getElementById("cardTotalPopulation").textContent = formatNumber(data.total_population);
    document.getElementById("cardAvgPopulation").textContent = formatNumber(data.average_population);
    document.getElementById("cardMedianPopulation").textContent = formatNumber(data.median_population);

    if (data.highest_city) {
      document.getElementById("cardHighestCity").textContent = data.highest_city.city;
      document.getElementById("cardHighestCityState").textContent = 
        `${data.highest_city.state} (${formatNumber(data.highest_city.population)})`;
    }

    renderTierChart(data.distribution);
  } catch (err) {
    console.error("Failed to load summary cards:", err);
  }
}

// 2. Render Top Cities Horizontal Bar Chart
async function renderTopCitiesChart(limit = 10) {
  try {
    const res = await fetchApi(`/api/rankings/top?limit=${limit}`);
    if (!res.success) return;
    const cities = res.data;

    const labels = cities.map(c => c.city);
    const dataValues = cities.map(c => c.population);

    const ctx = document.getElementById("topCitiesChart").getContext("2d");
    if (topCitiesChartInstance) {
      topCitiesChartInstance.destroy();
    }

    topCitiesChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Population (2011 Census)",
          data: dataValues,
          backgroundColor: "#3b82f6",
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: "y",
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
          x: {
            beginAtZero: true,
            ticks: {
              callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("Failed to render top cities chart:", err);
  }
}

// 3. Render Urban Population Tiers Donut Chart
function renderTierChart(distribution) {
  if (!distribution) return;
  const ctx = document.getElementById("tierChart").getContext("2d");
  if (tierChartInstance) {
    tierChartInstance.destroy();
  }

  const labels = [
    "Megacities (10M+)",
    "Tier 1 (5M - 10M)",
    "Major (1M - 5M)",
    "Mid-tier (500k - 1M)",
    "Emerging (< 500k)"
  ];

  const dataValues = [
    distribution.megacities_10m_plus || 0,
    distribution.tier1_5m_to_10m || 0,
    distribution.major_1m_to_5m || 0,
    distribution.mid_500k_to_1m || 0,
    distribution.emerging_sub_500k || 0
  ];

  tierChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: ["#1e3a8a", "#2563eb", "#60a5fa", "#93c5fd", "#cbd5e1"],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw} cities`
          }
        }
      }
    }
  });
}

// 4. Render State Analytics & Charts
async function loadStateAnalytics() {
  try {
    const res = await fetchApi("/api/analytics/states");
    if (!res.success) return;
    const states = res.data;

    // Top 10 states by population for charts
    const topStates = states.slice(0, 10);
    const stateLabels = topStates.map(s => s.state);
    const popData = topStates.map(s => s.total_population);
    const countData = topStates.map(s => s.city_count);

    // State Population Chart
    const ctxPop = document.getElementById("statePopulationChart").getContext("2d");
    if (statePopChartInstance) statePopChartInstance.destroy();
    statePopChartInstance = new Chart(ctxPop, {
      type: "bar",
      data: {
        labels: stateLabels,
        datasets: [{
          label: "Total Urban Population",
          data: popData,
          backgroundColor: "#10b981",
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val
            }
          }
        }
      }
    });

    // State City Count Chart
    const ctxCount = document.getElementById("stateCityCountChart").getContext("2d");
    if (stateCityCountChartInstance) stateCityCountChartInstance.destroy();
    stateCityCountChartInstance = new Chart(ctxCount, {
      type: "bar",
      data: {
        labels: stateLabels,
        datasets: [{
          label: "Number of Cities",
          data: countData,
          backgroundColor: "#8b5cf6",
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });

    // Populate State Table
    const tbody = document.getElementById("statesTableBody");
    tbody.innerHTML = "";
    states.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3 fw-semibold">${s.state}</td>
        <td><span class="badge bg-light text-dark border">${s.city_count}</span></td>
        <td>${formatNumber(s.total_population)}</td>
        <td>${formatNumber(s.average_population)}</td>
        <td class="pe-3"><span class="fw-semibold text-primary">${s.highest_city || "—"}</span></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Failed to load state analytics:", err);
  }
}

// 5. Pipeline Refresh Event Handler
async function handlePipelineRefresh() {
  const btn = document.getElementById("refreshBtn");
  const spinner = document.getElementById("refreshSpinner");
  const btnText = document.getElementById("refreshBtnText");
  const workers = document.getElementById("workerCountSelect").value;
  const alertEl = document.getElementById("pipelineAlert");
  const alertMsg = document.getElementById("pipelineAlertMessage");

  btn.disabled = true;
  spinner.classList.remove("d-none");
  btnText.textContent = "Processing...";

  try {
    const res = await fetchApi("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_workers: parseInt(workers) })
    });

    if (res.success) {
      alertEl.className = "alert alert-success alert-dismissible fade show";
      alertMsg.innerHTML = `
        <strong>Pipeline Complete!</strong> 
        Ingested & verified <strong>${res.data.total_valid_cities} cities</strong> in ${res.data.elapsed_seconds}s 
        using <strong>${res.data.processing_telemetry.distinct_threads_active} active worker threads</strong>.
      `;
      alertEl.classList.remove("d-none");
      
      // Refresh dashboard view
      await loadSummaryCards();
      await renderTopCitiesChart(currentTopLimit);
      await loadStateAnalytics();
    }
  } catch (err) {
    alertEl.className = "alert alert-danger alert-dismissible fade show";
    alertMsg.innerHTML = `<strong>Pipeline Error:</strong> ${err.message}`;
    alertEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    spinner.classList.add("d-none");
    btnText.textContent = "Refresh Pipeline";
  }
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  loadSummaryCards();
  renderTopCitiesChart(10);
  loadStateAnalytics();

  // Top toggle buttons
  document.getElementById("btnTop10").addEventListener("click", function() {
    this.classList.add("active");
    document.getElementById("btnTop20").classList.remove("active");
    currentTopLimit = 10;
    renderTopCitiesChart(10);
  });

  document.getElementById("btnTop20").addEventListener("click", function() {
    this.classList.add("active");
    document.getElementById("btnTop10").classList.remove("active");
    currentTopLimit = 20;
    renderTopCitiesChart(20);
  });

  // Refresh pipeline button
  document.getElementById("refreshBtn").addEventListener("click", handlePipelineRefresh);
});
