import { createAsyncThunk, createSlice, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";

export interface Bucket<T> {
  items: T[];
  status: "loading" | "succeeded" | "failed";
  error: string | null;
}

export interface LevelState<T> {
  /** the children of each parent id */
  byParent: Record<number, Bucket<T>>;
  /** an insert or update is in flight */
  saving: boolean;
  /** tags of the deletes in flight: String(id) */
  deleting: string[];
}

export interface LevelApi<T extends { id: number }, I> {
  list(parentId: number): Promise<T[]>;
  /** throws when the server doesn't confirm the new id */
  insert(parentId: number, input: I): Promise<T>;
  update(item: T): Promise<T>;
  remove(item: T): Promise<void>;
}

type Rejected = { rejectValue: string };

/**
 * A level of the hierarchy (workspaces, projects, collections or APIs).
 * `name` must also be the key the reducer is registered under in the store.
 * `extra` adds more cases (cascades, sub-resources).
 */
export function createLevelSlice<T extends { id: number }, I>(
  name: string,
  levelApi: LevelApi<T, I>,
  extra?: (b: ActionReducerMapBuilder<LevelState<T>>) => void,
) {
  type Root = Record<string, LevelState<T> | undefined>;
  const fresh = (): LevelState<T> => ({ byParent: {}, saving: false, deleting: [] });
  const st = (s: unknown) => s as LevelState<T>;

  /** Loads the children of one parent. Skipped when loaded or loading, unless { force: true }. A failed load retries. */
  const fetchAll = createAsyncThunk<{ parentId: number; rows: T[] }, { parentId: number; force?: boolean }, Rejected>(
    `${name}/fetch`,
    async ({ parentId }, { rejectWithValue }) => {
      try {
        return { parentId, rows: await levelApi.list(parentId) };
      } catch (e) {
        return rejectWithValue(getErrorMessage(e));
      }
    },
    {
      condition: ({ parentId, force }, { getState }) => {
        const bucket = (getState() as Root)[name]?.byParent[parentId];
        if (bucket?.status === "loading") return false;
        return !!force || !bucket || bucket.status === "failed";
      },
    },
  );

  /** Only changes the store after the server confirms the new id */
  const insert = createAsyncThunk<{ parentId: number; row: T }, { parentId: number; input: I }, Rejected>(
    `${name}/insert`,
    async ({ parentId, input }, { rejectWithValue }) => {
      try {
        return { parentId, row: await levelApi.insert(parentId, input) };
      } catch (e) {
        return rejectWithValue(getErrorMessage(e));
      }
    },
  );

  const update = createAsyncThunk<{ parentId: number; row: T }, { parentId: number; item: T }, Rejected>(
    `${name}/update`,
    async ({ parentId, item }, { rejectWithValue }) => {
      try {
        return { parentId, row: await levelApi.update(item) };
      } catch (e) {
        return rejectWithValue(getErrorMessage(e));
      }
    },
  );

  const remove = createAsyncThunk<{ parentId: number; id: number }, { parentId: number; item: T }, Rejected>(
    `${name}/remove`,
    async ({ parentId, item }, { rejectWithValue }) => {
      try {
        await levelApi.remove(item);
        return { parentId, id: item.id };
      } catch (e) {
        return rejectWithValue(getErrorMessage(e));
      }
    },
  );

  const slice = createSlice({
    name,
    initialState: fresh(),
    reducers: { reset: () => fresh() },
    extraReducers: (b) => {
      b.addCase(fetchAll.pending, (s, a) => {
        const x = st(s);
        const id = a.meta.arg.parentId;
        x.byParent[id] = { items: x.byParent[id]?.items ?? [], status: "loading", error: null };
      })
        .addCase(fetchAll.fulfilled, (s, a) => {
          st(s).byParent[a.payload.parentId] = { items: a.payload.rows, status: "succeeded", error: null };
        })
        .addCase(fetchAll.rejected, (s, a) => {
          const x = st(s);
          const id = a.meta.arg.parentId;
          x.byParent[id] = { items: x.byParent[id]?.items ?? [], status: "failed", error: a.payload ?? "Could not load the list" };
        })

        .addCase(insert.pending, (s) => void (st(s).saving = true))
        .addCase(insert.fulfilled, (s, a) => {
          const x = st(s);
          x.saving = false;
          const bucket = x.byParent[a.payload.parentId];
          if (bucket && !bucket.items.some((i) => i.id === a.payload.row.id)) bucket.items.push(a.payload.row);
        })
        .addCase(insert.rejected, (s) => void (st(s).saving = false))

        .addCase(update.pending, (s) => void (st(s).saving = true))
        .addCase(update.fulfilled, (s, a) => {
          const x = st(s);
          x.saving = false;
          const bucket = x.byParent[a.payload.parentId];
          if (bucket) bucket.items = bucket.items.map((i) => (i.id === a.payload.row.id ? a.payload.row : i));
        })
        .addCase(update.rejected, (s) => void (st(s).saving = false))

        .addCase(remove.pending, (s, a) => void st(s).deleting.push(String(a.meta.arg.item.id)))
        .addCase(remove.fulfilled, (s, a) => {
          const x = st(s);
          x.deleting = x.deleting.filter((t) => t !== String(a.payload.id));
          const bucket = x.byParent[a.payload.parentId];
          if (bucket) bucket.items = bucket.items.filter((i) => i.id !== a.payload.id);
        })
        .addCase(remove.rejected, (s, a) => {
          const x = st(s);
          x.deleting = x.deleting.filter((t) => t !== String(a.meta.arg.item.id));
        });

      extra?.(b);
    },
  });

  return { name, fetchAll, insert, update, remove, reset: slice.actions.reset, reducer: slice.reducer };
}