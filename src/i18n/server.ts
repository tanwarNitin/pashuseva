import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const dictionaries = {
  en: () => import("./dictionaries/en").then((module) => module.en),
  hi: () => import("./dictionaries/hi").then((module) => module.hi),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
