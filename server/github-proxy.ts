/**
 * GitHub Integration Proxy Router
 * Securely proxies requests to SC Replit's /api/github/* endpoints
 * - Auth validation before forwarding
 * - Request signing
 * - Audit logging
 */

import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { scRequest, isConfigured, getCircuitBreakerStatus } from "./sc-client";
import { auditLogger } from "./audit-logger";
import { storage } from "./storage";

export const githubProxyRouter = Router();

interface OnChainInstruction {
  instruction: string;
  accounts: Array<{
    name: string;
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  args: Record<string, any>;
  requiresDualSignature: boolean;
  note: string;
}

interface SCGitHubResponse {
  success: boolean;
  onChain?: {
    instruction: OnChainInstruction;
  };
  error?: string;
  [key: string]: any;
}

/**
 * POST /api/github/link-wallet
 * Link a Solana wallet to GitHub account
 */
githubProxyRouter.post("/link-wallet", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet address required",
        requestId,
      });
    }

    const response = await scRequest<SCGitHubResponse>({
      method: "POST",
      path: "/api/github/link-wallet",
      body: { walletAddress, userId },
      userId,
      requestId,
    });

    auditLogger.log({
      action: "GITHUB_LINK_WALLET",
      endpoint: "/api/github/link-wallet",
      method: "POST",
      statusCode: response.statusCode,
      requestId,
      userId,
      details: { walletAddress, success: response.success },
    });

    if (!response.success) {
      return res.status(response.statusCode).json({
        success: false,
        error: response.error,
        requestId,
      });
    }

    res.json({
      success: true,
      ...response.data,
      requestId,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error linking wallet:", error);
    res.status(500).json({
      success: false,
      error: "Failed to link wallet",
      requestId,
    });
  }
});

/**
 * GET /api/github/oauth/start
 * Start GitHub OAuth flow - redirects to GitHub
 */
githubProxyRouter.get("/oauth/start", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const response = await scRequest<{ redirectUrl: string }>({
      method: "GET",
      path: "/api/github/oauth/start",
      userId,
      requestId,
    });

    auditLogger.log({
      action: "GITHUB_OAUTH_START",
      endpoint: "/api/github/oauth/start",
      method: "GET",
      statusCode: response.statusCode,
      requestId,
      userId,
    });

    if (!response.success || !response.data?.redirectUrl) {
      return res.status(response.statusCode).json({
        success: false,
        error: response.error || "Failed to start OAuth",
        requestId,
      });
    }

    res.redirect(response.data.redirectUrl);
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error starting OAuth:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start GitHub OAuth",
      requestId,
    });
  }
});

/**
 * GET /api/github/oauth/callback
 * Handle GitHub OAuth callback
 */
githubProxyRouter.get("/oauth/callback", async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const { code, state } = req.query;

  try {
    if (!isConfigured()) {
      return res.redirect("/account?error=github_not_configured");
    }

    const response = await scRequest<SCGitHubResponse>({
      method: "GET",
      path: `/api/github/oauth/callback?code=${code}&state=${state}`,
      requestId,
    });

    auditLogger.log({
      action: "GITHUB_OAUTH_CALLBACK",
      endpoint: "/api/github/oauth/callback",
      method: "GET",
      statusCode: response.statusCode,
      requestId,
      details: { hasCode: !!code, hasState: !!state },
    });

    if (!response.success || !response.data) {
      return res.redirect(`/account?error=${encodeURIComponent(response.error || "oauth_failed")}`);
    }

    const data = response.data;
    if (data.onChain) {
      const encodedInstruction = encodeURIComponent(
        JSON.stringify(data.onChain)
      );
      return res.redirect(`/account?github_instruction=${encodedInstruction}`);
    }

    res.redirect("/account?github_linked=true");
  } catch (error: any) {
    console.error("[GITHUB-PROXY] OAuth callback error:", error);
    res.redirect("/account?error=oauth_failed");
  }
});

/**
 * POST /api/github/register-code
 * Register a code repository
 */
githubProxyRouter.post("/register-code", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const { repoUrl, commitHash, walletAddress } = req.body;

    if (!repoUrl || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Repository URL and wallet address required",
        requestId,
      });
    }

    const response = await scRequest<SCGitHubResponse>({
      method: "POST",
      path: "/api/github/register-code",
      body: { repoUrl, commitHash, walletAddress, userId },
      userId,
      requestId,
    });

    auditLogger.log({
      action: "GITHUB_REGISTER_CODE",
      endpoint: "/api/github/register-code",
      method: "POST",
      statusCode: response.statusCode,
      requestId,
      userId,
      details: { repoUrl, success: response.success },
    });

    if (!response.success) {
      return res.status(response.statusCode).json({
        success: false,
        error: response.error,
        requestId,
      });
    }

    res.json({
      success: true,
      ...response.data,
      requestId,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error registering code:", error);
    res.status(500).json({
      success: false,
      error: "Failed to register code",
      requestId,
    });
  }
});

/**
 * POST /api/github/close-challenge
 * Close an expired OAuth challenge
 */
githubProxyRouter.post("/close-challenge", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const { walletAddress } = req.body;

    const response = await scRequest<SCGitHubResponse>({
      method: "POST",
      path: "/api/github/close-challenge",
      body: { walletAddress, userId },
      userId,
      requestId,
    });

    auditLogger.log({
      action: "GITHUB_CLOSE_CHALLENGE",
      endpoint: "/api/github/close-challenge",
      method: "POST",
      statusCode: response.statusCode,
      requestId,
      userId,
    });

    res.status(response.statusCode).json({
      success: response.success,
      ...response.data,
      error: response.error,
      requestId,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error closing challenge:", error);
    res.status(500).json({
      success: false,
      error: "Failed to close challenge",
      requestId,
    });
  }
});

/**
 * GET /api/github/link-status/:wallet
 * Get GitHub link status for a wallet
 */
githubProxyRouter.get("/link-status/:wallet", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;
  const { wallet } = req.params;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const response = await scRequest({
      method: "GET",
      path: `/api/github/link-status/${wallet}`,
      userId,
      requestId,
    });

    res.status(response.statusCode).json({
      success: response.success,
      ...response.data,
      error: response.error,
      requestId,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error getting link status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get link status",
      requestId,
    });
  }
});

/**
 * GET /api/github/on-chain-status/:wallet
 * Check on-chain account existence
 */
githubProxyRouter.get("/on-chain-status/:wallet", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;
  const { wallet } = req.params;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const response = await scRequest({
      method: "GET",
      path: `/api/github/on-chain-status/${wallet}`,
      userId,
      requestId,
    });

    res.status(response.statusCode).json({
      success: response.success,
      ...response.data,
      error: response.error,
      requestId,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error getting on-chain status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get on-chain status",
      requestId,
    });
  }
});

/**
 * GET /api/github/registrations/:wallet
 * List all registered repositories for a wallet
 */
githubProxyRouter.get("/registrations/:wallet", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;
  const { wallet } = req.params;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const response = await scRequest({
      method: "GET",
      path: `/api/github/registrations/${wallet}`,
      userId,
      requestId,
    });

    res.status(response.statusCode).json({
      success: response.success,
      ...response.data,
      error: response.error,
      requestId,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error getting registrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get registrations",
      requestId,
    });
  }
});

/**
 * POST /api/github/webhook
 * Handle GitHub push webhook notifications
 */
githubProxyRouter.post("/webhook", async (req, res) => {
  const requestId = `gh_${Date.now()}`;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const response = await scRequest({
      method: "POST",
      path: "/api/github/webhook",
      body: req.body,
      requestId,
    });

    auditLogger.log({
      action: "GITHUB_WEBHOOK",
      endpoint: "/api/github/webhook",
      method: "POST",
      statusCode: response.statusCode,
      requestId,
      details: { event: req.headers["x-github-event"] },
    });

    res.status(response.statusCode).json({
      success: response.success,
      error: response.error,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Webhook error:", error);
    res.status(500).json({
      success: false,
      error: "Webhook processing failed",
    });
  }
});

/**
 * POST /api/github/submit-signed
 * Submit a dual-signed transaction to SC
 */
githubProxyRouter.post("/submit-signed", isAuthenticated, async (req: any, res) => {
  const requestId = `gh_${Date.now()}`;
  const userId = req.user?.claims?.sub;

  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "GitHub integration not configured",
        requestId,
      });
    }

    const { instruction, signature, accounts, args } = req.body;

    if (!instruction || !signature) {
      return res.status(400).json({
        success: false,
        error: "Instruction and signature required",
        requestId,
      });
    }

    const response = await scRequest({
      method: "POST",
      path: "/api/github/submit-signed",
      body: { instruction, signature, accounts, args, userId },
      userId,
      requestId,
    });

    auditLogger.log({
      action: "GITHUB_SUBMIT_SIGNED",
      endpoint: "/api/github/submit-signed",
      method: "POST",
      statusCode: response.statusCode,
      requestId,
      userId,
      details: { instruction, success: response.success },
    });

    if (!response.success) {
      return res.status(response.statusCode).json({
        success: false,
        error: response.error,
        requestId,
      });
    }

    res.json({
      success: true,
      transactionHash: response.data?.transactionHash,
      ...response.data,
      requestId,
    });
  } catch (error: any) {
    console.error("[GITHUB-PROXY] Error submitting signed tx:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit signed transaction",
      requestId,
    });
  }
});

/**
 * GET /api/github/status
 * Check SC connection status and circuit breaker state
 */
githubProxyRouter.get("/status", async (req, res) => {
  const configured = isConfigured();
  const circuitStatus = getCircuitBreakerStatus();

  res.json({
    configured,
    circuitBreaker: circuitStatus,
    available: configured && !circuitStatus.isOpen,
  });
});
