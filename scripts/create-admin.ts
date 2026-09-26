import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPIN } from "../src/lib/auth/pin";
import { toE164 } from "../src/lib/phone";

async function main() {
  const adminPhone = toE164("9999999999");
  const adminPin = "0000";

  console.log("Creating admin user with phone", adminPhone, "and PIN", adminPin);

  const pinHash = await hashPIN(adminPin);

  await db.insert(users).values({
    phone: adminPhone,
    pinHash,
    name: "System Admin",
    role: "ADMIN",
    status: "ACTIVE",
    isDemo: true,
  });

  console.log("Admin user created successfully.");
  process.exit(0);
}

main().catch(e => {
  console.error("Error creating admin user:", e);
  process.exit(1);
});
