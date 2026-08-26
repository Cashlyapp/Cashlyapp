// Capa de acceso a Firestore para cuentas

let _db = null;
let _user = null;
let _col = null;
let _fs = null;
let _unsubscribe = null;

export const ACCOUNT_TYPES = Object.freeze({
  BANK: 'bank',
  CASH: 'cash'
});

export const DEFAULT_ACCOUNT_IDS = Object.freeze({
  MAIN: 'main-bank',
  CASH: 'cash'
});

function ensureReady() {
  if (!_db || !_user || !_col || !_fs) {
    throw new Error('Servicio de cuentas no inicializado');
  }
}

/**
 * @typedef {Object} InternalAccount
 * @property {string} id
 * @property {string} name
 * @property {'bank'|'cash'} type
 * @property {number} initialBalanceCents
 * @property {string} initialBalanceDate
 * @property {boolean} archived
 */
function mapDocToAccount(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    ...data,
    name: typeof data.name === 'string' ? data.name : '',
    type: Object.values(ACCOUNT_TYPES).includes(data.type)
      ? data.type
      : ACCOUNT_TYPES.BANK,
    initialBalanceCents: Number.isFinite(data.initialBalanceCents)
      ? data.initialBalanceCents
      : 0,
    initialBalanceDate:
      typeof data.initialBalanceDate === 'string'
        ? data.initialBalanceDate.slice(0, 10)
        : '',
    archived: data.archived === true
  };
}

export function isAccountsReady() {
  return !!(_db && _user && _col && _fs);
}

/**
 * Inicializa el listener de cuentas del usuario actual.
 * La colección puede estar vacía en la Fase 1.
 */
export async function initAccountsListener(callbackOnData) {
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
    _fs = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
    );
  }

  const { collection, onSnapshot } = _fs;
  _col = collection(_db, 'users', _user.uid, 'accounts');

  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  _unsubscribe = onSnapshot(
    _col,
    (snap) => {
      const list = snap.docs
        .map(mapDocToAccount)
        .sort((a, b) => {
          if (a.archived !== b.archived) return a.archived ? 1 : -1;
          return (a.name || '').localeCompare(b.name || '', 'es');
        });

      callbackOnData(list);
    },
    (err) => {
      console.error('Firestore accounts error:', err);
    }
  );
}

/**
 * Crea una cuenta. No se usa todavía desde la UI; queda preparado para Fase 2.
 */
export async function createAccount(accountData) {
  ensureReady();

  const { addDoc, serverTimestamp } = _fs;
  const type = Object.values(ACCOUNT_TYPES).includes(accountData.type)
    ? accountData.type
    : ACCOUNT_TYPES.BANK;

  return addDoc(_col, {
    name: (accountData.name || '').trim(),
    type,
    initialBalanceCents: Number.isFinite(accountData.initialBalanceCents)
      ? accountData.initialBalanceCents
      : 0,
    initialBalanceDate: accountData.initialBalanceDate || '',
    archived: accountData.archived === true,
    createdAt: serverTimestamp()
  });
}


/**
 * Crea las cuentas iniciales de Cashly si todavía no existen.
 * Usa IDs deterministas para evitar duplicados aunque se ejecute más de una vez.
 */
export async function ensureDefaultAccounts(initialBalanceDate = '') {
  ensureReady();

  const { doc, getDoc, setDoc, serverTimestamp } = _fs;
  const date = initialBalanceDate || new Date().toISOString().slice(0, 10);

  const defaults = [
    {
      id: DEFAULT_ACCOUNT_IDS.MAIN,
      name: 'Cuenta principal',
      type: ACCOUNT_TYPES.BANK
    },
    {
      id: DEFAULT_ACCOUNT_IDS.CASH,
      name: 'Efectivo',
      type: ACCOUNT_TYPES.CASH
    }
  ];

  for (const account of defaults) {
    const ref = doc(_db, 'users', _user.uid, 'accounts', account.id);
    const snap = await getDoc(ref);

    if (snap.exists()) continue;

    await setDoc(ref, {
      name: account.name,
      type: account.type,
      initialBalanceCents: 0,
      initialBalanceDate: date,
      archived: false,
      createdAt: serverTimestamp()
    });
  }
}


/** Actualiza el saldo de partida y su fecha de corte. */
export async function updateAccountOpeningBalance(accountId, initialBalanceCents, initialBalanceDate) {
  ensureReady();
  if (!accountId) throw new Error('Cuenta no válida');
  if (!Number.isFinite(initialBalanceCents)) throw new Error('Saldo no válido');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(initialBalanceDate || '')) throw new Error('Fecha no válida');

  const { doc, updateDoc, serverTimestamp } = _fs;
  const ref = doc(_db, 'users', _user.uid, 'accounts', accountId);
  await updateDoc(ref, {
    initialBalanceCents: Math.round(initialBalanceCents),
    initialBalanceDate,
    updatedAt: serverTimestamp()
  });
}
