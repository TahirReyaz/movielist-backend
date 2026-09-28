import express from "express";
import lodash from "lodash";

import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_FOLDER,
} from "../constants/misc";
import { isCloudinaryConfigured, signParams, UploadParams } from "../utils/cloudinary";

export const IMAGE_KINDS = ["avatar", "banner"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

/**
 * What each kind of image is turned into ON UPLOAD (an "incoming
 * transformation"), so we store small files and serve them without
 * per-request transformations (saves free-plan credits).
 */
const KIND_SETTINGS: Record<ImageKind, { folder: string; transformation: string }> = {
  // square, face-centred, max 400px
  avatar: { folder: "avatars", transformation: "c_fill,g_auto,w_400,h_400,q_auto" },
  // keep aspect ratio, max 1920x600
  banner: { folder: "banners", transformation: "c_limit,w_1920,h_600,q_auto" },
};

/** The exact params the browser must send to Cloudinary for this user + kind. */
export const buildUploadParams = (userid: string, kind: ImageKind): UploadParams => {
  const { folder, transformation } = KIND_SETTINGS[kind];
  return {
    // one file per user per kind: re-uploading replaces the old image,
    // so we never pile up unused files
    public_id: `${CLOUDINARY_FOLDER}/${folder}/${userid}`,
    overwrite: true,
    invalidate: true,
    transformation,
    allowed_formats: "jpg,jpeg,png,webp,gif",
    timestamp: Math.floor(Date.now() / 1000),
  };
};

/**
 * POST /upload/signature  { kind: "avatar" | "banner" }
 * Returns everything the frontend needs to upload directly to Cloudinary.
 */
export const getUploadSignature = (req: express.Request, res: express.Response) => {
  if (!isCloudinaryConfigured()) {
    return res.status(503).send({ message: "Image uploads are not configured" });
  }

  const kind = req.body?.kind;
  if (!(IMAGE_KINDS as readonly string[]).includes(kind)) {
    return res.status(400).send({ message: "kind must be avatar or banner" });
  }

  const userid = String(lodash.get(req, "identity._id"));
  const params = buildUploadParams(userid, kind as ImageKind);

  return res.status(200).send({
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    apiKey: CLOUDINARY_API_KEY,
    params,
    signature: signParams(params, CLOUDINARY_API_SECRET!),
  });
};
