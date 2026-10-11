import { randomUUID } from "node:crypto";
import { productPricing } from "../domain/pricing.js";
import {
  DomainError,
  validateProduct,
  validateSettings,
  productionCost,
  createSale,
  dashboard,
  date,
  text,
  number,
  money,
} from "../domain/model.js";

// Ports: Store.read()/transaction(fn); AssetStore.put()/get(). No filesystem here.
export class Erp {
  /** @param {import('./ports.js').Store} store @param {import('./ports.js').AssetStore} assets */
  constructor(store, assets) {
    this.store = store;
    this.assets = assets;
  }
  async state(filters = {}) {
    const s = await this.store.read();
    return {
      ...s,
      products: s.products
        .filter((p) => !p.archived)
        .map((p) => {
          const pricing = productPricing(p, s.settings);
          return {
            ...p,
            price: pricing.basePrice,
            pricing,
            cost: productionCost(p, s.settings),
          };
        }),
      dashboard: dashboard(s, filters),
    };
  }
  async saveProduct(input, id) {
    const p = validateProduct(input);
    for (const asset of [...p.images, p.modelId].filter(Boolean)) {
      const a = await this.assets.get(asset);
      if (!a || (p.images.includes(asset) && !a.mime.startsWith("image/")))
        throw new DomainError("Anexo não encontrado ou incompatível.");
    }
    return this.store.transaction((s) => {
      p.channelIds ??= s.settings.channels.map((c) => c.id);
      if (
        p.channelIds.some((id) => !s.settings.channels.some((c) => c.id === id))
      )
        throw new DomainError(
          "Uma das plataformas não existe mais. Atualize a página.",
        );
      const old = id
        ? s.products.find((p) => p.id === id && !p.archived)
        : null;
      if (id && !old) throw new DomainError("Produto não encontrado.", 404);
      if (
        s.products.some(
          (x) =>
            !x.archived &&
            x.id !== id &&
            x.sku.toLowerCase() === p.sku.toLowerCase(),
        )
      )
        throw new DomainError("Já existe um produto com este SKU.");
      const now = new Date().toISOString(),
        item = {
          ...p,
          id: old?.id || randomUUID(),
          createdAt: old?.createdAt || now,
          updatedAt: now,
          archived: false,
        };
      if (!old || old.stock !== p.stock)
        s.movements.push({
          id: randomUUID(),
          productId: item.id,
          date: now,
          quantity: p.stock - (old?.stock || 0),
          reason: old ? "Ajuste manual" : "Estoque inicial",
        });
      if (old) Object.assign(old, item);
      else s.products.push(item);
      return item;
    });
  }
  async deleteProduct(id) {
    return this.store.transaction((s) => {
      const p = s.products.find((p) => p.id === id && !p.archived);
      if (!p) throw new DomainError("Produto não encontrado.", 404);
      p.archived = true;
      return { ok: true };
    });
  }
  async sale(input) {
    return this.store.transaction((s) => {
      const sale = createSale(input, s, randomUUID(), new Date().toISOString());
      for (const i of sale.items) {
        s.products.find((p) => p.id === i.productId).stock -= i.quantity;
        s.movements.push({
          id: randomUUID(),
          productId: i.productId,
          date: sale.createdAt,
          quantity: -i.quantity,
          reason: "Venda",
          saleId: sale.id,
        });
      }
      s.sales.push(sale);
      return sale;
    });
  }
  async cancelSale(id) {
    return this.store.transaction((s) => {
      const sale = s.sales.find((s) => s.id === id);
      if (!sale) throw new DomainError("Venda não encontrada.", 404);
      if (sale.status === "cancelled")
        throw new DomainError("Esta venda já foi cancelada.");
      sale.status = "cancelled";
      sale.cancelledAt = new Date().toISOString();
      for (const i of sale.items) {
        s.products.find((p) => p.id === i.productId).stock += i.quantity;
        s.movements.push({
          id: randomUUID(),
          productId: i.productId,
          date: sale.cancelledAt,
          quantity: i.quantity,
          reason: "Cancelamento de venda",
          saleId: id,
        });
      }
      return sale;
    });
  }
  async settings(input) {
    const settings = validateSettings(input);
    if (settings.logoId) {
      const a = await this.assets.get(settings.logoId);
      if (!a?.mime.startsWith("image/"))
        throw new DomainError("Logo inválido.");
    }
    return this.store.transaction((s) => {
      s.settings = settings;
      return settings;
    });
  }
  async expense(input) {
    const e = {
      id: randomUUID(),
      date: date(input.date),
      description: text(input.description, "Descrição", 200, true),
      category: text(input.category, "Categoria", 80, true),
      amount: money(number(input.amount, "Valor")),
    };
    if (!e.amount) throw new DomainError("Informe um valor maior que zero.");
    return this.store.transaction((s) => {
      s.expenses.push(e);
      return e;
    });
  }
  async deleteExpense(id) {
    return this.store.transaction((s) => {
      const i = s.expenses.findIndex((e) => e.id === id);
      if (i < 0) throw new DomainError("Despesa não encontrada.", 404);
      s.expenses.splice(i, 1);
      return { ok: true };
    });
  }
}
