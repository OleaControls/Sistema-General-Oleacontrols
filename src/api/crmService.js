const CRM_CLIENTS_KEY = 'olea_crm_clients';
const CRM_QUOTES_KEY = 'olea_crm_quotes';

const initialClients = [
  { id: 'CLI-001', name: 'Minera del Potosí S.A.', rfc: 'MPO920101XYZ', contact: 'Roberto Sierra', email: 'r.sierra@minera.mx', phone: '4421234567', address: 'Carretera Central KM 45, SLP', status: 'ACTIVE' },
  { id: 'CLI-002', name: 'Bebidas Globales S.A. de C.V.', rfc: 'BGL050812ABC', contact: 'Martha Cruz', email: 'm.cruz@bebidas.com', phone: '5512345678', address: 'Av. Industrial 102, Querétaro', status: 'ACTIVE' }
];

const initialQuotes = [
  { id: 'COT-2026-001', clientId: 'CLI-001', clientName: 'Minera del Potosí', date: '2026-02-20', total: 125000, status: 'ACCEPTED', poNumber: 'OC-98765' },
  { id: 'COT-2026-002', clientId: 'CLI-002', clientName: 'Bebidas Globales', date: '2026-02-24', total: 45000, status: 'SENT', poNumber: null }
];

export const crmService = {
  // Clientes
  async getClients() {
    const data = localStorage.getItem(CRM_CLIENTS_KEY);
    return data ? JSON.parse(data) : initialClients;
  },
  async saveClient(client) {
    const clients = await this.getClients();
    const newClient = { ...client, id: `CLI-${Math.floor(1000 + Math.random() * 9000)}` };
    localStorage.setItem(CRM_CLIENTS_KEY, JSON.stringify([...clients, newClient]));
    return newClient;
  },

  // Presupuestos (Quotes)
  async getQuotes() {
    const data = localStorage.getItem(CRM_QUOTES_KEY);
    return data ? JSON.parse(data) : initialQuotes;
  },
  async saveQuote(quote) {
    const quotes = await this.getQuotes();
    const newQuote = { ...quote, id: `COT-2026-${Math.floor(100 + Math.random() * 900)}`, status: 'DRAFT' };
    localStorage.setItem(CRM_QUOTES_KEY, JSON.stringify([...quotes, newQuote]));
    return newQuote;
  }
};
