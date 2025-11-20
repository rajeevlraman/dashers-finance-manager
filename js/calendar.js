// calendar.js
import { getAllItems, STORE_NAMES } from './db.js';

let currentYear, currentMonth;

export async function initCalendarUI(year = null, month = null) {
  const mainContent = document.getElementById('mainContent');
  const bills = await getAllItems(STORE_NAMES.bills);

  const today = new Date();
  currentYear = year !== null ? year : today.getFullYear();
  currentMonth = month !== null ? month : today.getMonth(); // 0‑based

  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const startWeekday = firstOfMonth.getDay();

  const monthLabel = `${firstOfMonth.toLocaleString('default', { month: 'long' })} ${currentYear}`;

  let html = `
    <h2>Bill Calendar</h2>
    <div class="calendar-controls">
      <button class="button" id="prevMonth">⬅️ Prev</button>
      <strong>${monthLabel}</strong>
      <button class="button" id="nextMonth">Next ➡️</button>
    </div>
    <table class="calendar">
      <thead><tr>
        <th>Sun</th><th>Mon</th><th>Tue</th>
        <th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
      </tr></thead>
      <tbody><tr>
  `;

  // empty cells for days before first of month
  for (let i = 0; i < startWeekday; i++) {
    html += `<td></td>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayBills = bills.filter(b => b.dueDate === dateStr);
    const cls = dayBills.length
      ? (dayBills.some(b => !b.paid && b.dueDate < dateStr) ? 'overdue' : 'due')
      : '';

    html += `
      <td class="${cls}" data-date="${dateStr}">
        <div class="date-number">${day}</div>
        ${dayBills.length ? `<div class="badge">${dayBills.length}</div>` : ''}
      </td>
    `;

    if ((startWeekday + day) % 7 === 0 && day < daysInMonth) {
      html += `</tr><tr>`;
    }
  }

  html += `</tr></tbody></table>
    <div id="dayBillsList"></div>
  `;

  mainContent.innerHTML = html;

  // Attach listeners
  document.getElementById('prevMonth').addEventListener('click', () => {
    const prev = new Date(currentYear, currentMonth - 1);
    initCalendarUI(prev.getFullYear(), prev.getMonth());
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    const next = new Date(currentYear, currentMonth + 1);
    initCalendarUI(next.getFullYear(), next.getMonth());
  });

  document.querySelectorAll('.calendar td.due, .calendar td.overdue').forEach(cell => {
    cell.addEventListener('click', () => {
      const dateStr = cell.getAttribute('data-date');
      showBillsForDate(dateStr, bills);
    });
  });
}

function showBillsForDate(dateStr, bills) {
  const listDiv = document.getElementById('dayBillsList');
  const list = bills.filter(b => b.dueDate === dateStr);
  if (!list.length) {
    listDiv.innerHTML = `<p>No bills due on ${dateStr}</p>`;
    return;
  }
  let html = `<h3>Bills on ${dateStr}</h3><ul>`;
  list.forEach(b => {
    html += `<li>${b.name} – $${b.amount.toFixed(2)} – ${b.paid ? 'Paid ✅' : 'Not Paid ❌'}</li>`;
  });
  html += `</ul>`;
  listDiv.innerHTML = html;
}
