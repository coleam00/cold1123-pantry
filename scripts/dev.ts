// `bun run dev`: the API server (restarting on changes) and the Vite dev server together,
// the same way on Windows, macOS and Linux.
export {};

const procs = [
  Bun.spawn(["bun", "--watch", "src/server/main.ts"], { stdout: "inherit", stderr: "inherit" }),
  Bun.spawn(["bun", "x", "vite"], { stdout: "inherit", stderr: "inherit" }),
];
const stopAll = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
await Promise.all(procs.map((p) => p.exited));
