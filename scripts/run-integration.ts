import { execSync } from "child_process";

const integrationScripts = [
  "scripts/test-e2e-registration.ts",
  "scripts/test-security.ts",
  "scripts/test-state-machine.ts",
  "scripts/test-e2e-part2.ts"
];

console.log("==========================================");
console.log("       STARTING INTEGRATION TESTS         ");
console.log("==========================================\n");
console.log("PREREQUISITES: Ensure Docker DB is running and seeded.");

for (const script of integrationScripts) {
  console.log(`\n▶ Running ${script}...`);
  try {
    execSync(`npx tsx --conditions react-server --env-file=.env.local ${script}`, { stdio: "inherit" });
    console.log(`✓ ${script} PASSED.`);
  } catch (err) {
    console.error(`\n❌ Integration test failed: ${script}`);
    process.exit(1);
  }
}

console.log("\n🎉 ALL INTEGRATION TESTS PASSED! 🎉");
