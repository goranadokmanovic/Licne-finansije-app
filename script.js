const STORAGE_KEY = "personal_finance_transactions_v1";
const CURRENCY_KEY = "personal_finance_currency_v1";

const CURRENCY_SETTINGS = {
  RSD: { locale: "sr-RS", symbol: "RSD" },
  EUR: { locale: "de-DE", symbol: "€" },
  USD: { locale: "en-US", symbol: "$" },
};

let currentCurrency = "RSD";
let transactions = [];
let editingId = null;

const filters = {
  type: "all",
  currency: "all",
  search: "",
};

function setNewDateFromDate(dateObj) {
  const dateInput = document.getElementById("date");
  const daySel = document.getElementById("new-date-day");
  const monthSel = document.getElementById("new-date-month");
  const yearSel = document.getElementById("new-date-year");
  if (!dateInput || !daySel || !monthSel || !yearSel) return;
  const d = dateObj.getDate();
  const m = dateObj.getMonth() + 1;
  const y = dateObj.getFullYear();
  daySel.value = String(d);
  monthSel.value = String(m);
  yearSel.value = String(y);
  const yyyy = String(y);
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function updateNewDateFromSelects() {
  const dateInput = document.getElementById("date");
  const daySel = document.getElementById("new-date-day");
  const monthSel = document.getElementById("new-date-month");
  const yearSel = document.getElementById("new-date-year");
  if (!dateInput || !daySel || !monthSel || !yearSel) return;
  const d = Number(daySel.value);
  const m = Number(monthSel.value);
  const y = Number(yearSel.value);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return;
  const yyyy = String(y);
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function loadCurrency() {
  const stored = localStorage.getItem(CURRENCY_KEY);
  return stored && CURRENCY_SETTINGS[stored] ? stored : "RSD";
}

function saveCurrency(code) {
  if (CURRENCY_SETTINGS[code]) {
    localStorage.setItem(CURRENCY_KEY, code);
  }
}

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

function formatCurrency(value, currencyCode) {
  if (!Number.isFinite(value)) return "0";
  const settings = CURRENCY_SETTINGS[currencyCode] || CURRENCY_SETTINGS.RSD;
  return value.toLocaleString(settings.locale, {
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

  const dayDaySel = document.getElementById("filter-day-day");
  const dayMonthSel = document.getElementById("filter-day-month");
  const dayYearSel = document.getElementById("filter-day-year");
  const monthMonthSel = document.getElementById("filter-month-month");
  const monthYearSel = document.getElementById("filter-month-year");
  const yearSel = document.getElementById("filter-year");

  let refDay = today;
  if (dayDaySel && dayMonthSel && dayYearSel && dayDaySel.value && dayMonthSel.value && dayYearSel.value) {
    const d = Number(dayDaySel.value);
    const m = Number(dayMonthSel.value);
    const y = Number(dayYearSel.value);
    if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(y)) {
      refDay = new Date(y, m - 1, d);
    }
  }

  let refMonth = today;
  if (monthMonthSel && monthYearSel && monthMonthSel.value && monthYearSel.value) {
    const m = Number(monthMonthSel.value);
    const y = Number(monthYearSel.value);
    if (Number.isFinite(m) && Number.isFinite(y)) {
      refMonth = new Date(y, m - 1, 1);
    }
  }

  let refYear = today;
  if (yearSel && yearSel.value) {
    const y = Number(yearSel.value);
    if (Number.isFinite(y)) {
      refYear = new Date(y, 0, 1);
    }
  }

  const dailyIncome = {};
  const dailyExpense = {};
  const monthlyIncome = {};
  const monthlyExpense = {};
  const yearlyIncome = {};
  const yearlyExpense = {};

  for (const t of transactions) {
    const d = new Date(t.date);
    const amount = Number(t.amount) || 0;
    const sign = t.type === "expense" ? -1 : 1;
    const cur = t.currency && CURRENCY_SETTINGS[t.currency] ? t.currency : "RSD";

    if (sameDay(d, refDay)) {
      if (sign > 0) {
        dailyIncome[cur] = (dailyIncome[cur] || 0) + amount;
      } else {
        dailyExpense[cur] = (dailyExpense[cur] || 0) + amount;
      }
    }

    if (sameMonth(d, refMonth)) {
      if (sign > 0) {
        monthlyIncome[cur] = (monthlyIncome[cur] || 0) + amount;
      } else {
        monthlyExpense[cur] = (monthlyExpense[cur] || 0) + amount;
      }
    }

    if (sameYear(d, refYear)) {
      if (sign > 0) {
        yearlyIncome[cur] = (yearlyIncome[cur] || 0) + amount;
      } else {
        yearlyExpense[cur] = (yearlyExpense[cur] || 0) + amount;
      }
    }
  }

  function buildBalanceMap(incomesMap, expensesMap) {
    const balance = {};
    for (const code of Object.keys(CURRENCY_SETTINGS)) {
      const inc = incomesMap[code] || 0;
      const exp = expensesMap[code] || 0;
      if (!inc && !exp) continue;
      balance[code] = inc - exp;
    }
    return balance;
  }

  function renderMultiCurrency(containerId, valuesMap) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";
    let hasAny = false;
    for (const code of Object.keys(CURRENCY_SETTINGS)) {
      const val = valuesMap[code];
      if (!val) continue;
      hasAny = true;
      const row = document.createElement("div");
      row.className = "currency-line";
      const symbol = CURRENCY_SETTINGS[code].symbol;
      row.textContent = `${symbol} ${formatCurrency(val, code)}`;
      el.appendChild(row);
    }
    if (!hasAny) {
      el.textContent = "0";
    }
  }

  const dailyBalance = buildBalanceMap(dailyIncome, dailyExpense);
  const monthlyBalance = buildBalanceMap(monthlyIncome, monthlyExpense);
  const yearlyBalance = buildBalanceMap(yearlyIncome, yearlyExpense);

  const dailyLabel = document.getElementById("daily-label");
  const monthlyLabel = document.getElementById("monthly-label");
  const yearlyLabel = document.getElementById("yearly-label");

  if (dailyLabel) {
    dailyLabel.textContent = `Saldo za dan: ${refDay.toLocaleDateString("sr-RS")}`;
  }

  if (monthlyLabel) {
    const monthNames = [
      "januar",
      "februar",
      "mart",
      "april",
      "maj",
      "jun",
      "jul",
      "avgust",
      "septembar",
      "oktobar",
      "novembar",
      "decembar",
    ];
    const monthText = `${monthNames[refMonth.getMonth()]} ${refMonth.getFullYear()}.`;
    monthlyLabel.textContent = `Saldo za mesec: ${monthText}`;
  }

  if (yearlyLabel) {
    yearlyLabel.textContent = `Saldo za godinu: ${refYear.getFullYear()}.`;
  }

  // daily
  renderMultiCurrency("daily-income", dailyIncome);
  renderMultiCurrency("daily-expense", dailyExpense);
  renderMultiCurrency("daily-balance", dailyBalance);

  // monthly
  renderMultiCurrency("monthly-income", monthlyIncome);
  renderMultiCurrency("monthly-expense", monthlyExpense);
  renderMultiCurrency("monthly-balance", monthlyBalance);

  // yearly
  renderMultiCurrency("yearly-income", yearlyIncome);
  renderMultiCurrency("yearly-expense", yearlyExpense);
  renderMultiCurrency("yearly-balance", yearlyBalance);
}

function applyFilters(list) {
  return list.filter((t) => {
    if (filters.type !== "all" && t.type !== filters.type) {
      return false;
    }
    if (filters.currency !== "all") {
      const cur = t.currency && CURRENCY_SETTINGS[t.currency] ? t.currency : "RSD";
      if (cur !== filters.currency) return false;
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      if (!t.description || !t.description.toLowerCase().includes(term)) return false;
    }
    return true;
  });
}

function renderTable(transactions) {
  const tbody = document.getElementById("transactions-body");
  tbody.innerHTML = "";

  const sorted = applyFilters(
    [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
  );

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
    const txCurrency = t.currency && CURRENCY_SETTINGS[t.currency] ? t.currency : "RSD";
    const symbol = (CURRENCY_SETTINGS[txCurrency] || CURRENCY_SETTINGS.RSD).symbol;
    amountCell.textContent = `${sign} ${symbol} ${formatCurrency(Number(t.amount) || 0, txCurrency)}`;

    const actionsCell = document.createElement("td");
    const edit = document.createElement("button");
    edit.className = "edit-btn";
    edit.textContent = "Izmeni";
    edit.addEventListener("click", () => {
      editingId = t.id;
      const form = document.getElementById("transaction-form");
      const dateInput = document.getElementById("date");
      const descriptionInput = document.getElementById("description");
      const amountInput = document.getElementById("amount");
      const typeInput = document.getElementById("type");
      const currencySelect = document.getElementById("currency");

      dateInput.value = t.date;
      descriptionInput.value = t.description;
      amountInput.value = t.amount;
      typeInput.value = t.type;

      setNewDateFromDate(new Date(t.date));

      if (currencySelect && t.currency && CURRENCY_SETTINGS[t.currency]) {
        currentCurrency = t.currency;
        currencySelect.value = currentCurrency;
        saveCurrency(currentCurrency);
      }

      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.textContent = "Sačuvaj izmene";
      }
    });

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

    actionsCell.appendChild(edit);
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
  const currencySelect = document.getElementById("currency");
  const filterType = document.getElementById("filter-type");
  const filterCurrency = document.getElementById("filter-currency");
  const filterSearch = document.getElementById("filter-search");
  const exportBtn = document.getElementById("export-json");
  const importInput = document.getElementById("import-json");
  const dayDaySel = document.getElementById("filter-day-day");
  const dayMonthSel = document.getElementById("filter-day-month");
  const dayYearSel = document.getElementById("filter-day-year");
  const monthMonthSel = document.getElementById("filter-month-month");
  const monthYearSel = document.getElementById("filter-month-year");
  const yearSel = document.getElementById("filter-year");
  const newDaySel = document.getElementById("new-date-day");
  const newMonthSel = document.getElementById("new-date-month");
  const newYearSel = document.getElementById("new-date-year");

  const today = new Date();

  // inicijalne vrednosti i popunjavanje custom selektora
  const currentYear = today.getFullYear();

  if (dayYearSel && monthYearSel && yearSel) {
    for (let y = currentYear - 10; y <= currentYear + 1; y++) {
      const opt1 = document.createElement("option");
      opt1.value = String(y);
      opt1.textContent = String(y);
      dayYearSel.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = String(y);
      opt2.textContent = String(y);
      monthYearSel.appendChild(opt2);

      const opt3 = document.createElement("option");
      opt3.value = String(y);
      opt3.textContent = String(y);
      yearSel.appendChild(opt3);
    }
    dayYearSel.value = String(currentYear);
    monthYearSel.value = String(currentYear);
    yearSel.value = String(currentYear);
  }

  if (dayMonthSel && monthMonthSel) {
    const monthNamesShort = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    for (let m = 1; m <= 12; m++) {
      const opt1 = document.createElement("option");
      opt1.value = String(m);
      opt1.textContent = monthNamesShort[m - 1];
      dayMonthSel.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = String(m);
      opt2.textContent = monthNamesShort[m - 1];
      monthMonthSel.appendChild(opt2);
    }
    const currentMonth = today.getMonth() + 1;
    dayMonthSel.value = String(currentMonth);
    monthMonthSel.value = String(currentMonth);
  }

  if (dayDaySel) {
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement("option");
      opt.value = String(d);
      opt.textContent = String(d).padStart(2, "0");
      dayDaySel.appendChild(opt);
    }
    dayDaySel.value = String(today.getDate());
  }

  // popuni i selektore za novi unos datuma
  if (newYearSel) {
    for (let y = currentYear - 10; y <= currentYear + 1; y++) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      newYearSel.appendChild(opt);
    }
    newYearSel.value = String(currentYear);
  }

  if (newMonthSel) {
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement("option");
      opt.value = String(m);
      opt.textContent = String(m).padStart(2, "0");
      newMonthSel.appendChild(opt);
    }
    newMonthSel.value = String(today.getMonth() + 1);
  }

  if (newDaySel) {
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement("option");
      opt.value = String(d);
      opt.textContent = String(d).padStart(2, "0");
      newDaySel.appendChild(opt);
    }
    newDaySel.value = String(today.getDate());
  }

  setNewDateFromDate(today);

  currentCurrency = loadCurrency();
  if (currencySelect) {
    currencySelect.value = currentCurrency;
    currencySelect.addEventListener("change", () => {
      currentCurrency = currencySelect.value;
      saveCurrency(currentCurrency);
      recalcSummaries(transactions);
      renderTable(transactions);
    });
  }

  transactions = loadTransactions();
  recalcSummaries(transactions);
  renderTable(transactions);

  const summaryChange = () => recalcSummaries(transactions);

  if (dayDaySel) dayDaySel.addEventListener("change", summaryChange);
  if (dayMonthSel) dayMonthSel.addEventListener("change", summaryChange);
  if (dayYearSel) dayYearSel.addEventListener("change", summaryChange);
  if (monthMonthSel) monthMonthSel.addEventListener("change", summaryChange);
  if (monthYearSel) monthYearSel.addEventListener("change", summaryChange);
  if (yearSel) yearSel.addEventListener("change", summaryChange);

  const newDateChange = () => updateNewDateFromSelects();
  if (newDaySel) newDaySel.addEventListener("change", newDateChange);
  if (newMonthSel) newMonthSel.addEventListener("change", newDateChange);
  if (newYearSel) newYearSel.addEventListener("change", newDateChange);

  if (filterType) {
    filterType.addEventListener("change", () => {
      filters.type = filterType.value;
      renderTable(transactions);
    });
  }

  if (filterCurrency) {
    filterCurrency.addEventListener("change", () => {
      filters.currency = filterCurrency.value;
      renderTable(transactions);
    });
  }

  if (filterSearch) {
    filterSearch.addEventListener("input", () => {
      filters.search = filterSearch.value;
      renderTable(transactions);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!transactions.length) {
        alert("Nema podataka za izvoz.");
        return;
      }
      const blob = new Blob([JSON.stringify(transactions, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "licne-finansije-export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    importInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!Array.isArray(parsed)) throw new Error("Not array");
          const cleaned = parsed
            .map((t) => ({
              id:
                t.id ||
                (crypto.randomUUID
                  ? crypto.randomUUID()
                  : String(Date.now() + Math.random())),
              date: t.date,
              description: t.description,
              amount: Number(t.amount),
              type: t.type === "expense" ? "expense" : "income",
              currency:
                t.currency && CURRENCY_SETTINGS[t.currency]
                  ? t.currency
                  : "RSD",
            }))
            .filter(
              (t) =>
                t.date &&
                t.description &&
                Number.isFinite(t.amount) &&
                (t.type === "income" || t.type === "expense")
            );

          if (!cleaned.length) {
            alert("Nema važećih unosa u fajlu.");
            return;
          }

          transactions.splice(0, transactions.length, ...cleaned);
          saveTransactions(transactions);
          recalcSummaries(transactions);
          renderTable(transactions);
        } catch {
          alert("Neispravan fajl za uvoz.");
        } finally {
          importInput.value = "";
        }
      };
      reader.readAsText(file);
    });
  }

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

    if (editingId) {
      const existing = transactions.find((t) => t.id === editingId);
      if (existing) {
        existing.date = date;
        existing.description = description;
        existing.amount = amount;
        existing.type = type;
        existing.currency = currentCurrency;
      }
    } else {
      const tx = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        date,
        description,
        amount,
        type,
        currency: currentCurrency,
      };
      transactions.push(tx);
    }

    saveTransactions(transactions);

    recalcSummaries(transactions);
    renderTable(transactions);

    editingId = null;
    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.textContent = "Sačuvaj unos";
    }

    descriptionInput.value = "";
    amountInput.value = "";
    setNewDateFromDate(new Date(date));
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

