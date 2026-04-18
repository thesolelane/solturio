import "./load-env";
import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { env } from "./env";
import { getErrorMessage } from "./http-types";

const app = express();

type TelegramBotStatus = "initializing" | "online" | "offline" | "not_configured";

interface RetryableTelegramBot {
  launch(): Promise<void>;
  stop(reason?: string): void;
}

interface StatusError {
  status?: number;
  statusCode?: number;
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare global {
  var telegramBotStatus: TelegramBotStatus | undefined;
}
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

const SENSITIVE_RESPONSE_PATHS = [
  /\/api\/admin\/secrets\/[^/]+\/reveal$/,
  /^\/api\/account\/export-private-key$/,
  /^\/api\/extension\/token$/,
  /^\/api\/visitor\/login$/,
  /^\/api\/visitor\/register$/,
];

function shouldLogResponseBody(path: string): boolean {
  return !SENSITIVE_RESPONSE_PATHS.some((pattern) => pattern.test(path));
}

// Retry Telegram connection with exponential backoff
async function retryTelegramConnection(quizBot: RetryableTelegramBot, attempt: number) {
  const maxAttempts = 5;
  const baseDelay = 30000; // 30 seconds
  const maxDelay = 300000; // 5 minutes

  if (attempt > maxAttempts) {
    console.warn("⚠️ Telegram bot: Max retry attempts reached. Bot will remain offline.");
    console.warn("   Restart the server to try again.");
    return;
  }

  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  console.log(`🔄 Telegram bot: Retry attempt ${attempt}/${maxAttempts} in ${delay / 1000}s...`);

  setTimeout(async () => {
    try {
      // Stop any existing polling before retry
      quizBot.stop("retry");

      await quizBot.launch();
      globalThis.telegramBotStatus = "online";
      console.log("✅ Telegram bot reconnected successfully");
    } catch (error: unknown) {
      globalThis.telegramBotStatus = "offline";
      console.warn(`Telegram bot retry ${attempt} failed:`, getErrorMessage(error));
      retryTelegramConnection(quizBot, attempt + 1);
    }
  }, delay);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Skip response-body logging for endpoints that return plaintext secrets,
      // auth tokens, or one-time verification values.
      if (capturedJsonResponse && shouldLogResponseBody(path)) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Telegram quiz bot with resilient error handling
  // Bot failures should not crash the main platform
  let telegramBotStatus: TelegramBotStatus = "initializing";

  try {
    const { quizBot } = await import("./telegram-bot");
    const { quizScheduler } = await import("./quiz-scheduler");

    // Launch bot in background - don't await (long-polling blocks)
    // Use setImmediate to not block server startup
    setImmediate(async () => {
      try {
        await quizBot.launch();
        globalThis.telegramBotStatus = "online";
        console.log("✅ Telegram bot launched successfully");
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        const isConfigError = errorMessage.includes("not configured");

        globalThis.telegramBotStatus = isConfigError ? "not_configured" : "offline";
        console.warn("⚠️ Telegram bot failed to launch:", errorMessage);
        console.warn("   The platform will continue without Telegram quiz features.");

        // Only retry if it's a network/transient error, not a config error
        if (!isConfigError) {
          console.warn("   Bot will attempt to reconnect in the background.");
          retryTelegramConnection(quizBot, 1);
        }
      }
    });

    // Start scheduler (won't affect platform if bot is offline)
    quizScheduler.start();
  } catch (error: unknown) {
    telegramBotStatus = "offline";
    console.warn("Telegram bot initialization failed:", getErrorMessage(error));
    console.warn("   The platform will continue without Telegram quiz features.");
  }

  // Store bot status for health checks
  globalThis.telegramBotStatus = telegramBotStatus;

  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const maybeStatusError = err as StatusError;
    const status = maybeStatusError.status || maybeStatusError.statusCode || 500;
    const message = getErrorMessage(err) || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = env.port;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
