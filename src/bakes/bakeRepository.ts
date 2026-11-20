import type { Bake, NewBake } from "./bake";

/** Stores Bakes; the only code that knows they live in IndexedDB. */
export interface BakeRepository {
  save(bake: NewBake): Promise<Bake>;
  get(id: string): Promise<Bake | undefined>;
  /** Newest bake date first; on the same date, the most recently saved first. */
  list(): Promise<Bake[]>;
  delete(id: string): Promise<void>;
}

const DATABASE_NAME = "pizza-dough";
const STORE = "bakes";

export function openBakeRepository(
  factory: IDBFactory = indexedDB,
  { now = () => new Date() }: { now?: () => Date } = {},
): BakeRepository {
  let database: Promise<IDBDatabase> | undefined;
  const open = () =>
    (database ??= request(
      (() => {
        const opening = factory.open(DATABASE_NAME, 1);
        opening.onupgradeneeded = () => opening.result.createObjectStore(STORE, { keyPath: "id" });
        return opening;
      })(),
    ));

  const store = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode).objectStore(STORE);

  return {
    async save(newBake) {
      const bake: Bake = { ...newBake, id: crypto.randomUUID(), savedAt: now().toISOString() };
      await request((await store("readwrite")).add(bake));
      return bake;
    },
    async get(id) {
      return request<Bake | undefined>((await store("readonly")).get(id));
    },
    async list() {
      const bakes = await request<Bake[]>((await store("readonly")).getAll());
      return bakes.sort(
        (a, b) => b.bakeDate.localeCompare(a.bakeDate) || b.savedAt.localeCompare(a.savedAt),
      );
    },
    async delete(id) {
      await request((await store("readwrite")).delete(id));
    },
  };
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
