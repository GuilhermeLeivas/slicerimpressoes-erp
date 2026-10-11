import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DomainError } from "../domain/model.js";

export class LocalAssets {
  constructor(directory) {
    this.directory = path.join(directory, "assets");
  }
  async init() {
    await mkdir(this.directory, { recursive: true });
  }
  async put({ name, data }) {
    if (
      typeof name !== "string" ||
      typeof data !== "string" ||
      !data.length ||
      data.length > 95 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
    )
      throw new DomainError("Arquivo inválido ou maior que 70 MB.");
    const ext = path.extname(name).toLowerCase(),
      bytes = Buffer.from(data, "base64");
    const types = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".stl": "application/octet-stream",
      ".obj": "text/plain",
      ".3mf": "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
    };
    if (!types[ext] || !bytes.length || bytes.length > 70 * 1024 * 1024)
      throw new DomainError("Use PNG, JPG, WebP, STL, OBJ ou 3MF (até 70 MB).");
    if (types[ext].startsWith("image/")) {
      if (bytes.length > 8 * 1024 * 1024)
        throw new DomainError("Cada imagem pode ter até 8 MB.");
      const valid =
        ext === ".png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : ext === ".webp"
            ? bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP"
            : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!valid)
        throw new DomainError(
          "O conteúdo não corresponde ao formato da imagem.",
        );
    }
    const asset = {
      id: randomUUID() + ext,
      name: path.basename(name).slice(0, 180),
      mime: types[ext],
      size: bytes.length,
    };
    await writeFile(path.join(this.directory, asset.id), bytes, { flag: "wx" });
    await writeFile(
      path.join(this.directory, asset.id + ".json"),
      JSON.stringify(asset),
      { flag: "wx" },
    );
    return asset;
  }
  async get(id) {
    if (!/^[\da-f-]{36}\.(png|jpe?g|webp|stl|obj|3mf)$/.test(id)) return null;
    try {
      return JSON.parse(
        await readFile(path.join(this.directory, id + ".json"), "utf8"),
      );
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }
  async bytes(id) {
    const asset = await this.get(id);
    return asset
      ? { ...asset, bytes: await readFile(path.join(this.directory, id)) }
      : null;
  }
}
