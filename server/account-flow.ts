import type { User } from "@shared/schema";

type CeremonyRouteUser = Pick<
  User,
  "ceremonyCompleted" | "recoveryPhraseVerified" | "recoveryPhraseShownAt"
>;

export function resolveAppBaseUrl(
  configuredBaseUrl: string | null | undefined,
  protocol: string,
  host: string | undefined
): string {
  if (configuredBaseUrl?.trim()) {
    return configuredBaseUrl.trim().replace(/\/+$/, "");
  }

  return `${protocol}://${host ?? "localhost"}`;
}

export function getNextCeremonyRoute(user: CeremonyRouteUser): string {
  if (user.ceremonyCompleted) {
    return "/account";
  }

  if (user.recoveryPhraseVerified) {
    return "/ceremony/stage-6-terms";
  }

  if (user.recoveryPhraseShownAt) {
    return "/ceremony/stage-5-verification";
  }

  return "/ceremony/stage-4-reveal";
}
