// Reference: blueprint:javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session, { type SessionData } from "express-session";
import type { Express, Request, RequestHandler } from "express";
import crypto from "crypto";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { env, requireEnv } from "./env";
import { type AuthenticatedRequest, type SessionUser } from "./http-types";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

const getOidcConfig = memoize(
  async () => {
    if (env.replitDomains.length === 0) {
      throw new Error("Environment variable REPLIT_DOMAINS not provided");
    }
    return await client.discovery(new URL(env.issuerUrl), requireEnv("REPL_ID", env.replId));
  },
  { maxAge: 3600 * 1000 }
);

interface ReplitClaims {
  sub: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  exp?: number;
}

type AuthSession = session.Session &
  Partial<SessionData> & {
    extensionAuth?: { extId: string };
  };

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: requireEnv("DATABASE_URL", env.databaseUrl),
    createTableIfMissing: false,
    ttl: SESSION_TTL_MS,
    tableName: "sessions",
  });
  return session({
    secret: requireEnv("SESSION_SECRET", env.sessionSecret),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax", // CSRF protection: prevents cross-site request forgery
      maxAge: SESSION_TTL_MS,
    },
  });
}

function updateUserSession(
  user: SessionUser,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  const claims = tokens.claims() as ReplitClaims;
  user.claims = claims;
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = claims.exp;
}

async function upsertUser(claims: ReplitClaims) {
  await storage.upsertUser({
    id: claims.sub,
    email: claims.email,
    firstName: claims.first_name,
    lastName: claims.last_name,
    profileImageUrl: claims.profile_image_url,
  });
}

function registerPassportSessionHandlers() {
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
}

function getLocalLoginRedirect(req: Request): string {
  const query = req.originalUrl.includes("?")
    ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
    : "";
  return `/login${query}`;
}

async function loginLocalUser(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<SessionUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await storage.upsertUser({
    id: crypto.randomUUID(),
    email: normalizedEmail,
    firstName: firstName?.trim() || undefined,
    lastName: lastName?.trim() || undefined,
    profileImageUrl: undefined,
  });

  if (!user.emailVerified) {
    await storage.updateEmailVerified(user.id, true);
  }

  return {
    claims: {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    },
    access_token: "local-bootstrap",
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
}

function setupLocalAuth(app: Express) {
  app.get("/api/login", (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect("/");
    }

    res.redirect(getLocalLoginRedirect(req));
  });

  app.post("/api/local-auth/login", async (req, res, next) => {
    try {
      const { email, firstName, lastName, accessCode, extension, ext_id: extensionId } =
        req.body ?? {};

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "A valid email is required" });
      }

      const requiredAccessCode = requireEnv(
        "LOCAL_AUTH_ACCESS_CODE",
        env.localAuthAccessCode,
        "LOCAL_AUTH_ACCESS_CODE is required when AUTH_PROVIDER=local"
      );

      if (typeof accessCode !== "string" || accessCode !== requiredAccessCode) {
        return res.status(401).json({ message: "Invalid access code" });
      }

      const sessionUser = await loginLocalUser(email, firstName, lastName);
      req.login(sessionUser as Express.User, (error) => {
        if (error) {
          return next(error);
        }

        const redirectTo =
          extension === true || extension === "true"
            ? `/extension-auth?ext_id=${encodeURIComponent(String(extensionId ?? ""))}`
            : "/";

        return res.json({ message: "Logged in", redirectTo });
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((logoutError) => {
      if (logoutError) {
        return next(logoutError);
      }

      req.session.destroy((sessionError) => {
        if (sessionError) {
          return next(sessionError);
        }

        res.redirect("/");
      });
    });
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  registerPassportSessionHandlers();

  app.get("/api/auth/config", (_req, res) => {
    res.json({
      provider: env.authProvider,
      loginPath: env.authProvider === "local" ? "/login" : "/api/login",
    });
  });

  if (env.authProvider === "local") {
    setupLocalAuth(app);
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: SessionUser = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims() as ReplitClaims);
    verified(null, user);
  };

  for (const domain of env.replitDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    );
    passport.use(strategy);
  }

  app.get("/api/login", (req, res, next) => {
    // Preserve extension params for callback
    const isExtension = req.query.extension === "true";
    const extId = req.query.ext_id as string;
    const requestSession = req.session as AuthSession;

    if (isExtension && extId) {
      // Store in session for retrieval after callback
      requestSession.extensionAuth = { extId };
    }

    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const requestSession = req.session as AuthSession;
    const extensionAuth = requestSession.extensionAuth;

    // Determine redirect URL
    let successRedirect = "/";
    if (extensionAuth?.extId) {
      // Redirect to extension auth page with ext_id
      successRedirect = `/extension-auth?ext_id=${encodeURIComponent(extensionAuth.extId)}`;
      // Clear from session
      delete requestSession.extensionAuth;
    }

    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: successRedirect,
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: requireEnv("REPL_ID", env.replId),
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req as AuthenticatedRequest).user;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  if (env.authProvider === "local") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
