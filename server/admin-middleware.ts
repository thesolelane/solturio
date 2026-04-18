import { storage } from "./storage";
import type { User } from "@shared/schema";
import { auditLogger } from "./audit-logger";
import {
  getErrorMessage,
  type AppNextFunction,
  type AppResponse,
  type AuthenticatedRequest,
} from "./http-types";
import { hasAdminAccess } from "./admin-access";

export { hasAdminAccess } from "./admin-access";

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: AppResponse,
  next: AppNextFunction
) {
  if (!req.user?.claims?.sub) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      error: "Authentication required",
    });
  }

  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!hasAdminAccess(user)) {
      auditLogger.log({
        action: "ADMIN_ACCESS_DENIED",
        endpoint: req.path,
        method: req.method,
        statusCode: 403,
        userId,
        details: { email: user?.email, reason: "User is not an admin" },
      });
      return res
        .status(403)
        .json({ success: false, message: "Admin access required", error: "Admin access required" });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify admin access",
      error: getErrorMessage(error),
    });
  }
}

export const isAdmin = requireAdmin;
