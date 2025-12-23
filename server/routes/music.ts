import { Router } from "express";
import multer from "multer";
import { sha256Hex } from "../lib/hash";
import { encryptAesGcm } from "../lib/crypto-aes";
import { hybridContextHash, hybridId } from "../lib/hybrid";

const upload = multer({ storage: multer.memoryStorage() });
export const musicRouter = Router();

musicRouter.post("/upload", upload.single("file"), async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const file = req.file;
  if (!file) return res.status(400).json({ error: "missing file" });

  const {
    collectionId,
    title,
    mode,
    releaseType,
    releaseTitle,
    trackNumber,
  } = req.body;

  const audioHash = sha256Hex(file.buffer);

  const context =
    mode === "part_of_release"
      ? `${releaseType}:${releaseTitle}:${trackNumber ?? "1"}`
      : `SINGLE_STANDALONE:${title}`;

  const contextHash = hybridContextHash(audioHash, context);

  const previewBuf = file.buffer;

  const masterKey = Buffer.from(process.env.MUSIC_MASTER_KEK!, "hex").subarray(0, 32);
  const { iv, enc, tag } = encryptAesGcm(file.buffer, masterKey);
  const encryptedMaster = Buffer.concat([iv, tag, enc]);

  const previewHash = sha256Hex(previewBuf);
  const encryptedHash = sha256Hex(encryptedMaster);

  const previewUri = "ar://PREVIEW_TX";
  const audioEncryptedUri = "ar://ENCRYPTED_TX";
  const manifestUri = "ar://MANIFEST_TX";

  return res.json({
    ok: true,
    audioHash,
    contextHash,
    previewHash,
    encryptedHash,
    previewUri,
    audioEncryptedUri,
    manifestUri,
  });
});
