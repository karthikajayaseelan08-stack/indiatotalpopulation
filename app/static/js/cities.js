/**
 * Cities Explorer Controller Script
 * Handles search, state filtering, sorting, pagination, and data export.
 */

let currentPage = 1;
let currentLimit = 25;
let currentSearch = "";
let currentState = "All";
let currentSort = "population";
let currentOrder = "desc";
let totalRecords = 0;
let totalPages = 1;

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN").format(num);
}

async function fetchCities() {
  const tbody = document.getElementById("citiesTableBody");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Loading cities...</td></tr>`;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: currentLimit,
      sort: currentSort,
      order: currentOrder
    });
    if (currentSearch.trim()) params.append("search", currentSearch.trim());
    if (currentState && currentState !== "All") params.append("state", currentState);

    const res = await fetch(`/api/cities?${params.toString()}`);
    const json = await res.json();

    if (!json.success) throw new Error(json.error || "Failed to load cities");

    const cities = json.data;
    const pagination = json.pagination;
    totalRecords = pagination.total;
    totalPages = pagination.total_pages;

    renderTable(cities);
    renderPagination(pagination);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger">Error: ${err.message}</td></tr>`;
  }
}

function renderTable(cities) {
  const tbody = document.getElementById("citiesTableBody");
  if (!cities || cities.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No cities matching the criteria were found.</td></tr>`;
    document.getElementById("recordCountText").textContent = "0 cities found";
    return;
  }

  tbody.innerHTML = "";
  cities.forEach(city => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="ps-3 fw-bold text-secondary">#${city.rank || "—"}</td>
      <td class="fw-semibold text-dark">${city.city}</td>
      <td><span class="badge bg-light text-secondary border">${city.state}</span></td>
      <td class="text-end font-monospace fw-bold text-primary">${formatNumber(city.population)}</td>
      <td class="text-center text-muted">${city.population_year || 2011}</td>
      <td class="pe-3 small text-muted text-truncate" style="max-width: 200px;" title="${city.source}">${city.source}</td>
    `;
    tbody.appendChild(tr);
  });

  const startIdx = (currentPage - 1) * currentLimit + 1;
  const endIdx = Math.min(currentPage * currentLimit, totalRecords);
  document.getElementById("recordCountText").textContent = `Showing ${startIdx}–${endIdx} of ${formatNumber(totalRecords)} cities`;
}

function renderPagination(pagination) {
  const container = document.getElementById("paginationControls");
  container.innerHTML = "";
  document.getElementById("paginationSummary").textContent = `Page ${pagination.page} of ${pagination.total_pages}`;

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${pagination.page <= 1 ? "disabled" : ""}`;
  prevLi.innerHTML = `<button class="page-link" aria-label="Previous">«</button>`;
  prevLi.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchCities();
    }
  });
  container.appendChild(prevLi);

  // Numbered pages (window around current page)
  const maxButtons = 5;
  let startPage = Math.max(1, pagination.page - 2);
  let endPage = Math.min(pagination.total_pages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    const li = document.createElement("li");
    li.className = `page-item ${p === pagination.page ? "active" : ""}`;
    li.innerHTML = `<button class="page-link">${p}</button>`;
    const targetPage = p;
    li.addEventListener("click", () => {
      currentPage = targetPage;
      fetchCities();
    });
    container.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${pagination.page >= pagination.total_pages ? "disabled" : ""}`;
  nextLi.innerHTML = `<button class="page-link" aria-label="Next">»</button>`;
  nextLi.addEventListener("click", () => {
    if (currentPage < pagination.total_pages) {
      currentPage++;
      fetchCities();
    }
  });
  container.appendChild(nextLi);
}

async function loadStatesFilter() {
  try {
    const res = await fetch("/api/states");
    const json = await res.json();
    if (json.success) {
      const select = document.getElementById("stateFilterSelect");
      json.data.forEach(state => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.warn("Could not load states list", e);
  }
}

// Export current query view to CSV
async function exportFilteredView() {
  const params = new URLSearchParams({
    page: 1,
    limit: 1000,
    sort: currentSort,
    order: currentOrder
  });
  if (currentSearch.trim()) params.append("search", currentSearch.trim());
  if (currentState && currentState !== "All") params.append("state", currentState);

  const res = await fetch(`/api/cities?${params.toString()}`);
  const json = await res.json();
  if (!json.success || !json.data.length) {
    alert("No records available to export.");
    return;
  }

  const csvRows = [
    ["Rank", "City", "State", "Population", "Census Year", "Source"].join(",")
  ];
  json.data.forEach(c => {
    csvRows.push([
      c.rank,
      `"${c.city}"`,
      `"${c.state}"`,
      c.population,
      c.population_year,
      `"${c.source}"`
    ].join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `indian_cities_export_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

document.addEventListener("DOMContentLoaded", () => {
  loadStatesFilter();
  fetchCities();

  // Search input debounced
  let debounceTimeout = null;
  document.getElementById("citySearchInput").addEventListener("input", (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      currentSearch = e.target.value;
      currentPage = 1;
      fetchCities();
    }, 300);
  });

  // State filter
  document.getElementById("stateFilterSelect").addEventListener("change", (e) => {
    currentState = e.target.value;
    currentPage = 1;
    fetchCities();
  });

  // Sort By
  document.getElementById("sortBySelect").addEventListener("change", (e) => {
    currentSort = e.target.value;
    fetchCities();
  });

  // Sort Order
  document.getElementById("sortOrderSelect").addEventListener("change", (e) => {
    currentOrder = e.target.value;
    fetchCities();
  });

  // Page Size
  document.getElementById("pageSizeSelect").addEventListener("change", (e) => {
    currentLimit = parseInt(e.target.value);
    currentPage = 1;
    fetchCities();
  });

  // Reset Filters
  document.getElementById("btnResetFilters").addEventListener("click", () => {
    document.getElementById("citySearchInput").value = "";
    document.getElementById("stateFilterSelect").value = "All";
    document.getElementById("sortBySelect").value = "population";
    document.getElementById("sortOrderSelect").value = "desc";
    currentSearch = "";
    currentState = "All";
    currentSort = "population";
    currentOrder = "desc";
    currentPage = 1;
    fetchCities();
  });

  // Export Button
  document.getElementById("btnExportFiltered").addEventListener("click", exportFilteredView);
});
