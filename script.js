const STORAGE_KEY = "personal_finance_transactions_v1";

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransactions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth();
}

function sameYear(a, b) {
  return a.getFullYear() === b.getFullYear();
}

function recalcSummaries(transactions) {
  const today = new Date();

  let dailyIncome = 0;
  let dailyExpense = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let yearlyIncome = 0;
  let yearlyExpense = 0;

  for (const t of transactions) {
    const d = new Date(t.date);
    const amount = Number(t.amount) || 0;
    const sign = t.type === "expense" ? -1 : 1;

    if (sameDay(d, today)) {
      if (sign > 0) dailyIncome += amount;
      else dailyExpense += amount;
    }

    if (sameMonth(d, today)) {
      if (sign > 0) monthlyIncome += amount;
      else monthlyExpense += amount;
    }

    if (sameYear(d, today)) {
      if (sign > 0) yearlyIncome += amount;
      else yearlyExpense += amount;
    }
  }

  document.getElementById("daily-income").textContent = formatCurrency(dailyIncome);
  document.getElementById("daily-expense").textContent = formatCurrency(dailyExpense);
  document.getElementById("daily-balance").textContent = formatCurrency(dailyIncome - dailyExpense);

  document.getElementById("monthly-income").textContent = formatCurrency(monthlyIncome);
  document.getElementById("monthly-expense").textContent = formatCurrency(monthlyExpense);
  document.getElementById("monthly-balance").textContent = formatCurrency(monthlyIncome - monthlyExpense);

  document.getElementById("yearly-income").textContent = formatCurrency(yearlyIncome);
  document.getElementById("yearly-expense").textContent = formatCurrency(yearlyExpense);
  document.getElementById("yearly-balance").textContent = formatCurrency(yearlyIncome - yearlyExpense);
}

function renderTable(transactions) {
  const tbody = document.getElementById("transactions-body");
  tbody.innerHTML = "";

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const t of sorted) {
    const tr = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(t.date).toLocaleDateString("sr-RS");

    const descCell = document.createElement("td");
    descCell.textContent = t.description;

    const typeCell = document.createElement("td");
    typeCell.textContent = t.type === "income" ? "Prihod" : "Rashod";
    typeCell.className = t.type === "income" ? "tag-income" : "tag-expense";

    const amountCell = document.createElement("td");
    const sign = t.type === "expense" ? "-" : "+";
    amountCell.textContent = `${sign} ${formatCurrency(Number(t.amount) || 0)}`;

    const actionsCell = document.createElement("td");
    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Obriši";
    del.addEventListener("click", () => {
      const idx = transactions.findIndex((x) => x.id === t.id);
      if (idx !== -1) {
        transactions.splice(idx, 1);
        saveTransactions(transactions);
        recalcSummaries(transactions);
        renderTable(transactions);
      }
    });
    actionsCell.appendChild(del);

    tr.appendChild(dateCell);
    tr.appendChild(descCell);
    tr.appendChild(typeCell);
    tr.appendChild(amountCell);
    tr.appendChild(actionsCell);

    tbody.appendChild(tr);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transaction-form");
  const dateInput = document.getElementById("date");
  const descriptionInput = document.getElementById("description");
  const amountInput = document.getElementById("amount");
  const typeInput = document.getElementById("type");
  const clearAllBtn = document.getElementById("clear-all");

  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;

  const transactions = loadTransactions();
  recalcSummaries(transactions);
  renderTable(transactions);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const date = dateInput.value;
    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;

    if (!date || !description || !amount || !type) {
      alert("Molim popuni sva polja i ispravan iznos.");
      return;
    }

    const tx = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      date,
      description,
      amount,
      type,
    };

    transactions.push(tx);
    saveTransactions(transactions);

    recalcSummaries(transactions);
    renderTable(transactions);

    descriptionInput.value = "";
    amountInput.value = "";
    dateInput.value = date;
    typeInput.value = type;
  });

  clearAllBtn.addEventListener("click", () => {
    if (!transactions.length) return;
    const confirmed = confirm("Da li sigurno želiš da obrišeš sve unose?");
    if (!confirmed) return;
    transactions.splice(0, transactions.length);
    saveTransactions(transactions);
    recalcSummaries(transactions);
    renderTable(transactions);
  });
});

