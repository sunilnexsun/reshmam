// An in-memory stand-in for the parts of the Firebase Admin Firestore API the routes use:
// collection().get(), collection().doc().get/set/update/delete, collection().where().orderBy().limit().get(),
// doc("col/id"), and batch().
type Data = Record<string, unknown>;

export function fakeAdminDb(initial: Record<string, Record<string, Data>> = {}) {
  const store: Record<string, Map<string, Data>> = {};
  const col = (name: string) => (store[name] ??= new Map());
  for (const [c, docs] of Object.entries(initial)) for (const [id, d] of Object.entries(docs)) col(c).set(id, structuredClone(d));

  const snap = (c: string, id: string) => {
    const d = col(c).get(id);
    return { id, exists: d !== undefined, data: () => (d === undefined ? undefined : structuredClone(d)) };
  };
  const docRef = (c: string, id: string) => ({
    id,
    path: `${c}/${id}`,
    get: async () => snap(c, id),
    set: async (data: Data, opts?: { merge?: boolean }) => {
      col(c).set(id, opts?.merge ? { ...(col(c).get(id) ?? {}), ...structuredClone(data) } : structuredClone(data));
    },
    update: async (data: Data) => {
      if (!col(c).has(id)) throw new Error(`No document ${c}/${id}`);
      col(c).set(id, { ...col(c).get(id), ...structuredClone(data) });
    },
    delete: async () => {
      col(c).delete(id);
    },
  });

  type Filter = [string, unknown];
  const queryOf = (c: string, filters: Filter[], order?: [string, "asc" | "desc"], max?: number) => ({
    where: (field: string, _op: "==", value: unknown) => queryOf(c, [...filters, [field, value]], order, max),
    orderBy: (field: string, dir: "asc" | "desc" = "asc") => queryOf(c, filters, [field, dir], max),
    limit: (n: number) => queryOf(c, filters, order, n),
    get: async () => {
      let docs = [...col(c).keys()].map((id) => snap(c, id)).filter((s) => filters.every(([f, v]) => s.data()![f] === v));
      if (order) {
        const [f, dir] = order;
        docs.sort((a, b) => String(a.data()![f]).localeCompare(String(b.data()![f])) * (dir === "desc" ? -1 : 1));
      }
      if (max !== undefined) docs = docs.slice(0, max);
      return { empty: docs.length === 0, docs, size: docs.length };
    },
  });

  const db = {
    collection: (c: string) => ({ ...queryOf(c, []), doc: (id: string) => docRef(c, id) }),
    doc: (path: string) => {
      const [c, id] = path.split("/");
      return docRef(c, id);
    },
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      return {
        set: (ref: ReturnType<typeof docRef>, data: Data, opts?: { merge?: boolean }) => void ops.push(() => ref.set(data, opts)),
        update: (ref: ReturnType<typeof docRef>, data: Data) => void ops.push(() => ref.update(data)),
        delete: (ref: ReturnType<typeof docRef>) => void ops.push(() => ref.delete()),
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
  };
  return { db, store, read: (c: string, id: string) => col(c).get(id) };
}
