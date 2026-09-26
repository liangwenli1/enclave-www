import "server-only";
import { headers } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n/locale";

export async function getRequestLocale(): Promise<Locale> {
  const value = (await headers()).get("x-enclave-locale") ?? "en";
  return isLocale(value) ? value : "en";
}
