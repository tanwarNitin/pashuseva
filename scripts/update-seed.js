const fs = require('fs');
let c = fs.readFileSync('scripts/seed.ts', 'utf8');
c = c.replace(
  'const pinHash = await hashPIN("1234");',
  'const pinHash = await hashPIN("1234");\n    const adminPinHash = await hashPIN("0000");\n    await db.insert(users).values({name: "System Admin", phone: "+919999999999", role: "ADMIN", status: "ACTIVE", pinHash: adminPinHash, preferredLocale: "en"});'
);
fs.writeFileSync('scripts/seed.ts', c);
console.log("Done");
