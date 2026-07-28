// categories.js
// =============================
// Categorías de movimientos
// =============================

export const CATEGORIES = [
  // INGRESOS
  { id: 'salary',          type: 'income', name: 'Nómina',                emoji: '💼' },
  { id: 'transfers_inc',   type: 'income', name: 'Bizum / Transferencias', emoji: '💸' },
  { id: 'sales_inc',       type: 'income', name: 'Ventas',                 emoji: '🏷️' },
  { id: 'refunds_inc',     type: 'income', name: 'Devoluciones',           emoji: '↩️' },
  { id: 'gifts_inc',       type: 'income', name: 'Regalos',                emoji: '🎁' },
  { id: 'investments_inc', type: 'income', name: 'Inversiones',            emoji: '📈' },
  { id: 'other_inc',       type: 'income', name: 'Otros ingresos',         emoji: '➕' },

  // GASTOS
  { id: 'other_exp',     type: 'expense', name: 'Otros gastos',   emoji: '➖' },
  { id: 'groceries',     type: 'expense', name: 'Supermercado',   emoji: '🛒' },
  { id: 'rent',          type: 'expense', name: 'Alquiler',       emoji: '🏠' },
  { id: 'bills',         type: 'expense', name: 'Facturas',       emoji: '💡' },
  { id: 'transport',     type: 'expense', name: 'Transporte',     emoji: '🚗' },
  { id: 'restaurants',   type: 'expense', name: 'Restaurantes',   emoji: '🍽️' },
  { id: 'leisure',       type: 'expense', name: 'Ocio',           emoji: '🎉' },
  { id: 'selfcare',      type: 'expense', name: 'SelfCare',       emoji: '💆🏽' },
  { id: 'shopping',      type: 'expense', name: 'Compras',        emoji: '🛍️' },
  { id: 'wedding',       type: 'expense', name: 'Boda',           emoji: '👰🏻‍♀️' },
  { id: 'subscriptions', type: 'expense', name: 'Suscripciones',  emoji: '👨🏽‍💻' }
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
);

export const CHART_COLORS = [
  '#ff6b6b', // rojo
  '#feca57', // amarillo
  '#1dd1a1', // verde
  '#54a0ff', // azul
  '#5f27cd', // morado
  '#f368e0', // rosa
  '#c8d6e5', // gris claro
];

export const COLOR_HISTORY_INCOME  = '#22c55e'; // verde ingresos
export const COLOR_HISTORY_EXPENSE = '#f97316'; // naranja gastos
export const COLOR_HISTORY_BALANCE = '#6366f1'; // línea saldo


