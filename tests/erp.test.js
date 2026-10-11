import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { LocalStore } from "../src/infrastructure/local-store.js";
import { LocalAssets } from "../src/infrastructure/local-assets.js";
import { Erp } from "../src/application/erp.js";
import {
  productionCost,
  defaultSettings,
  suggestedPrice,
  dashboard,
} from "../src/domain/model.js";
import { startServer } from "../src/server.js";

const product = (overrides = {}) => ({
  name: "Árvore giratória",
  sku: "ARV-001",
  collection: "Natal",
  material: "PLA Creality",
  price: 100,
  stock: 10,
  minStock: 2,
  costs: {
    weightGrams: 100,
    wasteGrams: 20,
    filamentKgPrice: 100,
    printHours: 2,
    powerWatts: 100,
    laborMinutes: 30,
    primer: 1,
    paint: 2,
    sandpaper: 1,
    glue: 0,
    packaging: 2,
    license: 1,
    other: 0,
    failurePercent: 10,
  },
  images: [],
  ...overrides,
});
const sale = (p) => ({
  date: "2026-10-05",
  channelId: "direct",
  payment: "Pix",
  items: [{ productId: p.id, quantity: 2, unitPrice: 100 }],
  discount: 10,
  shippingCharged: 15,
  shippingCost: 20,
  advertising: 5,
  feePercent: 10,
  fixedFee: 2,
  taxPercent: 5,
  paymentPercent: 1,
});
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "slicer-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new LocalStore(dir),
    assets = new LocalAssets(dir);
  await store.init();
  await assets.init();
  return { dir, store, assets, erp: new Erp(store, assets) };
}

test("custo inclui descarte, energia, depreciação, trabalho e perdas compostas", () => {
  const c = productionCost(product(), defaultSettings());
  assert.equal(c.filament, 12);
  assert.equal(c.energy, 0.2);
  assert.equal(c.machine, 3);
  assert.equal(c.labor, 12.5);
  assert.equal(c.failure, 1.69);
  assert.equal(c.total, 36.39);
  assert.equal(
    suggestedPrice(30, { feePercent: 10, fixedFee: 0, taxPercent: 0 }, 25),
    46.15,
  );
  assert.equal(
    suggestedPrice(30, { feePercent: 60, fixedFee: 0, taxPercent: 0 }, 50),
    null,
  );
});
test("venda salva fotografia financeira; atualização não altera o passado; cancelamento devolve estoque uma vez", async (t) => {
  const { erp, store } = await fixture(t),
    p = await erp.saveProduct(product()),
    s = await erp.sale(sale(p));
  assert.equal(s.revenue, 205);
  assert.equal(s.production, 72.78);
  assert.equal(s.fees, 24.55);
  assert.equal(s.taxes, 10.25);
  assert.equal(s.profit, 72.42);
  assert.equal((await store.read()).products[0].stock, 8);
  await erp.saveProduct(
    product({ stock: 8, costs: { weightGrams: 1000, filamentKgPrice: 300 } }),
    p.id,
  );
  assert.equal((await store.read()).sales[0].production, 72.78);
  await erp.cancelSale(s.id);
  assert.equal((await store.read()).products[0].stock, 10);
  await assert.rejects(erp.cancelSale(s.id), /já foi cancelada/);
  assert.equal((await store.read()).products[0].stock, 10);
  assert.equal((await erp.state()).dashboard.orders, 0);
});
test("concorrência não vende estoque duplicado e erro não deixa baixa parcial", async (t) => {
  const { erp, store } = await fixture(t),
    p = await erp.saveProduct(product({ stock: 2 }));
  const results = await Promise.allSettled([
    erp.sale(sale(p)),
    erp.sale(sale(p)),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await store.read()).products[0].stock, 0);
  assert.equal((await store.read()).sales.length, 1);
  await assert.rejects(
    erp.sale({
      ...sale(p),
      items: [{ productId: p.id, quantity: -1, unitPrice: 100 }],
    }),
  );
});
test("validação rejeita SKU repetido, NaN, estoque fracionado e item duplicado", async (t) => {
  const { erp } = await fixture(t),
    p = await erp.saveProduct(product());
  await assert.rejects(erp.saveProduct(product()), /SKU/);
  await assert.rejects(
    erp.saveProduct(product({ sku: "OTHER", stock: 1.5 })),
    /inteiro/,
  );
  await assert.rejects(
    erp.saveProduct(product({ sku: "OTHER", costs: { weightGrams: "oops" } })),
    /número/,
  );
  await assert.rejects(
    erp.sale({ ...sale(p), items: [...sale(p).items, ...sale(p).items] }),
    /repetido/,
  );
  await assert.rejects(
    erp.sale({ ...sale(p), date: "2026-02-31" }),
    /data válida/,
  );
  await assert.rejects(erp.sale({ ...sale(p), discount: 999 }), /Desconto/);
});
test("filtros financeiros, despesas gerais e exclusão de produto preservam histórico", async (t) => {
  const { erp, store } = await fixture(t),
    p = await erp.saveProduct(product());
  await erp.sale(sale(p));
  await erp.expense({
    date: "2026-10-06",
    description: "Sistema",
    category: "Software",
    amount: 20,
  });
  assert.equal((await erp.state()).dashboard.net, 52.42);
  assert.equal((await erp.state({ payment: "Pix" })).dashboard.net, null);
  assert.equal((await erp.state({ from: "2026-11-01" })).dashboard.orders, 0);
  await erp.deleteProduct(p.id);
  assert.equal((await erp.state()).products.length, 0);
  assert.equal(dashboard(await store.read()).orders, 1);
});
test("persistência sobrevive à reabertura e gera backup anterior à alteração", async (t) => {
  const { erp, store, dir } = await fixture(t);
  await erp.saveProduct(product());
  const reopened = new LocalStore(dir);
  await reopened.init();
  assert.equal((await reopened.read()).products.length, 1);
  const backups = await readdir(path.join(dir, "backups"));
  assert.equal(backups.length, 1);
  assert.equal(
    JSON.parse(await readFile(path.join(dir, "backups", backups[0]), "utf8"))
      .products.length,
    0,
  );
  assert.equal((await store.read()).schemaVersion, 1);
});
test("arquivos são validados e identificadores não permitem atravessar diretórios", async (t) => {
  const { assets } = await fixture(t);
  await assert.rejects(
    assets.put({
      name: "attack.html",
      data: Buffer.from("<script>").toString("base64"),
    }),
  );
  await assert.rejects(
    assets.put({
      name: "photo.png",
      data: Buffer.from("fake").toString("base64"),
    }),
  );
  const file = await assets.put({
    name: "modelo.stl",
    data: Buffer.from("solid example\nendsolid").toString("base64"),
  });
  assert.equal((await assets.bytes(file.id)).name, "modelo.stl");
  assert.equal(await assets.get("../../secret"), null);
});
test("HTTP protege gravações, origem e host; gravação e download funcionam", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "slicer-http-"));
  const { server, url } = await startServer({ port: 0, directory: dir });
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  });
  const session = await (await fetch(url + "/api/session")).json();
  assert.equal(
    (
      await fetch(url + "/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(product()),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url + "/api/state", {
        headers: { Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  const wrongHost = await new Promise((resolve, reject) => {
    http
      .get(url + "/api/state", { headers: { Host: "evil.example" } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on("error", reject);
  });
  assert.equal(wrongHost, 403);
  const saved = await fetch(url + "/api/products", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-local-token": session.token,
    },
    body: JSON.stringify(product()),
  });
  assert.equal(saved.status, 201);
  assert.equal(
    (await (await fetch(url + "/api/state")).json()).products.length,
    1,
  );
  assert.equal((await fetch(url + "/")).status, 200);
  assert.equal(
    (await fetch(url + "/api/export")).headers.get("content-disposition"),
    'attachment; filename="slicer-dados.json"',
  );
  await assert.rejects(
    startServer({ port: 0, directory: dir }),
    /outra instância/,
  );
});
