// Pure domain functions shared by the server and the browser preview.
export const money = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export function productionCost(product, settings) {
  const c = product.costs;
  const filament = ((c.weightGrams + c.wasteGrams) / 1000) * c.filamentKgPrice;
  const energy = ((c.printHours * c.powerWatts) / 1000) * settings.energyKwh;
  const machine = c.printHours * settings.machineHour;
  const labor = (c.laborMinutes / 60) * settings.laborHour;
  const finishing = c.primer + c.paint + c.sandpaper + c.glue;
  const printBase = filament + energy + machine;
  const components = (product.components ?? []).map((c) => ({
    ...c,
    total: money(c.quantity * c.unitCost),
  }));
  const extras = money(components.reduce((sum, c) => sum + c.total, 0));
  const failure = c.failurePercent
    ? printBase / (1 - c.failurePercent / 100) - printBase
    : 0;
  const total = money(
    printBase +
      failure +
      labor +
      finishing +
      c.packaging +
      c.license +
      c.other +
      extras,
  );
  return {
    filament: money(filament),
    energy: money(energy),
    machine: money(machine),
    labor: money(labor),
    finishing: money(finishing),
    failure: money(failure),
    packaging: c.packaging,
    license: c.license,
    other: c.other,
    components,
    extras,
    total,
  };
}
export function suggestedPrice(cost, channel, margin, payment = {}) {
  const divisor =
    1 -
    (channel.feePercent +
      channel.taxPercent +
      (payment.feePercent ?? 0) +
      margin) /
      100;
  return divisor > 0
    ? money((cost + channel.fixedFee + (payment.fixedFee ?? 0)) / divisor)
    : null;
}
export function channelPrices(cost, channel, margin) {
  return {
    ...channel,
    price: suggestedPrice(cost, channel, margin),
    payments: (channel.payments ?? []).map((p) => ({
      ...p,
      price: suggestedPrice(cost, channel, margin, p),
    })),
  };
}
export function paymentFor(channel, payment) {
  return (
    channel.payments?.find((p) => p.name === payment) ?? {
      name: payment,
      feePercent: 0,
      fixedFee: 0,
    }
  );
}
export function quoteSale({
  actualProductionCost = null,
  items,
  discount = 0,
  shippingCharged = 0,
  shippingCost = 0,
  advertising = 0,
  feePercent = 0,
  paymentPercent = 0,
  paymentFixedFee = 0,
  fixedFee = 0,
  taxPercent = 0,
}) {
  const subtotal = money(
    items.reduce((v, i) => v + i.quantity * i.unitPrice, 0),
  );
  const revenue = money(subtotal - discount + shippingCharged);
  const production =
    actualProductionCost ??
    money(items.reduce((v, i) => v + i.quantity * i.unitCost, 0));
  const fees = money(
    (revenue * (feePercent + paymentPercent)) / 100 +
      fixedFee +
      paymentFixedFee,
  );
  const taxes = money((revenue * taxPercent) / 100);
  const profit = money(
    revenue - production - fees - taxes - shippingCost - advertising,
  );
  return { subtotal, revenue, production, fees, taxes, profit };
}

export function productPricing(product, settings) {
  const cost = productionCost(product, settings).total;
  const ids = product.channelIds ?? settings.channels.map((c) => c.id);
  return {
    basePrice: suggestedPrice(
      cost,
      { feePercent: 0, taxPercent: 0, fixedFee: 0 },
      settings.targetMargin,
    ),
    margin: settings.targetMargin,
    channels: settings.channels
      .filter((c) => ids.includes(c.id))
      .map((c) => channelPrices(cost, c, settings.targetMargin)),
  };
}

// Sequential reconciliation: interactions (e.g. fees on freight/discount) are
// attributed to the step introducing them. Every cent reconciles to actual profit.
export function saleComparison(sale, channel, margin, payment = {}) {
  const forecastItems = sale.items.map((i) => ({
    ...i,
    unitPrice: suggestedPrice(i.unitCost, channel, margin, payment),
  }));
  if (forecastItems.some((i) => i.unitPrice === null)) return null;
  let args = {
    items: forecastItems,
    feePercent: channel.feePercent,
    fixedFee: channel.fixedFee,
    taxPercent: channel.taxPercent,
    paymentPercent: payment.feePercent ?? 0,
    paymentFixedFee: payment.fixedFee ?? 0,
  };
  let previous = quoteSale(args),
    expectedProfit = previous.profit;
  const impacts = {};
  const step = (name, patch) => {
    args = { ...args, ...patch };
    const next = quoteSale(args);
    impacts[name] = money(next.profit - previous.profit);
    previous = next;
  };
  step("price", { items: sale.items });
  step("discount", { discount: sale.discount });
  step("shipping", {
    shippingCharged: sale.shippingCharged,
    shippingCost: sale.shippingCost,
  });
  step("advertising", { advertising: sale.advertising });
  step("fees", {
    feePercent: sale.feePercent,
    paymentPercent: sale.paymentPercent,
    paymentFixedFee: sale.paymentFixedFee ?? 0,
    fixedFee: sale.fixedFee,
    taxPercent: sale.taxPercent,
  });
  step("production", {
    actualProductionCost: sale.actualProductionCost ?? null,
  });
  return {
    version: 1,
    margin,
    channel: { ...channel },
    payment: { ...payment },
    forecastItems,
    expectedProfit,
    actualProfit: previous.profit,
    gap: money(previous.profit - expectedProfit),
    impacts,
  };
}
