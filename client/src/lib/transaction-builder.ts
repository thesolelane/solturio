/**
 * Transaction Builder Utilities
 * Handles dual-signature transactions for SC integration
 */

export interface OnChainInstruction {
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

export interface SCTransactionResponse {
  success: boolean;
  onChain?: {
    instruction: OnChainInstruction;
  };
  error?: string;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export async function submitDualSignatureTransaction(
  instruction: OnChainInstruction,
  walletSignFn: (message: Uint8Array) => Promise<Uint8Array>
): Promise<TransactionResult> {
  try {
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(JSON.stringify(instruction));

    const signature = await walletSignFn(messageBytes);

    const response = await fetch("/api/github/submit-signed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction: instruction.instruction,
        signature: Array.from(signature),
        accounts: instruction.accounts,
        args: instruction.args,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Transaction failed" };
    }

    return {
      success: true,
      signature: result.transactionHash,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function parseInstructionFromUrl(): OnChainInstruction | null {
  const params = new URLSearchParams(window.location.search);
  const instructionParam = params.get("github_instruction");

  if (!instructionParam) return null;

  try {
    const decoded = decodeURIComponent(instructionParam);
    return JSON.parse(decoded) as OnChainInstruction;
  } catch {
    return null;
  }
}

export function formatAccountsForDisplay(accounts: OnChainInstruction["accounts"]): string[] {
  return accounts.map((acc) => {
    const signerIcon = acc.isSigner ? "[S]" : "";
    const writableIcon = acc.isWritable ? "[W]" : "";
    return `${acc.name}: ${acc.pubkey.slice(0, 8)}...${acc.pubkey.slice(-4)} ${signerIcon}${writableIcon}`;
  });
}

export function getInstructionDescription(instruction: string): string {
  const descriptions: Record<string, string> = {
    create_oauth_challenge: "Create OAuth verification challenge",
    verify_oauth_challenge: "Verify GitHub OAuth connection",
    close_oauth_challenge: "Close expired challenge and recover rent",
    register_code: "Register code repository on-chain",
    link_wallet: "Link wallet to GitHub account",
  };

  return descriptions[instruction] || instruction;
}
