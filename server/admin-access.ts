import type { User } from "../shared/schema.ts";
import { isAdminEmail } from "../shared/pricing.ts";

export function hasAdminAccess(user: Pick<User, "email" | "isAdmin"> | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return isAdminEmail(user.email) || user.isAdmin === true;
}
