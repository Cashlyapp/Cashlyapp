export function normalizeShortcutAmount(value) {
  return String(value || '')
    .replace(/EUR/gi, '')
    .replace(/€/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function getShortcutExpenseFromUrl(todayISO) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('newExpense') !== '1') return null;

  const amount = normalizeShortcutAmount(params.get('amount'));
  const merchant = (params.get('merchant') || '').trim();
  const paymentCard = (params.get('card') || '').trim();
  const date = (params.get('date') || '').trim();

  return {
    amount: amount.slice(0, 30),
    merchant: merchant.slice(0, 120),
    paymentCard: paymentCard.slice(0, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO()
  };
}
