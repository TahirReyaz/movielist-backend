import assert from "node:assert/strict";
import { test } from "node:test";

import { signParams } from "../src/utils/cloudinary";
import { buildUploadParams } from "../src/controllers/uploads";

test("signature matches Cloudinary's documented example", () => {
  // Example from cloudinary.com/documentation/authentication_signatures
  const signature = signParams(
    { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
    "abcd"
  );
  assert.equal(signature, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("signing ignores key order and empty values", () => {
  assert.equal(
    signParams({ b: "2", a: "1", c: "" }, "s"),
    signParams({ a: "1", b: "2" }, "s")
  );
});

test("upload params: one fixed file per user and kind", () => {
  const p = buildUploadParams("64abc", "avatar");
  assert.equal(p.public_id, "movielist/avatars/64abc");
  assert.equal(p.overwrite, true);
  assert.match(String(p.transformation), /w_400,h_400/);
  assert.equal(buildUploadParams("64abc", "banner").public_id, "movielist/banners/64abc");
});
