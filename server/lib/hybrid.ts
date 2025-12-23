import crypto from "crypto";

export function hybridContextHash(audioHashHex: string, context: string) {
  return crypto.createHash("sha256").update(`${audioHashHex}:${context}`).digest("hex");
}

export function hybridId(audioHashHex: string, releaseId: string, trackNumber: number) {
  return crypto.createHash("sha256")
    .update(`${audioHashHex}:${releaseId}:${trackNumber}:v1`)
    .digest("hex");
}
