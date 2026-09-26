import { execSync } from "child_process";

console.log("==========================================");
console.log("       PASHU SEVA 2 - TEST SUITE          ");
console.log("==========================================\n");
console.log("PREREQUISITES:");
console.log("1. Docker DB must be running (docker compose up -d)");
console.log("2. Next.js dev server must be running (npm run dev)");
console.log("3. DB must be seeded (npm run db:seed)\n");

const commands = [
  { name: "Unit Tests", cmd: "npm run test:unit" },
  { name: "Integration Tests", cmd: "npm run test:integration" },
  { name: "UI/E2E Tests", cmd: "npm run test:e2e" }
];

for (const { name, cmd } of commands) {
  console.log(`\n\n==========================================`);
  console.log(`▶ Running ${name} (${cmd})`);
  console.log(`==========================================\n`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error(`\n❌ ${name} failed!`);
    process.exit(1);
  }
}

console.log("\n✅ ALL TEST SUITES PASSED SUCCESSFULLY! ✅");
