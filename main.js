import {
  fmtEUR,
  monthNames,
  todayISO,
  toMonthKey,
  parseAmountToCents,
  centsToEUR
} from './core-utils.js';

import {
  CATEGORIES,
  CATEGORY_BY_ID,
  CHART_COLORS,
  COLOR_HISTORY_INCOME,
  COLOR_HISTORY_EXPENSE,
  COLOR_HISTORY_BALANCE
} from './categories.js';

import {
  initTransactionsListener,
  saveTransaction,
  deleteTransaction,
  isTransactionsReady
} from './transactions-service.js';

import {
  initAccountsListener,
  ensureDefaultAccounts,
  updateAccountOpeningBalance,
  DEFAULT_ACCOUNT_IDS
} from './accounts-service.js';

// ===== SPLASH CONTROL =====
function hideSplash() {
  const sp = document.getElementById('splash');
  if (!sp) return;
  sp.classList.add('hide');   // solo ocultar, sin eliminar
}

function showSplash() {
  const sp = document.getElementById('splash');
  if (!sp) return;
  sp.classList.remove('hide'); // mostrar como overlay/spinner
}

/**
 * @typedef {Object} InternalTx
 * @property {string} id
 * @property {'income'|'expense'|'transfer'} type
 * @property {number} amountCents       // céntimos
 * @property {string} categoryId
 * @property {string} date              // ISO YYYY-MM-DD
 * @property {string} [merchant]
 * @property {string|null} [accountId]
 * @property {string|null} [fromAccountId]
 * @property {string|null} [toAccountId]
 * @property {string} [paymentCard]
 * @property {string} [note]
 * @property {'manual'|'apple_pay'|'ocr'|'import'} [source]
 * @property {{freq: 'monthly'|'weekly', endsOn: (string|null)}|null} [recurring]
 */


// =============================
// 2. Estado global y referencias DOM
// =============================

/** @type {{
 *   month: string,
 *   txs: InternalTx[],
 *   accounts: any[],
 *   chartExpenses: any,
 *   chartIncome: any,
 *   activeChartIndex: number,
 *   chartHistory: any
 * }} */
const state = {
  month: toMonthKey(new Date()),
  txs: [],
  accounts: [],
  chartExpenses: null,
  chartIncome: null,
  activeChartIndex: 0,
  chartHistory: null
};

window.__state = state;

const APP_VERSION = 'v1.0.7';

const el = {
  // Cabecera / toolbar
  monthLabel:   document.getElementById('currentMonth'),
  btnPrevMonth: document.getElementById('prevMonth'),
  btnNextMonth: document.getElementById('nextMonth'),
  btnMenu:      document.getElementById('btnMenu'),
  toolbarMenu:  document.getElementById('toolbarMenu'),

  // Resumen + lista
  txList:         document.getElementById('txList'),
  emptyState:     document.getElementById('emptyState') || document.querySelector('.empty'),
  totalsIncome:   document.getElementById('incomeTotal'),
  totalsExpense:  document.getElementById('expenseTotal'),
  totalsBalance:  document.getElementById('balance'),
  donutCarousel:  document.getElementById('chartCarousel'),
  donutExpenses:  document.getElementById('chartDonutExpenses'),
  donutIncome:    document.getElementById('chartDonutIncome'),
  donutDots:      Array.from(document.querySelectorAll('.chart-dots .dot')),
  chartEmpty:    document.getElementById('chartEmpty'),
  wealthCard:     document.getElementById('wealthCard'),
  wealthTotal:    document.getElementById('wealthTotal'),
  wealthBreakdown: document.getElementById('wealthBreakdown'),

  // FAB + diálogo de movimiento
  fabAdd:       document.getElementById('fabAdd'),
  dlgTx:        document.getElementById('dlgTx'),
  form:         document.getElementById('txForm'),
  dlgTitle:     document.getElementById('dlgTitle'),
  btnDeleteTx:  document.getElementById('btnDeleteTx'), // si no existe será null, no pasa nada si usas ?.addEventListener
  btnCancelTx:  document.getElementById('btnCancelTx'),

  // Campos del formulario
  inputAmount:      document.getElementById('amount'),
  inputDate:        document.getElementById('date'),
  selectCategory:   document.getElementById('category'),
  inputMerchant:    document.getElementById('merchant'),
  merchantSuggestions: document.getElementById('merchantSuggestions'),
  selectAccount:    document.getElementById('account'),
  inputPaymentCard: document.getElementById('paymentCard'),
  inputNote:        document.getElementById('note'),
  radioIncome:      document.getElementById('typeIncome'),
  radioExpense:     document.getElementById('typeExpense'),
  radioTransfer:    document.getElementById('typeTransfer'),
  merchantField:    document.getElementById('merchantField'),
  accountField:     document.getElementById('accountField'),
  categoryField:    document.getElementById('categoryField'),
  recurringField:   document.getElementById('recurringField'),
  transferFields:   document.getElementById('transferFields'),
  selectFromAccount: document.getElementById('fromAccount'),
  selectToAccount:   document.getElementById('toAccount'),
  recurringFreq:    document.getElementById('recurringFreq'),
  recurringEndsOn:  document.getElementById('recurringEndsOn'),

  // Export / import JSON
  btnExport:      document.getElementById('btnExport'),
  btnExportCSV:   document.getElementById('btnExportCSV'),
  fileImport:     document.getElementById('fileImport'),

  // OCR
  btnOcr:       document.getElementById('btnOcr'),
  ocrFiles:     document.getElementById('ocrFiles'),
  dlgOcr:       document.getElementById('dlgOcr'),
  ocrStatus:    document.getElementById('ocrStatus'),
  ocrPreview:   document.getElementById('ocrPreview'),
  ocrImport:    document.getElementById('ocrImport'),
  ocrCancel:    document.getElementById('ocrCancel'),

  // Auth
  authDialog:   document.getElementById('authDialog'),
  authForm:     document.getElementById('authForm'),
  authEmail:    document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmit:   document.getElementById('authSubmit'),
  authCancel:   document.getElementById('authCancel'),
  toggleMode:   document.getElementById('toggleMode'),
  authInfo:     document.getElementById('authInfo'),
  appVersion:   document.getElementById('appVersion'),

  // Diálogo borrar
  dlgConfirmDelete: document.getElementById('dlgConfirm'),
  btnConfirmDelete: document.getElementById('btnYes'),
  btnCancelDelete:  document.getElementById('btnNo'),

  // Histórico
  dlgHistory:      document.getElementById('dlgHistory'),
  historyCanvas:   document.getElementById('chartHistory'),
  btnOpenHistory:  document.getElementById('btnOpenHistory'),
  btnCloseHistory: document.getElementById('btnCloseHistory'),

  // Cuentas y saldos
  btnAccounts: document.getElementById('btnAccounts'),
  dlgAccounts: document.getElementById('dlgAccounts'),
  accountsBalanceList: document.getElementById('accountsBalanceList'),
  btnCloseAccounts: document.getElementById('btnCloseAccounts'),

  // Patrimonio
  dlgWealth: document.getElementById('dlgWealth'),
  wealthDialogTotal: document.getElementById('wealthDialogTotal'),
  wealthDistribution: document.getElementById('wealthDistribution'),
  wealthChangeAmount: document.getElementById('wealthChangeAmount'),
  wealthChangePct: document.getElementById('wealthChangePct'),
  wealthHistoryCanvas: document.getElementById('chartWealthHistory'),
  wealthAccountsList: document.getElementById('wealthAccountsList'),
  btnCloseWealth: document.getElementById('btnCloseWealth'),
  dlgAccountDetail: document.getElementById('dlgAccountDetail'),
  accountDetailContent: document.getElementById('accountDetailContent'),
  btnCloseAccountDetail: document.getElementById('btnCloseAccountDetail'),
  dlgBalanceAdjustment: document.getElementById('dlgBalanceAdjustment'),
  adjustAccountName: document.getElementById('adjustAccountName'),
  adjustCurrentBalance: document.getElementById('adjustCurrentBalance'),
  adjustRealBalance: document.getElementById('adjustRealBalance'),
  adjustDifference: document.getElementById('adjustDifference'),
  adjustNote: document.getElementById('adjustNote'),
  btnCancelBalanceAdjustment: document.getElementById('btnCancelBalanceAdjustment'),
  btnSaveBalanceAdjustment: document.getElementById('btnSaveBalanceAdjustment')
};

if (el.appVersion) {
  el.appVersion.textContent = APP_VERSION;
}

// Animación del logotipo al entrar (vía transición)
function showLogoWithTransition() {
  const logo = document.querySelector('.brand-logo');
  if (!logo) return;

  // Quitamos por si acaso
  logo.classList.remove('brand-logo--visible');

  // Esperamos al siguiente frame para asegurar que el estilo inicial (opacity 0)
  // se ha aplicado antes de añadir la clase visible → transición garantizada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      logo.classList.add('brand-logo--visible');
    });
  });
}

// Cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  showLogoWithTransition();
});

// Cuando la página vuelve a mostrarse (PWA / volver atrás, etc.)
window.addEventListener('pageshow', () => {
  showLogoWithTransition();
});


// =============================
// 3. Mes visible y helpers UI
// =============================

function updateMonthLabel() {
  const [y, m] = state.month.split('-').map(Number);
  el.monthLabel.textContent = `${monthNames[m - 1]} ${y}`;
}

function changeMonth(delta) {
  const [y, m] = state.month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  state.month = toMonthKey(d);
  updateMonthLabel();
  refreshList();
}

function initCategoryOptions(forType) {
  const txType = forType || (el.radioIncome.checked ? 'income' : 'expense');

  el.selectCategory.innerHTML = '';
  const frag = document.createDocumentFragment();

  CATEGORIES
    .filter(c => c.type === txType)
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.emoji} ${c.name}`;
      frag.appendChild(opt);
    });

  el.selectCategory.appendChild(frag);

  // Categoría por defecto
  if (txType === 'expense') {
    el.selectCategory.value = 'other_exp';
  }
}


// =============================
// Menú hamburguesa de la barra
// =============================
el.btnMenu?.addEventListener('click', (e) => {
  e.stopPropagation();
  el.toolbarMenu?.classList.toggle('toolbar-menu--open');
});

// Cerrar el menú al hacer clic fuera
document.addEventListener('click', (e) => {
  if (!el.toolbarMenu?.classList.contains('toolbar-menu--open')) return;

  // Si hacemos click dentro del menú o en el botón, no cerrar
  if (e.target.closest('#toolbarMenu') || e.target.closest('#btnMenu')) return;

  el.toolbarMenu.classList.remove('toolbar-menu--open');
});


// =============================
// 4. Renderizado principal
// =============================

// Devuelve las transacciones del mes visible
function getVisibleMonthTxs() {
  const [y, m] = state.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last  = new Date(y, m, 0);

  return state.txs.filter((/** @type {InternalTx} */ t) => {
    if (!t.date) return false;
    const d = new Date(t.date + 'T00:00:00');
    return d >= first && d <= last;
  });
}



// Construye la tarjeta HTML de un movimiento
function renderTxCard(tx) {
  const isTransfer = tx.type === 'transfer';
  const fromAccount = isTransfer ? state.accounts.find(a => a.id === tx.fromAccountId) : null;
  const toAccount = isTransfer ? state.accounts.find(a => a.id === tx.toAccountId) : null;
  const cat = isTransfer
    ? { name: 'Transferencia', emoji: '↔️' }
    : (CATEGORY_BY_ID[tx.categoryId] || {
        name: 'Sin categoría',
        emoji: tx.type === 'income' ? '➕' : '➖'
      });

  const li = document.createElement('li');
  li.className = `tx ${tx.type}`;
  li.dataset.id = tx.id;

  const emojiDiv = document.createElement('div');
  emojiDiv.className = 'emoji';
  emojiDiv.textContent = cat.emoji;

  const mainDiv = document.createElement('div');
  mainDiv.className = 'main';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'title';
  titleDiv.textContent = isTransfer ? 'Transferencia' : (tx.merchant || tx.note || cat.name);

  const subDiv = document.createElement('div');
  subDiv.className = 'sub';

    const d = tx.date
    ? new Date(tx.date + 'T00:00:00')
    : new Date();


  // categoría + fecha en la línea pequeña
  const subParts = isTransfer
    ? [
        `${fromAccount?.name || 'Cuenta'} → ${toAccount?.name || 'Cuenta'}`,
        tx.note || '',
        d.toLocaleDateString('es-ES')
      ].filter(Boolean)
    : [
        cat.name,
        tx.paymentCard,
        tx.merchant ? tx.note : '',
        d.toLocaleDateString('es-ES')
      ].filter(Boolean);

subDiv.textContent = subParts.join(' • ');

  mainDiv.appendChild(titleDiv);
  mainDiv.appendChild(subDiv);

  const amountDiv = document.createElement('div');
  amountDiv.className = 'amount';
  amountDiv.textContent =
    isTransfer ? centsToEUR(tx.amountCents) : ((tx.type === 'expense' ? '-' : '+') + ' ' + centsToEUR(tx.amountCents));

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'actions';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = 'Editar';
  btnEdit.addEventListener('click', () => openEditDialog(tx));

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = 'Eliminar';
  btnDelete.classList.add('danger');
  btnDelete.addEventListener('click', () => openDeleteDialog(tx.id));

  actionsDiv.appendChild(btnEdit);
  actionsDiv.appendChild(btnDelete);

  li.appendChild(emojiDiv);
  li.appendChild(mainDiv);
  li.appendChild(amountDiv);
  li.appendChild(actionsDiv);

  return li;
}


// Render lista + totales + gráfico
function refreshList() {
  const list = getVisibleMonthTxs();
  const hasTx = list.length > 0;
  toggleEmptyState(hasTx);
  // ----- Lista + estado vacío -----
  el.txList.innerHTML = '';
  if (!list.length) {
  } else {
    const frag = document.createDocumentFragment();
    list.forEach(tx => frag.appendChild(renderTxCard(tx)));
    el.txList.appendChild(frag);
  }

  // ----- Totales y agregados por categoría (solo gastos en el donut base) -----
  let inc = 0;
  let exp = 0;
  const byCategory = {};

  for (const tx of list) {
    const amount = tx.amountCents || 0;

    if (tx.type === 'income') {
      // INGRESOS: solo suman al total de ingresos
      inc += amount;
    } else if (tx.type === 'expense') {
      // GASTOS: suman a gastos + donut. Las transferencias quedan fuera.
      exp += amount;
      const catId = tx.categoryId || 'other_exp';
      byCategory[catId] = (byCategory[catId] || 0) + amount;
    }
  }

  el.totalsIncome.textContent  = centsToEUR(inc);
  el.totalsExpense.textContent = centsToEUR(exp);
  el.totalsBalance.textContent = centsToEUR(inc - exp);

  // KPI: porcentaje de ingresos gastados
  const kpi = document.getElementById('kpiSpendRate');
  if (inc > 0) {
    const rate = (exp / inc) * 100;
    kpi.textContent = `Este mes has gastado el ${rate.toFixed(1)}% de tus ingresos`;
  } else {
    kpi.textContent = '';
  }


  // Donut 1: distribución de gastos
  // Donut 2: gastos sobre ingresos (con "Restante")
  renderDonutCharts(byCategory, inc, exp);

  renderWealthCard();

  // Si el diálogo de histórico está abierto, lo refrescamos
  if (el.dlgHistory?.open) {
    renderHistoryChart();
  }
}

function toggleEmptyState(hasTx) {
  // Empty state de la LISTA
  if (el.emptyState) {
    el.emptyState.classList.toggle('hidden', hasTx);
  }

  // Zona de DONUTS
  const showCharts = hasTx;

  if (el.donutCarousel) {
    el.donutCarousel.classList.toggle('hidden', !showCharts);
  }

  if (Array.isArray(el.donutDots)) {
    el.donutDots.forEach(dot => {
      dot.classList.toggle('hidden', !showCharts);
    });
  }

  if (el.chartEmpty) {
    el.chartEmpty.classList.toggle('hidden', showCharts);
  }
}


// Gráficos donut con Chart.js
function renderExpensesDonut(byCategory) {
  if (!el.donutExpenses) return;

  const canvas = el.donutExpenses;
  const ctx = canvas.getContext('2d');

  // Forzar tamaño estable ANTES de crear Chart.js
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetWidth;

  // Destruir el gráfico anterior
  if (state.chartExpenses) {
    state.chartExpenses.destroy();
    state.chartExpenses = null;
  }

  const entries = Object.entries(byCategory).filter(([_, v]) => v > 0);

  if (!entries.length) {
    return;
  }

  const labels = entries.map(([id]) => CATEGORY_BY_ID[id]?.name || 'Otros gastos');
  const values = entries.map(([_, cents]) => Math.round(cents / 100));
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  state.chartExpenses = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#050918',
        borderWidth: 2
      }]
    },
    options: {
      responsive: false, // 👈 importante
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#ffffff' }
        }
      },
      cutout: '50%'
    }
  });
}

function renderIncomeDonut(byCategory, totalIncomeCents, totalExpenseCents) {
  if (!el.donutIncome) return;

  const canvas = el.donutIncome;
  const ctx = canvas.getContext('2d');

  // Forzar tamaño ANTES de crear el Chart
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetWidth;

  if (state.chartIncome) {
    state.chartIncome.destroy();
    state.chartIncome = null;
  }

  const entries = Object.entries(byCategory).filter(([_, v]) => v > 0);

  const labels = [];
  const values = [];

  // Caso A: hay ingresos → usar ingresos como 100%
  if (totalIncomeCents > 0) {
    for (const [catId, cents] of entries) {
      if (!cents) continue;
      const name = CATEGORY_BY_ID[catId]?.name || 'Otros gastos';
      labels.push(name);
      values.push(Math.round(cents / 100));
    }

    labels.push('Restante');
    values.push(Math.round((totalIncomeCents - totalExpenseCents) / 100));
  }
  // Caso B: no hay ingresos pero sí gastos → mostrar solo gastos
  else if (entries.length) {
    for (const [catId, cents] of entries) {
      if (!cents) continue;
      const name = CATEGORY_BY_ID[catId]?.name || 'Otros gastos';
      labels.push(name);
      values.push(Math.round(cents / 100));
    }
  }

  if (!values.length) {
    return;
  }

  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  state.chartIncome = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#050918',
        borderWidth: 2
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#ffffff' }
        }
      },
      cutout: '50%'
    }
  });
}


function renderDonutCharts(byCategory, totalIncomeCents, totalExpenseCents) {
  renderExpensesDonut(byCategory);
  renderIncomeDonut(byCategory, totalIncomeCents, totalExpenseCents);
}


function setActiveChart(index) {
  state.activeChartIndex = index;

  // Mostrar/ocultar cada canvas
  if (el.donutExpenses) {
    el.donutExpenses.classList.toggle('chart-visible', index === 0);
  }
  if (el.donutIncome) {
    el.donutIncome.classList.toggle('chart-visible', index === 1);
  }

  // Actualizar los dots
  if (Array.isArray(el.donutDots)) {
    el.donutDots.forEach((dot, idx) => {
      dot.classList.toggle('dot--active', idx === index);
    });
  }
}

// =============================
// 4.x Histórico de meses
// =============================

// Construye las series para el histórico (últimos N meses con datos,
// pero nunca por encima del mes actual)
function buildHistorySeries(limitMonths = 8) {
  /** @type {Map<string, {income: number, expense: number}>} */
  const buckets = new Map();

  for (const tx of state.txs) {
    if (!tx.date || tx.type === 'transfer') continue;
    const d = new Date(tx.date + 'T00:00:00');
    if (Number.isNaN(d.getTime())) continue;

    const key = toMonthKey(d); // "YYYY-MM"
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { income: 0, expense: 0 };
      buckets.set(key, bucket);
    }

    if (tx.type === 'income') bucket.income += tx.amountCents || 0;
    else if (tx.type === 'expense') bucket.expense += tx.amountCents || 0;
  }

  // Mes actual como límite superior
  const currentMonthKey = toMonthKey(new Date());

  // Nos quedamos solo con meses <= hoy y ordenados
  const keys = Array
    .from(buckets.keys())
    .filter(k => k <= currentMonthKey)   // 👈 evita meses futuros (2026, etc.)
    .sort();

  const lastKeys = keys.slice(-limitMonths); // últimos N meses válidos

  const labels = [];
  const income = [];
  const expense = [];
  const balance = [];

  for (const key of lastKeys) {
    const [y, m] = key.split('-').map(Number);
    const b = buckets.get(key) || { income: 0, expense: 0 };
    const inc = b.income;
    const exp = b.expense;

    labels.push(`${monthNames[m - 1].slice(0, 3)} ${String(y).slice(2)}`); // "Nov 25"
    income.push(inc / 100);
    expense.push(exp / 100);
    balance.push((inc - exp) / 100);
  }

  return { labels, income, expense, balance };
}

function renderHistoryChart() {
  if (!el.historyCanvas) return;

  const { labels, income, expense, balance } = buildHistorySeries(8);

  // Si no hay datos, destruimos el gráfico anterior y listo
  if (!labels.length) {
    if (state.chartHistory) {
      state.chartHistory.destroy();
      state.chartHistory = null;
    }
    return;
  }

  const ctx = el.historyCanvas.getContext('2d');

  if (state.chartHistory) {
    state.chartHistory.destroy();
    state.chartHistory = null;
  }

  state.chartHistory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: income,
          backgroundColor: COLOR_HISTORY_INCOME,
          borderRadius: 4
        },
        {
          label: 'Gastos',
          data: expense,
          backgroundColor: COLOR_HISTORY_EXPENSE,
          borderRadius: 4
        },
        {
          label: 'Saldo',
          data: balance,
          type: 'line',
          borderColor: COLOR_HISTORY_BALANCE,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#e5e7eb' }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: {
            color: '#e5e7eb',
            callback(value) {
              const n = Number(value);
              if (Number.isNaN(n)) return value;
              return n.toLocaleString('es-ES', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }) + ' €';
            }
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#e5e7eb',
            boxWidth: 12,
            boxHeight: 12
          }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y;
              return `${ctx.dataset.label}: ${centsToEUR(Math.round(v * 100))}`;
            }
          }
        }
      }
    }
  });
}


// =============================
// 5. Inicialización básica UI
// =============================

initCategoryOptions();

function getSelectedTxType() {
  if (el.radioTransfer?.checked) return 'transfer';
  return el.radioIncome?.checked ? 'income' : 'expense';
}

function updateTransactionFormMode() {
  const type = getSelectedTxType();
  const isTransfer = type === 'transfer';

  if (!isTransfer) initCategoryOptions(type);

  if (el.merchantField) el.merchantField.hidden = isTransfer;
  if (el.accountField) el.accountField.hidden = isTransfer;
  if (el.categoryField) el.categoryField.hidden = isTransfer;
  if (el.recurringField) el.recurringField.hidden = isTransfer;
  if (el.transferFields) el.transferFields.hidden = !isTransfer;

  if (el.selectCategory) el.selectCategory.required = !isTransfer;
  if (el.selectAccount) el.selectAccount.required = !isTransfer;
  if (el.selectFromAccount) el.selectFromAccount.required = isTransfer;
  if (el.selectToAccount) el.selectToAccount.required = isTransfer;

  if (isTransfer) renderTransferAccountOptions();
}

if (el.radioIncome && el.radioExpense) {
  el.radioIncome.addEventListener('change', updateTransactionFormMode);
  el.radioExpense.addEventListener('change', updateTransactionFormMode);
  el.radioTransfer?.addEventListener('change', updateTransactionFormMode);
}

state.month = toMonthKey(new Date());
updateMonthLabel();
refreshList();

// estado inicial del carrusel de donuts
setActiveChart(0);

// Navegación de meses
el.btnPrevMonth?.addEventListener('click', () => changeMonth(-1));
el.btnNextMonth?.addEventListener('click', () => changeMonth(1));

// Carrusel: dots
if (Array.isArray(el.donutDots)) {
  el.donutDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => setActiveChart(idx));
  });
}

// Carrusel: swipe en móviles
let touchStartX = null;
if (el.donutCarousel) {
  el.donutCarousel.addEventListener('touchstart', (ev) => {
    if (!ev.touches || !ev.touches.length) return;
    touchStartX = ev.touches[0].clientX;
  });

  el.donutCarousel.addEventListener('touchend', (ev) => {
    if (touchStartX == null || !ev.changedTouches || !ev.changedTouches.length) return;
    const dx = ev.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      const direction = dx < 0 ? 1 : -1;
      const next = Math.min(1, Math.max(0, state.activeChartIndex + direction));
      setActiveChart(next);
    }
    touchStartX = null;
  });
}

// (opcional) Swipe con ratón en desktop
let mouseDownX = null;
if (el.donutCarousel) {
  el.donutCarousel.addEventListener('mousedown', (ev) => {
    mouseDownX = ev.clientX;
  });

  el.donutCarousel.addEventListener('mouseup', (ev) => {
    if (mouseDownX == null) return;
    const dx = ev.clientX - mouseDownX;
    if (Math.abs(dx) > 40) {
      const direction = dx < 0 ? 1 : -1;
      const next = Math.min(1, Math.max(0, state.activeChartIndex + direction));
      setActiveChart(next);
    }
    mouseDownX = null;
  });

  el.donutCarousel.addEventListener('mouseleave', () => {
    mouseDownX = null;
  });
}


// =============================
// 5.5 Cuentas y saldos
// =============================

function calculateAccountBalance(account) {
  let balance = Number(account.initialBalanceCents) || 0;
  const cutoff = account.initialBalanceDate || '';

  for (const tx of state.txs) {
    // initialBalanceCents representa el saldo REAL al cierre de cutoff.
    // Por tanto solo aplicamos movimientos de días posteriores.
    if (cutoff && tx.date <= cutoff) continue;

    const amount = Number(tx.amountCents) || 0;
    if (tx.type === 'transfer') {
      if (tx.fromAccountId === account.id) balance -= amount;
      if (tx.toAccountId === account.id) balance += amount;
      continue;
    }
    if (tx.type === 'adjustment') {
      if (tx.accountId === account.id) balance += amount;
      continue;
    }

    if (tx.accountId !== account.id) continue;
    if (tx.type === 'income') balance += amount;
    else if (tx.type === 'expense') balance -= amount;
  }
  return balance;
}

function renderWealthCard() {
  if (!el.wealthCard || !el.wealthTotal || !el.wealthBreakdown) return;

  const accounts = getActiveAccounts();
  const balances = accounts.map(account => ({
    account,
    balance: calculateAccountBalance(account)
  }));
  const total = balances.reduce((sum, item) => sum + item.balance, 0);

  el.wealthTotal.textContent = centsToEUR(total);
  el.wealthBreakdown.innerHTML = '';

  for (const { account, balance } of balances) {
    const item = document.createElement('div');
    item.className = 'wealth-account';
    const icon = account.type === 'cash' ? '💶' : '🏦';
    item.innerHTML = `
      <span class="wealth-account__name">${icon} ${account.name}</span>
      <strong class="wealth-account__value">${centsToEUR(balance)}</strong>
    `;
    el.wealthBreakdown.appendChild(item);
  }

  el.wealthCard.classList.toggle('wealth-card--empty', balances.length === 0);
}


function calculateAccountBalanceAt(account, targetDate) {
  let balance = Number(account.initialBalanceCents) || 0;
  const cutoff = account.initialBalanceDate || '';
  if (!cutoff || !targetDate || targetDate < cutoff) return null;

  for (const tx of state.txs) {
    if (!tx.date || tx.date <= cutoff || tx.date > targetDate) continue;
    const amount = Number(tx.amountCents) || 0;
    if (tx.type === 'transfer') {
      if (tx.fromAccountId === account.id) balance -= amount;
      if (tx.toAccountId === account.id) balance += amount;
    } else if (tx.type === 'adjustment') {
      if (tx.accountId === account.id) balance += amount;
    } else if (tx.accountId === account.id) {
      if (tx.type === 'income') balance += amount;
      else if (tx.type === 'expense') balance -= amount;
    }
  }
  return balance;
}

function buildWealthHistorySeries() {
  const accounts = getActiveAccounts().filter(a => a.initialBalanceDate);
  if (!accounts.length) return { labels: [], values: [] };
  // Solo mostramos patrimonio total desde la fecha en la que TODAS las cuentas activas
  // tienen un saldo de partida fiable.
  const start = accounts.map(a => a.initialBalanceDate).sort().at(-1);
  const end = todayISO();
  if (!start || start > end) return { labels: [], values: [] };

  const labels = [];
  const values = [];
  const d = new Date(start + 'T12:00:00');
  const last = new Date(end + 'T12:00:00');
  while (d <= last) {
    const iso = d.toISOString().slice(0, 10);
    let total = 0;
    let valid = true;
    for (const account of accounts) {
      const value = calculateAccountBalanceAt(account, iso);
      if (value == null) { valid = false; break; }
      total += value;
    }
    if (valid) {
      labels.push(iso);
      values.push(total);
    }
    d.setDate(d.getDate() + 1);
  }
  return { labels, values };
}

function formatShortDate(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}`;
}

function renderWealthDialog() {
  if (!el.dlgWealth) return;
  const balances = getActiveAccounts().map(account => ({ account, balance: calculateAccountBalance(account) }));
  const total = balances.reduce((sum, x) => sum + x.balance, 0);
  if (el.wealthDialogTotal) el.wealthDialogTotal.textContent = centsToEUR(total);

  if (el.wealthDistribution) {
    el.wealthDistribution.innerHTML = balances.map(({account,balance}) => {
      const pct = total > 0 && balance > 0 ? (balance / total * 100) : 0;
      const icon = account.type === 'cash' ? '💶' : '🏦';
      return `<div class="wealth-dist-row"><div><strong>${icon} ${account.name}</strong><span>${centsToEUR(balance)}</span></div><strong>${pct.toFixed(1).replace('.', ',')}%</strong></div>`;
    }).join('');
  }

  const series = buildWealthHistorySeries();
  const first = series.values[0] ?? total;
  const last = series.values.at(-1) ?? total;
  const diff = last - first;
  const pct = first !== 0 ? diff / Math.abs(first) * 100 : 0;
  if (el.wealthChangeAmount) el.wealthChangeAmount.textContent = `${diff >= 0 ? '+' : ''}${centsToEUR(diff)}`;
  if (el.wealthChangePct) el.wealthChangePct.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')} %`;

  if (state.chartWealth) { state.chartWealth.destroy(); state.chartWealth = null; }
  if (el.wealthHistoryCanvas && series.labels.length && window.Chart) {
    state.chartWealth = new Chart(el.wealthHistoryCanvas, {
      type: 'line',
      data: { labels: series.labels.map(formatShortDate), datasets: [{ label: 'Patrimonio', data: series.values.map(v => v/100), tension: .3, fill: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => centsToEUR(Math.round(c.parsed.y*100)) } } }, scales: { x: { ticks: { maxTicksLimit: 6 } }, y: { ticks: { callback: v => `${v.toLocaleString('es-ES')} €` } } } }
    });
  }

  if (el.wealthAccountsList) {
    el.wealthAccountsList.innerHTML = '';
    for (const {account,balance} of balances) {
      const pct = total > 0 && balance > 0 ? balance/total*100 : 0;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'wealth-account-row';
      btn.innerHTML = `<span><strong>${account.type === 'cash' ? '💶' : '🏦'} ${account.name}</strong><small>${pct.toFixed(0)}% de tu dinero</small></span><span><strong>${centsToEUR(balance)}</strong><b>›</b></span>`;
      btn.addEventListener('click', () => openAccountDetail(account.id));
      el.wealthAccountsList.appendChild(btn);
    }
  }
}

function openAccountDetail(accountId) {
  const account = state.accounts.find(a => a.id === accountId);
  if (!account || !el.dlgAccountDetail || !el.accountDetailContent) return;
  const balance = calculateAccountBalance(account);
  const cutoff = account.initialBalanceDate || '';
  let income=0, expense=0, transfers=0, adjustments=0;
  const related = state.txs.filter(tx => {
    if (!tx.date || (cutoff && tx.date <= cutoff)) return false;
    if (tx.type === 'transfer') return tx.fromAccountId === account.id || tx.toAccountId === account.id;
    return tx.accountId === account.id;
  }).sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  for (const tx of related) {
    const amount=Number(tx.amountCents)||0;
    if (tx.type==='income') income+=amount;
    else if (tx.type==='expense') expense+=amount;
    else if (tx.type==='transfer') transfers += tx.toAccountId===account.id ? amount : -amount;
    else if (tx.type==='adjustment') adjustments += amount;
  }
  const recent = related.slice(0,8).map(tx => {
    let label = tx.merchant || tx.note || (tx.type==='transfer' ? 'Transferencia' : tx.type==='adjustment' ? 'Ajuste de saldo' : tx.type==='income' ? 'Ingreso' : 'Gasto');
    let sign = tx.type==='income' ? '+' : tx.type==='expense' ? '-' : tx.type==='adjustment' ? ((Number(tx.amountCents)||0)>=0 ? '+' : '') : (tx.toAccountId===account.id ? '+' : '-');
    return `<div class="account-detail-tx"><span><strong>${label}</strong><small>${tx.date || ''}</small></span><strong>${sign}${centsToEUR(Number(tx.amountCents)||0)}</strong></div>`;
  }).join('') || '<p class="sub">Sin movimientos posteriores al saldo inicial.</p>';
  el.accountDetailContent.innerHTML = `<div class="account-detail-hero"><span>${account.type==='cash'?'💶':'🏦'} ${account.name}</span><strong>${centsToEUR(balance)}</strong><small>Saldo actual</small></div><h4>Desde el inicio</h4><div class="account-detail-stats"><div><span>Ingresos</span><strong>${income === 0 ? centsToEUR(0) : `+${centsToEUR(income)}`}</strong></div><div><span>Gastos</span><strong>${expense === 0 ? centsToEUR(0) : `-${centsToEUR(expense)}`}</strong></div><div><span>Transferencias</span><strong>${transfers === 0 ? centsToEUR(0) : `${transfers > 0 ? '+' : ''}${centsToEUR(transfers)}`}</strong></div><div><span>Ajustes</span><strong>${adjustments === 0 ? centsToEUR(0) : `${adjustments > 0 ? '+' : ''}${centsToEUR(adjustments)}`}</strong></div></div><button type="button" class="account-adjust-btn" id="btnAdjustAccountBalance"><span class="account-adjust-icon" aria-hidden="true">⚖</span><span>Ajustar saldo</span></button><h4>Movimientos recientes</h4>${recent}`;
  el.dlgAccountDetail.showModal();
  document.getElementById('btnAdjustAccountBalance')?.addEventListener('click', () => openBalanceAdjustmentDialog(account.id));
}

async function saveBalanceAdjustment(accountId, realBalanceCents, note = '') {
  const account = state.accounts.find(a => a.id === accountId);
  if (!account) throw new Error('Cuenta no encontrada');
  const current = calculateAccountBalance(account);
  const difference = realBalanceCents - current;
  if (difference === 0) return false;
  await saveTransaction({
    type: 'adjustment', amountCents: difference, category: null,
    date: todayISO(), merchant: '', accountId,
    fromAccountId: null, toAccountId: null, paymentCard: '',
    note: note || 'Ajuste de saldo', source: 'manual',
    recurringFreq: '', recurringEndsOn: ''
  }, null);
  return true;
}

function openBalanceAdjustmentDialog(accountId) {
  const account = state.accounts.find(a => a.id === accountId);
  if (!account || !el.dlgBalanceAdjustment) return;
  const current = calculateAccountBalance(account);
  el.dlgBalanceAdjustment.dataset.accountId = accountId;
  if (el.adjustAccountName) el.adjustAccountName.textContent = `${account.type==='cash'?'💶':'🏦'} ${account.name}`;
  if (el.adjustCurrentBalance) el.adjustCurrentBalance.textContent = centsToEUR(current);
  if (el.adjustRealBalance) el.adjustRealBalance.value = (current / 100).toFixed(2).replace('.', ',');
  if (el.adjustDifference) el.adjustDifference.textContent = centsToEUR(0);
  if (el.adjustNote) el.adjustNote.value = '';
  el.dlgBalanceAdjustment.showModal();
}

function refreshAdjustmentDifference() {
  const account = state.accounts.find(a => a.id === el.dlgBalanceAdjustment?.dataset.accountId);
  if (!account || !el.adjustDifference) return;
  const real = parseAmountToCents(el.adjustRealBalance?.value || '');
  if (Number.isNaN(real)) { el.adjustDifference.textContent = '—'; return; }
  const diff = real - calculateAccountBalance(account);
  el.adjustDifference.textContent = `${diff > 0 ? '+' : ''}${centsToEUR(diff)}`;
}

function openWealthDialog() {
  if (el.toolbarMenu) el.toolbarMenu.classList.remove('open');
  renderWealthDialog();
  el.dlgWealth?.showModal();
}

function renderAccountsBalanceDialog() {
  if (!el.accountsBalanceList) return;
  el.accountsBalanceList.innerHTML = '';

  for (const account of getActiveAccounts()) {
    const card = document.createElement('section');
    card.className = 'account-balance-card';
    const icon = account.type === 'cash' ? '💶' : '🏦';
    const current = calculateAccountBalance(account);

    card.innerHTML = `
      <div class="account-balance-head">
        <div><strong>${icon} ${account.name}</strong><span>Saldo actual calculado</span></div>
        <strong class="account-current">${centsToEUR(current)}</strong>
      </div>
      <label class="field">
        <span>Saldo real al cierre (€)</span>
        <input class="account-opening" type="text" inputmode="decimal" value="${(Number(account.initialBalanceCents || 0) / 100).toFixed(2).replace('.', ',')}">
      </label>
      <label class="field">
        <span>Fecha de cierre</span>
        <input class="account-date" type="date" value="${account.initialBalanceDate || todayISO()}">
      </label>
      <button type="button" class="account-save">Guardar saldo</button>
    `;

    card.querySelector('.account-save').addEventListener('click', async () => {
      const amountInput = card.querySelector('.account-opening');
      const dateInput = card.querySelector('.account-date');
      const cents = parseAmountToCents(amountInput.value);
      if (!Number.isFinite(cents)) { alert('Introduce un saldo válido.'); return; }
      if (!dateInput.value) { alert('Selecciona una fecha de cierre.'); return; }

      showSplash();
      try {
        await updateAccountOpeningBalance(account.id, cents, dateInput.value);
      } catch (err) {
        console.error(err);
        alert('Error guardando el saldo: ' + (err?.message || err));
      } finally {
        hideSplash();
      }
    });

    el.accountsBalanceList.appendChild(card);
  }
}

// =============================
// 6. Diálogo de alta / edición
// =============================

function getActiveAccounts() {
  return state.accounts.filter(account => !account.archived);
}

function renderAccountOptions({ selectedId = null, allowUnassigned = false } = {}) {
  if (!el.selectAccount) return;

  const accounts = getActiveAccounts();
  el.selectAccount.innerHTML = '';

  if (allowUnassigned) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Sin asignar';
    el.selectAccount.appendChild(option);
  }

  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = `${account.type === 'cash' ? '💶' : '🏦'} ${account.name}`;
    el.selectAccount.appendChild(option);
  }

  if (selectedId && accounts.some(account => account.id === selectedId)) {
    el.selectAccount.value = selectedId;
  } else if (allowUnassigned && !selectedId) {
    el.selectAccount.value = '';
  } else if (accounts.some(account => account.id === DEFAULT_ACCOUNT_IDS.MAIN)) {
    el.selectAccount.value = DEFAULT_ACCOUNT_IDS.MAIN;
  } else if (accounts.length) {
    el.selectAccount.value = accounts[0].id;
  }

  el.selectAccount.disabled = accounts.length === 0;
}

function renderTransferAccountOptions({ fromId = null, toId = null } = {}) {
  const accounts = getActiveAccounts();
  const fill = (select, selectedId) => {
    if (!select) return;
    select.innerHTML = '';
    for (const account of accounts) {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = `${account.type === 'cash' ? '💶' : '🏦'} ${account.name}`;
      select.appendChild(option);
    }
    if (selectedId && accounts.some(a => a.id === selectedId)) select.value = selectedId;
  };

  fill(el.selectFromAccount, fromId || DEFAULT_ACCOUNT_IDS.CASH);
  const defaultTo = toId || (accounts.some(a => a.id === DEFAULT_ACCOUNT_IDS.MAIN) ? DEFAULT_ACCOUNT_IDS.MAIN : accounts.find(a => a.id !== el.selectFromAccount?.value)?.id);
  fill(el.selectToAccount, defaultTo);
}

function resetFormForNew() {
  el.form.reset();

  if (el.inputMerchant) {
    el.inputMerchant.value = '';
  }

  if (el.inputPaymentCard) {
    el.inputPaymentCard.value = '';
  }

  renderAccountOptions({ selectedId: DEFAULT_ACCOUNT_IDS.MAIN });

  if (el.btnCancelTx) {
    el.btnCancelTx.textContent = 'Cancelar';
  }

  el.radioIncome.checked = true;
  el.radioExpense.checked = false;
  if (el.radioTransfer) el.radioTransfer.checked = false;

  initCategoryOptions('income');
  renderTransferAccountOptions();
  updateTransactionFormMode();

  el.inputDate.value = todayISO();
  el.recurringFreq.value = '';
  el.recurringEndsOn.value = '';

  el.dlgTitle.textContent = 'Nuevo movimiento';
  el.dlgTx.dataset.editingId = '';
  el.dlgTx.dataset.source = 'manual';

  if (el.btnDeleteTx) {
    el.btnDeleteTx.hidden = true;
  }
}

function setDefaultRecurringEndIfNeeded() {
  if (!el.recurringFreq || !el.recurringEndsOn || !el.inputDate) return;

  const freq = el.recurringFreq.value;
  const currentEnd = (el.recurringEndsOn.value || '').trim();
  const baseDateStr = el.inputDate.value;

  // Solo si es mensual, no hay fecha fin puesta y tenemos fecha base
  if (freq !== 'monthly' || currentEnd || !baseDateStr) return;

  const baseDate = new Date(baseDateStr + 'T00:00:00');
  if (Number.isNaN(baseDate.getTime())) return;

  const nextYear = new Date(baseDate);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const yyyy = nextYear.getFullYear();
  const mm = String(nextYear.getMonth() + 1).padStart(2, '0');
  const dd = String(nextYear.getDate()).padStart(2, '0');

  el.recurringEndsOn.value = `${yyyy}-${mm}-${dd}`;
}



function openEditDialog(tx) {
  el.form.reset();
  el.radioIncome.checked = tx.type === 'income';
  el.radioExpense.checked = tx.type === 'expense';
  if (el.radioTransfer) el.radioTransfer.checked = tx.type === 'transfer';

  if (tx.type !== 'transfer') initCategoryOptions(tx.type);
  renderTransferAccountOptions({ fromId: tx.fromAccountId || null, toId: tx.toAccountId || null });
  updateTransactionFormMode();

  el.inputAmount.value = (tx.amountCents / 100).toString().replace('.', ',');
  el.inputDate.value = tx.date || todayISO();


  if (tx.type !== 'transfer') {
    el.selectCategory.value = tx.categoryId || (tx.type === 'income' ? 'other_inc' : 'other_exp');
  }
  el.inputNote.value = tx.note || '';

  if (el.inputMerchant) {
  el.inputMerchant.value = tx.merchant || '';
}

if (el.inputPaymentCard) {
  el.inputPaymentCard.value = tx.paymentCard || '';
}

if (tx.type !== 'transfer') {
  renderAccountOptions({
    selectedId: tx.accountId || null,
    allowUnassigned: !tx.accountId
  });
}

  if (tx.recurring && tx.recurring.freq) {
    el.recurringFreq.value = tx.recurring.freq;
    el.recurringEndsOn.value = tx.recurring.endsOn || '';
  } else {
    el.recurringFreq.value = '';
    el.recurringEndsOn.value = '';
  }

  el.dlgTitle.textContent = 'Editar movimiento';
el.dlgTx.dataset.editingId = tx.id;
el.dlgTx.dataset.source = tx.source || 'manual';

if (el.btnDeleteTx) {
  el.btnDeleteTx.hidden = false;
}

if (el.btnCancelTx) {
  el.btnCancelTx.textContent = 'Cancelar';
}

el.dlgTx.showModal();
}


function openDeleteDialog(id) {
  el.dlgConfirmDelete.dataset.id = id;
  el.dlgConfirmDelete.showModal();
}

el.fabAdd?.addEventListener('click', () => {
  resetFormForNew();
  el.dlgTx.showModal();
});

el.btnDeleteTx?.addEventListener('click', () => {
  const id = el.dlgTx.dataset.editingId;
  if (!id) return;
  el.dlgTx.close();
  openDeleteDialog(id);
});

el.btnCancelTx?.addEventListener('click', () => {
  el.dlgTx.close();
});

el.btnCancelDelete?.addEventListener('click', () => {
  el.dlgConfirmDelete.close();
});

el.btnConfirmDelete?.addEventListener('click', async () => {
  const id = el.dlgConfirmDelete.dataset.id;
  el.dlgConfirmDelete.close();
  if (!id) return;

  if (!isTransactionsReady()) {
    alert('Firebase aún no está listo');
    return;
  }

  try {
    await deleteTransaction(id);
  } catch (e) {
    console.error(e);
    alert('Error eliminando: ' + (e?.message || e));
  }
});


// Guardar movimiento
el.form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(el.form);
  const raw = Object.fromEntries(fd.entries());

  const amountCents = parseAmountToCents(raw.amount);
  if (!raw.amount || isNaN(amountCents)) {
    alert('Importe inválido');
    return;
  }
  if (!raw.date) {
    alert('Fecha requerida');
    return;
  }

  const type = raw.type === 'transfer' ? 'transfer' : (raw.type === 'income' ? 'income' : 'expense');

  // --- lógica de recurrentes ---
  let recurringFreq = type === 'transfer' ? '' : (raw.recurringFreq || '');
  let recurringEndsOn = type === 'transfer' ? '' : (raw.recurringEndsOn || '').trim();

  // Si es mensual y no han indicado fecha fin, poner por defecto 1 año después
  if (recurringFreq === 'monthly' && !recurringEndsOn) {
    const baseDate = new Date(raw.date + 'T00:00:00');
    if (!Number.isNaN(baseDate.getTime())) {
      const nextYear = new Date(baseDate);
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const yyyy = nextYear.getFullYear();
      const mm = String(nextYear.getMonth() + 1).padStart(2, '0');
      const dd = String(nextYear.getDate()).padStart(2, '0');

      recurringEndsOn = `${yyyy}-${mm}-${dd}`;
    }
  }

  const payload = {
    type,
    amountCents,
    category: type === 'transfer' ? null : (raw.category || (type === 'income' ? 'other_inc' : 'other_exp')),
    date: raw.date,
    merchant: type === 'transfer' ? '' : (raw.merchant?.trim() || ''),
    accountId: type === 'transfer' ? null : (raw.accountId || null),
    fromAccountId: type === 'transfer' ? (raw.fromAccountId || null) : null,
    toAccountId: type === 'transfer' ? (raw.toAccountId || null) : null,
    paymentCard: type === 'transfer' ? '' : (raw.paymentCard?.trim() || ''),
    note: raw.note?.trim() || '',
    source: el.dlgTx.dataset.source || 'manual',
    recurringFreq,
    recurringEndsOn
  };
  if (!isTransactionsReady()) {
    alert('Firebase aún no está listo. Espera un momento y reintenta.');
    return;
  }

  const editingId = el.dlgTx.dataset.editingId || null;

  if (type === 'transfer') {
    if (!payload.fromAccountId || !payload.toAccountId) {
      alert('Selecciona la cuenta de origen y la de destino.');
      return;
    }
    if (payload.fromAccountId === payload.toAccountId) {
      alert('La cuenta de origen y la de destino deben ser distintas.');
      return;
    }
  } else if (!editingId && !payload.accountId) {
    alert('Selecciona una cuenta para el movimiento.');
    return;
  }

  // 1️⃣ Cerrar el diálogo ANTES de empezar el guardado
  el.dlgTx.close();

  // 2️⃣ Mostrar siempre la pantalla de carga mientras se guarda
  showSplash();

  try {
    await saveTransaction(payload, editingId);
  } catch (e2) {
    console.error(e2);
    alert('Error al guardar: ' + (e2?.message || e2));
  } finally {
    // 3️⃣ Ocultar pantalla de carga al terminar
    hideSplash();
  }
});



// =============================
// 7. Integración con Firebase
// =============================

const pendingShortcutExpense = getShortcutExpenseFromUrl();

document.addEventListener('firebase-ready', async () => {
  const { user } = window.__firebase || {};

  if (user && el.authInfo) {
    el.authInfo.textContent =
      `Conectado • ${user.email || user.uid.slice(0, 8)}`;
  }

  try {
    await initTransactionsListener((txList) => {
      state.txs = txList;
      refreshList();
    });

    await initAccountsListener((accountList) => {
      state.accounts = accountList;

      // Mantiene sincronizado el selector si las cuentas cambian.
      if (!el.dlgTx?.open) {
        renderAccountOptions({ selectedId: DEFAULT_ACCOUNT_IDS.MAIN });
        renderTransferAccountOptions();
      }
      renderWealthCard();
      if (el.dlgAccounts?.open) renderAccountsBalanceDialog();
      if (el.dlgWealth?.open) renderWealthDialog();
    });

    await ensureDefaultAccounts(todayISO());

    hideSplash();

    if (pendingShortcutExpense) {
      openShortcutExpenseDialog(pendingShortcutExpense);
    }
  } catch (err) {
    console.error(err);
    hideSplash();

    alert(
      'Error inicializando datos: ' +
      (err?.message || err)
    );
  }
});



// =============================
// 8. Exportar / importar JSON
// =============================

// Exporta TODAS las transacciones que tenemos en memoria (no sólo el mes)
el.btnExport?.addEventListener('click', () => {
  const data = JSON.stringify(state.txs, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cashly-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

el.btnExportCSV?.addEventListener('click', () => { exportCSV(); });

// Importar JSON (se insertan como nuevos docs)
el.fileImport?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const json = JSON.parse(text);
    if (!Array.isArray(json)) {
      alert('El JSON debe ser un array de transacciones');
      return;
    }

        if (!isTransactionsReady()) {
      alert('Firebase aún no está listo');
      return;
    }

    const promises = [];
    for (const item of json) {
      if (!item.type || !item.amountCents || !item.date) continue;
      promises.push(
        saveTransaction(
          {
  type: item.type === 'transfer' ? 'transfer' : (item.type === 'income' ? 'income' : 'expense'),
  amountCents: item.amountCents,
  category: item.type === 'transfer' ? null : (
    item.categoryId || (item.type === 'income' ? 'other_inc' : 'other_exp')
  ),
  date:
    typeof item.date === 'string'
      ? item.date.slice(0, 10)
      : todayISO(),
  merchant: item.type === 'transfer' ? '' : (item.merchant || ''),
  accountId: item.type === 'transfer' ? null : (item.accountId || null),
  fromAccountId: item.type === 'transfer' ? (item.fromAccountId || null) : null,
  toAccountId: item.type === 'transfer' ? (item.toAccountId || null) : null,
  paymentCard: item.type === 'transfer' ? '' : (item.paymentCard || ''),
  note: item.note || '',
  source: item.source || 'import',
  recurringFreq: '',
  recurringEndsOn: ''
},
          null
        )
      );
    }


    await Promise.all(promises);
    alert(`Importadas ${promises.length} transacciones`);
  } catch (err) {
    console.error(err);
    alert('Error al importar JSON: ' + (err?.message || err));
  } finally {
    e.target.value = '';
  }
});

function exportCSV() {
  const rows = [
    ['Fecha','Tipo','Cuenta','Desde','Hacia','Categoría','Descripción','Importe']
  ];

  state.txs.forEach(t => {
    const accountName = state.accounts.find(a => a.id === t.accountId)?.name || '';
    const fromName = state.accounts.find(a => a.id === t.fromAccountId)?.name || '';
    const toName = state.accounts.find(a => a.id === t.toAccountId)?.name || '';
    rows.push([
      t.date,
      t.type,
      accountName,
      fromName,
      toName,
      CATEGORY_BY_ID[t.categoryId]?.name || '',
      t.note || '',
      (t.amountCents / 100).toFixed(2)
    ]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'cashly_movimientos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeShortcutAmount(value) {
  return String(value || '')
    .replace(/EUR/gi, '')
    .replace(/€/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function getShortcutExpenseFromUrl() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('newExpense') !== '1') {
    return null;
  }

  const amount = normalizeShortcutAmount(
  params.get('amount')
);
  const merchant = (params.get('merchant') || '').trim();
  const paymentCard = (params.get('card') || '').trim();
  const date = (params.get('date') || '').trim();

  return {
    amount: amount.slice(0, 30),
    merchant: merchant.slice(0, 120),
    paymentCard: paymentCard.slice(0, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : todayISO()
  };
}

function normalizeMerchantName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function suggestExpenseCategory(merchant) {
  const normalized = normalizeMerchantName(merchant);

  const mappings = [
    {
      category: 'groceries',
      words: [
        'mercadona',
        'carrefour',
        'lidl',
        'aldi',
        'eroski',
        'alcampo',
        'supermercado'
      ]
    },
    {
      category: 'restaurants',
      words: [
        'restaurante',
        'restaurant',
        'cafeteria',
        'cafe',
        'mcdonald',
        'burger king',
        'telepizza',
        'glovo',
        'uber eats',
        'just eat'
      ]
    },
    {
      category: 'transport',
      words: [
        'repsol',
        'cepsa',
        'shell',
        'renfe',
        'iryo',
        'ouigo',
        'uber',
        'cabify',
        'parking'
      ]
    },
    {
      category: 'shopping',
      words: [
        'amazon',
        'zara',
        'pull&bear',
        'bershka',
        'primark',
        'ikea',
        'decathlon',
        'mediamarkt'
      ]
    },
    {
      category: 'subscriptions',
      words: [
        'netflix',
        'spotify',
        'apple.com/bill',
        'amazon prime',
        'youtube',
        'disney'
      ]
    }
  ];

  const match = mappings.find(group =>
    group.words.some(word => normalized.includes(word))
  );

  return match?.category || 'other_exp';
}

function getMerchantSuggestions(searchText, maxResults = 6) {
  const search = normalizeMerchantName(searchText);

  if (search.length < 2) {
    return [];
  }

  const merchants = new Map();

  for (const tx of state.txs) {
    const currentType =
      el.radioIncome.checked ? 'income' : 'expense';

    if (tx.type !== currentType) continue;

    const merchant = String(tx.merchant || '').trim();
    if (!merchant) continue;

    const normalizedMerchant = normalizeMerchantName(merchant);

    if (!normalizedMerchant.includes(search)) continue;

    const existing = merchants.get(normalizedMerchant);

    if (existing) {
      existing.count += 1;

      // Conservamos la categoría más reciente encontrada.
      if (tx.categoryId) {
        existing.categoryId = tx.categoryId;
      }
    } else {
      merchants.set(normalizedMerchant, {
        merchant,
        categoryId:
          tx.categoryId ||
          (tx.type === 'income' ? 'other_inc' : 'other_exp'),
        count: 1
      });
    }
  }

  return Array.from(merchants.values())
    .sort((a, b) => {
      const aStarts = normalizeMerchantName(a.merchant).startsWith(search);
      const bStarts = normalizeMerchantName(b.merchant).startsWith(search);

      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1;
      }

      return b.count - a.count;
    })
    .slice(0, maxResults);
}

function hideMerchantSuggestions() {
  if (!el.merchantSuggestions) return;

  el.merchantSuggestions.hidden = true;
  el.merchantSuggestions.innerHTML = '';
}

function renderMerchantSuggestions() {
  if (
    !el.inputMerchant ||
    !el.merchantSuggestions
  ) {
    hideMerchantSuggestions();
    return;
  }

  const suggestions = getMerchantSuggestions(
    el.inputMerchant.value
  );

  el.merchantSuggestions.innerHTML = '';

  if (!suggestions.length) {
    hideMerchantSuggestions();
    return;
  }

  for (const suggestion of suggestions) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'merchant-suggestion';

    const category =
      CATEGORY_BY_ID[suggestion.categoryId];

    button.innerHTML = `
      <span>${suggestion.merchant}</span>
      <small>
        ${category?.emoji || ''} ${category?.name || ''}
      </small>
    `;

    button.addEventListener('mousedown', event => {
      event.preventDefault();
    });

    button.addEventListener('click', () => {
      el.inputMerchant.value = suggestion.merchant;

      const categoryExists = Array.from(
        el.selectCategory.options
      ).some(option =>
        option.value === suggestion.categoryId
      );

      if (categoryExists) {
        el.selectCategory.value =
          suggestion.categoryId;
      }

      hideMerchantSuggestions();
      el.selectCategory.focus();
    });

    el.merchantSuggestions.appendChild(button);
  }

  el.merchantSuggestions.hidden = false;
}

window.getMerchantSuggestions = getMerchantSuggestions;
window.renderMerchantSuggestions = renderMerchantSuggestions;

el.inputMerchant?.addEventListener('input', () => {
  renderMerchantSuggestions();
});

el.inputMerchant?.addEventListener('blur', () => {
  setTimeout(() => {
    hideMerchantSuggestions();
  }, 100);

  applyMerchantCategorySuggestion();
});

el.inputMerchant?.addEventListener(
  'keydown',
  event => {
    if (event.key !== 'Enter') return;

    event.preventDefault();

    applyMerchantCategorySuggestion();
    hideMerchantSuggestions();
    el.selectCategory?.focus();
  }
);

function openShortcutExpenseDialog(expense) {
  if (!expense || !el.dlgTx || !el.form) return;

  resetFormForNew();

  el.radioExpense.checked = true;
  el.radioIncome.checked = false;

  initCategoryOptions('expense');

  el.inputAmount.value = expense.amount;
  el.inputDate.value = expense.date;
  el.inputMerchant.value = expense.merchant;
  if (el.inputPaymentCard) {
    el.inputPaymentCard.value = expense.paymentCard || '';
  }
  el.inputNote.value = '';

  const suggestedCategory =
    suggestExpenseCategory(expense.merchant);

  const categoryExists = Array.from(
    el.selectCategory.options
  ).some(option => option.value === suggestedCategory);

  el.selectCategory.value = categoryExists
    ? suggestedCategory
    : 'other_exp';

  el.recurringFreq.value = '';
  el.recurringEndsOn.value = '';

  el.dlgTitle.textContent = 'Revisar gasto';
  el.dlgTx.dataset.editingId = '';
  el.dlgTx.dataset.source = 'apple_pay';

  if (el.btnDeleteTx) {
    el.btnDeleteTx.hidden = true;
  }

  if (el.btnCancelTx) {
    el.btnCancelTx.textContent = 'Descartar';
  }

  el.dlgTx.showModal();

  // Elimina importe y comercio de la barra de direcciones.
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );
}

// =============================
// Limpieza avanzada de transacciones por rango de fechas
// =============================

/**
 * Limpia transacciones en un rango de fechas.
 *
 * @param {string|null|undefined} fromISO  Fecha inicio (YYYY-MM-DD) o null/undefined → desde el principio.
 * @param {string|null|undefined|boolean} toISOOrFlag
 *        - Si es string: fecha fin (YYYY-MM-DD) o null → hasta el final.
 *        - Si es boolean: se interpreta como removeAll (y no hay fecha fin).
 * @param {boolean} [maybeFlag]           Si se pasa, es el removeAll cuando el 2º parámetro es fecha.
 *
 * Formas válidas:
 *  cleanupDuplicateTransactions("2025-12-01");                 // desde 01/12 en adelante, SOLO duplicados
 *  cleanupDuplicateTransactions("2025-12-01", true);           // desde 01/12 en adelante, TODOS
 *  cleanupDuplicateTransactions("2025-12-01", "2100-12-30");   // entre 01/12 y 30/12/2100, SOLO duplicados
 *  cleanupDuplicateTransactions("2025-12-01", "2100-12-30", true); // mismo rango, TODOS
 *  cleanupDuplicateTransactions(null, "2025-12-31", true);     // desde el inicio hasta 31/12, TODOS
 */
async function cleanupDuplicateTransactions(fromISO, toISOOrFlag, maybeFlag) {
  if (!isTransactionsReady()) {
    alert('Firebase aún no está listo');
    return;
  }

  // --- Normalizar parámetros ---
  let removeAll = false;
  let toISO = null;

  // Caso: cleanup("2025-12-01", true)
  if (typeof toISOOrFlag === 'boolean') {
    removeAll = toISOOrFlag;
  } else {
    toISO = toISOOrFlag || null;
    if (typeof maybeFlag === 'boolean') {
      removeAll = maybeFlag;
    }
  }

  fromISO = fromISO || null;

  if (!fromISO && !toISO) {
    alert('Debes indicar al menos una fecha (desde, hasta o ambas)');
    return;
  }

  let from = null;
  let to = null;

  if (fromISO) {
    from = new Date(fromISO + 'T00:00:00');
    if (isNaN(from)) {
      alert('Fecha "desde" inválida. Usa YYYY-MM-DD');
      return;
    }
  }

  if (toISO) {
    to = new Date(toISO + 'T23:59:59');
    if (isNaN(to)) {
      alert('Fecha "hasta" inválida. Usa YYYY-MM-DD');
      return;
    }
  }

  const seen = new Set();
  const toDelete = [];
  let totalInRange = 0;

  for (const tx of state.txs) {
    if (!tx?.id || !tx.date) continue;

    const d = new Date(tx.date + 'T00:00:00');
    if (isNaN(d)) continue;

    if (from && d < from) continue;
    if (to && d > to) continue;

    totalInRange++;

    if (removeAll) {
      // MODO: borrar TODO en el rango
      toDelete.push(tx.id);
      continue;
    }

    // MODO: sólo duplicados
    const key = [
      tx.type,
      tx.categoryId,
      tx.amountCents,
      (tx.note || '').trim().toLowerCase(),
      tx.date
    ].join('|');

    if (seen.has(key)) {
      toDelete.push(tx.id);
    } else {
      seen.add(key);
    }
  }

  // Log de debug para la consola
  console.log('[cleanupDuplicateTransactions] from:', fromISO, 'to:', toISO, 'removeAll:', removeAll);
  console.log('[cleanupDuplicateTransactions] total en rango:', totalInRange, 'a borrar:', toDelete.length);

  if (!toDelete.length) {
    if (removeAll) {
      alert(totalInRange === 0
        ? 'No hay transacciones en ese rango'
        : 'Hay transacciones en el rango pero ninguna ha sido marcada para borrar (revisa la lógica)'
      );
    } else {
      alert('No se han encontrado transacciones duplicadas en ese rango');
    }
    return;
  }

  let desc = '';
  if (fromISO && toISO) desc = `entre ${fromISO} y ${toISO}`;
  else if (fromISO) desc = `desde ${fromISO} hasta el final`;
  else if (toISO) desc = `desde el inicio hasta ${toISO}`;

  const modo = removeAll ? 'TODAS las transacciones' : 'las transacciones duplicadas';
  const ok = confirm(`Se van a borrar ${toDelete.length} ${modo} ${desc}. ¿Continuar?`);
  if (!ok) return;

  try {
    await Promise.all(toDelete.map(id => deleteTransaction(id)));
    alert(`Borradas ${toDelete.length} ${removeAll ? 'transacciones' : 'duplicados'} ${desc}.`);
  } catch (err) {
    console.error(err);
    alert('Error borrando: ' + (err?.message || err));
  }
}

window.cleanupDuplicateTransactions = cleanupDuplicateTransactions;


// =============================
// 9. Autenticación (login/registro)
// =============================

let authMode = 'login'; // 'login' | 'register'

function setAuthMode(mode) {
  authMode = mode;
  const title = document.getElementById('authTitle');
  if (!title) return;

  if (mode === 'login') {
    title.textContent = 'Iniciar sesión';
    el.authSubmit.textContent = 'Entrar';
    el.toggleMode.textContent = '¿No tienes cuenta? Regístrate';
  } else {
    title.textContent = 'Crear cuenta';
    el.authSubmit.textContent = 'Registrarme';
    el.toggleMode.textContent = '¿Ya tienes cuenta? Inicia sesión';
  }
}

setAuthMode('login');

el.toggleMode?.addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});

el.authCancel?.addEventListener('click', () => {
  el.authDialog?.close();
});

el.authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = el.authEmail.value.trim();
  const password = el.authPassword.value;

  if (!email || !password) {
    alert('Email y contraseña requeridos');
    return;
  }

  try {
    const { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } =
      window.__firebase || {};
    if (!auth) {
      alert('Firebase Auth no inicializado');
      return;
    }

    if (authMode === 'login') {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }

    el.authDialog.close();
  } catch (err) {
    console.error(err);
    alert('Error de autenticación: ' + (err?.message || err));
  }
});

// Cerrar sesión (si añades un botón con id="btnLogout")
const btnLogout = document.getElementById('btnLogout');
btnLogout?.addEventListener('click', async () => {
  try {
    const { auth, signOut } = window.__firebase || {};
    if (!auth) return;
    await signOut(auth);
    state.txs = [];
    refreshList();
    el.authInfo.textContent = 'Offline';
    if (el.authDialog && !el.authDialog.open) {
      el.authDialog.showModal();
    }
  } catch (err) {
    console.error(err);
    alert('Error al cerrar sesión: ' + (err?.message || err));
  }
});

// =============================
// 10. OCR con Tesseract
// =============================

let tesseractLoaded = false;
let TesseractModule = null;
let ocrCandidates = [];

// Carga perezosa de Tesseract la primera vez
async function ensureTesseractLoaded() {
  if (tesseractLoaded) return;

  // CDN estándar
  const mod = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js');
  TesseractModule = mod.default || mod;
  tesseractLoaded = true;
}

// Detecta un importe y si es negativo (por guion)
function findAmountToken(line) {
  let s = line
    .normalize('NFKC')
    .replace(/[‐-–—−]/g, '-')
    .replace(/\s+/g, ' ');

  const negativeNear = (match) => {
    const idx = match.index;
    const context = s.slice(Math.max(0, idx - 3), idx);
    return context.includes('-');
  };

  // Formato con espacio: "34 00€"
  const spaced = /(\d{1,3})\s(\d{2})\s*€?/;
  let m = spaced.exec(s);
  if (m) {
    const cents = parseInt(m[1] + m[2], 10);
    return { cents, negative: negativeNear(m) };
  }

  // Formato normal: "1.234,56€" / "1234.56"
  const normal = /(\d{1,4}(?:[.\s]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})\s*€?/;
  m = normal.exec(s);
  if (m) {
    const cents = parseAmountToCents(m[1]);
    return { cents, negative: negativeNear(m) };
  }

  return null;
}

// Usa la fecha de hoy si no detectamos nada en el texto
function parseLinesToTxs(lines) {
  const out = [];
  let currentDateISO = todayISO();
  let lastDesc = '';

  for (const lnRaw of lines) {
    let ln = lnRaw.trim();
    if (!ln) continue;

    // Detectar fecha tipo "12/11/2025" o "2025-11-12"
    const dateMatch =
      ln.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ||
      ln.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      let y, m, d;
      if (dateMatch[1].length === 4) {
        // YYYY-MM-DD
        y = parseInt(dateMatch[1], 10);
        m = parseInt(dateMatch[2], 10);
        d = parseInt(dateMatch[3], 10);
      } else {
        // DD/MM/YYYY
        d = parseInt(dateMatch[1], 10);
        m = parseInt(dateMatch[2], 10);
        y = parseInt(dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3], 10);
      }
      currentDateISO = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      lastDesc = '';
      continue;
    }

    const tok = findAmountToken(ln);
    if (!tok || !Number.isFinite(tok.cents) || Math.abs(tok.cents) === 0) {
      if (/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(ln)) lastDesc = ln;
      continue;
    }

    const type = tok.negative ? 'expense' : 'income';
    const amountCents = Math.abs(tok.cents);

    let note = ln.replace(/\s*[€]?\s*[\d\s.,−–—-]{3,}\s*€?\s*$/, '').trim();
    if (note.length < 4 && lastDesc) note = lastDesc;

    out.push({
      type,
      amountCents,
      date: currentDateISO,
      merchant: note || 'Movimiento',
      categoryId: type === 'expense' ? 'other_exp' : 'other_inc'
    });
  }

  return out;
}

function parseTextToCandidates(text) {
  const lines = text.split(/\r?\n/);
  const txs = parseLinesToTxs(lines);
  if (txs.length) return txs;

  // Fallback: si no hubo fechas ni nada claro, toma HOY
  const out = [];
  for (const ln of lines) {
    const tok = findAmountToken(ln);
    if (tok && Number.isFinite(tok.cents) && Math.abs(tok.cents) > 0) {
      const type = tok.negative ? 'expense' : 'income';
      out.push({
        type,
        amountCents: Math.abs(tok.cents),
        date: todayISO(),
        merchant: 'Detectado por OCR',
        categoryId: type === 'expense' ? 'other_exp' : 'other_inc'
      });
    }
  }
  return out;
}

// Render de candidatos en el diálogo OCR
function renderCandidatesForImport(candidates) {
  ocrCandidates = candidates;
  el.ocrPreview.innerHTML = '';
  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';

  candidates.forEach((tx, i) => {
    const li = document.createElement('li');
    li.style.margin = '6px 0';
    li.style.padding = '8px';
    li.style.border = '1px solid #334155';
    li.style.borderRadius = '8px';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = true;
    chk.dataset.index = String(i);
    chk.style.marginRight = '6px';

    const label = document.createElement('span');
    label.textContent =
      `${tx.type === 'income' ? '+' : '-'} ${centsToEUR(tx.amountCents)} • ` +
      `${tx.date} • ${tx.merchant}`;

    li.appendChild(chk);
    li.appendChild(label);
    list.appendChild(li);
  });

  el.ocrPreview.appendChild(list);
  el.ocrImport.disabled = !candidates.length;
}

// Eventos OCR
el.btnOcr?.addEventListener('click', () => {
  el.ocrFiles.click();
});

el.ocrCancel?.addEventListener('click', () => {
  el.dlgOcr.close();
  el.ocrPreview.innerHTML = '';
  el.ocrStatus.textContent = 'Listo';
  ocrCandidates = [];
});

// Cuando se cambia la frecuencia recurrente
el.recurringFreq?.addEventListener('change', () => {
  setDefaultRecurringEndIfNeeded();
});

// Cuando se cambia la fecha, si es mensual y no hay fecha fin, recalcular
el.inputDate?.addEventListener('change', () => {
  setDefaultRecurringEndIfNeeded();
});

function applyMerchantCategorySuggestion() {
  if (!el.radioExpense.checked) return;

  const merchant = el.inputMerchant?.value?.trim();

  if (!merchant) {
    el.selectCategory.value = 'other_exp';
    return;
  }

  const suggestedCategory = suggestExpenseCategory(merchant);

  const availableCategories = Array.from(el.selectCategory.options)
    .map(option => option.value);

  if (availableCategories.includes(suggestedCategory)) {
    el.selectCategory.value = suggestedCategory;
  } else {
    el.selectCategory.value = 'other_exp';
  }
}

el.ocrFiles?.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  el.dlgOcr.showModal();
  el.ocrStatus.textContent = 'Preparando OCR...';
  el.ocrPreview.innerHTML = '';
  el.ocrImport.disabled = true;

  try {
    await ensureTesseractLoaded();

    const results = [];

    for (const [idx, file] of files.entries()) {
      el.ocrStatus.textContent = `Procesando imagen ${idx + 1}/${files.length}...`;

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data } = await TesseractModule.recognize(
        dataUrl,
        'spa+eng',
        {
          logger: m => {
            if (m.status) {
              el.ocrStatus.textContent =
                `Imagen ${idx + 1}/${files.length}: ${m.status} ${Math.round((m.progress || 0) * 100)}%`;
            }
          }
        }
      );

      results.push(data.text || '');
    }

    const candidates = results.flatMap(text => parseTextToCandidates(text));
    if (!candidates.length) {
      el.ocrStatus.textContent = 'No se detectaron importes. Prueba a recortar mejor la zona de movimientos.';
      el.ocrImport.disabled = true;
      return;
    }

    renderCandidatesForImport(candidates);
    el.ocrStatus.textContent = `Detectados ${candidates.length} movimientos`;
  } catch (err) {
    console.error(err);
    alert('Error OCR: ' + (err?.message || err));
    el.dlgOcr.close();
  } finally {
    el.ocrFiles.value = '';
  }
});

// Importar candidatos seleccionados
el.ocrImport?.addEventListener('click', async () => {
  if (!isTransactionsReady()) {
    alert('Firebase aún no está listo');
    return;
  }

  const checkboxes = el.ocrPreview.querySelectorAll('input[type="checkbox"]');
  const toImport = [];

  checkboxes.forEach((chk) => {
    if (!chk.checked) return;
    const idx = Number(chk.dataset.index);
    const tx = ocrCandidates[idx];
    if (!tx) return;

    toImport.push({
  type: tx.type,
  amountCents: tx.amountCents,
  category:
    tx.categoryId ||
    (tx.type === 'income' ? 'other_inc' : 'other_exp'),
  date: tx.date,
  merchant: tx.merchant || '',
  paymentCard: '',
  note: '',
  source: 'ocr',
  recurringFreq: '',
  recurringEndsOn: ''
});
  });

  if (!toImport.length) {
    alert('No hay movimientos seleccionados');
    return;
  }

  try {
    const promises = toImport.map(t => saveTransaction(t, null));
    await Promise.all(promises);
    el.dlgOcr.close();
    el.ocrPreview.innerHTML = '';
    ocrCandidates = [];
  } catch (err) {
    console.error(err);
    alert('Error importando movimientos: ' + (err?.message || err));
  }
});

// =============================
// 11. Diálogo de histórico
// =============================

function openAccountsDialog() {
  if (el.toolbarMenu) el.toolbarMenu.classList.remove('open');
  renderAccountsBalanceDialog();
  el.dlgAccounts?.showModal();
}

el.btnAccounts?.addEventListener('click', openAccountsDialog);
el.wealthCard?.addEventListener('click', openWealthDialog);
el.btnCloseWealth?.addEventListener('click', () => el.dlgWealth?.close());
el.adjustRealBalance?.addEventListener('input', refreshAdjustmentDifference);
el.btnCancelBalanceAdjustment?.addEventListener('click', () => el.dlgBalanceAdjustment?.close());
el.btnSaveBalanceAdjustment?.addEventListener('click', async () => {
  const accountId = el.dlgBalanceAdjustment?.dataset.accountId;
  const real = parseAmountToCents(el.adjustRealBalance?.value || '');
  if (!accountId || Number.isNaN(real)) { alert('Introduce un saldo real válido.'); return; }
  try {
    const changed = await saveBalanceAdjustment(accountId, real, el.adjustNote?.value.trim() || '');
    el.dlgBalanceAdjustment?.close();
    if (!changed) { alert('El saldo ya coincide con Cashly.'); return; }
    // El listener de Firestore refrescará los saldos; cerramos el detalle para evitar mostrar datos antiguos.
    el.dlgAccountDetail?.close();
  } catch (err) { console.error(err); alert('Error ajustando saldo: ' + (err?.message || err)); }
});

el.btnCloseAccountDetail?.addEventListener('click', () => el.dlgAccountDetail?.close());

el.btnCloseAccounts?.addEventListener('click', () => {
  el.dlgAccounts?.close();
});

el.btnOpenHistory?.addEventListener('click', () => {
  if (!el.dlgHistory) return;
  el.dlgHistory.showModal();

  // Renderizamos el gráfico justo al abrir (el canvas ya tiene tamaño)
  setTimeout(() => {
    renderHistoryChart();
  }, 0);
});

el.btnCloseHistory?.addEventListener('click', () => {
  el.dlgHistory?.close();
});
