import type { Employee, Company } from "@/lib/types";

export const GUEST_KEY = "majorstockx-guest-mode";
export const GUEST_DURATION_MINUTES = 30;

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const started = localStorage.getItem(GUEST_KEY);
    if (!started) return false;
    const elapsed = Date.now() - parseInt(started, 10);
    if (elapsed > GUEST_DURATION_MINUTES * 60 * 1000) {
      localStorage.removeItem(GUEST_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getGuestRemainingMinutes(): number {
  if (typeof window === "undefined") return 0;
  try {
    const started = localStorage.getItem(GUEST_KEY);
    if (!started) return 0;
    const elapsed = Date.now() - parseInt(started, 10);
    const left = GUEST_DURATION_MINUTES - Math.floor(elapsed / (60 * 1000));
    return Math.max(1, left);
  } catch {
    return 0;
  }
}

export function enterGuestMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_KEY, Date.now().toString());
  } catch {
    /* ignore */
  }
}

export function exitGuestMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}

export const GUEST_COMPANY: Company = {
  id: "demo-company",
  name: "Ferragens & Mercearia Modelo (Convidado)",
  businessType: "reseller",
  phone: "+258 84 000 0000",
  address: "Av. 24 de Julho, Maputo",
  taxId: "400123456",
  email: "demo@majorstockx.app",
  locations: [
    { id: "Armazém Principal", name: "Armazém Principal" },
    { id: "Pátio de Produção", name: "Pátio de Produção" },
    { id: "Loja Principal", name: "Loja Principal" }
  ],
  validUnits: ["un", "saco", "kg", "m³", "barra", "rolo", "balde", "lata", "garrafão", "fardo", "caixa"],
  validCategories: [
    "Materiais de Construção",
    "Coberturas",
    "Ferragens",
    "Ferramentas",
    "Consumíveis",
    "Canalização",
    "Eletricidade",
    "Tintas & Acabamento",
    "Acessórios Pintura",
    "Adesivos & Químicos",
    "Mercearia Grossista",
    "Bebidas",
    "Higiene & Limpeza"
  ]
};

export const GUEST_USER: Employee = {
  id: "guest-user",
  username: "Convidado (Teste)",
  email: "convidado@majorstockx.demo",
  role: "Admin",
  companyId: "demo-company",
  permissions: {
    dashboard: "write",
    diagnostico: "write",
    inventory: "write",
    sales: "write",
    customers: "write",
    production: "write",
    "raw-materials": "write",
    finance: "write",
    orders: "write",
    reports: "write",
    users: "write",
    settings: "write"
  }
};
