import { loadData, saveData } from '../storage.js';

export function resetBalances(dataDir) {
  const data = loadData(dataDir);

  const balances = {};
  for (const entry of data.log) {
    if (!balances[entry.exercise]) {
      balances[entry.exercise] = { balance: 0, unit: entry.unit || 'reps' };
    }
    balances[entry.exercise].balance += (entry.completed - entry.assigned);
  }

  for (const [exercise, info] of Object.entries(balances)) {
    if (info.balance !== 0) {
      data.log.push({
        date: new Date().toISOString(),
        exercise,
        unit: info.unit,
        assigned: info.balance > 0 ? info.balance : 0,
        completed: info.balance < 0 ? Math.abs(info.balance) : 0,
        pr: null,
      });
    }
  }

  saveData(dataDir, data);
}

export function resetAll(dataDir) {
  const data = loadData(dataDir);
  data.log = [];
  data.dailyChoice = null;
  saveData(dataDir, data);
}
