import type { Bake, Comment, NewBake } from "./bake";
import { type Backup, type ImportResult, SCHEMA_VERSION } from "./backup";

/** Stores Bakes and their Comments; the only code that knows they live in IndexedDB. */
export interface BakeRepository {
  save(bake: NewBake): Promise<Bake>;
  get(id: string): Promise<Bake | undefined>;
  /** Newest bake date first; on the same date, the most recently saved first. */
  list(): Promise<Bake[]>;
  /** Deletes the Bake together with its comments. */
  delete(id: string): Promise<void>;
  addComment(bakeId: string, body: string): Promise<Comment>;
  /** Oldest first. */
  listComments(bakeId: string): Promise<Comment[]>;
  deleteComment(id: string): Promise<void>;
  /** The whole history: every Bake and every Comment. */
  exportBackup(): Promise<Backup>;
  /**
   * Merges a backup into the history in one transaction: Bakes that already exist are skipped,
   * and Comments that don't exist yet are added, also on Bakes that were skipped.
   */
  importBackup(backup: Backup): Promise<ImportResult>;
}

const DATABASE_NAME = "pizza-dough";
const BAKES = "bakes";
const COMMENTS = "comments";
type StoreName = typeof BAKES | typeof COMMENTS;
const BY_BAKE = "byBake";

export function openBakeRepository(
  factory: IDBFactory = indexedDB,
  { now = () => new Date() }: { now?: () => Date } = {},
): BakeRepository {
  let database: Promise<IDBDatabase> | undefined;
  const open = () => {
    // Once closed for another tab's upgrade, the next call opens the database afresh.
    database ??= openDatabase(factory, () => (database = undefined)).catch((error: unknown) => {
      database = undefined; // Let the next call try again.
      throw error;
    });
    return database;
  };

  const store = async (name: StoreName, mode: IDBTransactionMode) =>
    (await open()).transaction(name, mode).objectStore(name);

  return {
    async save(newBake) {
      const bake: Bake = { ...newBake, id: crypto.randomUUID(), savedAt: now().toISOString() };
      await request((await store(BAKES, "readwrite")).add(bake));
      return bake;
    },
    async get(id) {
      return request<Bake | undefined>((await store(BAKES, "readonly")).get(id));
    },
    async list() {
      const bakes = await request<Bake[]>((await store(BAKES, "readonly")).getAll());
      return bakes.sort(
        (a, b) => b.bakeDate.localeCompare(a.bakeDate) || b.savedAt.localeCompare(a.savedAt),
      );
    },
    async delete(id) {
      // One transaction, so a Bake is never left half-deleted with orphaned comments.
      const transaction = (await open()).transaction([BAKES, COMMENTS], "readwrite");
      transaction.objectStore(BAKES).delete(id);
      const comments = transaction.objectStore(COMMENTS);
      const commentIds = comments.index(BY_BAKE).getAllKeys(id);
      // Deleting inside the handler keeps the transaction active; an await here could let it close.
      commentIds.onsuccess = () => commentIds.result.forEach((commentId) => comments.delete(commentId));
      await transactionComplete(transaction);
    },
    async addComment(bakeId, body) {
      const comment: Comment = { id: crypto.randomUUID(), bakeId, body, createdAt: now().toISOString() };
      await request((await store(COMMENTS, "readwrite")).add(comment));
      return comment;
    },
    async listComments(bakeId) {
      const comments = await request<Comment[]>((await store(COMMENTS, "readonly")).index(BY_BAKE).getAll(bakeId));
      return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async deleteComment(id) {
      await request((await store(COMMENTS, "readwrite")).delete(id));
    },
    async exportBackup() {
      // One transaction, so the Bakes and Comments are read as one consistent snapshot.
      const transaction = (await open()).transaction([BAKES, COMMENTS], "readonly");
      const [bakes, comments] = await Promise.all([
        request<Bake[]>(transaction.objectStore(BAKES).getAll()),
        request<Comment[]>(transaction.objectStore(COMMENTS).getAll()),
      ]);
      return { schemaVersion: SCHEMA_VERSION, bakes, comments };
    },
    async importBackup(backup) {
      const transaction = (await open()).transaction([BAKES, COMMENTS], "readwrite");
      const bakes = transaction.objectStore(BAKES);
      const comments = transaction.objectStore(COMMENTS);
      const result: ImportResult = { bakesAdded: 0, bakesSkipped: 0, commentsAdded: 0 };
      // Writing inside the handlers keeps the transaction active; an await here could let it close.
      const bakeIds = bakes.getAllKeys();
      bakeIds.onsuccess = () => {
        const existingBakes = new Set(bakeIds.result);
        const commentIds = comments.getAllKeys();
        commentIds.onsuccess = () => {
          const existingComments = new Set(commentIds.result);
          for (const bake of backup.bakes) {
            if (existingBakes.has(bake.id)) {
              result.bakesSkipped++;
            } else {
              bakes.add(bake);
              result.bakesAdded++;
            }
          }
          for (const comment of backup.comments) {
            if (existingComments.has(comment.id)) continue;
            comments.add(comment);
            result.commentsAdded++;
          }
        };
      };
      await transactionComplete(transaction);
      return result;
    },
  };
}

const VERSION = 2;

function openDatabase(factory: IDBFactory, onClose: () => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = factory.open(DATABASE_NAME, VERSION);
    opening.onupgradeneeded = ({ oldVersion }) => {
      const database = opening.result;
      if (oldVersion < 1) database.createObjectStore(BAKES, { keyPath: "id" });
      if (oldVersion < 2) {
        database.createObjectStore(COMMENTS, { keyPath: "id" }).createIndex(BY_BAKE, "bakeId");
      }
    };
    // Another tab still has an older version open; fail rather than wait until it closes.
    opening.onblocked = () => reject(new Error("The bake history is open in another tab with an older version."));
    opening.onsuccess = () => {
      const database = opening.result;
      // Step aside when another tab upgrades the database, so its upgrade isn't blocked by us.
      database.onversionchange = () => {
        database.close();
        onClose();
      };
      resolve(database);
    };
    opening.onerror = () => reject(opening.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
