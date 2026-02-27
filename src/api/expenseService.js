const EXPENSES_KEY = 'olea_expenses_db';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const expenseService = {
  async getAll() {
    // Simulamos carga de red si hay conexión, si no, directo de LS
    if (navigator.onLine) await sleep(400);
    
    const data = localStorage.getItem(EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  },

  async save(expense) {
    const isOnline = navigator.onLine;
    if (isOnline) await sleep(600);
    
    const expenses = await this.getAll();
    const newExpense = {
      ...expense,
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      pendingSync: !isOnline, // Flag fundamental para PWA
      syncStatus: isOnline ? 'SYNCED' : 'OFFLINE'
    };
    
    const updated = [newExpense, ...expenses];
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    return newExpense;
  },

  // Simular la sincronización de fondo
  async syncPending() {
    if (!navigator.onLine) return;

    const expenses = await this.getAll();
    const pending = expenses.filter(e => e.pendingSync);
    
    if (pending.length === 0) return;

    await sleep(1000); // Simular tiempo de subida de todos los pendientes

    const updated = expenses.map(e => ({
      ...e,
      pendingSync: false,
      syncStatus: 'SYNCED'
    }));

    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    console.log(`[PWA Sync] ${pending.length} gastos sincronizados con el servidor.`);
  },

  async updateStatus(id, status, comment) {
    if (navigator.onLine) await sleep(400);
    const expenses = await this.getAll();
    const updated = expenses.map(exp => 
      exp.id === id ? { ...exp, status, lastComment: comment } : exp
    );
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    return true;
  }
};

// Listener global para sincronización automática
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    expenseService.syncPending();
  });
}
