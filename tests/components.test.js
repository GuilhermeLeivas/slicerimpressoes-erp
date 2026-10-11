import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProduct,
  validateSettings,
  defaultSettings,
  createSale,
  dashboard,
} from "../src/domain/model.js";
import {
  productionCost,
  productPricing,
  money,
} from "../src/domain/pricing.js";
const setup = () => {
  const settings = validateSettings({
    ...defaultSettings(),
    channels: [
      {
        id: "shop",
        name: "Nuvemshop",
        type: "own-store",
        feePercent: 2,
        fixedFee: 1,
        taxPercent: 3,
        payments: [
          { name: "Pix", feePercent: 1, fixedFee: 0.5 },
          { name: "Cartão de crédito", feePercent: 5, fixedFee: 2 },
        ],
      },
    ],
  });
  const product = {
    id: "frame",
    ...validateProduct({
      name: "Vice City",
      sku: "VC",
      productType: "frame",
      stock: 10,
      costs: { other: 10 },
      components: [
        { name: "Moldura", quantity: 1, unitCost: 20 },
        { name: "Arte impressa", quantity: 1, unitCost: 5 },
        { name: "Fixadores", quantity: 2, unitCost: 0.5 },
      ],
    }),
  };
  return { settings, products: [product], sales: [], expenses: [] };
};
test("componentes entram no custo, base e sugestões por canal/pagamento", () => {
  const state = setup(),
    p = state.products[0],
    cost = productionCost(p, state.settings),
    prices = productPricing(p, state.settings);
  assert.equal(cost.total, 36);
  assert.equal(cost.extras, 26);
  assert.equal(prices.basePrice, 51.43);
  assert.equal(prices.channels[0].payments[0].price, 58.59);
  assert.equal(prices.channels[0].payments[1].price, 65);
  delete p.components;
  assert.equal(productionCost(p, state.settings).total, 10);
});
test("venda multiplica componentes, cobra fixos uma vez e congela previsão e resultado", () => {
  const state = setup();
  const sale = createSale(
    {
      date: "2026-10-10",
      channelId: "shop",
      payment: "Cartão de crédito",
      items: [{ productId: "frame", quantity: 2, unitPrice: 65 }],
    },
    state,
    "s",
    "now",
  );
  assert.equal(sale.production, 72);
  assert.equal(sale.fees, 12.1);
  assert.equal(sale.taxes, 3.9);
  assert.equal(sale.profit, 42);
  assert.equal(sale.comparison.gap, 0);
  assert.equal(sale.items[0].costBreakdown.components[0].name, "Moldura");
  state.sales.push(sale);
  state.settings.channels[0].payments[1].feePercent = 50;
  state.products[0].components[0].unitCost = 999;
  assert.equal(sale.comparison.payment.feePercent, 5);
  assert.equal(dashboard(state).contribution, 42);
  assert.equal(dashboard(state, { payment: "Pix" }).orders, 0);
});
test("ajustes reais de pagamento e produção reconciliam a diferença", () => {
  const state = setup();
  const sale = createSale(
    {
      date: "2026-10-10",
      channelId: "shop",
      payment: "Pix",
      paymentPercent: 2,
      paymentFixedFee: 2,
      actualProductionCost: 40,
      shippingCost: 8,
      items: [{ productId: "frame", quantity: 1, unitPrice: 58.59 }],
    },
    state,
    "s",
    "now",
  );
  assert.equal(sale.comparison.actualProfit, sale.profit);
  assert.equal(
    money(Object.values(sale.comparison.impacts).reduce((a, b) => a + b, 0)),
    sale.comparison.gap,
  );
  assert.equal(sale.comparison.impacts.production, -4);
  assert.ok(sale.comparison.impacts.fees < 0);
});
test("rejeita componentes e taxas inválidos; preserva cadastros antigos", () => {
  const state = setup(),
    p = state.products[0];
  assert.throws(() =>
    validateProduct({
      ...p,
      components: [{ name: "", quantity: 1, unitCost: 1 }],
    }),
  );
  assert.throws(() =>
    validateProduct({
      ...p,
      components: [{ name: "A", quantity: 0, unitCost: 1 }],
    }),
  );
  assert.throws(() =>
    validateProduct({
      ...p,
      components: [{ name: "A", quantity: 1, unitCost: -1 }],
    }),
  );
  const settings = state.settings;
  settings.channels[0].payments[0].feePercent = 95;
  assert.throws(() => validateSettings(settings));
  const legacy = validateProduct({
    name: "Antigo",
    sku: "OLD",
    costs: { other: 10 },
  });
  assert.deepEqual(legacy.components, []);
  assert.equal(legacy.productType, "print3d");
  assert.deepEqual(
    validateSettings(defaultSettings()).channels[0].payments,
    [],
  );
});
