import http from "node:http";
import { readFile, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { LocalStore } from "./infrastructure/local-store.js";
import { LocalAssets } from "./infrastructure/local-assets.js";
import { Erp } from "./application/erp.js";
import { DomainError } from "./domain/model.js";

export async function startServer({
  port = Number(process.env.PORT || 4310),
  directory = process.env.DATA_DIR || path.resolve("data"),
} = {}) {
  const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
  await mkdir(directory, { recursive: true });
  const lockPath = path.join(directory, ".server.lock");
  try {
    const lock = await open(lockPath, "wx");
    await lock.writeFile(String(process.pid));
    await lock.close();
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    const pid = Number(await readFile(lockPath, "utf8"));
    let alive = true;
    try {
      process.kill(pid, 0);
    } catch {
      alive = false;
    }
    if (alive)
      throw new Error("Esta base já está aberta em outra instância do ERP.");
    await unlink(lockPath);
    return startServer({ port, directory });
  }
  const store = new LocalStore(directory),
    assets = new LocalAssets(directory);
  try {
    await store.init();
    await assets.init();
  } catch (e) {
    await unlink(lockPath);
    throw e;
  }
  const erp = new Erp(store, assets),
    token = randomBytes(32).toString("hex");
  let closing = false,
    active = 0,
    stopPromise,
    releasePromise;
  const releaseLock = () =>
    (releasePromise ??= unlink(lockPath).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    }));
  const waiters = [];
  const waitForRequests = (limit = 0) =>
    active <= limit
      ? Promise.resolve()
      : new Promise((resolve) => waiters.push({ limit, resolve }));
  function stop() {
    if (stopPromise) return stopPromise;
    closing = true;
    stopPromise = (async () => {
      const closed = new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      server.closeIdleConnections();
      await waitForRequests();
      await store.queue;
      await closed;
      await releaseLock();
    })();
    return stopPromise;
  }
  const server = http.createServer(async (req, res) => {
    let counted = false;
    const host = req.headers.host,
      allowed = new Set([
        `127.0.0.1:${server.address()?.port ?? port}`,
        `localhost:${server.address()?.port ?? port}`,
      ]);
    const json = (status, value) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    try {
      if (!allowed.has(host)) throw new DomainError("Host não permitido.", 403);
      if (req.headers.origin && req.headers.origin !== `http://${host}`)
        throw new DomainError("Origem não permitida.", 403);
      const url = new URL(req.url, `http://${host}`),
        route = url.pathname;
      if (!["GET", "POST", "PUT", "DELETE"].includes(req.method))
        throw new DomainError("Método não permitido.", 405);
      if (req.method !== "GET" && req.headers["x-local-token"] !== token)
        throw new DomainError("Sessão expirada. Atualize a página.", 403);
      if (closing)
        throw new DomainError(
          "O sistema está sendo encerrado. Aguarde e abra pelo INICIAR.bat.",
          503,
        );
      active++;
      counted = true;
      let body = {};
      if (["POST", "PUT"].includes(req.method)) {
        if (!String(req.headers["content-type"]).startsWith("application/json"))
          throw new DomainError("Envie dados em JSON.", 415);
        const limit = route === "/api/assets" ? 96 * 1024 * 1024 : 1024 * 1024;
        let size = 0,
          chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > limit)
            throw new DomainError("Envio maior que o limite permitido.", 413);
          chunks.push(chunk);
        }
        try {
          body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        } catch {
          throw new DomainError("JSON inválido.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new DomainError("Dados inválidos.");
      }
      if (route === "/api/session" && req.method === "GET")
        return json(200, { token });
      if (route === "/api/shutdown" && req.method === "POST") {
        closing = true;
        await waitForRequests(1);
        await store.queue;
        json(200, {
          ok: true,
          message: "Gravações concluídas. Encerrando o sistema.",
        });
        void stop().catch(console.error);
        return;
      }
      if (route === "/api/state" && req.method === "GET")
        return json(200, await erp.state(Object.fromEntries(url.searchParams)));
      if (route === "/api/products" && req.method === "POST")
        return json(201, await erp.saveProduct(body));
      const product = route.match(/^\/api\/products\/([\da-f-]{36})$/);
      if (product && req.method === "PUT")
        return json(200, await erp.saveProduct(body, product[1]));
      if (product && req.method === "DELETE")
        return json(200, await erp.deleteProduct(product[1]));
      if (route === "/api/sales" && req.method === "POST")
        return json(201, await erp.sale(body));
      const cancel = route.match(/^\/api\/sales\/([\da-f-]{36})\/cancel$/);
      if (cancel && req.method === "POST")
        return json(200, await erp.cancelSale(cancel[1]));
      if (route === "/api/settings" && req.method === "PUT")
        return json(200, await erp.settings(body));
      if (route === "/api/expenses" && req.method === "POST")
        return json(201, await erp.expense(body));
      const expense = route.match(/^\/api\/expenses\/([\da-f-]{36})$/);
      if (expense && req.method === "DELETE")
        return json(200, await erp.deleteExpense(expense[1]));
      if (route === "/api/assets" && req.method === "POST")
        return json(201, await assets.put(body));
      if (route === "/api/export" && req.method === "GET") {
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="slicer-dados.json"',
        );
        return json(200, await store.read());
      }
      if (route.startsWith("/assets/") && req.method === "GET") {
        const asset = await assets.bytes(route.slice(8));
        if (!asset) throw new DomainError("Arquivo não encontrado.", 404);
        res.setHeader("Content-Type", asset.mime);
        res.setHeader(
          "Content-Disposition",
          `${asset.mime.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
        );
        return res.end(asset.bytes);
      }
      if (route === "/pricing.js" && req.method === "GET") {
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
        return res.end(
          await readFile(new URL("./domain/pricing.js", import.meta.url)),
        );
      }
      const files = {
        "/": "index.html",
        "/app.js": "app.js",
        "/style.css": "style.css",
      };
      if (req.method === "GET" && files[route]) {
        res.setHeader(
          "Content-Type",
          route.endsWith(".js")
            ? "text/javascript; charset=utf-8"
            : route.endsWith(".css")
              ? "text/css; charset=utf-8"
              : "text/html; charset=utf-8",
        );
        return res.end(await readFile(path.join(publicDir, files[route])));
      }
      throw new DomainError("Página não encontrada.", 404);
    } catch (e) {
      if (!res.headersSent)
        json(e.status || 500, {
          error: e.status
            ? e.message
            : "Não foi possível concluir. Seus dados anteriores foram preservados.",
        });
      else res.end();
      if (!e.status) console.error(e);
    } finally {
      if (counted) active--;
      for (let i = waiters.length - 1; i >= 0; i--)
        if (active <= waiters[i].limit) waiters.splice(i, 1)[0].resolve();
    }
  });
  server.requestTimeout = 120000;
  server.headersTimeout = 15000;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  }).catch(async (e) => {
    await unlink(lockPath);
    throw e;
  });
  server.on("close", () => {
    void releaseLock().catch(console.error);
  });
  return {
    server,
    store,
    erp,
    stop,
    token,
    url: `http://127.0.0.1:${server.address().port}`,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startServer()
    .then(({ stop, url }) => {
      console.log(
        `\nSlicer ERP disponível em ${url}\nPara encerrar: botão Encerrar sistema, ENCERRAR.bat ou Ctrl+C nesta janela.\n`,
      );
      for (const signal of ["SIGINT", "SIGTERM"])
        process.on(signal, () => {
          void stop().catch((e) => {
            console.error(e);
            process.exitCode = 1;
          });
        });
    })
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
