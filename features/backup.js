export function initBackup({
  state,
  el,
  saveTransaction,
  isTransactionsReady,
  todayISO,
  CATEGORY_BY_ID
}) {
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

  el.btnExportCSV?.addEventListener('click', () => exportCSV(state, CATEGORY_BY_ID));

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

        promises.push(saveTransaction({
          type: item.type === 'transfer'
            ? 'transfer'
            : (item.type === 'income' ? 'income' : 'expense'),
          amountCents: item.amountCents,
          category: item.type === 'transfer'
            ? null
            : (item.categoryId || (item.type === 'income' ? 'other_inc' : 'other_exp')),
          date: typeof item.date === 'string' ? item.date.slice(0, 10) : todayISO(),
          merchant: item.type === 'transfer' ? '' : (item.merchant || ''),
          accountId: item.type === 'transfer' ? null : (item.accountId || null),
          fromAccountId: item.type === 'transfer' ? (item.fromAccountId || null) : null,
          toAccountId: item.type === 'transfer' ? (item.toAccountId || null) : null,
          paymentCard: item.type === 'transfer' ? '' : (item.paymentCard || ''),
          note: item.note || '',
          source: item.source || 'import',
          recurringFreq: '',
          recurringEndsOn: ''
        }, null));
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
}

export function exportCSV(state, CATEGORY_BY_ID) {
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
