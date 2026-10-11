var impactLabels = {
  price: "Preço praticado",
  discount: "Desconto",
  shipping: "Frete líquido (após taxas)",
  advertising: "Publicidade",
  fees: "Diferenças de taxas e impostos",
  production: "Diferença de produção",
};
import {
  productionCost,
  channelPrices,
  paymentFor,
  suggestedPrice,
  quoteSale,
  saleComparison,
} from "/pricing.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const brl = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v === 0 ? 0 : (v ?? 0),
  );
const decimal = (v) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v ?? 0);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dateLabel = (s) =>
  s ? new Date(s + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const icons = {
  layers: '<path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l9 4"/>',
  bag: '<path d="M5 7h14l1 14H4zM9 7V5a3 3 0 0 1 6 0v2"/>',
  wallet:
    '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8V5a2 2 0 0 1 2-2h13M21 10h-6v6h6M17 13h.01"/>',
  settings:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  up: '<path d="m4 16 6-6 4 4 6-9M15 5h5v5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  edit: '<path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  chart: '<path d="M4 3v17h17M8 16v-5M13 16V6M18 16V9"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  file: '<path d="M14 2H5v20h14V7zM14 2v6h5M8 13h8M8 17h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.box}</svg>`;
let state,
  token,
  page = "dashboard",
  productView = "grid",
  productFilter = { search: "", collection: "", stock: "", sort: "recent" },
  saleFilter = { search: "", status: "", sort: "recent" },
  period = "month",
  from = today().slice(0, 7) + "-01",
  to = today(),
  channel = "",
  payment = "",
  modalCleanup = () => {},
  saving = false;
const pages = {
  dashboard: ["Visão geral", "Seu negócio, em perspectiva."],
  products: ["Produtos", "Cada criação tem seu lugar."],
  sales: ["Vendas", "Do seu ateliê para o mundo."],
  expenses: ["Despesas", "Os detalhes que fazem a conta fechar."],
  settings: ["Configurações", "Seu estúdio, do seu jeito."],
};
async function api(path, method = "GET", body) {
  const r = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Local-Token": token || "",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
}
async function reload() {
  state = await api(
    "/api/state?" + new URLSearchParams({ from, to, channel, payment }),
  );
  applyBrand();
}
function applyBrand() {
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  document.title = `${state.settings.brand} — Estúdio de gestão`;
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 4200);
}
function empty(title, description, action, label = "Cadastrar produto") {
  return `<div class="empty">${icon("box", 36)}<h3>${title}</h3><p>${description}</p>${action ? `<button class="btn primary" data-action="${action}">${icon("plus", 15)}${label}</button>` : ""}</div>`;
}
function render() {
  const [title] = pages[page];
  $("#app").innerHTML =
    `<div class="layout"><aside class="sidebar" aria-label="Menu principal"><div class="brand">${state.settings.logoId ? `<img src="/assets/${esc(state.settings.logoId)}" alt="Logo">` : `<span class="brand-mark">${icon("layers", 33)}</span>`}<strong>${esc(state.settings.brand)}</strong></div><div class="eyebrow">${esc(state.settings.tagline || "Seu estúdio de gestão")}</div><nav class="nav">${Object.entries(
      pages,
    )
      .map(
        ([key, [label]]) =>
          `<button data-page="${key}" class="${page === key ? "active" : ""}" ${page === key ? 'aria-current="page"' : ""}>${icon({ dashboard: "grid", products: "box", sales: "bag", expenses: "wallet", settings: "settings" }[key])}${label}</button>`,
      )
      .join(
        "",
      )}</nav><div class="side-bottom"><div class="local-box"><strong><span class="dot"></span>Seu ateliê está em casa</strong>Dados salvos localmente.<br>Seu trabalho, sob seu controle.</div><div class="profile"><div class="avatar">${icon("layers", 17)}</div><div>Meu ateliê<br><span class="small muted">Administrador local</span></div></div></div></aside><div class="workspace"><header class="topbar"><div class="crumb"><button class="mobile-menu icon-btn" aria-label="Abrir menu" data-action="menu">${icon("menu", 21)}</button><span>Meu ateliê</span>${icon("chevron", 12)}<b>${title}</b></div><div class="top-actions"><span class="desktop-only muted">${new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</span><span class="status-pill"><span class="dot"></span>Armazenamento local</span><button class="btn shutdown-button" data-action="shutdown" aria-label="Encerrar sistema">${icon("close", 16)}<span>Encerrar sistema</span></button><button class="icon-btn" data-page="settings" aria-label="Configurações">${icon("settings")}</button></div></header><main id="main" class="page-enter" tabindex="-1">${renderPage()}</main></div></div>`;
  bindPage();
}
function head(actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">${page === "dashboard" ? "Uma camada de cada vez" : "Seu ateliê organizado"}</div><h1>${pages[page][0]}</h1><p>${pages[page][1]}</p></div><div class="actions">${actions}</div></div>`;
}
const newSale = () =>
  `<button class="btn primary" data-action="new-sale">${icon("plus", 16)}Registrar venda</button>`;
function periodFilters() {
  return `<div class="filters"><select class="filter" id="period" aria-label="Período"><option value="month" ${period === "month" ? "selected" : ""}>Este mês</option><option value="last" ${period === "last" ? "selected" : ""}>Mês passado</option><option value="year" ${period === "year" ? "selected" : ""}>Este ano</option><option value="all" ${period === "all" ? "selected" : ""}>Todo o período</option><option value="custom" ${period === "custom" ? "selected" : ""}>Personalizado</option></select><label>De <input class="filter" id="from" type="date" value="${from}"></label><label>Até <input class="filter" id="to" type="date" value="${to}"></label><span class="spacer"></span><select class="filter" id="channel-filter" aria-label="Filtrar canal"><option value="">Todos os canais</option>${channelOptions(channel)}</select><select class="filter" id="payment-filter" aria-label="Filtrar pagamento"><option value="">Todos os pagamentos</option>${paymentOptions(payment)}</select></div>`;
}
function channelOptions(selected) {
  const list = new Map(state.settings.channels.map((c) => [c.id, c.name]));
  for (const s of state.sales)
    if (!list.has(s.channelId))
      list.set(s.channelId, s.channelName + " (anterior)");
  return [...list]
    .map(
      ([id, name]) =>
        `<option value="${esc(id)}" ${selected === id ? "selected" : ""}>${esc(name)}</option>`,
    )
    .join("");
}
function paymentOptions(selected) {
  return [
    "Pix",
    "Cartão de crédito",
    "Cartão de débito",
    "Dinheiro",
    "Boleto",
    "Outro",
  ]
    .map((p) => `<option ${p === selected ? "selected" : ""}>${p}</option>`)
    .join("");
}
function metric(label, value, foot, name, featured = false) {
  return `<article class="metric ${featured ? "featured" : ""}"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon(name, 16)}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></article>`;
}
function chart() {
  const data = state.dashboard.months;
  if (!data.length)
    return `<div class="chart-empty">${icon("chart", 30)}<span>Suas primeiras vendas desenham este gráfico.</span><span class="small">Receita, produção e resultado mês a mês.</span></div>`;
  const values = data.flatMap((d) => [d.revenue, d.production, d.profit]),
    max = Math.max(...values, 1),
    min = Math.min(...values, 0),
    height = 170,
    y = (v) => 20 + ((max - v) / (max - min)) * height,
    W = Math.max(520, data.length * 60),
    left = 55,
    step = (W - left - 15) / data.length,
    bw = Math.min(13, step / 4);
  let svg = "";
  for (let i = 0; i < 5; i++) {
    const value = min + ((max - min) * i) / 4,
      yy = y(value);
    svg += `<line x1="${left}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#e9eee3" stroke-dasharray="3 4"/><text x="${left - 10}" y="${yy + 3}" text-anchor="end">${decimal(value >= 1000 ? value / 1000 : value)}${value >= 1000 ? "k" : ""}</text>`;
  }
  data.forEach((d, i) => {
    const x = left + step * i + step / 2;
    ["revenue", "production", "profit"].forEach((k, j) => {
      const v = d[k],
        zero = y(0),
        yy = y(v);
      svg += `<rect x="${x + (j - 1) * bw * 1.4 - bw / 2}" y="${Math.min(yy, zero)}" width="${bw}" height="${Math.max(Math.abs(zero - yy), 1)}" rx="3" fill="${["#a9c997", "#dce5d3", "#314d36"][j]}"><title>${d.month} · ${["Receita", "Produção", "Resultado"][j]}: ${brl(v)}</title></rect>`;
    });
    svg += `<text x="${x}" y="218" text-anchor="middle">${new Date(d.month + "-01T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}</text>`;
  });
  return `<div class="table-wrap"><svg class="chart" style="min-width:${Math.min(W, 950)}px" viewBox="0 0 ${W} 235" role="img" aria-label="Gráfico mensal: receitas, custos de produção e resultado das vendas">${svg}</svg></div>`;
}
function renderDashboard() {
  const d = state.dashboard;
  return (
    head(
      `<button class="btn" data-action="export-sales">${icon("download", 15)}Exportar</button>${newSale()}`,
    ) +
    periodFilters() +
    `<div class="cards">${metric("Receita de vendas", brl(d.revenue), `${d.orders} venda${d.orders === 1 ? "" : "s"} no período`, "wallet", true)}${metric("Custo de produção", brl(d.production), "Custos preservados em cada venda", "box")}${metric("Resultado das vendas", brl(d.contribution), `${decimal(d.margin)}% de margem de contribuição`, "up")}${metric("Pedidos concluídos", d.orders.toString().padStart(2, "0"), `Ticket médio de ${brl(d.average)}`, "bag")}</div><div class="two-col"><section class="panel"><div class="panel-head"><div><h2>O ritmo do seu ateliê</h2><p>Acompanhe o que entra, o que custa e o que fica.</p></div>${icon("chart", 20)}</div><div class="legend"><span><i style="background:#a9c997"></i>Receita</span><span><i style="background:#dce5d3"></i>Produção</span><span><i style="background:#314d36"></i>Resultado das vendas</span></div>${chart()}</section><section class="panel"><div class="panel-head"><div><h2>Por dentro do resultado</h2><p>Cada valor, no lugar certo.</p></div>${icon("wallet", 20)}</div>${row("Receita total", d.revenue)}${row("Produção", -d.production)}${row("Taxas e impostos", -d.fees - d.taxes)}${row("Frete e publicidade", -d.shipping - d.advertising)}${row("Resultado das vendas", d.contribution, true)}${row("Despesas do período", -d.expenses)}${row("Resultado operacional", d.net, true)}<div class="info-note">${d.net === null ? "Despesas gerais não são rateadas por canal ou pagamento. Remova esses filtros para ver o resultado operacional." : "Resultado operacional = resultado das vendas − despesas cadastradas. Não substitui a apuração contábil do lucro líquido."}</div></section></div>${comparisonDashboard(d.comparison)}<div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Últimas vendas</h2><p>Os pedidos que movimentam seu negócio.</p></div><button class="icon-btn" data-page="sales" aria-label="Ver todas as vendas">${icon("arrow")}</button></div>${salesTable(
      filteredSales()
        .filter((s) => s.status === "completed")
        .slice(0, 5),
      true,
    )}</section><section class="panel"><div class="panel-head"><div><h2>Seus destaques</h2><p>Produtos por receita, antes dos descontos.</p></div>${icon("layers", 20)}</div>${
      d.topProducts.length
        ? d.topProducts
            .slice(0, 5)
            .map(
              (p, i) =>
                `<div class="rank"><span class="rank-number">0${i + 1}</span><div><strong>${esc(p.name)}</strong><p>${p.quantity} unidade(s) vendida(s)</p></div><div class="value">${brl(p.revenue)}</div></div>`,
            )
            .join("")
        : empty(
            "O primeiro destaque vem aí",
            "Registre uma venda para conhecer seus favoritos.",
          )
    }<div class="info-note">${state.products.filter((p) => p.stock <= p.minStock).length} produto(s) no estoque mínimo ou abaixo. <a href="#products" data-page="products">Ver catálogo →</a></div></section></div><section class="panel"><div class="panel-head"><div><h2>Resultado por canal</h2><p>Compare receita e contribuição após custos e taxas.</p></div></div>${d.channels.length ? `<div class="table-wrap"><table><thead><tr><th>Canal</th><th>Pedidos</th><th>Receita</th><th>Resultado</th><th>Margem</th></tr></thead><tbody>${d.channels.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.orders}</td><td>${brl(c.revenue)}</td><td class="${c.profit < 0 ? "negative" : "positive"}">${brl(c.profit)}</td><td>${decimal(c.revenue ? (c.profit / c.revenue) * 100 : 0)}%</td></tr>`).join("")}</tbody></table></div>` : empty("Compare seus canais", "As vendas registradas aparecerão aqui.")}</section>`
  );
}
function row(label, value, total = false) {
  return `<div class="breakdown-row ${total ? "total" : ""}"><span>${label}</span><strong class="${value < 0 ? "negative" : ""}">${value === null ? "—" : brl(value)}</strong></div>`;
}
function filteredProducts() {
  let p = state.products.filter(
    (p) =>
      (!productFilter.search ||
        `${p.name} ${p.sku} ${p.material} ${p.color}`
          .toLowerCase()
          .includes(productFilter.search.toLowerCase())) &&
      (!productFilter.collection ||
        p.collection === productFilter.collection) &&
      (!productFilter.stock ||
        (productFilter.stock === "low" ? p.stock <= p.minStock : p.stock > 0)),
  );
  return p.sort((a, b) =>
    productFilter.sort === "name"
      ? a.name.localeCompare(b.name)
      : productFilter.sort === "price"
        ? b.price - a.price
        : productFilter.sort === "stock"
          ? a.stock - b.stock
          : b.createdAt.localeCompare(a.createdAt),
  );
}
function productResults() {
  const products = filteredProducts();
  if (!products.length)
    return `<section class="panel">${empty(state.products.length ? "Nenhum produto encontrado" : "Sua próxima criação começa aqui", state.products.length ? "Experimente outros filtros." : "Cadastre materiais, custos, fotos e o arquivo 3D em um só lugar.", state.products.length ? "" : "new-product")}</section>`;
  if (productView === "list")
    return `<section class="panel table-wrap"><table><thead><tr><th>Produto / SKU</th><th>Coleção</th><th>Estoque</th><th>Custo unitário</th><th>Preço</th><th>Ações</th></tr></thead><tbody>${products.map((p) => `<tr><td><strong>${esc(p.name)}</strong><div class="small muted">${esc(p.sku)}</div></td><td>${esc(p.collection || "—")}</td><td>${stockBadge(p)}</td><td>${brl(p.cost.total)}</td><td>${brl(p.price)}</td><td>${productActions(p)}</td></tr>`).join("")}</tbody></table></section>`;
  return `<div class="product-grid">${products.map((p) => `<article class="product-card"><button class="product-visual" data-action="view-product" data-id="${p.id}" aria-label="Ver ${esc(p.name)}">${p.images[0] ? `<img src="/assets/${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy">` : icon("layers", 70)}<span class="badge">${esc(p.collection || "Sem coleção")}</span></button><div class="product-body"><div class="eyebrow">${esc(p.sku)}</div><h3>${esc(p.name)}</h3><p class="small muted">${esc([p.material, p.color].filter(Boolean).join(" · ") || "Sua criação em 3D")}</p><div class="product-price"><div><strong>${brl(p.price)}</strong><p>Preço-base automático</p></div><div><span class="small">${brl(p.cost.total)}</span><p>Custo unitário</p></div></div><div class="product-foot">${stockBadge(p)}<div>${productActions(p)}</div></div></div></article>`).join("")}</div>`;
}
function stockBadge(p) {
  return `<span class="badge ${p.stock <= p.minStock ? "warn" : ""}">${p.stock} em estoque${p.stock <= p.minStock ? " · baixo" : ""}</span>`;
}
function productActions(p) {
  return `<button class="icon-btn" data-action="edit-product" data-id="${p.id}" aria-label="Editar ${esc(p.name)}">${icon("edit", 16)}</button><button class="icon-btn" data-action="delete-product" data-id="${p.id}" aria-label="Excluir ${esc(p.name)}">${icon("trash", 16)}</button>`;
}
function renderProducts() {
  return (
    head(
      `<button class="btn primary" data-action="new-product">${icon("plus", 16)}Novo produto</button>`,
    ) +
    `<div class="filters"><input class="filter search" id="product-search" placeholder="Buscar por nome, SKU, material…" aria-label="Buscar produtos" value="${esc(productFilter.search)}"><select class="filter" id="collection-filter" aria-label="Coleção"><option value="">Todas as coleções</option>${[
      ...new Set(state.products.map((p) => p.collection).filter(Boolean)),
    ]
      .sort()
      .map(
        (c) =>
          `<option ${c === productFilter.collection ? "selected" : ""}>${esc(c)}</option>`,
      )
      .join(
        "",
      )}</select><select class="filter" id="stock-filter" aria-label="Estoque"><option value="">Todo o estoque</option><option value="low" ${productFilter.stock === "low" ? "selected" : ""}>Estoque baixo</option><option value="available" ${productFilter.stock === "available" ? "selected" : ""}>Disponíveis</option></select><select class="filter" id="product-sort" aria-label="Ordenar produtos"><option value="recent">Mais recentes</option><option value="name" ${productFilter.sort === "name" ? "selected" : ""}>Nome A–Z</option><option value="price" ${productFilter.sort === "price" ? "selected" : ""}>Maior preço</option><option value="stock" ${productFilter.sort === "stock" ? "selected" : ""}>Menor estoque</option></select><div class="segmented"><button class="${productView === "grid" ? "selected" : ""}" data-action="grid" aria-label="Visualizar cartões">${icon("grid", 16)}</button><button class="${productView === "list" ? "selected" : ""}" data-action="list" aria-label="Visualizar lista">${icon("list", 16)}</button></div></div><div id="product-results">${productResults()}</div><p class="footnote">${state.products.length} produto(s) cadastrado(s) · Custos calculados com os parâmetros atuais do ateliê.</p>`
  );
}
function filteredSales() {
  const listFilter =
    page === "sales" ? saleFilter : { search: "", status: "", sort: "recent" };
  return state.sales
    .filter(
      (s) =>
        (!from || s.date >= from) &&
        (!to || s.date <= to) &&
        (!channel || s.channelId === channel) &&
        (!payment || s.payment === payment) &&
        (!listFilter.status || s.status === listFilter.status) &&
        (!listFilter.search ||
          `${s.customer} ${s.reference} ${s.items.map((i) => i.name).join(" ")}`
            .toLowerCase()
            .includes(listFilter.search.toLowerCase())),
    )
    .sort((a, b) =>
      listFilter.sort === "revenue"
        ? b.revenue - a.revenue
        : listFilter.sort === "profit"
          ? b.profit - a.profit
          : b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
    );
}
function salesTable(sales, compact = false) {
  return sales.length
    ? `<div class="table-wrap"><table><thead><tr><th>Pedido / Produto</th><th>Data</th><th>Canal</th>${compact ? "" : "<th>Pagamento</th><th>Status</th>"}<th>Receita</th><th>Resultado</th><th></th></tr></thead><tbody>${sales.map((s) => `<tr><td><strong>${esc(s.items[0].name)}${s.items.length > 1 ? ` +${s.items.length - 1}` : ""}</strong><div class="small muted">${esc(s.reference || s.id.slice(0, 8).toUpperCase())}${s.customer ? " · " + esc(s.customer) : ""}</div></td><td>${dateLabel(s.date)}</td><td>${esc(s.channelName)}</td>${compact ? "" : `<td>${esc(s.payment)}</td><td><span class="badge ${s.status === "cancelled" ? "off" : ""}">${s.status === "cancelled" ? "Cancelada" : "Concluída"}</span></td>`}<td>${brl(s.revenue)}</td><td class="${s.profit < 0 ? "negative" : "positive"}">${brl(s.profit)}</td><td><button class="icon-btn" data-action="view-sale" data-id="${s.id}" aria-label="Detalhes da venda ${esc(s.reference || s.id.slice(0, 8))}">${icon("arrow", 17)}</button></td></tr>`).join("")}</tbody></table></div>`
    : empty(
        "Nenhuma venda neste período",
        "Registre uma venda ou ajuste os filtros.",
        "new-sale",
        "Registrar venda",
      );
}
function renderSales() {
  return (
    head(
      `<button class="btn" data-action="export-sales">${icon("download", 15)}Exportar CSV</button>${newSale()}`,
    ) +
    periodFilters() +
    `<div class="filters"><input class="filter search" id="sale-search" placeholder="Buscar produto, cliente ou referência…" aria-label="Buscar vendas" value="${esc(saleFilter.search)}"><select class="filter" id="sale-status" aria-label="Status da venda"><option value="">Todos os status</option><option value="completed" ${saleFilter.status === "completed" ? "selected" : ""}>Concluídas</option><option value="cancelled" ${saleFilter.status === "cancelled" ? "selected" : ""}>Canceladas</option></select><select class="filter" id="sale-sort" aria-label="Ordenar vendas"><option value="recent">Mais recentes</option><option value="revenue" ${saleFilter.sort === "revenue" ? "selected" : ""}>Maior receita</option><option value="profit" ${saleFilter.sort === "profit" ? "selected" : ""}>Maior resultado</option></select></div><section class="panel" id="sale-results">${salesTable(filteredSales())}</section><p class="footnote">Vendas concluídas baixam o estoque. Cancelamentos devolvem as unidades e preservam o registro para consulta.</p>`
  );
}
function renderExpenses() {
  const expenses = state.expenses
    .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    head(
      `<button class="btn primary" data-action="new-expense">${icon("plus", 16)}Nova despesa</button>`,
    ) +
    `<div class="filters"><label>De <input class="filter" id="from" type="date" value="${from}"></label><label>Até <input class="filter" id="to" type="date" value="${to}"></label></div><div class="cards">${metric("Despesas do período", brl(expenses.reduce((v, e) => v + e.amount, 0)), `${expenses.length} lançamento(s)`, "wallet", true)}</div><section class="panel"><div class="panel-head"><div><h2>Despesas operacionais</h2><p>Site, sistemas, contabilidade e outros gastos do ateliê.</p></div></div>${expenses.length ? `<div class="table-wrap"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th></th></tr></thead><tbody>${expenses.map((e) => `<tr><td>${esc(e.description)}</td><td>${esc(e.category)}</td><td>${dateLabel(e.date)}</td><td>${brl(e.amount)}</td><td><button class="icon-btn" data-action="delete-expense" data-id="${e.id}" aria-label="Excluir ${esc(e.description)}">${icon("trash", 16)}</button></td></tr>`).join("")}</tbody></table></div>` : empty("Contas organizadas, decisões melhores", "Adicione as despesas que não estão no custo dos produtos.", "new-expense", "Nova despesa")}<div class="info-note">Evite contar duas vezes: energia, materiais e mão de obra já incluídos nos produtos não devem ser lançados novamente aqui. Publicidade pode ser alocada na venda ou registrada como despesa geral.</div></section>`
  );
}
function field(label, name, value = "", type = "text", extra = "", help = "") {
  const numeric =
    type === "number"
      ? `${extra.includes("min=") ? "" : 'min="0"'} ${extra.includes("step=") ? "" : 'step="0.01"'}`
      : "";
  return `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${numeric} ${extra}>${help ? `<small>${help}</small>` : ""}</label>`;
}
function channelRow(c) {
  const types = {
    direct: "Venda direta",
    marketplace: "Marketplace",
    "own-store": "Loja própria (ex.: Nuvemshop)",
  };
  return (
    '<div class="channel-row" data-channel="' +
    esc(c.id) +
    '"><div class="channel-fields">' +
    field(
      "Nome do canal",
      "channelName",
      c.name,
      "text",
      'required maxlength="80"',
    ) +
    '<label class="field">Tipo de canal<select name="channelType">' +
    Object.entries(types)
      .map(
        ([v, l]) =>
          '<option value="' +
          v +
          '" ' +
          ((c.type ?? (c.id === "direct" ? "direct" : "marketplace")) === v
            ? "selected"
            : "") +
          ">" +
          l +
          "</option>",
      )
      .join("") +
    "</select></label>" +
    field("Comissão (%)", "feePercent", c.feePercent, "number", 'max="95"') +
    field("Taxa fixa / pedido (R$)", "fixedFee", c.fixedFee, "number") +
    field("Impostos (%)", "taxPercent", c.taxPercent, "number", 'max="95"') +
    '<button type="button" class="icon-btn" data-remove-channel aria-label="Remover canal">' +
    icon("trash", 16) +
    '</button></div><details><summary>Taxas adicionais por forma de pagamento</summary><p class="footnote">Preencha conforme seu contrato. Zero significa sem taxa adicional. Percentual sobre a receita; valor fixo por pedido.</p><div class="payment-rates">' +
    [
      "Pix",
      "Cartão de crédito",
      "Cartão de débito",
      "Dinheiro",
      "Boleto",
      "Outro",
    ]
      .map((name) => {
        const p = paymentFor(c, name);
        return (
          '<div class="payment-rate" data-payment="' +
          esc(name) +
          '"><strong>' +
          esc(name) +
          "</strong>" +
          field(
            "Pagamento (%)",
            "paymentRate",
            p.feePercent,
            "number",
            'max="95"',
          ) +
          field("Fixo (R$)", "paymentFixed", p.fixedFee, "number") +
          "</div>"
        );
      })
      .join("") +
    "</div></details></div>"
  );
}
function productTypeField(value = "print3d") {
  return (
    '<label class="field">Tipo de produto<select name="productType">' +
    Object.entries({
      print3d: "Impressão 3D",
      frame: "Quadro com moldura",
      composite: "Produto composto / outros",
    })
      .map(
        ([v, l]) =>
          '<option value="' +
          v +
          '" ' +
          (v === value ? "selected" : "") +
          ">" +
          l +
          "</option>",
      )
      .join("") +
    "</select><small>Quadros recebem campos de moldura e arte impressa na aba de custos.</small></label>"
  );
}
function renderSettings() {
  const s = state.settings;
  return (
    head() +
    `<form id="settings-form"><div class="settings-grid"><section class="panel"><div class="panel-head"><div><h2>Identidade do ateliê</h2><p>A marca pode evoluir. Seu sistema acompanha.</p></div>${icon("layers")}</div><div class="form-grid">${field("Nome da marca", "brand", s.brand, "text", 'required maxlength="60"')}${field("Cor de destaque", "accent", s.accent, "color")}${field("Assinatura da marca", "tagline", s.tagline, "text", 'maxlength="140"')}<label class="field">Logo da marca<input type="file" id="logo-file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG ou WebP · até 8 MB</small></label></div><div id="logo-preview">${s.logoId ? `<img src="/assets/${esc(s.logoId)}" alt="Logo atual" style="max-height:65px;max-width:150px;margin-top:18px"><button type="button" class="btn" data-action="remove-logo">Remover logo</button>` : ""}</div></section><section class="panel"><div class="panel-head"><div><h2>Parâmetros de produção</h2><p>Valores de referência — ajuste à sua operação.</p></div>${icon("settings")}</div><div class="form-grid">${field("Energia (R$ / kWh)", "energyKwh", s.energyKwh, "number", "required", "Confira o custo total na sua conta de energia.")}${field("Impressora (R$ / hora)", "machineHour", s.machineHour, "number", "required", "Depreciação e manutenção. Não inclui energia.")}${field("Seu trabalho (R$ / hora)", "laborHour", s.laborHour, "number", "required", "Tempo ativo: preparar, pintar, montar e embalar.")}${field("Margem desejada (%)", "targetMargin", s.targetMargin, "number", 'required max="95"', "Usada na sugestão de preço, antes de despesas gerais.")}</div></section><section class="panel wide"><div class="panel-head"><div><h2>Marketplaces e canais de venda</h2><p>Cadastre quantas plataformas precisar: Shopee, Mercado Livre, sua loja ou venda direta. Defina o nome e as taxas da sua conta; depois selecione as plataformas em cada produto. Os valores iniciais são zero.</p></div></div><div id="channels">${s.channels.map(channelRow).join("")}</div><button type="button" class="btn" data-action="add-channel">${icon("plus", 15)}Adicionar marketplace ou canal</button><div class="info-note">Comissão e impostos incidem sobre a receita total da venda, incluindo o frete cobrado. Na venda, você pode ajustar as taxas aplicadas. As taxas fixas do canal e do pagamento são cobradas uma vez por pedido. Cadastre a mensalidade da Nuvemshop ou de outra plataforma em Despesas, no mês correspondente; ela reduz o resultado líquido geral. Se a comissão já inclui o pagamento, deixe a taxa adicional desse método zerada. Cartão: use a taxa do parcelamento praticado e ajuste na venda quando necessário.</div></section><section class="security-card wide"><h3>${icon("shield", 18)} Local por escolha</h3><p>Este ERP aceita conexões apenas deste computador. Seus dados ficam na pasta <strong>data</strong>; imagens e arquivos 3D ficam em <strong>data/assets</strong>. Antes de cada alteração, uma cópia da base é preservada (últimas 50).</p><p>Para um backup completo, feche o sistema e copie toda a pasta <strong>data</strong> para outro disco. A exportação abaixo contém os registros, mas não os anexos.</p><a class="btn" href="/api/export" download style="margin-top:13px">${icon("download", 15)}Exportar registros JSON</a></section></div><div class="error" id="settings-error" role="alert"></div><div class="form-footer"><button class="btn primary" type="submit">${icon("check", 16)}Salvar configurações</button></div></form>`
  );
}
function renderPage() {
  return {
    dashboard: renderDashboard,
    products: renderProducts,
    sales: renderSales,
    expenses: renderExpenses,
    settings: renderSettings,
  }[page]();
}
async function refreshRender() {
  try {
    await reload();
    render();
  } catch (e) {
    toast(e.message);
  }
}
function bindPage() {
  for (const id of ["from", "to"])
    if ($("#" + id))
      $("#" + id).onchange = async (e) => {
        const nextFrom = id === "from" ? e.target.value : from,
          nextTo = id === "to" ? e.target.value : to;
        if (nextFrom && nextTo && nextFrom > nextTo) {
          toast("A data inicial deve ser anterior à final.");
          e.target.value = id === "from" ? from : to;
          return;
        }
        from = nextFrom;
        to = nextTo;
        period = "custom";
        await refreshRender();
      };
  if ($("#period"))
    $("#period").onchange = async (e) => {
      period = e.target.value;
      const now = new Date();
      if (period === "month") {
        from = today().slice(0, 7) + "-01";
        to = today();
      } else if (period === "year") {
        from = now.getFullYear() + "-01-01";
        to = today();
      } else if (period === "last") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end = new Date(now.getFullYear(), now.getMonth(), 0);
        from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
        to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${end.getDate()}`;
      } else if (period === "all") {
        from = "";
        to = "";
      }
      await refreshRender();
    };
  if ($("#channel-filter"))
    $("#channel-filter").onchange = async (e) => {
      channel = e.target.value;
      await refreshRender();
    };
  if ($("#payment-filter"))
    $("#payment-filter").onchange = async (e) => {
      payment = e.target.value;
      await refreshRender();
    };
  for (const [id, key] of [
    ["product-search", "search"],
    ["collection-filter", "collection"],
    ["stock-filter", "stock"],
    ["product-sort", "sort"],
  ])
    if ($("#" + id))
      $("#" + id)[id.includes("search") ? "oninput" : "onchange"] = (e) => {
        productFilter[key] = e.target.value;
        $("#product-results").innerHTML = productResults();
      };
  for (const [id, key] of [
    ["sale-search", "search"],
    ["sale-status", "status"],
    ["sale-sort", "sort"],
  ])
    if ($("#" + id))
      $("#" + id)[id.includes("search") ? "oninput" : "onchange"] = (e) => {
        saleFilter[key] = e.target.value;
        $("#sale-results").innerHTML = salesTable(filteredSales());
      };
  if ($("#settings-form")) bindSettings();
}
function showModal(title, subtitle, body) {
  modalCleanup();
  const modal = $("#modal");
  modal.innerHTML = `<div class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${subtitle}</p></div><button class="icon-btn" data-action="close" aria-label="Fechar">${icon("close", 21)}</button></div><div class="modal-body">${body}</div>`;
  modal.setAttribute("aria-labelledby", "modal-title");
  if (!modal.open) modal.showModal();
  document.body.classList.add("modal-open");
  modal.oncancel = (e) => {
    if (saving) e.preventDefault();
  };
  modal.onclose = () => {
    document.body.classList.remove("modal-open");
    modalCleanup();
  };
}
function closeModal() {
  if (saving) return;
  $("#modal").close();
}
async function submitGuard(form, fn) {
  if (saving) return;
  saving = true;
  const buttons = [...form.querySelectorAll("button")];
  buttons.forEach((b) => (b.disabled = true));
  const error = form.querySelector(".error");
  if (error) error.textContent = "";
  try {
    await fn();
  } catch (e) {
    if (error) error.textContent = e.message;
    else toast(e.message);
  } finally {
    saving = false;
    buttons.forEach((b) => (b.disabled = false));
  }
}
function confirmAction(title, description, action) {
  showModal(
    title,
    "Confira antes de continuar.",
    `<div class="confirmation">${description}</div><div class="error" role="alert"></div><div class="form-footer"><button class="btn" data-action="close">Voltar</button><button class="btn danger" id="confirm">Confirmar</button></div>`,
  );
  $("#confirm").onclick = () =>
    submitGuard($("#modal"), async () => {
      await action();
      saving = false;
      closeModal();
      await refreshRender();
    });
}
function collectForm(form) {
  return Object.fromEntries(new FormData(form));
}
const costLabels = {
  weightGrams: ["Peso da peça (g)", "Material que permanece no produto."],
  wasteGrams: ["Suportes e purga (g)", "Inclua descarte e trocas de cor."],
  filamentKgPrice: ["Filamento (R$ / kg)", "Preço pago por quilo."],
  printHours: ["Impressão (horas)", "Use 1,5 para uma hora e meia."],
  powerWatts: [
    "Potência média (W)",
    "Consumo médio medido, não potência máxima.",
  ],
  laborMinutes: ["Trabalho ativo (min)", "Preparação, acabamento e embalagem."],
  primer: ["Primer por peça (R$)", ""],
  paint: ["Tinta / verniz (R$)", ""],
  sandpaper: ["Lixa por peça (R$)", ""],
  glue: ["Cola e consumíveis (R$)", ""],
  packaging: ["Embalagem (R$)", ""],
  license: [
    "Licença rateada (R$)",
    "Licenciamento comercial, quando aplicável.",
  ],
  other: ["Outros custos (R$)", ""],
  failurePercent: [
    "Taxa de falha (%)",
    "Reserva sobre filamento, energia e máquina.",
  ],
};
function estimate(costs, components = []) {
  return productionCost(
    {
      components,
      costs: Object.fromEntries(
        Object.keys(costLabels).map((k) => [k, Number(costs[k]) || 0]),
      ),
    },
    state.settings,
  ).total;
}
async function upload(file) {
  if (!file) return null;
  if (file.size > 70 * 1024 * 1024)
    throw new Error("O arquivo deve ter até 70 MB.");
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(file);
  });
  return api("/api/assets", "POST", { name: file.name, data });
}
function productModal(id) {
  const p = state.products.find((p) => p.id === id) || {
    name: "",
    sku: "",
    collection: "",
    material: "PLA Creality",
    color: "",
    dimensions: "",
    price: 0,
    stock: 0,
    minStock: 2,
    description: "",
    costs: {},
    images: [],
    modelId: "",
  };
  let images = [...p.images],
    modelId = p.modelId,
    pendingImages = [],
    pendingModel = null,
    urls = [];
  showModal(
    id ? "Editar produto" : "Uma nova criação",
    "Informações, custos e arquivos organizados em um só lugar.",
    `<form id="product-form" novalidate><div class="modal-tabs" role="tablist"><button type="button" role="tab" class="active" aria-selected="true" data-tab="info">01 · Produto</button><button type="button" role="tab" aria-selected="false" data-tab="cost">02 · Produção e custos</button><button type="button" role="tab" aria-selected="false" data-tab="files">03 · Imagens e arquivo 3D</button></div><div class="tab-content" data-content="info"><div class="form-grid">${field("Nome do produto *", "name", p.name, "text", 'required maxlength="120"')}${field("SKU / Código único *", "sku", p.sku, "text", 'required maxlength="60"')}${productTypeField(p.productType)}${field("Coleção", "collection", p.collection, "text", 'list="collections" maxlength="80"')}${field("Material", "material", p.material, "text", 'maxlength="80"')}${field("Cor / acabamento", "color", p.color, "text", 'maxlength="80"')}${field("Dimensões (L × A × P)", "dimensions", p.dimensions, "text", 'placeholder="Ex.: 10 × 18 × 10 cm" maxlength="100"')}${field("Preço-base calculado (R$)", "price", p.price, "number", "readonly", "Automático: custo ÷ (1 − margem). Sem taxas de canal.")}${field("Estoque atual (un.)", "stock", p.stock, "number", 'required step="1"')}${field("Alerta de estoque mínimo", "minStock", p.minStock, "number", 'step="1"')}<label class="field wide">Descrição e características<textarea name="description" maxlength="4000" placeholder="Detalhes da peça, cuidados e observações…">${esc(p.description)}</textarea></label></div><datalist id="collections">${[...new Set(state.products.map((p) => p.collection))].map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div><div class="tab-content" data-content="cost" hidden><div class="info-note" style="margin-top:0;margin-bottom:18px">Informe os consumos e gastos para <strong>uma unidade</strong>. Energia, hora da máquina e hora de trabalho vêm das configurações.</div><div class="form-grid">${Object.entries(
      costLabels,
    )
      .map(([key, [label, help]]) =>
        field(
          label,
          "cost_" + key,
          p.costs[key] || 0,
          "number",
          key === "failurePercent" ? 'max="90"' : "",
          help,
        ),
      )
      .join(
        "",
      )}</div><div class="form-section">Materiais e componentes adicionais</div><p class="footnote">Consumo para uma unidade do produto. Não repita valores já incluídos acima. A troca do tipo preserva os componentes cadastrados.</p><div id="components"></div><button type="button" class="btn" id="add-component">Adicionar componente</button><div class="cost-summary"><div><p>Custo de produção / unidade</p><strong id="estimate-cost">${brl(p.cost?.total || 0)}</strong></div><div><p>Preço-base automático</p><strong id="estimate-price">—</strong></div></div><div class="form-section">Plataformas deste produto</div><p class="footnote">Cadastre Shopee, Mercado Livre ou outras plataformas em <strong>Configurações → Marketplaces e canais de venda → Adicionar marketplace ou canal</strong>, com as taxas da sua conta. Salve o produto antes de sair para cadastrar uma nova plataforma.</p><div class="platform-options">${state.settings.channels.map((c) => `<label><input type="checkbox" name="productChannel" value="${esc(c.id)}" ${(p.channelIds ?? state.settings.channels.map((x) => x.id)).includes(c.id) ? "checked" : ""}> ${esc(c.name)}</label>`).join("")}</div><div id="platform-prices"></div><p class="footnote">Sugestão com margem de ${decimal(state.settings.targetMargin)}%, comissão, impostos e taxa fixa para pedido de uma unidade. Taxas dos pagamentos cadastrados estão incluídas nas respectivas sugestões. Frete, publicidade e despesas gerais não estão incluídos.</p></div><div class="tab-content" data-content="files" hidden><label class="field">Fotos do produto<input id="product-images" type="file" multiple accept="image/png,image/jpeg,image/webp"><small>Até 6 imagens · PNG, JPG ou WebP · 8 MB cada. A primeira será a capa.</small></label><div class="upload-previews" id="image-previews"></div><div class="form-section">Seu arquivo de produção</div><label class="field">Arquivo 3D<input id="product-model" type="file" accept=".stl,.3mf,.obj"><small>STL, 3MF ou OBJ · até 70 MB. Armazenado para download; o ERP não fatia nem envia à impressora.</small></label><div id="model-preview" class="info-note"></div></div><div class="error" role="alert"></div><div class="form-footer"><button class="btn" type="button" data-action="close">Cancelar</button><button class="btn primary" type="submit">${icon("check", 16)}Salvar produto</button></div></form>`,
  );
  const form = $("#product-form");
  const readComponents = () =>
    [...form.querySelectorAll(".component-row")].map((r) => ({
      name: r.querySelector("[name=componentName]").value,
      quantity: Number(r.querySelector("[name=componentQuantity]").value),
      unitCost: Number(r.querySelector("[name=componentCost]").value),
    }));
  const addComponent = (c = { name: "", quantity: 1, unitCost: 0 }) => {
    const r = document.createElement("div");
    r.className = "component-row";
    r.innerHTML =
      field(
        "Componente",
        "componentName",
        c.name,
        "text",
        'required maxlength="120"',
      ) +
      field(
        "Quantidade por produto",
        "componentQuantity",
        c.quantity,
        "number",
        'required min="0.001" step="0.001"',
      ) +
      field(
        "Custo unitário (R$)",
        "componentCost",
        c.unitCost,
        "number",
        "required",
      ) +
      '<button type="button" class="icon-btn" aria-label="Remover componente">' +
      icon("trash", 16) +
      "</button>";
    r.querySelector("button").onclick = () => {
      r.remove();
      calc();
    };
    $("#components").append(r);
  };
  (p.components ?? []).forEach(addComponent);
  $("#add-component").onclick = () => {
    addComponent();
    calc();
  };
  form.elements.productType.onchange = () => {
    if (form.elements.productType.value === "frame") {
      const names = readComponents().map((c) => c.name.toLowerCase());
      ["Moldura", "Arte impressa / fundo"].forEach((name) => {
        if (!names.includes(name.toLowerCase()))
          addComponent({ name, quantity: 1, unitCost: 0 });
      });
    }
    calc();
  };
  function calc() {
    const data = collectForm(form),
      cost = estimate(
        Object.fromEntries(
          Object.keys(costLabels).map((k) => [k, data["cost_" + k]]),
        ),
        readComponents(),
      );
    const base = suggestedPrice(
      cost,
      { feePercent: 0, taxPercent: 0, fixedFee: 0 },
      state.settings.targetMargin,
    );
    form.elements.price.value = base;
    $("#estimate-cost").textContent = brl(cost);
    $("#estimate-price").textContent = brl(base);
    const ids = new FormData(form).getAll("productChannel");
    $("#platform-prices").innerHTML = platformTable(
      state.settings.channels
        .filter((c) => ids.includes(c.id))
        .map((c) => channelPrices(cost, c, state.settings.targetMargin)),
    );
  }
  function previews() {
    $("#image-previews").innerHTML =
      images
        .map(
          (a, i) =>
            `<div class="upload-preview"><img src="/assets/${esc(a)}" alt="Foto ${i + 1}"><button type="button" data-remove-image="${i}" aria-label="Remover foto ${i + 1}">×</button></div>`,
        )
        .join("") +
      pendingImages
        .map(
          (f, i) =>
            `<div class="upload-preview"><img src="${urls[i]}" alt="Nova foto ${i + 1}"><button type="button" data-remove-pending="${i}" aria-label="Remover nova foto">×</button></div>`,
        )
        .join("");
    $("#model-preview").innerHTML = pendingModel
      ? `Novo arquivo: ${esc(pendingModel.name)}`
      : modelId
        ? `<a href="/assets/${esc(modelId)}">${icon("file", 15)} Baixar arquivo atual</a> <button type="button" class="icon-btn" id="remove-model" aria-label="Remover arquivo">${icon("trash", 15)}</button>`
        : "Nenhum arquivo 3D anexado.";
  }
  form.oninput = calc;
  form.onchange = calc;
  calc();
  previews();
  form.onclick = (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      $$("[data-tab]").forEach((b) => {
        b.classList.toggle("active", b === tab);
        b.setAttribute("aria-selected", b === tab ? "true" : "false");
      });
      $$("[data-content]").forEach(
        (c) => (c.hidden = c.dataset.content !== tab.dataset.tab),
      );
    }
    const remove = e.target.closest("[data-remove-image]");
    if (remove) {
      images.splice(Number(remove.dataset.removeImage), 1);
      previews();
    }
    const pending = e.target.closest("[data-remove-pending]");
    if (pending) {
      const i = Number(pending.dataset.removePending);
      pendingImages.splice(i, 1);
      URL.revokeObjectURL(urls[i]);
      urls.splice(i, 1);
      previews();
    }
    if (e.target.closest("#remove-model")) {
      modelId = "";
      previews();
    }
  };
  $("#product-images").onchange = (e) => {
    const files = [...e.target.files];
    if (
      images.length + pendingImages.length + files.length > 6 ||
      files.some((f) => f.size > 8 * 1024 * 1024)
    ) {
      form.querySelector(".error").textContent =
        "Use até 6 imagens, de no máximo 8 MB cada.";
      e.target.value = "";
      return;
    }
    pendingImages.push(...files);
    urls.push(...files.map((f) => URL.createObjectURL(f)));
    previews();
    e.target.value = "";
  };
  $("#product-model").onchange = (e) => {
    pendingModel = e.target.files[0] || null;
    previews();
  };
  modalCleanup = () => urls.forEach(URL.revokeObjectURL);
  form.onsubmit = (e) => {
    e.preventDefault();
    const invalid = [...form.elements].find(
      (el) => el.willValidate && !el.validity.valid,
    );
    if (invalid) {
      const tab = invalid.closest("[data-content]");
      if (tab)
        form.querySelector(`[data-tab="${tab.dataset.content}"]`).click();
      invalid.reportValidity();
      return;
    }
    submitGuard(form, async () => {
      const data = collectForm(form);
      for (const file of pendingImages) images.push((await upload(file)).id);
      pendingImages = [];
      if (pendingModel) {
        modelId = (await upload(pendingModel)).id;
        pendingModel = null;
      }
      await api("/api/products" + (id ? "/" + id : ""), id ? "PUT" : "POST", {
        ...data,
        components: readComponents(),
        channelIds: new FormData(form).getAll("productChannel"),
        costs: Object.fromEntries(
          Object.keys(costLabels).map((k) => [k, data["cost_" + k]]),
        ),
        images,
        modelId,
      });
      saving = false;
      closeModal();
      await refreshRender();
      toast(id ? "Produto atualizado." : "Produto cadastrado.");
    });
  };
}
function viewProduct(id) {
  const p = state.products.find((p) => p.id === id);
  showModal(
    esc(p.name),
    `${esc(p.sku)} · ${esc(p.collection || "Sem coleção")}`,
    `<div class="detail-grid"><div><div class="detail-hero">${p.images[0] ? `<img src="/assets/${esc(p.images[0])}" alt="${esc(p.name)}">` : icon("layers", 75)}</div><div class="upload-previews">${p.images
      .slice(1)
      .map(
        (a) =>
          `<a href="/assets/${esc(a)}" target="_blank"><img src="/assets/${esc(a)}" alt="Foto adicional" width="60" height="60" style="object-fit:cover"></a>`,
      )
      .join(
        "",
      )}</div><p class="detail-description">${esc(p.description || "Sem descrição adicional.")}</p>${p.modelId ? `<a class="btn" href="/assets/${esc(p.modelId)}">${icon("download", 16)}Baixar arquivo 3D</a>` : ""}<div class="detail-properties">${[
      ["Material", p.material],
      ["Cor", p.color],
      ["Dimensões", p.dimensions],
      ["Estoque", p.stock + " unidades"],
    ]
      .map(
        ([l, v]) => `<div><p>${l}</p><strong>${esc(v || "—")}</strong></div>`,
      )
      .join("")}</div></div><div><h3>Composição do custo unitário</h3>${[
      ["Filamento", "filament"],
      ["Energia", "energy"],
      ["Máquina", "machine"],
      ["Trabalho ativo", "labor"],
      ["Acabamento", "finishing"],
      ["Reserva para falhas", "failure"],
      ["Embalagem", "packaging"],
      ["Licença", "license"],
      ["Outros", "other"],
    ]
      .map(([l, k]) => row(l, p.cost[k]))
      .join(
        "",
      )}${(p.cost.components ?? []).map((c) => row(esc(c.name) + " · " + decimal(c.quantity) + " × " + brl(c.unitCost), c.total)).join("")}${row("Custo total", p.cost.total, true)}${row("Preço-base automático", p.price, true)}<p class="footnote">Margem de ${decimal(p.pricing.margin)}%. Valores atuais; vendas anteriores preservadas.</p></div></div><div class="form-section">Preços por canal e pagamento</div>${platformTable(p.pricing.channels)}<div class="form-section">Movimentações de estoque</div><div class="table-wrap"><table><thead><tr><th>Data</th><th>Motivo</th><th>Quantidade</th></tr></thead><tbody>${state.movements
      .filter((m) => m.productId === id)
      .slice(-10)
      .reverse()
      .map(
        (m) =>
          `<tr><td>${new Date(m.date).toLocaleString("pt-BR")}</td><td>${esc(m.reason)}</td><td>${m.quantity > 0 ? "+" : ""}${m.quantity}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><div class="form-footer"><button class="btn primary" data-action="edit-product" data-id="${id}">${icon("edit", 15)}Editar produto</button></div>`,
  );
}
function saleModal() {
  if (!state.products.length) {
    toast("Cadastre um produto antes de registrar a venda.");
    page = "products";
    render();
    return;
  }
  showModal(
    "Registrar uma venda",
    "O estoque será baixado e os custos deste momento serão preservados.",
    `<form id="sale-form"><div class="form-grid">${field("Data da venda", "date", today(), "date", "required")}<label class="field">Canal de venda<select name="channelId" id="sale-channel">${state.settings.channels.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select></label>${field("Cliente (opcional)", "customer", "", "text", 'maxlength="120"')}${field("Referência / nº do pedido", "reference", "", "text", 'maxlength="100"')}<label class="field">Forma de pagamento<select name="payment">${paymentOptions("Pix")}</select></label></div><div class="form-section">Produtos vendidos</div><div id="sale-items"></div><button class="btn" id="add-item" type="button">${icon("plus", 15)}Adicionar produto</button><div class="form-section">Taxas e ajustes deste pedido</div><div class="form-grid">${field("Comissão da plataforma (%)", "feePercent", 0, "number", 'max="95"')}${field("Taxa fixa do pedido (R$)", "fixedFee", 0, "number")}${field("Impostos (%)", "taxPercent", 0, "number", 'max="95"')}${field("Taxa adicional do pagamento (%)", "paymentPercent", 0, "number", 'max="95"', "Use somente se não estiver incluída na comissão.")}${field("Taxa fixa do pagamento (R$)", "paymentFixedFee", 0, "number")}${field("Desconto total (R$)", "discount", 0, "number")}${field("Publicidade deste pedido (R$)", "advertising", 0, "number")}${field("Frete cobrado do cliente (R$)", "shippingCharged", 0, "number")}${field("Frete pago por você (R$)", "shippingCost", 0, "number")}${field("Produção real do pedido (R$)", "actualProductionCost", "", "number", "", "Opcional. Total de todas as unidades. Vazio = custo estimado do cadastro.")}</div><div class="info-note">Percentuais sobre o total após desconto, incluindo frete cobrado. Confira a regra de cobrança da sua plataforma; ajuste a taxa fixa para representar eventuais diferenças.</div><div class="form-section">Observações</div><label class="field"><textarea name="notes" maxlength="2000" placeholder="Detalhes do pedido…"></textarea></label><div class="sale-summary"><div><p>Receita</p><strong id="sale-revenue">R$ 0,00</strong></div><div><p>Produção</p><strong id="sale-production">R$ 0,00</strong></div><div><p>Resultado estimado</p><strong id="sale-profit">R$ 0,00</strong></div></div><div id="sale-comparison"></div><div class="error" role="alert"></div><div class="form-footer"><button class="btn" type="button" data-action="close">Cancelar</button><button class="btn primary" type="submit">${icon("check", 16)}Confirmar venda</button></div></form>`,
  );
  const form = $("#sale-form");
  function addItem() {
    const div = document.createElement("div");
    div.className = "sale-item";
    div.innerHTML = `<label class="field">Produto<select class="item-product" required><option value="">Selecione um produto</option>${state.products.map((p) => `<option value="${p.id}">${esc(p.name)} · ${p.stock} un.</option>`).join("")}</select></label><label class="field">Quantidade<input class="item-qty" type="number" min="1" step="1" value="1" required></label><label class="field">Preço un. (R$)<input class="item-price" type="number" min="0" step="0.01" value="0" required></label><button type="button" class="icon-btn remove-item" aria-label="Remover item">${icon("trash", 16)}</button>`;
    $("#sale-items").append(div);
    div.querySelector("select").onchange = (e) => {
      const p = state.products.find((p) => p.id === e.target.value);
      const c = state.settings.channels.find(
        (c) => c.id === form.elements.channelId.value,
      );
      div.querySelector(".item-price").value = p
        ? (suggestedPrice(
            p.cost.total,
            c,
            state.settings.targetMargin,
            paymentFor(c, form.elements.payment.value),
          ) ?? 0)
        : 0;
      div.querySelector(".item-price").dataset.edited = "";
      calc();
    };
    div.querySelector("button").onclick = () => {
      div.remove();
      calc();
    };
  }
  function items() {
    return $$(".sale-item").map((r) => ({
      productId: r.querySelector(".item-product").value,
      quantity: Number(r.querySelector(".item-qty").value),
      unitPrice: Number(r.querySelector(".item-price").value),
    }));
  }
  function calc() {
    const data = collectForm(form),
      numbers = Object.fromEntries(
        [
          "discount",
          "shippingCharged",
          "shippingCost",
          "advertising",
          "feePercent",
          "paymentPercent",
          "paymentFixedFee",
          "fixedFee",
          "taxPercent",
        ].map((k) => [k, Number(data[k]) || 0]),
      ),
      { revenue, production, profit } = quoteSale({
        ...numbers,
        actualProductionCost:
          data.actualProductionCost === ""
            ? null
            : Number(data.actualProductionCost),
        items: items().map((i) => ({
          ...i,
          unitCost:
            state.products.find((p) => p.id === i.productId)?.cost.total || 0,
        })),
      });
    $("#sale-revenue").textContent = brl(revenue);
    $("#sale-production").textContent = brl(production);
    $("#sale-profit").textContent = brl(profit);
    $("#sale-profit").classList.toggle("negative", profit < 0);
    const comparison = saleComparison(
      {
        ...numbers,
        actualProductionCost:
          data.actualProductionCost === ""
            ? null
            : Number(data.actualProductionCost),
        items: items().map((i) => ({
          ...i,
          unitCost:
            state.products.find((p) => p.id === i.productId)?.cost.total || 0,
        })),
      },
      state.settings.channels.find((c) => c.id === data.channelId),
      state.settings.targetMargin,
      paymentFor(
        state.settings.channels.find((c) => c.id === data.channelId),
        data.payment,
      ),
    );
    $("#sale-comparison").innerHTML = comparisonView(
      comparison,
      data.actualProductionCost === "",
    );
  }
  function channelChanged(resetChannel = true) {
    const c = state.settings.channels.find(
      (c) => c.id === $("#sale-channel").value,
    );
    if (resetChannel)
      for (const k of ["feePercent", "fixedFee", "taxPercent"])
        form.elements[k].value = c[k];
    const payment = paymentFor(c, form.elements.payment.value);
    form.elements.paymentPercent.value = payment.feePercent;
    form.elements.paymentFixedFee.value = payment.fixedFee;
    $$(".sale-item").forEach((r) => {
      const p = state.products.find(
          (p) => p.id === r.querySelector(".item-product").value,
        ),
        input = r.querySelector(".item-price");
      if (p && !input.dataset.edited)
        input.value =
          suggestedPrice(
            p.cost.total,
            c,
            state.settings.targetMargin,
            paymentFor(c, form.elements.payment.value),
          ) ?? 0;
    });
    calc();
  }
  addItem();
  channelChanged();
  $("#add-item").onclick = () => {
    addItem();
    calc();
  };
  $("#sale-channel").onchange = channelChanged;
  form.elements.payment.onchange = () => channelChanged(false);
  form.oninput = (e) => {
    if (e.target.matches(".item-price")) e.target.dataset.edited = "true";
    calc();
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    submitGuard(form, async () => {
      await api("/api/sales", "POST", { ...collectForm(form), items: items() });
      saving = false;
      closeModal();
      await refreshRender();
      toast("Venda registrada e estoque atualizado.");
    });
  };
}
function viewSale(id) {
  const s = state.sales.find((s) => s.id === id);
  showModal(
    "Detalhes da venda",
    `${dateLabel(s.date)} · ${esc(s.reference || s.id.slice(0, 8).toUpperCase())}`,
    `<div class="detail-properties"><div><p>Cliente</p><strong>${esc(s.customer || "Não informado")}</strong></div><div><p>Canal / pagamento</p><strong>${esc(s.channelName)} · ${esc(s.payment)}</strong></div></div><p style="margin:18px 0"><span class="badge ${s.status === "cancelled" ? "off" : ""}">${s.status === "cancelled" ? "Venda cancelada" : "Venda concluída"}</span></p><div class="table-wrap"><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Preço un.</th><th>Custo un.</th></tr></thead><tbody>${s.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${brl(i.unitPrice)}</td><td>${brl(i.unitCost)}</td></tr>`).join("")}</tbody></table></div>${row("Produtos", s.subtotal)}${row("Desconto", -s.discount)}${row("Frete cobrado", s.shippingCharged)}${row("Receita", s.revenue, true)}${row("Produção", -s.production)}${row(`Taxas (${decimal(s.feePercent + s.paymentPercent)}% + ${brl(s.fixedFee + (s.paymentFixedFee ?? 0))})`, -s.fees)}${row(`Impostos (${decimal(s.taxPercent)}%)`, -s.taxes)}${row("Frete pago", -s.shippingCost)}${row("Publicidade", -s.advertising)}${row("Resultado desta venda", s.profit, true)}${comparisonView(s.comparison, s.actualProductionCost == null)}<p class="detail-description">${esc(s.notes)}</p><div class="info-note">Valores históricos. Alterações nos produtos ou nas configurações não mudam esta venda.${s.status === "cancelled" ? " Este registro está excluído dos indicadores." : ""}</div><div class="form-footer">${s.status === "completed" ? `<button class="btn danger" data-action="cancel-sale" data-id="${s.id}">Cancelar venda e devolver estoque</button>` : ""}<button class="btn" data-action="close">Fechar</button></div>`,
  );
}
function expenseModal() {
  showModal(
    "Nova despesa",
    "Registre gastos gerais, sem duplicar custos já incluídos nas peças.",
    `<form id="expense-form"><div class="form-grid">${field("Descrição", "description", "", "text", 'required maxlength="200"')}${field("Valor (R$)", "amount", "", "number", 'required min="0.01"')}${field("Data", "date", today(), "date", "required")}<label class="field">Categoria<select name="category">${["Sistemas e site", "Contabilidade", "Publicidade geral", "Aluguel", "Pós-venda e reposições", "Outros"].map((c) => `<option>${c}</option>`).join("")}</select></label></div><div class="error" role="alert"></div><div class="form-footer"><button class="btn" type="button" data-action="close">Cancelar</button><button class="btn primary" type="submit">Salvar despesa</button></div></form>`,
  );
  $("#expense-form").onsubmit = (e) => {
    e.preventDefault();
    submitGuard(e.target, async () => {
      await api("/api/expenses", "POST", collectForm(e.target));
      saving = false;
      closeModal();
      await refreshRender();
      toast("Despesa registrada.");
    });
  };
}
let settingsLogo;
function bindSettings() {
  settingsLogo = state.settings.logoId;
  $("#settings-form").onsubmit = (e) => {
    e.preventDefault();
    submitGuard(e.target, async () => {
      const data = collectForm(e.target),
        file = $("#logo-file").files[0];
      if (file) settingsLogo = (await upload(file)).id;
      data.logoId = settingsLogo;
      data.channels = $$(".channel-row").map((r) => ({
        id: r.dataset.channel,
        name: r.querySelector("[name=channelName]").value,
        type: r.querySelector("[name=channelType]").value,
        payments: [...r.querySelectorAll(".payment-rate")].map((p) => ({
          name: p.dataset.payment,
          feePercent: p.querySelector("[name=paymentRate]").value,
          fixedFee: p.querySelector("[name=paymentFixed]").value,
        })),
        feePercent: r.querySelector("[name=feePercent]").value,
        fixedFee: r.querySelector("[name=fixedFee]").value,
        taxPercent: r.querySelector("[name=taxPercent]").value,
      }));
      await api("/api/settings", "PUT", data);
      await refreshRender();
      toast("Configurações salvas.");
    });
  };
}
function exportSales() {
  const rows = [
    [
      "Referência",
      "Data",
      "Status",
      "Canal",
      "Pagamento",
      "Cliente",
      "Receita",
      "Produção",
      "Taxas",
      "Impostos",
      "Frete pago",
      "Publicidade",
      "Resultado",
      "Resultado previsto",
      "Diferença realizado - previsto",
      "Impacto preço",
      "Impacto desconto",
      "Impacto frete",
      "Impacto publicidade",
      "Impacto taxas",
      "Impacto produção",
    ],
    ...filteredSales().map((s) => [
      s.reference || s.id,
      s.date,
      s.status === "completed" ? "Concluída" : "Cancelada",
      s.channelName,
      s.payment,
      s.customer,
      ...[
        "revenue",
        "production",
        "fees",
        "taxes",
        "shippingCost",
        "advertising",
        "profit",
      ].map((k) => s[k].toFixed(2).replace(".", ",")),
      ...[
        s.comparison?.expectedProfit,
        s.comparison?.gap,
        ...Object.keys(impactLabels).map((k) => s.comparison?.impacts[k]),
      ].map((v) => (v == null ? "" : v.toFixed(2).replace(".", ","))),
    ]),
  ];
  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value);
            if (/^[=+@\-]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "slicer-vendas-" + today() + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Relatório exportado com os filtros atuais.");
}
document.addEventListener("click", async (e) => {
  const nav = e.target.closest("[data-page]");
  if (nav) {
    e.preventDefault();
    page = nav.dataset.page;
    render();
    window.scrollTo(0, 0);
    return;
  }
  const removeChannel = e.target.closest("[data-remove-channel]");
  if (removeChannel) {
    if ($$(".channel-row").length === 1) {
      toast("Mantenha pelo menos um canal.");
      return;
    }
    removeChannel.closest(".channel-row").remove();
    return;
  }
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const id = b.dataset.id;
  try {
    switch (b.dataset.action) {
      case "shutdown":
        shutdownModal();
        break;
      case "menu":
        $(".sidebar").classList.toggle("open");
        break;
      case "close":
        closeModal();
        break;
      case "new-product":
        productModal();
        break;
      case "edit-product":
        productModal(id);
        break;
      case "view-product":
        viewProduct(id);
        break;
      case "delete-product":
        confirmAction(
          "Excluir produto?",
          `O produto <strong>${esc(state.products.find((p) => p.id === id).name)}</strong> sairá do catálogo. Vendas anteriores e seus custos serão preservados.`,
          async () => {
            await api("/api/products/" + id, "DELETE");
            toast("Produto removido do catálogo.");
          },
        );
        break;
      case "grid":
      case "list":
        productView = b.dataset.action;
        render();
        break;
      case "new-sale":
        saleModal();
        break;
      case "view-sale":
        viewSale(id);
        break;
      case "cancel-sale":
        confirmAction(
          "Cancelar esta venda?",
          "A venda sairá dos indicadores e todas as unidades retornarão ao estoque. O histórico será mantido.",
          async () => {
            await api("/api/sales/" + id + "/cancel", "POST", {});
            toast("Venda cancelada. Estoque devolvido.");
          },
        );
        break;
      case "new-expense":
        expenseModal();
        break;
      case "delete-expense":
        confirmAction(
          "Excluir despesa?",
          "A despesa será removida do cálculo do resultado operacional.",
          async () => {
            await api("/api/expenses/" + id, "DELETE");
            toast("Despesa removida.");
          },
        );
        break;
      case "add-channel":
        $("#channels").insertAdjacentHTML(
          "beforeend",
          channelRow({
            id: crypto.randomUUID(),
            name: "",
            feePercent: 0,
            fixedFee: 0,
            taxPercent: 0,
          }),
        );
        break;
      case "remove-logo":
        settingsLogo = "";
        $("#logo-file").value = "";
        $("#logo-preview").innerHTML = "";
        break;
      case "export-sales":
        exportSales();
        break;
    }
  } catch (e) {
    toast(e.message);
  }
});
try {
  ({ token } = await api("/api/session"));
  await reload();
  render();
} catch (e) {
  $("#app").innerHTML =
    `<div class="loading"><h2>Não foi possível abrir o ateliê.</h2><p>${esc(e.message)}</p><p>Verifique se o servidor local está ligado e atualize a página.</p></div>`;
}

function platformTable(channels) {
  if (!channels.length)
    return '<div class="info-note">Nenhuma plataforma selecionada. O preço-base continua disponível.</div>';
  return (
    '<div class="table-wrap platform-table"><table><thead><tr><th>Canal / pagamento</th><th>Taxas + impostos</th><th>Fixo / pedido</th><th>Preço sugerido</th></tr></thead><tbody>' +
    channels
      .flatMap((c) =>
        (c.payments?.length
          ? c.payments
          : [
              {
                name: "Sem taxa adicional de pagamento",
                feePercent: 0,
                fixedFee: 0,
                price: c.price,
              },
            ]
        ).map(
          (p) =>
            "<tr><td>" +
            esc(c.name) +
            '<small class="payment-caption">' +
            esc(p.name) +
            "</small></td><td>" +
            decimal(c.feePercent + p.feePercent + c.taxPercent) +
            "%</td><td>" +
            brl(c.fixedFee + p.fixedFee) +
            "</td><td><strong>" +
            (p.price === null ? "Margem inviável" : brl(p.price)) +
            "</strong></td></tr>",
        ),
      )
      .join("") +
    "</tbody></table></div>"
  );
}
function comparisonView(c, estimated = true) {
  if (!c)
    return '<div class="info-note">Sem previsão comparável: venda anterior à atualização ou margem inviável para o canal.</div>';
  return (
    '<section class="comparison"><h3>Previsto × realizado</h3>' +
    row("Resultado previsto no cadastro", c.expectedProfit, true) +
    Object.entries(impactLabels)
      .map(([k, label]) => row(label, c.impacts[k]))
      .join("") +
    row("Resultado com os valores informados", c.actualProfit, true) +
    row("Diferença (realizado − previsto)", c.gap, true) +
    '<p class="footnote">' +
    (c.gap < 0
      ? "Abaixo da previsão."
      : c.gap > 0
        ? "Acima da previsão."
        : "Em linha com a previsão.") +
    " " +
    (estimated
      ? "Produção estimada pelo cadastro."
      : "Produção real informada neste pedido.") +
    " Previsão calculada com os preços e taxas do cadastro no momento do registro; não inclui despesas gerais.</p></section>"
  );
}
function comparisonDashboard(c) {
  if (!c) return "";
  return (
    '<section class="panel comparison-panel"><div class="panel-head"><div><h2>Previsto × realizado</h2><p>Identifique o que mudou entre a precificação e a venda.</p></div></div><div class="sale-summary"><div><p>Resultado previsto</p><strong>' +
    brl(c.expected) +
    "</strong></div><div><p>Resultado realizado</p><strong>" +
    brl(c.actual) +
    '</strong></div><div><p>Diferença</p><strong class="' +
    (c.gap < 0 ? "negative" : "positive") +
    '">' +
    brl(c.gap) +
    "</strong></div></div>" +
    Object.entries(impactLabels)
      .map(([k, label]) => row(label, c.impacts[k]))
      .join("") +
    '<p class="footnote">' +
    c.covered +
    " venda(s) comparável(is); " +
    c.uncovered +
    " sem previsão histórica. Valores negativos reduzem o resultado. Produção estimada quando o custo real não foi informado. Despesas gerais não incluídas nesta comparação.</p></section>"
  );
}

function shutdownModal() {
  showModal(
    "Encerrar o sistema?",
    "O servidor local será desligado.",
    '<p class="confirmation">As gravações em andamento serão concluídas. Alterações que você ainda não salvou nesta ou em outras abas serão perdidas. Para abrir novamente, use <strong>INICIAR.bat</strong>.</p><div class="error" role="alert"></div><div class="form-footer"><button class="btn" data-action="close">Voltar</button><button class="btn danger" id="shutdown-confirm">Encerrar sistema</button></div>',
  );
  $("#shutdown-confirm").onclick = () =>
    submitGuard($("#modal"), async () => {
      $("#shutdown-confirm").textContent = "Concluindo gravações…";
      await api("/api/shutdown", "POST", {});
      let stopped = false;
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        try {
          await fetch("/api/session", { signal: AbortSignal.timeout(1500) });
        } catch {
          stopped = true;
          break;
        }
      }
      if (!stopped)
        throw new Error(
          "Encerramento solicitado. A porta ainda responde; aguarde e verifique novamente.",
        );
      saving = false;
      closeModal();
      $("#app").innerHTML =
        '<main class="loading"><section class="panel"><h1>Sistema encerrado</h1><p style="margin-top:16px">O servidor local foi desligado. Os registros salvos foram preservados.</p><p class="footnote">Você pode fechar esta aba. Para voltar ao ateliê, abra <strong>INICIAR.bat</strong>.</p></section></main>';
    });
}
