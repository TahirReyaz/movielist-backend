/**
 * Minimal Cloudinary helpers (no SDK needed).
 *
 * Free plan: 25 monthly credits (1 credit = 1 GB storage OR 1 GB bandwidth
 * OR 1,000 transformations), no credit card.
 *
 * Flow for user images:
 *   1. Frontend asks our backend for a signature  (POST /upload/signature)
 *   2. Frontend uploads the file straight to Cloudinary with that signature
 *   3. Frontend saves the returned `secure_url` on the user (PATCH /user/:id)
 * The API secret never leaves the backend, and a signature only allows the
 * exact upload we signed (fixed public_id, size limits, formats).
 */
import crypto from "crypto";
import axios from "axios";

import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from "../constants/misc";

export type UploadParams = Record<string, string | number | boolean>;

export const isCloudinaryConfigured = () =>
  !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

/**
 * Cloudinary's signature: sort params by key, join as k=v with "&",
 * append the API secret, SHA-1 hex. (file, api_key, cloud_name and
 * resource_type are never signed.)
 */
export const signParams = (params: UploadParams, apiSecret: string) => {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
};

export const uploadUrl = () =>
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/** Server-side upload of an image that is already online (used by the migration script). */
export const uploadFromUrl = async (
  fileUrl: string,
  params: UploadParams
): Promise<{ secure_url: string; public_id: string }> => {
  const signed: UploadParams = { ...params, timestamp: Math.floor(Date.now() / 1000) };
  const body = new URLSearchParams();
  Object.entries(signed).forEach(([k, v]) => body.append(k, String(v)));
  body.append("file", fileUrl);
  body.append("api_key", CLOUDINARY_API_KEY!);
  body.append("signature", signParams(signed, CLOUDINARY_API_SECRET!));

  const { data } = await axios.post(uploadUrl(), body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30_000,
  });
  return data;
};
