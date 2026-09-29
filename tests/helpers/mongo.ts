import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let replSet: MongoMemoryReplSet | undefined;

/**
 * Starts a single-node in-memory replica set (the ledger uses
 * transactions, which need a replica set), points MONGODB_URI at it and
 * connects through the app's own lib/db. Import app modules that read
 * MONGODB_URI at load time (lib/db and anything using it) only AFTER this.
 */
export async function startTestDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replSet.getUri("linknsmile-test");

  const { connectDB } = await import("@/lib/db");
  await connectDB();

  // A live DB already has these collections; creating them up front avoids
  // a fresh-DB "catalog changes" WriteConflict when a transaction would
  // otherwise create them implicitly.
  const db = mongoose.connection.db!;
  for (const name of [
    "users", "shops", "products", "orders", "carts", "wallets", "ledgerentries",
    "auditlogs", "razorpaycheckouts", "coupons", "platformsettings",
  ]) {
    await db.createCollection(name).catch(() => {});
  }
  return db;
}

/**
 * Builds indexes for every model registered so far. Mongoose builds them
 * lazily in the background; a transaction racing an index build fails with
 * LockTimeout (a live DB already has its indexes). Call after importing the
 * app modules a test uses.
 */
export async function initModels() {
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await replSet?.stop();
}

/**
 * Records, in order, every commit/abort on any mongoose session, so tests
 * can assert that no abortTransaction() ever follows a commitTransaction().
 * Only successful commits are recorded as "commit".
 */
export function trackTransactionCalls() {
  const events: Array<"commit" | "abort"> = [];
  const proto = mongoose.mongo.ClientSession.prototype;
  const originalCommit = proto.commitTransaction;
  const originalAbort = proto.abortTransaction;
  proto.commitTransaction = async function (this: unknown, ...args: unknown[]) {
    const result = await (originalCommit as any).apply(this, args);
    events.push("commit");
    return result;
  } as typeof originalCommit;
  proto.abortTransaction = async function (this: unknown, ...args: unknown[]) {
    events.push("abort");
    return (originalAbort as any).apply(this, args);
  } as typeof originalAbort;
  return {
    events,
    restore() {
      proto.commitTransaction = originalCommit;
      proto.abortTransaction = originalAbort;
    },
  };
}
