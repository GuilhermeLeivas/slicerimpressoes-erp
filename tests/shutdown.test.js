import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startServer } from "../src/server.js";

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "slicer-shutdown-"));
  const app = await startServer({ port: 0, directory });
  t.after(async () => {
    await app.stop();
    await rm(directory, { recursive: true, force: true });
  });
  const headers = {
    "content-type": "application/json",
    "x-local-token": app.token,
  };
  return { ...app, directory, headers };
}
test("encerramento exige token e origem local; espera requisições de gravação aceitas", async (t) => {
  const app = await fixture(t);
  assert.equal((await fetch(app.url + "/api/shutdown")).status, 404);
  assert.equal(
    (
      await fetch(app.url + "/api/shutdown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(app.url + "/api/shutdown", {
        method: "POST",
        headers: { ...app.headers, origin: "https://other.example" },
        body: "{}",
      })
    ).status,
    403,
  );
  let release, entered;
  const gate = new Promise((r) => (release = r)),
    started = new Promise((r) => (entered = r)),
    original = app.erp.saveProduct.bind(app.erp);
  app.erp.saveProduct = async (...args) => {
    entered();
    await gate;
    return original(...args);
  };
  const saving = fetch(app.url + "/api/products", {
    method: "POST",
    headers: app.headers,
    body: JSON.stringify({
      name: "Peça preservada",
      sku: "SAFE",
      stock: 1,
      costs: { other: 30 },
    }),
  });
  await started;
  const shutdown = fetch(app.url + "/api/shutdown", {
    method: "POST",
    headers: app.headers,
    body: "{}",
  });
  // Wait for the explicit draining state, not an arbitrary delay.
  let draining = false;
  for (let i = 0; i < 50; i++) {
    if ((await fetch(app.url + "/api/state")).status === 503) {
      draining = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.equal(draining, true);
  assert.equal(
    (
      await fetch(app.url + "/api/expenses", {
        method: "POST",
        headers: app.headers,
        body: JSON.stringify({
          date: "2026-10-05",
          description: "Blocked",
          category: "Test",
          amount: 5,
        }),
      })
    ).status,
    503,
  );
  release();
  assert.equal((await saving).status, 201);
  assert.equal((await shutdown).status, 200);
  await app.stop();
  const state = JSON.parse(
    await readFile(path.join(app.directory, "database.json"), "utf8"),
  );
  assert.equal(state.products[0].name, "Peça preservada");
  assert.equal(state.expenses.length, 0);
  await assert.rejects(access(path.join(app.directory, ".server.lock")));
  await assert.rejects(fetch(app.url + "/api/session"));
});
test("comando usado pelo ENCERRAR.bat desliga o servidor e confirma a porta fechada", async (t) => {
  const app = await fixture(t);
  const script = fileURLToPath(new URL("../src/stop.js", import.meta.url));
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, PORT: new URL(app.url).port },
    windowsHide: true,
  });
  let output = "";
  child.stdout.on("data", (x) => (output += x));
  child.stderr.on("data", (x) => (output += x));
  const code = await new Promise((resolve, reject) => {
    child.on("exit", resolve);
    child.on("error", reject);
  });
  assert.equal(code, 0, output);
  assert.match(output, /encerrado/);
  await app.stop();
  await assert.rejects(fetch(app.url));
});
