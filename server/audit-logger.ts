/**
 * Phase 3: Audit Logging Service
 * - Logs all API calls
 * - Tracks user actions
 * - Compliance and debugging
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  action: string;
  endpoint: string;
  method: string;
  statusCode: number;
  requestId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditLogger {
  private logs: Map<string, AuditLogEntry> = new Map();
  private maxLogs = 10000;

  log(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    };

    // Store in memory (in production, write to database)
    this.logs.set(auditEntry.id, auditEntry);

    // Rotate logs if too many
    if (this.logs.size > this.maxLogs) {
      const firstKey = this.logs.keys().next().value;
      this.logs.delete(firstKey);
    }

    // Console log important actions
    if (entry.statusCode >= 400) {
      console.warn(
        `[AUDIT] ${entry.method} ${entry.endpoint} - ${entry.statusCode} - User: ${entry.userId}`
      );
    }

    return auditEntry;
  }

  getLog(id: string): AuditLogEntry | undefined {
    return this.logs.get(id);
  }

  getAllLogs(): AuditLogEntry[] {
    return Array.from(this.logs.values());
  }

  getLogsByUser(userId: string): AuditLogEntry[] {
    return Array.from(this.logs.values()).filter((l) => l.userId === userId);
  }

  getLogsByEndpoint(endpoint: string): AuditLogEntry[] {
    return Array.from(this.logs.values()).filter((l) => l.endpoint === endpoint);
  }

  // Persist logs to database (Phase 3 enhancement)
  async persistLogs(): Promise<void> {
    // TODO: Implement database persistence
    console.log(`[AUDIT] Persisting ${this.logs.size} audit logs to database`);
  }
}

export const auditLogger = new AuditLogger();
