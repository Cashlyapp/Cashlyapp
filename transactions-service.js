// Capa de acceso a Firestore para transacciones

let _db = null;
let _user = null;
let _col = null;
let _fs = null;          // módulo de firestore (collection, addDoc, etc.)
let _unsubscribe = null; // para cancelar el onSnapshot si hiciera falta

function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @typedef {Object} InternalTx
 * @property {string} id
 * @property {'income'|'expense'} type
 * @property {number} amountCents
 * @property {string} categoryId
 * @property {string} date
 * @property {string} [note]
 * @property {{freq: 'monthly'|'weekly', endsOn: (string|null)}|null} [recurring]
 */
function mapDocToTx(docSnap) {
  const data = docSnap.data() || {};
  const dateField = data.date;
  let dateISO;

  if (typeof dateField === 'string') {
    // Ya viene como "YYYY-MM-DD"
    dateISO = dateField.slice(0, 10);
  } else if (dateField && typeof dateField.toDate === 'function') {
    // Timestamp de Firestore → Date local → cadena local
    dateISO = toLocalISODate(dateField.toDate());
  } else {
    // Por seguridad, hoy
    dateISO = toLocalISODate(new Date());
  }

  return {
    id: docSnap.id,
    ...data,
    date: dateISO // SIEMPRE string en memoria
  };
}



function ensureReady() {
  if (!_db || !_user || !_col || !_fs) {
    throw new Error('Servicio de transacciones no inicializado');
  }
}

/**
 * Devuelve true si el servicio está listo para hacer operaciones
 */
export function isTransactionsReady() {
  return !!(_db && _user && _col && _fs);
}

/**
 * Inicializa el listener de transacciones del usuario actual.
 * Llama a callbackOnData(lista) cada vez que hay cambios.
 */
export async function initTransactionsListener(callbackOnData) {
  if (!window.__firebase) {
    throw new Error('Firebase no inicializado todavía');
  }

  const { db, user } = window.__firebase;
  if (!db || !user) {
    throw new Error('Faltan db o user en __firebase');
  }

  _db = db;
  _user = user;

  if (!_fs) {
    _fs = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  }

  const { collection, onSnapshot, query, orderBy } = _fs;

  _col = collection(_db, 'users', _user.uid, 'transactions');

  // por si se vuelve a inicializar
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  const q = query(
    _col,
    orderBy('date', 'desc'),
    orderBy('createdAt', 'desc')
  );

  _unsubscribe = onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(mapDocToTx);
      callbackOnData(list);
    },
    (err) => {
      console.error(err);
      alert('Firestore error: ' + (err?.message || err));
    }
  );
}

/**
 * Crea o actualiza una transacción
 * formData es el objeto que ya construyes en main.js
 */
export async function saveTransaction(formData, editingId) {
  ensureReady();
  const {
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    query,
    where,
    getDocs
  } = _fs;

  const baseTx = {
    type: formData.type,
    amountCents: formData.amountCents,
    categoryId: formData.category,
    date: formData.date, // string YYYY-MM-DD
    note: formData.note || '',
    recurring: formData.recurringFreq
      ? {
          freq: formData.recurringFreq,
          endsOn: formData.recurringEndsOn || null
        }
      : null,
  };

  // 1) EDICIÓN: solo actualiza el documento, sin tocar cuotas futuras
  if (editingId) {
    const txRef = doc(_db, 'users', _user.uid, 'transactions', editingId);
    await updateDoc(txRef, {
      type: baseTx.type,
      amountCents: baseTx.amountCents,
      categoryId: baseTx.categoryId,
      date: baseTx.date,
      note: baseTx.note,
      recurring: baseTx.recurring,
    });
    return;
  }

  // 2) ALTA: creamos la transacción "base"
  await addDoc(_col, {
    type: baseTx.type,
    amountCents: baseTx.amountCents,
    categoryId: baseTx.categoryId,
    date: baseTx.date,
    note: baseTx.note,
    recurring: baseTx.recurring,
    createdAt: serverTimestamp()
  });

  // 3) Si es recurrente mensual → generamos futuras cuotas
  if (baseTx.recurring && baseTx.recurring.freq === 'monthly') {
    let endsDate = null;

    if (baseTx.recurring.endsOn) {
      // endsOn viene como "YYYY-MM-DD" → lo llevamos al final de ese día
      const tmp = new Date(baseTx.recurring.endsOn + 'T23:59:59');
      if (!Number.isNaN(tmp.getTime())) {
        endsDate = tmp;
      }
    }

    // Si falla la fecha, nos salimos
    const start = new Date(baseTx.date + 'T00:00:00');
    if (Number.isNaN(start.getTime())) return;

    // Seguridad: máximo 12 meses vista
    const fallbackEnd = new Date(start);
    fallbackEnd.setFullYear(fallbackEnd.getFullYear() + 1);

    if (!endsDate || endsDate > fallbackEnd) {
      endsDate = fallbackEnd;
    }

    // Cursor: primer día del mes de la fecha inicial
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (true) {
      // Siguiente mes, SIEMPRE día 1
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      if (cursor > endsDate) break;

      const futureDate = toLocalISODate(cursor);

      // 🔍 Evitar duplicados:
      // si ya hay un movimiento con mismo tipo + categoría + importe + fecha, no creamos otro
      const dupQuery = query(
        _col,
        where('type', '==', baseTx.type),
        where('categoryId', '==', baseTx.categoryId),
        where('amountCents', '==', baseTx.amountCents),
        where('date', '==', futureDate)
      );

      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        // Ya existe algo igual para ese día → saltamos ese mes
        continue;
      }

      // Crear la cuota futura
      await addDoc(_col, {
        type: baseTx.type,
        amountCents: baseTx.amountCents,
        categoryId: baseTx.categoryId,
        date: futureDate,          // ← siempre "YYYY-MM-01"
        note: baseTx.note || '',
        recurring: null,           // las cuotas son movimientos “normales”
        createdAt: serverTimestamp()
      });
    }
  }
}


/**
 * Elimina una transacción por id
 */
export async function deleteTransaction(id) {
  ensureReady();
  const { doc, deleteDoc } = _fs;
  await deleteDoc(doc(_db, 'users', _user.uid, 'transactions', id));
}
