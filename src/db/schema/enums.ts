import { pgEnum } from "drizzle-orm/pg-core";

/**
 * User role enumeration
 */
export const userRoleEnum = pgEnum("user_role", [
  "FARMER",
  "VET_DOCTOR",
  "PARAVET_WORKER",
  "ADMIN",
]);

/**
 * Account status enumeration
 */
export const accountStatusEnum = pgEnum("account_status", [
  "ACTIVE",
  "SUSPENDED",
]);

/**
 * Service codes catalog
 */
export const serviceCodeEnum = pgEnum("service_code", [
  "CONSULTATION",
  "EMERGENCY",
  "VACCINATION",
  "ARTIFICIAL_INSEMINATION",
  "BASIC_LIVESTOCK_ASSISTANCE",
]);
