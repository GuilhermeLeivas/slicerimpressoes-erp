import test from "node:test";
import assert from "node:assert/strict";
import {
  productPricing,
  saleComparison,
  quoteSale,
  money,
} from "../src/domain/pricing.js";
import {
  defaultSettings,
  validateProduct,
  createSale,
  dashboard,
} from "../src/domain/model.js";
const settings = () => ({
  ...defaultSettings(),
  channels: [
    { id: "direct", name: "Direta", feePercent: 0, taxPercent: 0, fixedFee: 0 },
    {
      id: "market",
      name: "Loja A",
      feePercent: 15,
      taxPercent: 0,
      fixedFee: 0,
    },
    { id: "other", name: "Loja B", feePercent: 10, taxPercent: 5, fixedFee: 2 },
  ],
});
const product = () => ({
  ...validateProduct({
    name: "Produto",
    sku: "A",
    price: 9999,
    stock: 10,
    channelIds: ["direct", "market", "other"],
    costs: { other: 30 },
  }),
  id: "p",
});
test("preço-base automático e N preços por plataforma; valor manual ignorado", () => {
  const p = product(),
    prices = productPricing(p, settings());
  assert.equal(prices.basePrice, 42.86);
  assert.deepEqual(
    prices.channels.map((c) => c.price),
    [42.86, 54.55, 58.18],
  );
  assert.equal(p.price, undefined);
  p.channelIds = ["market"];
  assert.equal(productPricing(p, settings()).channels.length, 1);
  p.channelIds = [];
  assert.equal(productPricing(p, settings()).channels.length, 0);
  delete p.channelIds;
  assert.equal(productPricing(p, settings()).channels.length, 3);
});
test("previsão se reconcilia exatamente com preço, desconto, frete, publicidade, taxas e produção", () => {
  const channel = settings().channels[1],
    sale = {
      items: [{ unitCost: 30, unitPrice: 52, quantity: 2 }],
      discount: 4,
      shippingCharged: 10,
      shippingCost: 18,
      advertising: 5,
      feePercent: 16,
      paymentPercent: 2,
      fixedFee: 3,
      taxPercent: 1,
      actualProductionCost: 65,
    };
  const c = saleComparison(sale, channel, 30);
  assert.equal(c.actualProfit, quoteSale(sale).profit);
  assert.equal(c.gap, money(c.actualProfit - c.expectedProfit));
  assert.equal(
    money(Object.values(c.impacts).reduce((n, v) => n + v, 0)),
    c.gap,
  );
  assert.equal(c.impacts.production, -5);
  assert.equal(c.impacts.advertising, -5);
  assert.equal(c.impacts.shipping, -9.5);
  assert.equal(c.impacts.discount, -3.4);
  assert.ok(c.impacts.price < 0);
  assert.ok(c.impacts.fees < 0);
});
test("diferença favorável e margem inviável são explícitas", () => {
  const sale = { items: [{ unitCost: 30, unitPrice: 80, quantity: 1 }] };
  const c = saleComparison(sale, settings().channels[0], 30);
  assert.ok(c.gap > 0);
  assert.equal(c.actualProfit, 50);
  assert.equal(
    saleComparison(sale, { feePercent: 70, taxPercent: 0, fixedFee: 0 }, 30),
    null,
  );
});
test("fotografia da previsão não muda com configurações futuras; filtros e cancelamento respeitados", () => {
  const st = {
    settings: settings(),
    products: [product()],
    sales: [],
    expenses: [],
  };
  const input = {
    channelId: "market",
    date: "2026-10-06",
    payment: "Pix",
    items: [{ productId: "p", quantity: 1, unitPrice: 54.55 }],
    shippingCost: 10,
    actualProductionCost: 35,
  };
  const sale = createSale(input, st, "s", "now");
  assert.equal(sale.production, 35);
  assert.equal(sale.comparison.impacts.production, -5);
  assert.equal(sale.comparison.actualProfit, sale.profit);
  const before = JSON.stringify(sale);
  st.sales.push(sale);
  st.settings.targetMargin = 50;
  st.settings.channels[1].feePercent = 20;
  assert.equal(JSON.stringify(sale), before);
  assert.equal(dashboard(st).comparison.gap, sale.comparison.gap);
  assert.equal(dashboard(st, { payment: "Dinheiro" }).comparison.covered, 0);
  st.sales.push({ ...sale, id: "old", comparison: undefined });
  assert.equal(dashboard(st).comparison.uncovered, 1);
  sale.status = "cancelled";
  assert.equal(dashboard(st).comparison.covered, 0);
  assert.throws(() =>
    createSale({ ...input, actualProductionCost: -1 }, st, "bad", "now"),
  );
});
