const port = Number(process.env.PORT || 4310);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Porta inválida.");
const url = `http://127.0.0.1:${port}`;
try {
  const session = await fetch(url + "/api/session", {
    signal: AbortSignal.timeout(5000),
  });
  if (!session.ok)
    throw new Error("Não foi possível identificar a sessão local.");
  const { token } = await session.json();
  const response = await fetch(url + "/api/shutdown", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Local-Token": token },
    body: "{}",
    signal: AbortSignal.timeout(125000),
  });
  if (!response.ok)
    throw new Error(
      "Não foi possível encerrar. Confira se a versão atualizada do ERP está aberta.",
    );
  for (let attempt = 0; attempt < 50; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      await fetch(url + "/api/session", { signal: AbortSignal.timeout(1000) });
    } catch {
      console.log("Slicer ERP encerrado. Você pode fechar esta janela.");
      process.exit(0);
    }
  }
  throw new Error(
    "Encerramento solicitado, mas a porta ainda responde. Aguarde e verifique novamente.",
  );
} catch (e) {
  if (e.cause?.code === "ECONNREFUSED")
    console.log("O Slicer ERP já está desligado.");
  else {
    console.error(e.message);
    process.exitCode = 1;
  }
}
