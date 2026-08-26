export const el = {
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
  ocrAccount:   document.getElementById('ocrAccount'),

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
