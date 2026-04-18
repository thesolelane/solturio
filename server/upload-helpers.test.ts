import assert from "node:assert/strict";
import { assertValidUploadFile, InvalidUploadError } from "./upload-helpers.ts";

function createFile(overrides: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: "document.txt",
    encoding: "7bit",
    mimetype: "text/plain",
    size: 4,
    destination: "",
    filename: "",
    path: "",
    buffer: Buffer.from("test"),
    stream: undefined as never,
    ...overrides,
  };
}

export async function runTests() {
  const validated = await assertValidUploadFile(createFile({}));
  assert.equal(validated.originalname, "document.txt");

  await assert.rejects(
    () =>
      assertValidUploadFile(
        createFile({
          originalname: "../secret.txt",
        })
      ),
    InvalidUploadError
  );

  await assert.rejects(
    () =>
      assertValidUploadFile(
        createFile({
          originalname: "report.pdf",
          mimetype: "application/pdf",
          buffer: Buffer.from("not-a-real-pdf"),
          size: 14,
        })
      ),
    InvalidUploadError
  );

  await assert.rejects(
    () =>
      assertValidUploadFile(
        createFile({
          originalname: "logo.svg",
          mimetype: "image/svg+xml",
          buffer: Buffer.from('<svg><script>alert("xss")</script></svg>'),
          size: 39,
        })
      ),
    InvalidUploadError
  );
}
