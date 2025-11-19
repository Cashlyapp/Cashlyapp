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
  CHART_COLORS
} from './categories.js';

import {
  initTransactionsListener,
  saveTransaction,
  deleteTransaction,
  isTransactionsReady
} from './transactions-service.js';

/**
 * @typedef {Object} InternalTx
 * @property {string} id
 * @property {'income'|'expense'} type
 * @property {number} amountCents       // céntimos
 * @property {string} categoryId
 * @property {string} date              // ISO YYYY-MM-DD
 * @property {string} [note]
 * @property {{freq: 'monthly'|'weekly', endsOn: (string|null)}|null} [recurring]
 */


// =============================
// 2. Estado global y referencias DOM
// =============================

/** @type {{
 *   month: string,
 *   txs: InternalTx[],
 *   chartExpenses: any,
 *   chartIncome: any,
 *   activeChartIndex: number
 * }} */
const state = {
  month: toMonthKey(new Date()),
  txs: [],
  chartExpenses: null,
  chartIncome: null,
  activeChartIndex: 0
};


window.__state = state;

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
  inputNote:        document.getElementById('note'),
  radioIncome:      document.getElementById('typeIncome'),
  radioExpense:     document.getElementById('typeExpense'),
  recurringFreq:    document.getElementById('recurringFreq'),
  recurringEndsOn:  document.getElementById('recurringEndsOn'),

  // Export / import JSON
  btnExport:   document.getElementById('btnExport'),
  fileImport:  document.getElementById('fileImport'),

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

  // Diálogo borrar
  dlgConfirmDelete: document.getElementById('dlgConfirm'),
  btnConfirmDelete: document.getElementById('btnYes'),
  btnCancelDelete:  document.getElementById('btnNo')
};


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

// Poblar categorías del <select>
function initCategoryOptions() {
  el.selectCategory.innerHTML = '';
  const frag = document.createDocumentFragment();
  CATEGORIES.filter(c => c.type === 'expense').concat(
    CATEGORIES.filter(c => c.type === 'income')
  ).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.emoji} ${c.name}`;
    frag.appendChild(opt);
  });
  el.selectCategory.appendChild(frag);
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
  const cat = CATEGORY_BY_ID[tx.categoryId] || {
    name: 'Sin categoría',
    emoji: tx.type === 'income' ? '➕' : '➖'
  };

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
  titleDiv.textContent = tx.note || cat.name;

  const subDiv = document.createElement('div');
  subDiv.className = 'sub';

    const d = tx.date
    ? new Date(tx.date + 'T00:00:00')
    : new Date();


  // categoría + fecha en la línea pequeña
  subDiv.textContent = `${cat.name} • ${d.toLocaleDateString('es-ES')}`;

  mainDiv.appendChild(titleDiv);
  mainDiv.appendChild(subDiv);

  const amountDiv = document.createElement('div');
  amountDiv.className = 'amount';
  amountDiv.textContent =
    (tx.type === 'expense' ? '-' : '+') + ' ' + centsToEUR(tx.amountCents);

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

  // ----- Lista + estado vacío -----
  el.txList.innerHTML = '';
  if (!list.length) {
    toggleEmptyState(true);
  } else {
    toggleEmptyState(false);
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
    } else {
      // GASTOS: suman a gastos + donut
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
}

function toggleEmptyState(show) {
  if (!el.emptyState) return;
  el.emptyState.style.display = show ? 'block' : 'none';
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
// 5. Inicialización básica UI
// =============================

initCategoryOptions();
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
// 6. Diálogo de alta / edición
// =============================

function resetFormForNew() {
  el.form.reset();
  el.radioIncome.checked = true;
  el.inputDate.value = todayISO();
  el.recurringFreq.value = '';
  el.recurringEndsOn.value = '';
  el.dlgTitle.textContent = 'Nuevo movimiento';
  el.dlgTx.dataset.editingId = '';
  if (el.btnDeleteTx) el.btnDeleteTx.hidden = true;
}


function openEditDialog(tx) {
  el.form.reset();
  if (tx.type === 'income') el.radioIncome.checked = true;
  else el.radioExpense.checked = true;

  el.inputAmount.value = (tx.amountCents / 100).toString().replace('.', ',');
  el.inputDate.value = tx.date || todayISO();


  el.selectCategory.value = tx.categoryId || (tx.type === 'income' ? 'other_inc' : 'other_exp');
  el.inputNote.value = tx.note || '';

  if (tx.recurring && tx.recurring.freq) {
    el.recurringFreq.value = tx.recurring.freq;
    el.recurringEndsOn.value = tx.recurring.endsOn || '';
  } else {
    el.recurringFreq.value = '';
    el.recurringEndsOn.value = '';
  }

  el.dlgTitle.textContent = 'Editar movimiento';
  el.dlgTx.dataset.editingId = tx.id;
  if (el.btnDeleteTx) el.btnDeleteTx.hidden = false;

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

  const type = raw.type === 'income' ? 'income' : 'expense';

  const payload = {
    type,
    amountCents,
    category: raw.category || (type === 'income' ? 'other_inc' : 'other_exp'),
    date: raw.date,
    note: raw.note?.trim() || '',
    recurringFreq: raw.recurringFreq || '',
    recurringEndsOn: raw.recurringEndsOn || ''
  };

  if (!isTransactionsReady()) {
    alert('Firebase aún no está listo. Espera un momento y reintenta.');
    return;
  }

  try {
    const editingId = el.dlgTx.dataset.editingId || null;
    await saveTransaction(payload, editingId);
    el.dlgTx.close();
  } catch (e2) {
    console.error(e2);
    alert('Error al guardar: ' + (e2?.message || e2));
  }
});


// =============================
// 7. Integración con Firebase
// =============================

document.addEventListener('firebase-ready', () => {
  const { user } = window.__firebase || {};

  if (user && el.authInfo) {
    el.authInfo.textContent = `Conectado • ${user.email || user.uid.slice(0, 8)}`;
  }

  initTransactionsListener((txList) => {
    state.txs = txList;
    refreshList();
  }).catch(err => {
    console.error(err);
    alert('Error inicializando datos: ' + (err?.message || err));
  });
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
            type: item.type === 'income' ? 'income' : 'expense',
            amountCents: item.amountCents,
            category: item.categoryId || (item.type === 'income' ? 'other_inc' : 'other_exp'),
            date: typeof item.date === 'string'
              ? item.date.slice(0, 10)
              : todayISO(),
            note: item.note || '',
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
      category: tx.categoryId || (tx.type === 'income' ? 'other_inc' : 'other_exp'),
      date: tx.date,
      note: tx.merchant || '',
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

