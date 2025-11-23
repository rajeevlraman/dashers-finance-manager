import { getAllItems, STORE_NAMES } from './db.js';

export async function initDashboardUI() {
  console.log("✅ initDashboardUI() executing...");
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = '<p>⏳ Loading dashboard...</p>';

  try {
    // === Fetch all core + property data ===
    const [transactions, bills, categories, properties, tenants, loans, maintenance] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.bills),
      getAllItems(STORE_NAMES.categories),
      getAllItems(STORE_NAMES.properties || 'properties').catch(() => []),
      getAllItems(STORE_NAMES.tenants || 'tenants').catch(() => []),
      getAllItems(STORE_NAMES.loans || 'loans').catch(() => []),
      getAllItems(STORE_NAMES.maintenance || 'maintenance').catch(() => [])
    ]);

    // === Financial totals ===
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;

    // === Property-specific calculations (safe defaults) ===
    const totalValue = properties.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0);
    const totalLoan = loans.reduce((sum, l) => sum + (parseFloat(l.currentBalance) || 0), 0);
    const totalRent = tenants.reduce((sum, t) => sum + (parseFloat(t.rent) || 0), 0);
    const maintCost = maintenance.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);
    const avgROI = calcAvgROI(properties, tenants);
    const netPropertyWorth = totalValue - totalLoan;

    // === Get available months from transactions ===
    const uniqueMonths = Array.from(
      new Set(
        transactions.map(t => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
      )
    ).sort();

    const latestMonth = uniqueMonths.at(-1) || new Date().toISOString().slice(0, 7);

    // === Main HTML Layout ===
    mainContent.innerHTML = `
      <h2>Dashboard</h2>
      <div class="summary-cards">
        <div class="card green"><h3>Total Income</h3><p>$${safe(income)}</p></div>
        <div class="card red"><h3>Total Expenses</h3><p>$${safe(expenses)}</p></div>
        <div class="card blue"><h3>Balance</h3><p>$${safe(balance)}</p></div>
      </div>

      <!-- 🏠 Property Summary Row -->
      <div class="summary-cards property-row">
        <div class="card teal"><h3>Total Property Value</h3><p>$${safe(totalValue)}</p></div>
        <div class="card gold"><h3>Rent (Monthly)</h3><p>$${safe(totalRent)}</p></div>
        <div class="card purple"><h3>Loan Balance</h3><p>$${safe(totalLoan)}</p></div>
        <div class="card gray"><h3>Maintenance YTD</h3><p>$${safe(maintCost)}</p></div>
      </div>

      <div class="property-stats">
        <p>🏘️ Properties: <strong>${properties.length}</strong></p>
        <p>👥 Tenants: <strong>${tenants.length}</strong></p>
        <p>📈 Avg ROI: <strong>${avgROI}%</strong></p>
        <p>💎 Net Worth (Properties – Loans): <strong>$${safe(netPropertyWorth)}</strong></p>
      </div>

      <canvas id="summaryChart" height="180"></canvas>

      <div style="margin-top:2rem;">
        <h3>Expenses by Category</h3>
        <label>Select Month:
          <select id="monthSelect">
            ${uniqueMonths.map(m => `<option value="${m}" ${m === latestMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </label>
        <canvas id="expenseByCatChart" height="220"></canvas>
      </div>

      <div style="margin-top:2rem;">
        <h3>Monthly Comparison (Selected vs Previous)</h3>
        <canvas id="monthCompareChart" height="200"></canvas>
      </div>

      <div id="trendContainer" style="margin-top:2rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3>Spending Trend (Income vs Expenses Over Time)</h3>
          <button id="toggleTrend" class="button">📉 Hide</button>
        </div>
        <canvas id="trendChart" height="250" style="transition:all 0.4s ease;"></canvas>
      </div>
    `;

    if (typeof Chart === 'undefined') throw new Error('Chart.js not loaded');

    // === SUMMARY CHART ===
    new Chart(document.getElementById('summaryChart'), {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses', 'Balance', 'Rent'],
        datasets: [{
          label: 'Overview',
          data: [income, expenses, balance, totalRent],
          backgroundColor: ['#2ecc71', '#e74c3c', '#3498db', '#f1c40f']
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });

    // === Setup Chart Containers ===
    let catChart, compareChart, trendChart;
    const ctxCat = document.getElementById('expenseByCatChart');
    const ctxCompare = document.getElementById('monthCompareChart');
    const ctxTrend = document.getElementById('trendChart');
    const monthSelect = document.getElementById('monthSelect');

    // ---------- CATEGORY CHART ----------
    function renderCategoryChart(selectedMonth) {
      const filteredTx = transactions.filter(
        t => t.type === 'expense' && t.date?.startsWith(selectedMonth)
      );
      const expensesByCategory = {};
      filteredTx.forEach(t => {
        const cat = t.categoryId || 'Uncategorized';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
      });

      const catLabels = Object.keys(expensesByCategory).map(
        id => categories.find(c => c.id === id)?.name || 'Other'
      );
      const catData = Object.values(expensesByCategory);
      if (catChart) catChart.destroy();

      catChart = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{ data: catData, backgroundColor: catLabels.map(() => randomColor()) }]
        },
        options: {
          plugins: {
            title: { display: true, text: `Expenses by Category – ${selectedMonth}` },
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // ---------- COMPARISON CHART ----------
    function renderComparisonChart(selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
      const monthlyTotals = {
        [prevMonth]: { income: 0, expense: 0 },
        [selectedMonth]: { income: 0, expense: 0 }
      };

      transactions.forEach(t => {
        const key = t.date?.slice(0, 7);
        if (monthlyTotals[key]) monthlyTotals[key][t.type] += t.amount;
      });

      if (compareChart) compareChart.destroy();

      compareChart = new Chart(ctxCompare, {
        type: 'bar',
        data: {
          labels: ['Income', 'Expenses'],
          datasets: [
            {
              label: prevMonth,
              data: [monthlyTotals[prevMonth].income, monthlyTotals[prevMonth].expense],
              backgroundColor: 'rgba(231,76,60,0.6)'
            },
            {
              label: selectedMonth,
              data: [monthlyTotals[selectedMonth].income, monthlyTotals[selectedMonth].expense],
              backgroundColor: 'rgba(46,204,113,0.6)'
            }
          ]
        },
        options: {
          plugins: {
            title: { display: true, text: `This Month vs Previous (${selectedMonth})` },
            legend: { position: 'bottom' }
          },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // ---------- TREND CHART ----------
    function renderTrendChart() {
      const monthly = {};
      transactions.forEach(t => {
        if (!t.date) return;
        const key = t.date.slice(0, 7);
        if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
        monthly[key][t.type] += t.amount;
      });

      const months = Object.keys(monthly).sort();
      const incomeData = months.map(m => monthly[m].income);
      const expenseData = months.map(m => monthly[m].expense);
      if (trendChart) trendChart.destroy();

      const maxY = Math.max(...incomeData, ...expenseData, 1) * 1.1;

      trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            { label: 'Income', data: incomeData, borderColor: '#2ecc71', fill: false },
            { label: 'Expenses', data: expenseData, borderColor: '#e74c3c', fill: false }
          ]
        },
        options: {
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true, max: maxY } }
        }
      });
    }

    // === Initial Render ===
    renderCategoryChart(latestMonth);
    renderComparisonChart(latestMonth);
    renderTrendChart();

    monthSelect.addEventListener('change', e => {
      const newMonth = e.target.value;
      renderCategoryChart(newMonth);
      renderComparisonChart(newMonth);
    });

    // === Trend Toggle ===
    const toggleBtn = document.getElementById('toggleTrend');
    toggleBtn.addEventListener('click', () => {
      const hidden = ctxTrend.style.display === 'none';
      ctxTrend.style.display = hidden ? 'block' : 'none';
      toggleBtn.textContent = hidden ? '📉 Hide' : '📈 Show';
    });

    console.log("✅ All charts rendered successfully");
  } catch (err) {
    console.error("❌ Dashboard failed:", err);
    mainContent.innerHTML = `<pre style="color:red;">Dashboard Error: ${err.message}</pre>`;
  }
}

// === Helpers ===
function calcAvgROI(properties, tenants) {
  if (!properties.length) return 0;
  const rois = properties.map(p => {
    const t = tenants.find(t => t.propertyId === p.id);
    if (!p.purchasePrice || !t?.rent) return 0;
    return ((t.rent * 12) / p.purchasePrice * 100);
  });
  return (rois.reduce((a, b) => a + b, 0) / rois.length).toFixed(1);
}

function safe(num) {
  return isNaN(num) || num == null ? '0.00' : parseFloat(num).toFixed(2);
}

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h},70%,60%)`;
}
