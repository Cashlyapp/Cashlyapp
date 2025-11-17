// Capa de acceso a Firestore para transacciones

let _db = null;
let _user = null;
let _col = null;
let _fs = null;          // módulo de firestore (collection, addDoc, etc.)
let _unsubscribe = null; // para cancelar el onSnapshot si hiciera falta

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
    dateISO = dateField.slice(0, 10);
  } else if (dateField && typeof dateField.toDate === 'function') {
    dateISO = dateField.toDate().toISOString().slice(0, 10);
  } else {
    dateISO = new Date().toISOString().slice(0, 10);
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
  const { addDoc, serverTimestamp, doc, updateDoc } = _fs;

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
    createdAt: serverTimestamp()
  };

  if (editingId) {
    await updateDoc(doc(_db, 'users', _user.uid, 'transactions', editingId), baseTx);
    return;
  }

  // Alta
  await addDoc(_col, baseTx);

  // Generar futuras recurrentes (si procede)
  if (baseTx.recurring && baseTx.recurring.freq) {
    const ends = baseTx.recurring.endsOn ? new Date(baseTx.recurring.endsOn) : null;
    let d = new Date(baseTx.date);

    while (true) {
      d = new Date(d);
      if (baseTx.recurring.freq === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (baseTx.recurring.freq === 'weekly') d.setDate(d.getDate() + 7);
      else break;

      if (ends && d > ends) break;

      const future = {
        ...baseTx,
        date: d.toISOString().slice(0, 10),
        recurring: null,
        createdAt: serverTimestamp()
      };
      await addDoc(_col, future);
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
