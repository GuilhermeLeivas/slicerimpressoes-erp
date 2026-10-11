import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  unlink,
  open,
} from "node:fs/promises";
import path from "node:path";
import { defaultSettings } from "../domain/model.js";

export class LocalStore {
  constructor(directory) {
    this.directory = directory;
    this.file = path.join(directory, "database.json");
    this.queue = Promise.resolve();
  }
  async init() {
    await mkdir(path.join(this.directory, "backups"), { recursive: true });
    try {
      await this.read();
    } catch (e) {
      if (e.code !== "ENOENT")
        throw new Error(
          "Não foi possível ler a base local. Os arquivos foram preservados. Restaure um backup.",
        );
      await this.write({
        schemaVersion: 1,
        settings: defaultSettings(),
        products: [],
        sales: [],
        expenses: [],
        movements: [],
      });
    }
  }
  async read() {
    const s = JSON.parse(await readFile(this.file, "utf8"));
    if (
      s.schemaVersion !== 1 ||
      !Array.isArray(s.products) ||
      !Array.isArray(s.sales) ||
      !Array.isArray(s.expenses) ||
      !Array.isArray(s.movements) ||
      !s.settings ||
      !Array.isArray(s.settings.channels)
    )
      throw new Error("Formato de base não suportado.");
    return s;
  }
  async write(state) {
    const temp = this.file + ".tmp";
    const handle = await open(temp, "w");
    try {
      await handle.writeFile(JSON.stringify(state, null, 2), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, this.file);
  }
  transaction(fn) {
    const task = this.queue.then(async () => {
      const state = await this.read();
      const before = JSON.stringify(state, null, 2);
      const result = await fn(state);
      const backup = path.join(
        this.directory,
        "backups",
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
      );
      await writeFile(backup, before, "utf8");
      await this.write(state);
      // Rotation failure must never report a committed sale as failed.
      try {
        const files = (await readdir(path.join(this.directory, "backups")))
          .filter((f) => f.endsWith(".json"))
          .sort();
        for (const f of files.slice(0, -50))
          await unlink(path.join(this.directory, "backups", f));
      } catch {}
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
