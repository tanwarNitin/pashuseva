import "server-only";
import { db } from "@/db";
import { users, animals, vaccinationRecords } from "@/db/schema";
import { eq } from "drizzle-orm";

async function seedReminders() {
  const [farmer] = await db.select().from(users).where(eq(users.phone, "+919876543210")).limit(1);
  if (!farmer) throw new Error("Farmer not found");

  const [animal] = await db.select().from(animals).where(eq(animals.farmerId, farmer.id)).limit(1);
  if (!animal) throw new Error("Animal not found");

  const today = new Date();
  
  const overdueDate = new Date();
  overdueDate.setUTCDate(today.getUTCDate() - 5);
  
  const dueSoonDate = new Date();
  dueSoonDate.setUTCDate(today.getUTCDate() + 5);

  const farFutureDate = new Date();
  farFutureDate.setUTCDate(today.getUTCDate() + 30);

  await db.insert(vaccinationRecords).values([
    {
      animalId: animal.id,
      farmerId: farmer.id,
      vaccineName: "TEST Overdue Vaccine",
      diseaseTarget: "Test",
      administeredOn: "2024-01-01",
      nextDueOn: overdueDate.toISOString().split("T")[0],
      source: "FARMER_REPORTED",
      createdByUserId: farmer.id,
    },
    {
      animalId: animal.id,
      farmerId: farmer.id,
      vaccineName: "TEST Due Soon Vaccine",
      diseaseTarget: "Test",
      administeredOn: "2024-01-01",
      nextDueOn: dueSoonDate.toISOString().split("T")[0],
      source: "FARMER_REPORTED",
      createdByUserId: farmer.id,
    },
    {
      animalId: animal.id,
      farmerId: farmer.id,
      vaccineName: "TEST Far Future Vaccine",
      diseaseTarget: "Test",
      administeredOn: "2024-01-01",
      nextDueOn: farFutureDate.toISOString().split("T")[0],
      source: "FARMER_REPORTED",
      createdByUserId: farmer.id,
    }
  ]);

  console.log("Seeded test reminders for Rajesh Kumar");
}

seedReminders().catch(console.error);
