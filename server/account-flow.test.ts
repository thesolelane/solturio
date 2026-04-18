import assert from "node:assert/strict";
import { getNextCeremonyRoute, resolveAppBaseUrl } from "./account-flow.ts";

export async function runTests() {
  assert.equal(
    resolveAppBaseUrl("https://solturio.app///", "http", "localhost:5000"),
    "https://solturio.app"
  );

  assert.equal(resolveAppBaseUrl(undefined, "https", "example.com"), "https://example.com");

  assert.equal(
    getNextCeremonyRoute({
      ceremonyCompleted: true,
      recoveryPhraseVerified: false,
      recoveryPhraseShownAt: null,
    }),
    "/account"
  );

  assert.equal(
    getNextCeremonyRoute({
      ceremonyCompleted: false,
      recoveryPhraseVerified: true,
      recoveryPhraseShownAt: null,
    }),
    "/ceremony/stage-6-terms"
  );

  assert.equal(
    getNextCeremonyRoute({
      ceremonyCompleted: false,
      recoveryPhraseVerified: false,
      recoveryPhraseShownAt: new Date(),
    }),
    "/ceremony/stage-5-verification"
  );

  assert.equal(
    getNextCeremonyRoute({
      ceremonyCompleted: false,
      recoveryPhraseVerified: false,
      recoveryPhraseShownAt: null,
    }),
    "/ceremony/stage-4-reveal"
  );
}
