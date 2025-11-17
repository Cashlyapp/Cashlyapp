// core-utils.js
// =============================
// Utilidades y constantes base
// =============================

export const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const monthNames = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic'
];

export const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Convierte un Date a clave de mes: "YYYY-MM"
 * @param {Date} d
 * @returns {string}
 */
export const toMonthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Convierte textos como "1.234,56 €", "1234.56", "12 34€" a céntimos (number)
 * @param {string|number} value
 * @returns {number} céntimos o NaN
 */
export function parseAmountToCents(value) {
  if (value == null) return NaN;

  let s = String(value)
    .normalize('NFKC')
    .replace(/[^\d,.\-]/g, '') // deja solo dígitos, . , -
    .replace(/\./g, '')        // quita separador de miles .
    .replace(',', '.');        // coma decimal → punto

  const n = parseFloat(s);
  if (isNaN(n)) return NaN;

  return Math.round(n * 100);
}

/**
 * Formatea céntimos a string "1.234,56 €"
 * @param {number} cents
 * @returns {string}
 */
export function centsToEUR(cents) {
  return fmtEUR.format((cents || 0) / 100);
}
