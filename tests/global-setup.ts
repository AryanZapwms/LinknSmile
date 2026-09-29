// Vitest globalSetup: runs once in the main process before any test file.
//
// Each test file starts its own MongoMemoryReplSet in its own worker. If the
// MongoDB binary isn't downloaded yet (always the case on a fresh CI runner),
// the workers all start the same download at once and collide on the
// download lockfile (UnableToUnlockLockfileError, then a hook timeout).
// Locating/downloading the binary here first means workers always find it
// already on disk and never take the download lock.
import { MongoBinary } from "mongodb-memory-server";

export default async function setup() {
  await MongoBinary.getPath();
}
