import { db } from "../src/db";
import { users } from "../src/db/schema";

async function main() {
  const allUsers = await db.select().from(users);
  console.log(allUsers);
  process.exit(0);
}

main();
