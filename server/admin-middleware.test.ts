import assert from "node:assert/strict";
import { hasAdminAccess } from "./admin-access.ts";

export async function runTests() {
  assert.equal(hasAdminAccess({ email: "ADMIN@SOLTURIO.APP", isAdmin: false }), true);
  assert.equal(hasAdminAccess({ email: "owner@example.com", isAdmin: true }), true);
  assert.equal(hasAdminAccess({ email: "user@example.com", isAdmin: false }), false);
  assert.equal(hasAdminAccess(null), false);
}
