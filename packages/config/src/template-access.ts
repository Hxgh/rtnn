declare const process: {
  env: Record<string, string | undefined>;
};

import { TEMPLATE_ACCOUNT_DEFAULTS } from "./index";

function readServerEnv(keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

const templateAdminPassword = readServerEnv(["TEMPLATE_ADMIN_PASSWORD"], "Admin123!@#");
const templateCustomerPassword = readServerEnv(
  ["TEMPLATE_CUSTOMER_PASSWORD"],
  "Customer123!@#",
);

export const TEMPLATE_ACCESS_DEFAULTS = {
  admin: {
    ...TEMPLATE_ACCOUNT_DEFAULTS.admin,
    password: templateAdminPassword,
  },
  customer: {
    ...TEMPLATE_ACCOUNT_DEFAULTS.customer,
    password: templateCustomerPassword,
  },
} as const;
