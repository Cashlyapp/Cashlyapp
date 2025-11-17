// categories.js
// =============================
// Categorías de movimientos
// =============================

export const CATEGORIES = [
  // INGRESOS
  { id: 'salary',       type: 'income',  name: 'Nómina',         emoji: '💼' },
  { id: 'extra_inc',    type: 'income',  name: 'Extras',         emoji: '💸' },
  { id: 'refunds_inc',  type: 'income',  name: 'Devoluciones',   emoji: '↩️' },
  { id: 'other_inc',    type: 'income',  name: 'Otros ingresos', emoji: '➕' },

  // GASTOS
  { id: 'groceries',    type: 'expense', name: 'Supermercado',   emoji: '🛒' },
  { id: 'rent',         type: 'expense', name: 'Alquiler',       emoji: '🏠' },
  { id: 'bills',        type: 'expense', name: 'Facturas',       emoji: '💡' },
  { id: 'transport',    type: 'expense', name: 'Transporte',     emoji: '🚗' },
  { id: 'restaurants',  type: 'expense', name: 'Restaurantes',   emoji: '🍽️' },
  { id: 'leisure',      type: 'expense', name: 'Ocio',           emoji: '🎉' },
  { id: 'selfcare',     type: 'expense', name: 'SelfCare',       emoji: '💆🏽' },
  { id: 'shopping',     type: 'expense', name: 'Compras',        emoji: '🛍️' },
  { id: 'other_exp',    type: 'expense', name: 'Otros gastos',   emoji: '➖' }
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
);
