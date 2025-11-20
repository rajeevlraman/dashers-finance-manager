import { getAllItems, STORE_NAMES } from './db.js';
console.log('initReportsUI running');

let activeCharts = []; // 🧹 Track charts so we can destroy them safely

export function initReportsUI() {
  const mainContent = document.getElementById('mainContent');

  mainContent.innerHTML = `
    <h2>Reports</h2>
    <div class="charts">

      <div>
        <h3>Expenses by Main Category</h3>
        <canvas id="catChart" height="250"></canvas>
        <button class="button" id="backToMain" style="display:none;">⬅️ Back</button>
        <button class="button" onclick="downloadChart('catChart', 'Expenses_by_Category')">📥 Download</button>
      </div>

      <div>
        <h3>Cash Flow Over Time</h3>
        <canvas id="flowChart" height="250"></canvas>
        <button class="button" onclick="downloadChart('flowChart', 'Cash_Flow')">📥 Download</button>
      </div>

      <div>
        <h3>Monthly Income vs Expense</h3>
        <canvas id="monthBarChart" height="250"></canvas>
        <button class="button" onclick="downloadChart('monthBarChart', 'Monthly_Income_vs_Expense')">📥 Download</button>
      </div>

      <div>
        <h3>Income & Expense by Main Category</h3>
        <label>Select Month:
          <select id="monthSelect"></select>
        </label>
        <canvas id="monthCategoryChart" height="250"></canvas>
        <button class="button" onclick="downloadChart('monthCategoryChart', 'Category_Breakdown_By_Month')">📥 Download</button>
      </div>

    </div>
  `;

  renderCharts();
}

async function renderCharts() {
  const [transactions, categories] = await Promise.all([
    getAllItems(STORE_NAMES.transactions),
    getAllItems(STORE_NAMES.categories)
  ]);

  // 🧹 Destroy old charts before redrawing
  activeCharts.forEach(ch => { try { ch.destroy(); } catch {} });
  activeCharts = [];

  // 🧭 Helper: find main category
  const getMainCategory = id => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return null;
    return cat.parentId
      ? categories.find(p => p.id === cat.parentId) || cat
      : cat;
  };

  // 🧩 Handle no transactions
  if (!transactions.length) {
    console.warn("No transactions found for reports.");
    document.getElementById('mainContent').innerHTML += `
      <p style="color:gray;margin-top:1rem;">📉 No transactions yet. Add some to see reports.</p>`;
    return;
  }

  // === 1️⃣ Expenses by Main Category (with drill-down) ===
  const expenseTx = transactions.filter(t => t.type === 'expense');
  const grouped = {};
  expenseTx.forEach(t => {
    const mainCat = getMainCategory(t.categoryId);
    const mainName = mainCat?.name || 'Uncategorized';
    grouped[mainName] = (grouped[mainName] || 0) + t.amount;
  });

  const catChartCanvas = document.getElementById('catChart');
  let catChart;
  const backBtn = document.getElementById('backToMain');
  const mainLabels = Object.keys(grouped);
  const mainValues = Object.values(grouped);

  function drawMainExpenseChart() {
    if (catChart) { try { catChart.destroy(); } catch {} }
    catChart = new Chart(catChartCanvas, {
      type: 'doughnut',
      data: {
        labels: mainLabels,
        datasets: [{
          data: mainValues,
          backgroundColor: mainLabels.map(() => randomColor())
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: 'Expenses by Main Category' },
          legend: { position: 'bottom' }
        },
        onClick: (e, elements) => {
          if (elements.length) {
            const idx = elements[0].index;
            const clickedMain = mainLabels[idx];
            drillDownToSubcategories(clickedMain);
          }
        }
      }
    });
    activeCharts.push(catChart);
  }

  function drillDownToSubcategories(mainName) {
    const mainCat = categories.find(c => c.name === mainName && !c.parentId);
    if (!mainCat) return;
    const subCats = categories.filter(c => c.parentId === mainCat.id);
    if (subCats.length === 0) {
      alert(`No subcategories under "${mainName}"`);
      return;
    }

    const subs = {};
    expenseTx
      .filter(t => subCats.some(s => s.id === t.categoryId))
      .forEach(t => {
        const sub = categories.find(c => c.id === t.categoryId);
        if (!sub) return;
        subs[sub.name] = (subs[sub.name] || 0) + t.amount;
      });

    if (catChart) { try { catChart.destroy(); } catch {} }
    catChart = new Chart(catChartCanvas, {
      type: 'pie',
      data: {
        labels: Object.keys(subs),
        datasets: [{
          data: Object.values(subs),
          backgroundColor: Object.keys(subs).map(() => randomColor())
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: `Subcategory Breakdown: ${mainName}` },
          legend: { position: 'bottom' }
        }
      }
    });
    backBtn.style.display = 'inline-block';
    activeCharts.push(catChart);
  }

  drawMainExpenseChart();
  backBtn.addEventListener('click', () => {
    drawMainExpenseChart();
    backBtn.style.display = 'none';
  });

  // === 2️⃣ Cash Flow Over Time ===
  const flow = {};
  transactions.forEach(t => {
    const date = new Date(t.date).toISOString().slice(0, 10);
    flow[date] = (flow[date] || 0) + (t.type === 'income' ? t.amount : -t.amount);
  });

  const sortedDates = Object.keys(flow).sort();
  const cumulative = [];
  let running = 0;
  for (let date of sortedDates) {
    running += flow[date];
    cumulative.push(running);
  }

  const flowChart = new Chart(document.getElementById('flowChart'), {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Net Cash Flow',
        data: cumulative,
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46,204,113,0.2)',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
  activeCharts.push(flowChart);

  // === 3️⃣ Monthly Income vs Expense ===
  const monthly = {};
  transactions.forEach(tx => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
    monthly[key][tx.type] += tx.amount;
  });

  const months = Object.keys(monthly).sort();
  const incomeData = months.map(m => monthly[m].income);
  const expenseData = months.map(m => monthly[m].expense);

  const monthBarChart = new Chart(document.getElementById('monthBarChart'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Income', data: incomeData, backgroundColor: '#2ecc71' },
        { label: 'Expense', data: expenseData, backgroundColor: '#e74c3c' }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Monthly Income vs Expense' },
        legend: { position: 'bottom' }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
  activeCharts.push(monthBarChart);

  // === 4️⃣ Monthly Category Breakdown (simplified) ===
  const monthSelect = document.getElementById('monthSelect');
  const monthCategoryCanvas = document.getElementById('monthCategoryChart');
  let monthChart;

  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });

  const defaultMonth = months.at(-1);
  monthSelect.value = defaultMonth;
  drawMonthlyCategoryChart(defaultMonth);

  monthSelect.addEventListener('change', e => drawMonthlyCategoryChart(e.target.value));

  function drawMonthlyCategoryChart(selectedMonth) {
    if (monthChart) { try { monthChart.destroy(); } catch {} }

    const txInMonth = transactions.filter(tx => tx.date?.startsWith(selectedMonth));
    const sums = {};
    txInMonth.forEach(tx => {
      const mainCat = getMainCategory(tx.categoryId);
      const name = mainCat?.name || 'Uncategorized';
      if (!sums[name]) sums[name] = { income: 0, expense: 0 };
      sums[name][tx.type] += tx.amount;
    });

    const labels = Object.keys(sums);
    const incomeVals = labels.map(l => sums[l].income);
    const expenseVals = labels.map(l => sums[l].expense);

    monthChart = new Chart(monthCategoryCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: incomeVals, backgroundColor: '#27ae60' },
          { label: 'Expense', data: expenseVals, backgroundColor: '#c0392b' }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: `Category Breakdown – ${selectedMonth}` },
          legend: { position: 'bottom' }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
    activeCharts.push(monthChart);
  }
}

// 🎨 Random color generator
function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h},70%,60%)`;
}

// 📥 Chart download helper
window.downloadChart = function (canvasId, filename = 'chart') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return alert('Chart not found');
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${filename}.png`;
  link.click();
};
