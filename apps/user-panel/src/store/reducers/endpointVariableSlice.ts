import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { endpointVariableApi } from "../services/endpointVariableApi";
import { EndpointContext, EndpointVariable, VariableSection, VariableWrite } from "../../types/endpointVariable";

/** One list per endpoint and section, e.g. "108:headers" */
export const variableKey = (endpointId: number, section: VariableSection) => `${endpointId}:${section}`;

export interface EndpointVariablesState {
  byKey: Record<string, EndpointVariable[]>;
  /** keys with a list request in flight */
  loading: string[];
  errors: Record<string, string>;
  saving: boolean;
  /** "<key>:<id>" of the rows with a delete in flight */
  deleting: string[];
}

const initialState: EndpointVariablesState = { byKey: {}, loading: [], errors: {}, saving: false, deleting: [] };

type Rejected = { rejectValue: string };
type State = { endpointVariables: EndpointVariablesState };

interface SaveArg {
  ctx: EndpointContext;
  section: VariableSection;
  rows: VariableWrite[];
}
interface DeleteArg {
  ctx: EndpointContext;
  section: VariableSection;
  row: VariableWrite & { id: number };
}

/** Loads one section of one endpoint. Skipped when cached or loading, unless { force: true }. */
export const fetchEndpointVariables = createAsyncThunk<
  { key: string; rows: EndpointVariable[] },
  { endpointId: number; section: VariableSection; force?: boolean },
  Rejected
>(
  "endpointVariables/fetch",
  async ({ endpointId, section }, { rejectWithValue }) => {
    try {
      return { key: variableKey(endpointId, section), rows: await endpointVariableApi.list(endpointId, section) };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ endpointId, section, force }, { getState }) => {
      const s = (getState() as State).endpointVariables;
      const key = variableKey(endpointId, section);
      if (s.loading.includes(key)) return false;
      return !!force || s.byKey[key] === undefined;
    },
  },
);

export const insertEndpointVariables = createAsyncThunk<{ key: string; rows: EndpointVariable[] }, SaveArg, Rejected>(
  "endpointVariables/insert",
  async ({ ctx, section, rows }, { rejectWithValue }) => {
    try {
      const saved = await endpointVariableApi.insert(ctx, section, rows); // throws without ids, so the store is never patched
      return { key: variableKey(ctx.endpointId, section), rows: saved };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const updateEndpointVariables = createAsyncThunk<{ key: string; rows: EndpointVariable[] }, SaveArg, Rejected>(
  "endpointVariables/update",
  async ({ ctx, section, rows }, { rejectWithValue }) => {
    try {
      const saved = await endpointVariableApi.update(ctx, section, rows); // throws without ids, so the store is never patched
      return { key: variableKey(ctx.endpointId, section), rows: saved };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const deleteEndpointVariable = createAsyncThunk<{ key: string; id: number }, DeleteArg, Rejected>(
  "endpointVariables/delete",
  async ({ ctx, section, row }, { rejectWithValue }) => {
    try {
      await endpointVariableApi.remove(ctx, section, row);
      return { key: variableKey(ctx.endpointId, section), id: row.id };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

const deletingTag = (a: { ctx: EndpointContext; section: VariableSection; row: { id: number } }) =>
  `${variableKey(a.ctx.endpointId, a.section)}:${a.row.id}`;

const slice = createSlice({
  name: "endpointVariables",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchEndpointVariables.pending, (s, a) => {
      const key = variableKey(a.meta.arg.endpointId, a.meta.arg.section);
      s.loading.push(key);
      delete s.errors[key];
    })
      .addCase(fetchEndpointVariables.fulfilled, (s, a) => {
        s.loading = s.loading.filter((k) => k !== a.payload.key);
        s.byKey[a.payload.key] = a.payload.rows;
      })
      .addCase(fetchEndpointVariables.rejected, (s, a) => {
        const key = variableKey(a.meta.arg.endpointId, a.meta.arg.section);
        s.loading = s.loading.filter((k) => k !== key);
        s.errors[key] = a.payload ?? "Could not load the list";
      })
      .addCase(insertEndpointVariables.pending, (s) => void (s.saving = true))
      .addCase(insertEndpointVariables.fulfilled, (s, a) => {
        s.saving = false;
        if (s.byKey[a.payload.key]) s.byKey[a.payload.key].push(...a.payload.rows);
      })
      .addCase(insertEndpointVariables.rejected, (s) => void (s.saving = false))
      .addCase(updateEndpointVariables.pending, (s) => void (s.saving = true))
      .addCase(updateEndpointVariables.fulfilled, (s, a) => {
        s.saving = false;
        const list = s.byKey[a.payload.key];
        if (list) s.byKey[a.payload.key] = list.map((r) => a.payload.rows.find((x) => x.id === r.id) ?? r);
      })
      .addCase(updateEndpointVariables.rejected, (s) => void (s.saving = false))
      .addCase(deleteEndpointVariable.pending, (s, a) => void s.deleting.push(deletingTag(a.meta.arg)))
      .addCase(deleteEndpointVariable.fulfilled, (s, a) => {
        s.deleting = s.deleting.filter((t) => t !== `${a.payload.key}:${a.payload.id}`);
        const list = s.byKey[a.payload.key];
        if (list) s.byKey[a.payload.key] = list.filter((r) => r.id !== a.payload.id);
      })
      .addCase(deleteEndpointVariable.rejected, (s, a) => {
        s.deleting = s.deleting.filter((t) => t !== deletingTag(a.meta.arg));
      });
  },
});

export const endpointVariablesReducer = slice.reducer;