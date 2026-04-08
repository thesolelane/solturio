import { storage } from "./storage";

export const ADMIN_EMAILS = [
  "admin@solturio.app",
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

export async function isAdmin(req: any, res: any, next: any) {
  if (!req.user?.claims?.sub) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = await storage.getUser(req.user.claims.sub);
    if (!user) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const emailMatch =
      user.email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(user.email.toLowerCase());
    const dbAdmin = user.isAdmin === true;

    if (!emailMatch && !dbAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ message: "Failed to verify admin access" });
  }
}
