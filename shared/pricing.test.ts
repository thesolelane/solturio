import assert from "node:assert/strict";
import { isAdminEmail } from "./pricing.ts";

export async function runTests() {
  assert.equal(isAdminEmail("Admin@Solturio.App"), true);
  assert.equal(isAdminEmail("user@example.com"), false);
  assert.equal(isAdminEmail(undefined), false);
}
