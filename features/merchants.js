export function normalizeMerchantName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function suggestExpenseCategory(merchant) {
  const normalized = normalizeMerchantName(merchant);

  const mappings = [
    { category:'groceries', words:['mercadona','carrefour','lidl','aldi','eroski','alcampo','supermercado'] },
    { category:'restaurants', words:['restaurante','restaurant','cafeteria','cafe','mcdonald','burger king','telepizza','glovo','uber eats','just eat'] },
    { category:'transport', words:['repsol','cepsa','shell','renfe','iryo','ouigo','uber','cabify','parking'] },
    { category:'shopping', words:['amazon','zara','pull&bear','bershka','primark','ikea','decathlon','mediamarkt'] },
    { category:'subscriptions', words:['netflix','spotify','apple.com/bill','amazon prime','youtube','disney'] }
  ];

  const match = mappings.find(group =>
    group.words.some(word => normalized.includes(word))
  );
  return match?.category || 'other_exp';
}

export function initMerchantSuggestions({ state, el, CATEGORY_BY_ID, onBlurCategorySuggestion }) {
  function getMerchantSuggestions(searchText, maxResults = 6) {
    const search = normalizeMerchantName(searchText);
    if (search.length < 2) return [];

    const merchants = new Map();
    for (const tx of state.txs) {
      const currentType = el.radioIncome.checked ? 'income' : 'expense';
      if (tx.type !== currentType) continue;

      const merchant = String(tx.merchant || '').trim();
      if (!merchant) continue;

      const normalizedMerchant = normalizeMerchantName(merchant);
      if (!normalizedMerchant.includes(search)) continue;

      const existing = merchants.get(normalizedMerchant);
      if (existing) {
        existing.count += 1;
        if (tx.categoryId) existing.categoryId = tx.categoryId;
      } else {
        merchants.set(normalizedMerchant, {
          merchant,
          categoryId: tx.categoryId || (tx.type === 'income' ? 'other_inc' : 'other_exp'),
          count: 1
        });
      }
    }

    return Array.from(merchants.values())
      .sort((a,b) => {
        const aStarts = normalizeMerchantName(a.merchant).startsWith(search);
        const bStarts = normalizeMerchantName(b.merchant).startsWith(search);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return b.count - a.count;
      })
      .slice(0, maxResults);
  }

  function hideMerchantSuggestions() {
    if (!el.merchantSuggestions) return;
    el.merchantSuggestions.hidden = true;
    el.merchantSuggestions.innerHTML = '';
  }

  function renderMerchantSuggestions() {
    if (!el.inputMerchant || !el.merchantSuggestions) {
      hideMerchantSuggestions();
      return;
    }

    const suggestions = getMerchantSuggestions(el.inputMerchant.value);
    el.merchantSuggestions.innerHTML = '';

    if (!suggestions.length) {
      hideMerchantSuggestions();
      return;
    }

    for (const suggestion of suggestions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'merchant-suggestion';
      const category = CATEGORY_BY_ID[suggestion.categoryId];
      button.innerHTML = `
        <span>${suggestion.merchant}</span>
        <small>${category?.emoji || ''} ${category?.name || ''}</small>
      `;
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => {
        el.inputMerchant.value = suggestion.merchant;
        const categoryExists = Array.from(el.selectCategory.options)
          .some(option => option.value === suggestion.categoryId);
        if (categoryExists) el.selectCategory.value = suggestion.categoryId;
        hideMerchantSuggestions();
        el.selectCategory.focus();
      });
      el.merchantSuggestions.appendChild(button);
    }

    el.merchantSuggestions.hidden = false;
  }

  window.getMerchantSuggestions = getMerchantSuggestions;
  window.renderMerchantSuggestions = renderMerchantSuggestions;

  el.inputMerchant?.addEventListener('input', renderMerchantSuggestions);
  el.inputMerchant?.addEventListener('blur', () => {
    setTimeout(hideMerchantSuggestions, 100);
    onBlurCategorySuggestion?.();
  });
  el.inputMerchant?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onBlurCategorySuggestion?.();
    hideMerchantSuggestions();
    el.selectCategory?.focus();
  });

  return { getMerchantSuggestions, renderMerchantSuggestions, hideMerchantSuggestions };
}
