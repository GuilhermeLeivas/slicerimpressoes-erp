import {
  money,
  productionCost,
  quoteSale,
  saleComparison,
  paymentFor,
} from "./pricing.js";
export { money, productionCost, suggestedPrice } from "./pricing.js";
export class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const fail = (message) => {
  throw new DomainError(message);
};
export const paymentNames = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Boleto",
  "Outro",
];
function validatePayments(payments = []) {
  if (!Array.isArray(payments) || payments.length > 6)
    fail("Pagamentos inválidos.");
  const result = payments.map((p) => {
    if (!paymentNames.includes(p.name)) fail("Forma de pagamento inválida.");
    return {
      name: p.name,
      feePercent: number(p.feePercent, "Taxa do pagamento", 95),
      fixedFee: money(number(p.fixedFee, "Taxa fixa do pagamento")),
    };
  });
  if (new Set(result.map((p) => p.name)).size !== result.length)
    fail("Pagamentos duplicados.");
  return result;
}
export function number(value, label, max = 10000000) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > max)
    fail(`${label}: informe um número entre 0 e ${max}.`);
  return n;
}
export function integer(value, label, max = 100000) {
  const n = number(value, label, max);
  if (!Number.isInteger(n)) fail(`${label}: use um número inteiro.`);
  return n;
}
export function text(value, label, max = 200, required = false) {
  if (typeof value !== "string") value = "";
  const result = value.trim();
  if (result.length > max || (required && !result))
    fail(
      `${label}: ${required ? "campo obrigatório; " : ""}máximo de ${max} caracteres.`,
    );
  return result;
}
export function date(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    fail("Informe uma data válida.");
  return value;
}
export const costFields = [
  "weightGrams",
  "wasteGrams",
  "filamentKgPrice",
  "printHours",
  "powerWatts",
  "laborMinutes",
  "primer",
  "paint",
  "sandpaper",
  "glue",
  "packaging",
  "license",
  "other",
  "failurePercent",
];
export const defaultSettings = () => ({
  brand: "Slicer",
  tagline: "Sua casa, camada por camada.",
  accent: "#a9ed87",
  logoId: "",
  energyKwh: 1,
  machineHour: 1.5,
  laborHour: 25,
  targetMargin: 30,
  channels: [
    {
      id: "direct",
      name: "Venda direta",
      feePercent: 0,
      fixedFee: 0,
      taxPercent: 0,
    },
    {
      id: "marketplace",
      name: "Marketplace (configure taxas)",
      feePercent: 0,
      fixedFee: 0,
      taxPercent: 0,
    },
  ],
});
export function validateSettings(input) {
  const s = {
    brand: text(input.brand, "Marca", 60, true),
    tagline: text(input.tagline, "Assinatura", 140),
    logoId: text(input.logoId, "Logo", 100),
    accent: input.accent,
  };
  if (!/^#[\da-fA-F]{6}$/.test(s.accent))
    fail("Cor inválida. Use o formato #a9ed87.");
  for (const k of ["energyKwh", "machineHour", "laborHour", "targetMargin"])
    s[k] = number(input[k], k, k === "targetMargin" ? 95 : 100000);
  if (
    !Array.isArray(input.channels) ||
    !input.channels.length ||
    input.channels.length > 30
  )
    fail("Cadastre entre 1 e 30 canais.");
  s.channels = input.channels.map((c) => ({
    id: text(c.id, "Código do canal", 80, true),
    name: text(c.name, "Nome do canal", 80, true),
    type: c.type ?? "marketplace",
    payments: validatePayments(c.payments),
    feePercent: number(c.feePercent, "Taxa", 95),
    fixedFee: money(number(c.fixedFee, "Taxa fixa")),
    taxPercent: number(c.taxPercent, "Impostos", 95),
  }));
  if (new Set(s.channels.map((c) => c.id)).size !== s.channels.length)
    fail("Canais duplicados.");
  for (const c of s.channels) {
    if (!["direct", "marketplace", "own-store"].includes(c.type))
      fail("Tipo de canal inválido.");
    if (
      c.payments.some((p) => c.feePercent + c.taxPercent + p.feePercent >= 100)
    )
      fail("Taxas do canal e pagamento devem somar menos de 100%.");
    if (c.feePercent + c.taxPercent >= 100)
      fail("Taxas e impostos devem somar menos de 100%.");
  }
  return s;
}
export function validateProduct(input) {
  const p = {
    name: text(input.name, "Nome", 120, true),
    sku: text(input.sku, "SKU", 60, true),
    collection: text(input.collection, "Coleção", 80),
    material: text(input.material, "Material", 80),
    color: text(input.color, "Cor", 80),
    dimensions: text(input.dimensions, "Dimensões", 100),
    description: text(input.description, "Descrição", 4000),
    productType: input.productType ?? "print3d",
    components: [],
    channelIds: input.channelIds,
    stock: integer(input.stock, "Estoque"),
    minStock: integer(input.minStock, "Estoque mínimo"),
    costs: {},
    images: input.images || [],
    modelId: text(input.modelId, "Arquivo 3D", 100),
  };
  if (!["print3d", "frame", "composite"].includes(p.productType))
    fail("Tipo de produto inválido.");
  if (
    !Array.isArray(input.components ?? []) ||
    (input.components ?? []).length > 50
  )
    fail("Use até 50 componentes.");
  p.components = (input.components ?? []).map((c) => {
    const quantity = number(c.quantity, "Quantidade do componente", 100000);
    if (!quantity) fail("Quantidade do componente deve ser maior que zero.");
    const unitCost = money(number(c.unitCost, "Custo do componente", 1000000));
    number(quantity * unitCost, "Total do componente");
    return {
      name: text(c.name, "Nome do componente", 120, true),
      quantity,
      unitCost,
    };
  });
  for (const k of costFields)
    p.costs[k] = number(
      input.costs?.[k],
      k,
      k === "failurePercent" ? 90 : 1000000,
    );
  if (
    p.channelIds !== undefined &&
    (!Array.isArray(p.channelIds) ||
      p.channelIds.length > 30 ||
      p.channelIds.some((id) => typeof id !== "string") ||
      new Set(p.channelIds).size !== p.channelIds.length)
  )
    fail("Selecione plataformas válidas, sem repetições.");
  if (
    !Array.isArray(p.images) ||
    p.images.length > 6 ||
    p.images.some((id) => typeof id !== "string" || id.length > 100)
  )
    fail("Use até seis imagens.");
  return p;
}
export function createSale(input, state, id, now) {
  const channel = state.settings.channels.find((c) => c.id === input.channelId);
  if (!channel) fail("Selecione um canal de venda válido.");
  if (
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 100
  )
    fail("Adicione de 1 a 100 produtos.");
  const seen = new Set();
  const items = input.items.map((i) => {
    if (seen.has(i.productId))
      fail("Produto repetido. Ajuste a quantidade na mesma linha.");
    seen.add(i.productId);
    const p = state.products.find((p) => p.id === i.productId && !p.archived);
    if (!p) fail("Produto não encontrado.");
    const quantity = integer(i.quantity, "Quantidade");
    if (!quantity) fail("Quantidade deve ser maior que zero.");
    if (quantity > p.stock)
      fail(`Estoque insuficiente para ${p.name}: disponível ${p.stock}.`);
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      collection: p.collection,
      quantity,
      unitPrice: money(number(i.unitPrice, "Preço unitário")),
      unitCost: productionCost(p, state.settings).total,
      costBreakdown: productionCost(p, state.settings),
    };
  });
  const discount = money(number(input.discount, "Desconto"));
  const subtotal = money(
    items.reduce((v, i) => v + i.quantity * i.unitPrice, 0),
  );
  if (discount > subtotal)
    fail("Desconto não pode superar o valor dos produtos.");
  const shippingCharged = money(number(input.shippingCharged, "Frete cobrado"));
  const shippingCost = money(number(input.shippingCost, "Custo do frete"));
  const advertising = money(number(input.advertising, "Publicidade"));
  const feePercent = number(
    input.feePercent ?? channel.feePercent,
    "Taxa da plataforma",
    95,
  );
  const fixedFee = money(
    number(input.fixedFee ?? channel.fixedFee, "Taxa fixa"),
  );
  const taxPercent = number(
    input.taxPercent ?? channel.taxPercent,
    "Impostos",
    95,
  );
  const paymentProfile = paymentFor(channel, input.payment);
  const paymentPercent = number(
    input.paymentPercent ?? paymentProfile.feePercent,
    "Taxa de pagamento",
    95,
  );
  const paymentFixedFee = money(
    number(
      input.paymentFixedFee ?? paymentProfile.fixedFee,
      "Taxa fixa do pagamento",
    ),
  );
  const actualProductionCost =
    input.actualProductionCost === "" || input.actualProductionCost == null
      ? null
      : money(number(input.actualProductionCost, "Produção real do pedido"));
  if (feePercent + taxPercent + paymentPercent >= 100)
    fail("A soma das taxas deve ser menor que 100%.");
  const { revenue, production, fees, taxes, profit } = quoteSale({
    actualProductionCost,
    items,
    discount,
    shippingCharged,
    shippingCost,
    advertising,
    feePercent,
    paymentPercent,
    paymentFixedFee,
    fixedFee,
    taxPercent,
  });
  const payment = text(input.payment, "Pagamento", 30, true);
  if (
    ![
      "Pix",
      "Cartão de crédito",
      "Cartão de débito",
      "Dinheiro",
      "Boleto",
      "Outro",
    ].includes(payment)
  )
    fail("Forma de pagamento inválida.");
  return {
    id,
    date: date(input.date),
    createdAt: now,
    status: "completed",
    channelId: channel.id,
    channelName: channel.name,
    customer: text(input.customer, "Cliente", 120),
    reference: text(input.reference, "Referência", 100),
    notes: text(input.notes, "Observações", 2000),
    payment,
    items,
    subtotal,
    discount,
    shippingCharged,
    shippingCost,
    advertising,
    feePercent,
    fixedFee,
    taxPercent,
    paymentPercent,
    paymentFixedFee,
    revenue,
    production,
    fees,
    taxes,
    profit,
    actualProductionCost,
    comparison: saleComparison(
      {
        items,
        discount,
        shippingCharged,
        shippingCost,
        advertising,
        feePercent,
        paymentPercent,
        paymentFixedFee,
        fixedFee,
        taxPercent,
        actualProductionCost,
      },
      channel,
      state.settings.targetMargin,
      paymentProfile,
    ),
  };
}
export function dashboard(state, filter = {}) {
  const matchDate = (d) =>
    (!filter.from || d >= filter.from) && (!filter.to || d <= filter.to);
  const sales = state.sales.filter(
    (s) =>
      s.status === "completed" &&
      matchDate(s.date) &&
      (!filter.channel || s.channelId === filter.channel) &&
      (!filter.payment || s.payment === filter.payment),
  );
  const sum = (key) => money(sales.reduce((v, s) => v + s[key], 0));
  const expenses = money(
    state.expenses
      .filter((e) => matchDate(e.date))
      .reduce((v, e) => v + e.amount, 0),
  );
  const revenue = sum("revenue"),
    contribution = sum("profit");
  const months = new Map(),
    products = new Map(),
    channels = new Map();
  for (const s of sales) {
    const month = s.date.slice(0, 7),
      m = months.get(month) || { month, revenue: 0, production: 0, profit: 0 };
    for (const k of ["revenue", "production", "profit"])
      m[k] = money(m[k] + s[k]);
    months.set(month, m);
    const ch = channels.get(s.channelId) || {
      name: s.channelName,
      revenue: 0,
      profit: 0,
      orders: 0,
    };
    ch.revenue = money(ch.revenue + s.revenue);
    ch.profit = money(ch.profit + s.profit);
    ch.orders++;
    channels.set(s.channelId, ch);
    for (const i of s.items) {
      const p = products.get(i.productId) || {
        name: i.name,
        quantity: 0,
        revenue: 0,
      };
      p.quantity += i.quantity;
      p.revenue = money(p.revenue + i.quantity * i.unitPrice);
      products.set(i.productId, p);
    }
  }
  return {
    revenue,
    comparison: {
      covered: sales.filter((s) => s.comparison).length,
      uncovered: sales.filter((s) => !s.comparison).length,
      expected: money(
        sales.reduce((n, s) => n + (s.comparison?.expectedProfit ?? 0), 0),
      ),
      actual: money(
        sales.reduce((n, s) => n + (s.comparison?.actualProfit ?? 0), 0),
      ),
      gap: money(sales.reduce((n, s) => n + (s.comparison?.gap ?? 0), 0)),
      impacts: Object.fromEntries(
        [
          "price",
          "discount",
          "shipping",
          "advertising",
          "fees",
          "production",
        ].map((k) => [
          k,
          money(sales.reduce((n, s) => n + (s.comparison?.impacts[k] ?? 0), 0)),
        ]),
      ),
    },
    production: sum("production"),
    fees: sum("fees"),
    taxes: sum("taxes"),
    shipping: sum("shippingCost"),
    advertising: sum("advertising"),
    contribution,
    expenses,
    net:
      filter.channel || filter.payment ? null : money(contribution - expenses),
    orders: sales.length,
    units: sales.reduce(
      (v, s) => v + s.items.reduce((n, i) => n + i.quantity, 0),
      0,
    ),
    average: sales.length ? money(revenue / sales.length) : 0,
    margin: revenue ? money((contribution / revenue) * 100) : 0,
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue),
    channels: [...channels.values()].sort((a, b) => b.revenue - a.revenue),
  };
}
