import type { Employee, Company, Product, Sale, Expense, Customer, StockMovement, Order, Production, AppNotification } from "@/lib/types";
import { DEMO_PRODUCTS } from "@/lib/demo-data";

export const GUEST_KEY = "majorstockx-guest-mode";
export const GUEST_DURATION_MINUTES = 30;

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const started = localStorage.getItem(GUEST_KEY);
    if (!started) return false;
    const elapsed = Date.now() - parseInt(started, 10);
    if (elapsed > GUEST_DURATION_MINUTES * 60 * 1000) {
      exitGuestMode();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getGuestRemainingSeconds(): number {
  if (typeof window === "undefined") return 0;
  try {
    const started = localStorage.getItem(GUEST_KEY);
    if (!started) return 0;
    const elapsed = Date.now() - parseInt(started, 10);
    const totalSeconds = GUEST_DURATION_MINUTES * 60;
    const left = totalSeconds - Math.floor(elapsed / 1000);
    return Math.max(0, left);
  } catch {
    return 0;
  }
}

export function enterGuestMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_KEY, Date.now().toString());
    sessionStorage.removeItem("majorstockx-guest-dismissed");
  } catch {
    /* ignore */
  }
}

export function exitGuestMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem("majorstockx-guest-sales");
    localStorage.removeItem("majorstockx-guest-products");
    localStorage.removeItem("majorstockx-guest-expenses");
    localStorage.removeItem("majorstockx-guest-customers");
    sessionStorage.removeItem("majorstockx-guest-dismissed");
  } catch {
    /* ignore */
  }
}

// -----------------------------------------------------------------------------
// Empresa e Usuário Convidado
// -----------------------------------------------------------------------------

export const GUEST_COMPANY: Company = {
  id: "demo-company",
  name: "Ferragens & Construção Central (Convidado)",
  businessType: "manufacturer",
  phone: "+258 84 300 1234",
  address: "Av. de Moçambique, Km 7, Maputo",
  taxId: "400891234",
  email: "contacto@ferragenscentral.co.mz",
  curingDays: 3,
  countEveryDays: 30,
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
  username: "Gestor Comercial",
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

// -----------------------------------------------------------------------------
// Clientes Reais de Moçambique (8 clientes ativos)
// -----------------------------------------------------------------------------

export const INITIAL_GUEST_CUSTOMERS: Customer[] = [
  {
    id: "cust-01",
    name: "Construtora Horizonte & Filhos, Lda",
    phone: "+258 84 312 9900",
    email: "obras@horizonte.co.mz",
    totalPurchases: 148500,
    lastVisit: daysAgoIso(1, 10, 30),
    notes: "Grande empreiteiro em Maputo — compras semanais de cimento, varões e chapas."
  },
  {
    id: "cust-02",
    name: "Mestre Inácio Chissano",
    phone: "+258 82 455 1200",
    totalPurchases: 62400,
    lastVisit: daysAgoIso(0, 9, 15),
    notes: "Mestre de obras Matola Rio — paga sempre por M-Pesa."
  },
  {
    id: "cust-03",
    name: "Mercearia Popular da Machava",
    phone: "+258 84 890 3344",
    email: "popularmachava@gmail.com",
    totalPurchases: 94250,
    lastVisit: daysAgoIso(2, 14, 20),
    notes: "Revenda grossista de arroz, óleo vegetal, sabão e água mineral."
  },
  {
    id: "cust-04",
    name: "Eng. Carlos Machava",
    phone: "+258 87 220 4455",
    totalPurchases: 48900,
    lastVisit: daysAgoIso(3, 11, 45),
    notes: "Moradia privada na Sommerschield 2 — compras de tintas, acabamentos e disjuntores."
  },
  {
    id: "cust-05",
    name: "Dona Maria Muthemba",
    phone: "+258 84 551 8822",
    totalPurchases: 32600,
    lastVisit: daysAgoIso(0, 11, 10),
    notes: "Construção de dependências e reabilitação na Costa do Sol."
  },
  {
    id: "cust-06",
    name: "Ferragens Polana Caniço",
    phone: "+258 84 102 7788",
    totalPurchases: 54100,
    lastVisit: daysAgoIso(5, 16, 0),
    notes: "Revendedor local de pregos, tubos PVC, fitas e acessórios."
  },
  {
    id: "cust-07",
    name: "Restaurante & Bar Zambézia",
    phone: "+258 84 901 0022",
    totalPurchases: 18200,
    lastVisit: daysAgoIso(4, 15, 30),
    notes: "Compra semanal de fardos de água mineral e sabão de limpeza."
  },
  {
    id: "cust-08",
    name: "Consumidor Final (Balcão)",
    phone: "",
    totalPurchases: 27800,
    lastVisit: daysAgoIso(0, 12, 0),
    notes: "Vendas diretas no balcão a dinheiro e M-Pesa."
  }
];

// -----------------------------------------------------------------------------
// Despesas dos Últimos 30 Dias (Financeiro consistente)
// -----------------------------------------------------------------------------

export const INITIAL_GUEST_EXPENSES: Expense[] = [
  {
    id: "exp-01",
    description: "Electricidade EDM — Fábrica de Blocos & Armazém",
    amount: 14500,
    category: "Energia",
    date: daysAgoIso(3, 10, 0),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  },
  {
    id: "exp-02",
    description: "Combustível Carrinha Isuzu (Entregas aos clientes)",
    amount: 18000,
    category: "Transporte",
    date: daysAgoIso(5, 14, 30),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  },
  {
    id: "exp-03",
    description: "Salários da Quinzena — 4 Operários de Produção",
    amount: 48000,
    category: "Salários",
    date: daysAgoIso(12, 17, 0),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  },
  {
    id: "exp-04",
    description: "Aluguer do Armazém Principal e Pátio",
    amount: 35000,
    category: "Instalações",
    date: daysAgoIso(18, 9, 0),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  },
  {
    id: "exp-05",
    description: "Internet Fibra Vodacom Empresas (Mensalidade)",
    amount: 4500,
    category: "Comunicações",
    date: daysAgoIso(8, 11, 0),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  },
  {
    id: "exp-06",
    description: "Água FIPAG — Consumo Industrial de Betão",
    amount: 3200,
    category: "Água",
    date: daysAgoIso(10, 15, 0),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  },
  {
    id: "exp-07",
    description: "Manutenção Preventiva da Prensa Vibromoldadora",
    amount: 7500,
    category: "Manutenção",
    date: daysAgoIso(15, 16, 30),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  },
  {
    id: "exp-08",
    description: "Material de Escritório, Papel de Faturação e Limpeza",
    amount: 2100,
    category: "Operacional",
    date: daysAgoIso(22, 10, 0),
    status: "Pago",
    registeredBy: "Gestor Comercial"
  }
];

// -----------------------------------------------------------------------------
// Vendas Reais dos Últimos 30 Dias (~36 vendas com distribuição dinâmica)
// -----------------------------------------------------------------------------

function generateInitialGuestSales(): Sale[] {
  const sales: Sale[] = [
    // --- HOJE ---
    createSaleItem("s-01", daysAgoIso(0, 9, 15), "demo-cim-01", "Cimento Portland 32.5N Limak 50kg", 20, 580, 480, "VD-2026/0348", "Venda a Dinheiro", "Mestre Inácio Chissano", "cust-02", "M-Pesa", "Armazém Principal"),
    createSaleItem("s-02", daysAgoIso(0, 10, 30), "demo-blo-02", "Bloco de Betão 15 cm", 250, 42, 28, "VD-2026/0349", "Venda a Dinheiro", "Dona Maria Muthemba", "cust-05", "Numerário", "Pátio de Produção"),
    createSaleItem("s-03", daysAgoIso(0, 11, 45), "demo-agu-29", "Água Mineral 500 ml (Fardo c/ 24)", 5, 380, 280, "VD-2026/0350", "Venda a Dinheiro", "Consumidor Final (Balcão)", "cust-08", "M-Pesa", "Loja Principal"),
    createSaleItem("s-04", daysAgoIso(0, 13, 0), "demo-arr-26", "Arroz Vaporizado 25 kg", 4, 1350, 1150, "VD-2026/0351", "Venda a Dinheiro", "Consumidor Final (Balcão)", "cust-08", "Numerário", "Armazém Principal"),

    // --- ONTEM ---
    createSaleItem("s-05", daysAgoIso(1, 10, 0), "demo-var-04", "Varão de Aço 12 mm (12m)", 15, 690, 560, "FT-2026/0141", "Factura", "Construtora Horizonte & Filhos, Lda", "cust-01", "Transferência", "Setor Metais"),
    createSaleItem("s-06", daysAgoIso(1, 11, 20), "demo-cha-07", "Chapa de Zinco IBR 0.40mm x 6m", 20, 780, 620, "FT-2026/0142", "Factura", "Construtora Horizonte & Filhos, Lda", "cust-01", "Transferência", "Armazém B"),
    createSaleItem("s-07", daysAgoIso(1, 14, 10), "demo-tin-22", "Tinta Acrílica Branca 20 L", 3, 4950, 3800, "VD-2026/0345", "Venda a Dinheiro", "Eng. Carlos Machava", "cust-04", "POS / Cartão", "Setor Tintas"),
    createSaleItem("s-08", daysAgoIso(1, 15, 30), "demo-pre-08", "Prego de Cabeça Redonda 3\"", 10, 130, 85, "VD-2026/0346", "Venda a Dinheiro", "Mestre Inácio Chissano", "cust-02", "M-Pesa", "Prateleira F1"),

    // --- HÁ 2 DIAS ---
    createSaleItem("s-09", daysAgoIso(2, 9, 30), "demo-arr-26", "Arroz Vaporizado 25 kg", 25, 1350, 1150, "FT-2026/0140", "Factura", "Mercearia Popular da Machava", "cust-03", "M-Pesa", "Palete Alimentar 1"),
    createSaleItem("s-10", daysAgoIso(2, 10, 45), "demo-ole-27", "Óleo Vegetal 5 L", 10, 590, 490, "FT-2026/0140", "Factura", "Mercearia Popular da Machava", "cust-03", "M-Pesa", "Palete Alimentar 2"),
    createSaleItem("s-11", daysAgoIso(2, 15, 0), "demo-tub-14", "Tubo PVC Esgoto 110mm x 6m", 6, 690, 520, "VD-2026/0343", "Venda a Dinheiro", "Ferragens Polana Caniço", "cust-06", "Numerário", "Corredor Tubagens"),

    // --- HÁ 3 DIAS ---
    createSaleItem("s-12", daysAgoIso(3, 10, 0), "demo-blo-02", "Bloco de Betão 15 cm", 400, 42, 28, "GR-2026/0091", "Guia de Remessa", "Eng. Carlos Machava", "cust-04", "Transferência", "Pátio de Produção"),
    createSaleItem("s-13", daysAgoIso(3, 11, 30), "demo-are-05", "Areia Grossa de Rio", 4, 2500, 1800, "GR-2026/0091", "Guia de Remessa", "Eng. Carlos Machava", "cust-04", "Transferência", "Pátio Aberto"),
    createSaleItem("s-14", daysAgoIso(3, 14, 0), "demo-agu-29", "Água Mineral 500 ml (Fardo c/ 24)", 8, 380, 280, "VD-2026/0342", "Venda a Dinheiro", "Restaurante & Bar Zambézia", "cust-07", "Numerário", "Depósito Bebidas"),

    // --- HÁ 5 DIAS ---
    createSaleItem("s-15", daysAgoIso(5, 9, 0), "demo-cim-01", "Cimento Portland 32.5N Limak 50kg", 40, 580, 480, "FT-2026/0138", "Factura", "Construtora Horizonte & Filhos, Lda", "cust-01", "Transferência", "Armazém Principal"),
    createSaleItem("s-16", daysAgoIso(5, 11, 15), "demo-cab-18", "Cabo Elétrico Flexível 2.5mm² (100m)", 3, 2450, 1850, "VD-2026/0339", "Venda a Dinheiro", "Ferragens Polana Caniço", "cust-06", "M-Pesa", "Armazém Fechado"),
    createSaleItem("s-17", daysAgoIso(5, 16, 20), "demo-dis-19", "Disjuntor Bipolar DIN 20A", 6, 380, 240, "VD-2026/0340", "Venda a Dinheiro", "Ferragens Polana Caniço", "cust-06", "M-Pesa", "Painel Elétrico"),

    // --- HÁ 7 DIAS ---
    createSaleItem("s-18", daysAgoIso(7, 10, 0), "demo-acu-28", "Açúcar Castanho 50 kg", 6, 2850, 2450, "FT-2026/0136", "Factura", "Mercearia Popular da Machava", "cust-03", "Transferência", "Palete Alimentar 1"),
    createSaleItem("s-19", daysAgoIso(7, 11, 45), "demo-sab-30", "Sabão Azul 1 kg (Caixa c/ 20)", 4, 850, 680, "FT-2026/0136", "Factura", "Mercearia Popular da Machava", "cust-03", "Transferência", "Prateleira Limpeza"),
    createSaleItem("s-20", daysAgoIso(7, 14, 30), "demo-ver-23", "Verniz Marítimo 5 L", 2, 1750, 1250, "VD-2026/0337", "Venda a Dinheiro", "Dona Maria Muthemba", "cust-05", "Numerário", "Setor Tintas"),
    createSaleItem("s-21", daysAgoIso(7, 16, 0), "demo-rol-24", "Rolo de Pintura Anti-Gota 23cm", 3, 280, 180, "VD-2026/0337", "Venda a Dinheiro", "Dona Maria Muthemba", "cust-05", "Numerário", "Prateleira T1"),

    // --- HÁ 10 DIAS ---
    createSaleItem("s-22", daysAgoIso(10, 9, 30), "demo-cim-01", "Cimento Portland 32.5N Limak 50kg", 30, 580, 480, "VD-2026/0334", "Venda a Dinheiro", "Mestre Inácio Chissano", "cust-02", "M-Pesa", "Armazém Principal"),
    createSaleItem("s-23", daysAgoIso(10, 11, 0), "demo-var-03", "Varão de Aço 10 mm (12m)", 8, 490, 390, "VD-2026/0334", "Venda a Dinheiro", "Mestre Inácio Chissano", "cust-02", "M-Pesa", "Setor Metais"),
    createSaleItem("s-24", daysAgoIso(10, 15, 20), "demo-lam-20", "Lâmpada LED 9W E27 6500K", 12, 110, 60, "VD-2026/0335", "Venda a Dinheiro", "Consumidor Final (Balcão)", "cust-08", "Numerário", "Prateleira E2"),

    // --- HÁ 14 DIAS ---
    createSaleItem("s-25", daysAgoIso(14, 10, 15), "demo-blo-02", "Bloco de Betão 15 cm", 500, 42, 28, "FT-2026/0130", "Factura", "Construtora Horizonte & Filhos, Lda", "cust-01", "Transferência", "Pátio de Produção"),
    createSaleItem("s-26", daysAgoIso(14, 11, 30), "demo-bri-06", "Brita 1 para Betão", 5, 2850, 2100, "FT-2026/0130", "Factura", "Construtora Horizonte & Filhos, Lda", "cust-01", "Transferência", "Pátio Aberto"),
    createSaleItem("s-27", daysAgoIso(14, 14, 0), "demo-fec-10", "Fechadura de Embutir c/ Puxador", 4, 950, 650, "VD-2026/0331", "Venda a Dinheiro", "Eng. Carlos Machava", "cust-04", "POS / Cartão", "Vitrine Loja"),

    // --- HÁ 18 DIAS ---
    createSaleItem("s-28", daysAgoIso(18, 9, 45), "demo-arr-26", "Arroz Vaporizado 25 kg", 20, 1350, 1150, "FT-2026/0125", "Factura", "Mercearia Popular da Machava", "cust-03", "M-Pesa", "Palete Alimentar 1"),
    createSaleItem("s-29", daysAgoIso(18, 14, 10), "demo-agu-29", "Água Mineral 500 ml (Fardo c/ 24)", 10, 380, 280, "VD-2026/0328", "Venda a Dinheiro", "Restaurante & Bar Zambézia", "cust-07", "Numerário", "Depósito Bebidas"),
    createSaleItem("s-30", daysAgoIso(18, 16, 0), "demo-col-25", "Cola de Madeira PVA 1 kg", 3, 290, 190, "VD-2026/0329", "Venda a Dinheiro", "Consumidor Final (Balcão)", "cust-08", "Numerário", "Prateleira T2"),

    // --- HÁ 22 DIAS ---
    createSaleItem("s-31", daysAgoIso(22, 10, 0), "demo-cim-01", "Cimento Portland 32.5N Limak 50kg", 25, 580, 480, "FT-2026/0120", "Factura", "Construtora Horizonte & Filhos, Lda", "cust-01", "Transferência", "Armazém Principal"),
    createSaleItem("s-32", daysAgoIso(22, 11, 20), "demo-cha-07", "Chapa de Zinco IBR 0.40mm x 6m", 15, 780, 620, "FT-2026/0120", "Factura", "Construtora Horizonte & Filhos, Lda", "cust-01", "Transferência", "Armazém B"),
    createSaleItem("s-33", daysAgoIso(22, 15, 30), "demo-mar-11", "Martelo de Carpinteiro 500g", 2, 480, 320, "VD-2026/0322", "Venda a Dinheiro", "Mestre Inácio Chissano", "cust-02", "Numerário", "Painel Ferramentas"),

    // --- HÁ 26 DIAS ---
    createSaleItem("s-34", daysAgoIso(26, 10, 30), "demo-blo-02", "Bloco de Betão 15 cm", 300, 42, 28, "VD-2026/0318", "Venda a Dinheiro", "Dona Maria Muthemba", "cust-05", "M-Pesa", "Pátio de Produção"),
    createSaleItem("s-35", daysAgoIso(26, 14, 15), "demo-fit-13", "Fita Métrica 5m", 3, 220, 140, "VD-2026/0319", "Venda a Dinheiro", "Consumidor Final (Balcão)", "cust-08", "Numerário", "Painel Ferramentas"),

    // --- HÁ 28 DIAS ---
    createSaleItem("s-36", daysAgoIso(28, 9, 0), "demo-arr-26", "Arroz Vaporizado 25 kg", 15, 1350, 1150, "FT-2026/0115", "Factura", "Mercearia Popular da Machava", "cust-03", "Transferência", "Palete Alimentar 1"),
    createSaleItem("s-37", daysAgoIso(28, 11, 0), "demo-ole-27", "Óleo Vegetal 5 L", 8, 590, 490, "FT-2026/0115", "Factura", "Mercearia Popular da Machava", "cust-03", "Transferência", "Palete Alimentar 2"),
    createSaleItem("s-38", daysAgoIso(28, 15, 0), "demo-tor-16", "Torneira de Esfera 3/4\"", 4, 320, 210, "VD-2026/0312", "Venda a Dinheiro", "Ferragens Polana Caniço", "cust-06", "Numerário", "Gaveteiro Hidráulica"),
  ];

  return sales;
}

function createSaleItem(
  id: string,
  date: string,
  productId: string,
  productName: string,
  quantity: number,
  unitPrice: number,
  unitCost: number,
  guideNumber: string,
  documentType: Sale["documentType"],
  clientName: string,
  customerId: string,
  paymentMethod: string,
  location: string
): Sale {
  const subtotal = quantity * unitPrice;
  return {
    id,
    date,
    productId,
    productName,
    quantity,
    unitPrice,
    unitCost,
    subtotal,
    totalValue: subtotal,
    amountPaid: subtotal,
    soldBy: "Gestor Comercial",
    guideNumber,
    documentType,
    clientName,
    customerId,
    paymentMethod,
    location,
    status: "Pago"
  };
}

// -----------------------------------------------------------------------------
// Movimentos de Stock e Auditorias
// -----------------------------------------------------------------------------

export const INITIAL_GUEST_MOVEMENTS: StockMovement[] = [
  {
    id: "mov-01",
    productId: "demo-cim-01",
    productName: "Cimento Portland 32.5N Limak 50kg",
    type: "IN",
    quantity: 150,
    toLocationId: "Armazém Principal",
    reason: "Entrada Fornecedor — Limak Cimentos (Factura Forn. 8812)",
    userId: "guest-user",
    userName: "Gestor Comercial",
    timestamp: daysAgoIso(20, 9, 0),
  },
  {
    id: "mov-02",
    productId: "demo-blo-02",
    productName: "Bloco de Betão 15 cm",
    type: "IN",
    quantity: 1000,
    toLocationId: "Pátio de Produção",
    reason: "Lote de Produção Própria #142 (Vibropensada)",
    userId: "guest-user",
    userName: "Gestor Comercial",
    timestamp: daysAgoIso(15, 14, 0),
  },
  {
    id: "mov-03",
    productId: "demo-var-04",
    productName: "Varão de Aço 12 mm (12m)",
    type: "IN",
    quantity: 60,
    toLocationId: "Setor Metais",
    reason: "Descarga de Ferro da Matola",
    userId: "guest-user",
    userName: "Gestor Comercial",
    timestamp: daysAgoIso(10, 11, 0),
  },
  {
    id: "mov-04",
    productId: "demo-blo-02",
    productName: "Bloco de Betão 15 cm",
    type: "OUT",
    quantity: 4,
    fromLocationId: "Pátio de Produção",
    reason: "Perda/Quebra no manuseio de empilhador",
    userId: "guest-user",
    userName: "Gestor Comercial",
    timestamp: daysAgoIso(8, 16, 0),
  },
  {
    id: "mov-05",
    productId: "demo-cim-01",
    productName: "Cimento Portland 32.5N Limak 50kg",
    type: "OUT",
    quantity: 1,
    fromLocationId: "Armazém Principal",
    reason: "Saco rasgado durante descarregamento",
    userId: "guest-user",
    userName: "Gestor Comercial",
    timestamp: daysAgoIso(4, 15, 0),
  },
  {
    id: "mov-06",
    productId: "demo-arr-26",
    productName: "Arroz Vaporizado 25 kg",
    type: "ADJUSTMENT",
    quantity: 0,
    toLocationId: "Palete Alimentar 1",
    reason: "Auditoria e Contagem Física de Stock (Conferido)",
    userId: "guest-user",
    userName: "Gestor Comercial",
    timestamp: daysAgoIso(2, 10, 0),
  }
];

// -----------------------------------------------------------------------------
// Encomendas e Produção
// -----------------------------------------------------------------------------

export const INITIAL_GUEST_ORDERS: Order[] = [
  {
    id: "ord-01",
    productId: "demo-cha-07",
    productName: "Chapa de Zinco IBR 0.40mm x 6m",
    quantity: 30,
    unit: "un",
    unitPrice: 780,
    totalValue: 23400,
    clientName: "Construtora Horizonte & Filhos, Lda",
    deliveryDate: daysAgoIso(-2, 10, 0), // Entrega daqui a 2 dias
    location: "Armazém B",
    status: "Pendente",
    quantityProduced: 0,
    productionLogs: []
  },
  {
    id: "ord-02",
    productId: "demo-blo-02",
    productName: "Bloco de Betão 15 cm",
    quantity: 500,
    unit: "un",
    unitPrice: 42,
    totalValue: 21000,
    clientName: "Eng. Carlos Machava",
    deliveryDate: daysAgoIso(3, 14, 0),
    location: "Pátio de Produção",
    status: "Concluída",
    quantityProduced: 500,
    productionLogs: []
  }
];

export const INITIAL_GUEST_PRODUCTIONS: Production[] = [
  {
    id: "prod-01",
    date: daysAgoIso(2, 8, 30),
    productName: "Bloco de Betão 15 cm",
    quantity: 600,
    unit: "un",
    registeredBy: "Gestor Comercial",
    location: "Pátio de Produção",
    status: "Concluído"
  },
  {
    id: "prod-02",
    date: daysAgoIso(9, 8, 30),
    productName: "Bloco de Betão 15 cm",
    quantity: 800,
    unit: "un",
    registeredBy: "Gestor Comercial",
    location: "Pátio de Produção",
    status: "Concluído"
  }
];

// -----------------------------------------------------------------------------
// Notificações em Aberto (Sino de Notificações do Topo)
// -----------------------------------------------------------------------------

export const INITIAL_GUEST_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-01",
    message: "🔴 Stock Crítico: Varão de Aço 10 mm tem apenas 4 barras disponíveis.",
    date: daysAgoIso(0, 8, 0),
    read: false,
    type: "stock"
  },
  {
    id: "notif-02",
    message: "🔴 Stock Crítico: Tomada Dupla de Embutir tem apenas 2 unidades.",
    date: daysAgoIso(0, 8, 30),
    read: false,
    type: "stock"
  },
  {
    id: "notif-03",
    message: "🟡 Stock Baixo: Tinta Acrílica Branca 20 L abaixo do limite (9 baldes).",
    date: daysAgoIso(1, 14, 0),
    read: false,
    type: "stock"
  },
  {
    id: "notif-04",
    message: "💰 Nova Factura FT-2026/0141 emitida para Construtora Horizonte (6.900 MT).",
    date: daysAgoIso(1, 10, 5),
    read: true,
    type: "sale"
  },
  {
    id: "notif-05",
    message: "📋 Contagem física mensal concluída sem discrepâncias no Armazém Principal.",
    date: daysAgoIso(4, 17, 0),
    read: true,
    type: "stock"
  }
];

// -----------------------------------------------------------------------------
// Getters & Setters Reativos (Persistentes na Sessão do Convidado)
// -----------------------------------------------------------------------------

export function getGuestProducts(): Product[] {
  if (typeof window === "undefined") return DEMO_PRODUCTS;
  try {
    const raw = localStorage.getItem("majorstockx-guest-products");
    if (raw) return JSON.parse(raw);
    localStorage.setItem("majorstockx-guest-products", JSON.stringify(DEMO_PRODUCTS));
    return DEMO_PRODUCTS;
  } catch {
    return DEMO_PRODUCTS;
  }
}

export function deductGuestProductStock(productId: string, quantitySold: number): void {
  if (typeof window === "undefined") return;
  try {
    const prods = getGuestProducts();
    const updated = prods.map(p => {
      if (p.id === productId || p.name === productId) {
        return { ...p, stock: Math.max(0, p.stock - quantitySold) };
      }
      return p;
    });
    localStorage.setItem("majorstockx-guest-products", JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

export function getGuestSales(): Sale[] {
  if (typeof window === "undefined") return generateInitialGuestSales();
  try {
    const raw = localStorage.getItem("majorstockx-guest-sales");
    if (raw) return JSON.parse(raw);
    const initial = generateInitialGuestSales();
    localStorage.setItem("majorstockx-guest-sales", JSON.stringify(initial));
    return initial;
  } catch {
    return generateInitialGuestSales();
  }
}

export function addGuestSale(sale: Sale): void {
  if (typeof window === "undefined") return;
  try {
    const current = getGuestSales();
    const updated = [sale, ...current];
    localStorage.setItem("majorstockx-guest-sales", JSON.stringify(updated));
    deductGuestProductStock(sale.productId, sale.quantity);
  } catch {
    /* ignore */
  }
}

export function getGuestExpenses(): Expense[] {
  if (typeof window === "undefined") return INITIAL_GUEST_EXPENSES;
  try {
    const raw = localStorage.getItem("majorstockx-guest-expenses");
    if (raw) return JSON.parse(raw);
    localStorage.setItem("majorstockx-guest-expenses", JSON.stringify(INITIAL_GUEST_EXPENSES));
    return INITIAL_GUEST_EXPENSES;
  } catch {
    return INITIAL_GUEST_EXPENSES;
  }
}

export function addGuestExpense(expense: Expense): void {
  if (typeof window === "undefined") return;
  try {
    const current = getGuestExpenses();
    const updated = [expense, ...current];
    localStorage.setItem("majorstockx-guest-expenses", JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

export function getGuestCustomers(): Customer[] {
  if (typeof window === "undefined") return INITIAL_GUEST_CUSTOMERS;
  try {
    const raw = localStorage.getItem("majorstockx-guest-customers");
    if (raw) return JSON.parse(raw);
    localStorage.setItem("majorstockx-guest-customers", JSON.stringify(INITIAL_GUEST_CUSTOMERS));
    return INITIAL_GUEST_CUSTOMERS;
  } catch {
    return INITIAL_GUEST_CUSTOMERS;
  }
}

export function getGuestStockMovements(): StockMovement[] {
  return INITIAL_GUEST_MOVEMENTS;
}

export function getGuestOrders(): Order[] {
  return INITIAL_GUEST_ORDERS;
}

export function getGuestProductions(): Production[] {
  return INITIAL_GUEST_PRODUCTIONS;
}

export function getGuestNotifications(): AppNotification[] {
  return INITIAL_GUEST_NOTIFICATIONS;
}

// Helper date generator
function daysAgoIso(days: number, hour = 11, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
