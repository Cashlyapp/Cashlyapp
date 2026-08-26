import { toMonthKey } from '../core-utils.js';

export const APP_VERSION = 'v1.7.0';

export const state = {
  month: toMonthKey(new Date()),
  txs: [],
  accounts: [],
  chartExpenses: null,
  chartIncome: null,
  activeChartIndex: 0,
  chartHistory: null,
  statsCategoryChart: null,
  statsHistoryChart: null,
  wealthPageChart: null
};

window.__state = state;
