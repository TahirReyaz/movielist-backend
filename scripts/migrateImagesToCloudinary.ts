/**
 * One-off: copy every image still hosted on Firebase Storage to Cloudinary
 * and point the database at the new URLs.
 *
 *   npm run migrate:images            (dry run: only prints what it would do)
 *   npm run migrate:images -- --apply (really uploads + updates Mongo)
 *
 * Needs MONGO_URL and CLOUDINARY_* in .env. Safe to run more than once:
 * anything already moved no longer points at Firebase and is skipped.
 *
 * If Firebase refuses a download (bucket gone / billing off), the user's
 * avatar falls back to the default avatar and the banner is removed.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import { UserModel } from "../src/db/users";
import { ListEntryModel } from "../src/db/listEntries";
import {
  CLOUDINARY_FOLDER,
  FIREBASE_DEFAULT_AVATAR_URL,
  FIREBASE_DEFAULT_ENTRY_BANNER_URL,
} from "../src/constants/misc";
import { isCloudinaryConfigured, uploadFromUrl } from "../src/utils/cloudinary";

const APPLY = process.argv.includes("--apply");
const FIREBASE = /firebasestorage\.googleapis\.com/;

const log = (...args: unknown[]) => console.log(APPLY ? "" : "[dry-run]", ...args);

const copy = async (url: string, publicId: string, transformation?: string) => {
  if (!APPLY) return `https://res.cloudinary.com/<cloud>/image/upload/${publicId}`;
  const { secure_url } = await uploadFromUrl(url, {
    public_id: `${CLOUDINARY_FOLDER}/${publicId}`,
    overwrite: true,
    ...(transformation ? { transformation } : {}),
  });
  return secure_url;
};

const main = async () => {
  if (!isCloudinaryConfigured()) throw new Error("Set CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET first");
  await mongoose.connect(process.env.MONGO_URL!);

  // 1. The two default images
  let defaultAvatar = process.env.DEFAULT_AVATAR_URL;
  if (!defaultAvatar || FIREBASE.test(defaultAvatar)) {
    defaultAvatar = await copy(FIREBASE_DEFAULT_AVATAR_URL, "defaults/avatar");
    log("Default avatar ->", defaultAvatar);
  }
  let defaultBanner = process.env.DEFAULT_ENTRY_BANNER_URL;
  if (!defaultBanner || FIREBASE.test(defaultBanner)) {
    defaultBanner = await copy(FIREBASE_DEFAULT_ENTRY_BANNER_URL, "defaults/entry-banner");
    log("Default entry banner ->", defaultBanner);
  }

  // 2. Users' avatars and banners
  const users = await UserModel.find(
    { $or: [{ avatar: FIREBASE }, { banner: FIREBASE }] },
    { avatar: 1, banner: 1, username: 1 }
  );
  log(`${users.length} users have Firebase images`);

  let moved = 0;
  let failed = 0;
  for (const user of users) {
    const id = user._id.toString();
    const update: Record<string, string | null> = {};

    if (user.avatar && FIREBASE.test(user.avatar)) {
      update.avatar =
        user.avatar === FIREBASE_DEFAULT_AVATAR_URL
          ? defaultAvatar
          : await copy(user.avatar, `avatars/${id}`, "c_fill,g_auto,w_400,h_400,q_auto").catch(
              (e) => {
                failed++;
                console.warn(`  ${user.username}: avatar download failed (${e?.message}) -> default`);
                return defaultAvatar!;
              }
            );
    }
    if (user.banner && FIREBASE.test(user.banner)) {
      update.banner = await copy(user.banner, `banners/${id}`, "c_limit,w_1920,h_600,q_auto").catch(
        (e): null => {
          failed++;
          console.warn(`  ${user.username}: banner download failed (${e?.message}) -> removed`);
          return null;
        }
      );
    }

    log(`  ${user.username}`, update);
    if (APPLY) {
      const $set = Object.fromEntries(Object.entries(update).filter(([, v]) => v !== null));
      const $unset = Object.fromEntries(Object.entries(update).filter(([, v]) => v === null).map(([k]) => [k, ""]));
      await UserModel.updateOne({ _id: user._id }, { $set, $unset });
    }
    moved++;
  }

  // 3. List entries still using the old default banner
  const entryFilter = { backdrop: FIREBASE_DEFAULT_ENTRY_BANNER_URL };
  const entryCount = await ListEntryModel.countDocuments(entryFilter);
  log(`${entryCount} list entries use the old default banner`);
  if (APPLY && entryCount) {
    await ListEntryModel.updateMany(entryFilter, { $set: { backdrop: defaultBanner } });
  }

  console.log(`\nDone. Users processed: ${moved}, downloads that failed: ${failed}.`);
  console.log("Now set these in your backend env (Vercel + .env):");
  console.log(`  DEFAULT_AVATAR_URL=${defaultAvatar}`);
  console.log(`  DEFAULT_ENTRY_BANNER_URL=${defaultBanner}`);
  if (!APPLY) console.log("\nThis was a dry run. Re-run with --apply to make the changes.");

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
