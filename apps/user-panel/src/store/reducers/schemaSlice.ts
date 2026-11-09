import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { schemaApi } from "../services/schemaApi";
import { Schema, SchemaField, SchemaInput } from "../../types/schema";

export interface SchemasState {
  items: Schema[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** which project the current `items` belong to */
  loadedProjectId: number | null;
  /** fields per schema id, loaded when a schema is opened */
  details: Record<number, SchemaField[]>;
  loadingFieldIds: number[];
  fieldErrors: Record<number, string>;
  saving: boolean;
  /** schema ids with a delete in flight */
  deletingIds: number[];
  /** field ids with a delete in flight */
  deletingFieldIds: number[];
}

const initialState: SchemasState = {
  items: [],
  status: "idle",
  error: null,
  loadedProjectId: null,
  details: {},
  loadingFieldIds: [],
  fieldErrors: {},
  saving: false,
  deletingIds: [],
  deletingFieldIds: [],
};

type Rejected = { rejectValue: string };
type State = { schemas: SchemasState };

/** Another project always fetches. The same one is skipped unless { force: true }. */
export const fetchSchemas = createAsyncThunk<Schema[], { projectId: number; force?: boolean }, Rejected>(
  "schemas/fetch",
  async ({ projectId }, { rejectWithValue }) => {
    try {
      return await schemaApi.list(projectId);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ projectId, force }, { getState }) => {
      const { status, loadedProjectId } = (getState() as State).schemas;
      if (loadedProjectId !== projectId) return true;
      if (status === "loading") return false;
      return !!force || status === "idle" || status === "failed";
    },
  },
);

/** Loads one schema's fields. Skipped when cached or already loading, unless { force: true }. */
export const fetchSchemaFields = createAsyncThunk<{ id: number; fields: SchemaField[] }, { id: number; force?: boolean }, Rejected>(
  "schemas/fetchFields",
  async ({ id }, { rejectWithValue }) => {
    try {
      return { id, fields: await schemaApi.fields(id) };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ id, force }, { getState }) => {
      const s = (getState() as State).schemas;
      if (s.loadingFieldIds.includes(id)) return false;
      return !!force || s.details[id] === undefined;
    },
  },
);

export const createSchema = createAsyncThunk<{ schema: Schema; fields: SchemaField[] }, SchemaInput, Rejected>(
  "schemas/create",
  async (input, { rejectWithValue }) => {
    try {
      const saved = await schemaApi.create(input); // throws without an id, so the store is never patched
      return { schema: { id: saved.id, name: input.name, projectId: input.projectId }, fields: saved.fields };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const updateSchema = createAsyncThunk<{ schema: Schema; fields: SchemaField[] }, SchemaInput & { id: number }, Rejected>(
  "schemas/update",
  async (input, { rejectWithValue }) => {
    try {
      const saved = await schemaApi.update(input); // throws without an id in the response
      return { schema: { id: saved.id, name: input.name, projectId: input.projectId }, fields: saved.fields };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

/** Deletes the whole schema (deleteVariableRecordDef) */
export const deleteSchema = createAsyncThunk<number, number, Rejected>("schemas/delete", async (id, { rejectWithValue }) => {
  try {
    await schemaApi.removeSchema(id); // throws without an id in the response
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

/** Deletes one nested field (deleteVariableRecord) */
export const deleteSchemaField = createAsyncThunk<{ schemaId: number; fieldId: number }, { schemaId: number; fieldId: number }, Rejected>(
  "schemas/deleteField",
  async ({ schemaId, fieldId }, { rejectWithValue }) => {
    try {
      await schemaApi.removeField(fieldId); // throws without an id in the response
      return { schemaId, fieldId };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

const slice = createSlice({
  name: "schemas",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSchemas.pending, (s, a) => {
      s.status = "loading";
      s.error = null;
      if (s.loadedProjectId !== a.meta.arg.projectId) {
        s.items = []; // don't flash another project's schemas
        s.details = {};
        s.fieldErrors = {};
      }
      s.loadedProjectId = a.meta.arg.projectId;
    })
      .addCase(fetchSchemas.fulfilled, (s, a) => {
        if (a.meta.arg.projectId !== s.loadedProjectId) return; // stale response
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchSchemas.rejected, (s, a) => {
        if (a.meta.arg.projectId !== s.loadedProjectId) return;
        s.status = "failed";
        s.error = a.payload ?? "Could not load schemas";
      })
      .addCase(fetchSchemaFields.pending, (s, a) => {
        s.loadingFieldIds.push(a.meta.arg.id);
        delete s.fieldErrors[a.meta.arg.id];
      })
      .addCase(fetchSchemaFields.fulfilled, (s, a) => {
        s.loadingFieldIds = s.loadingFieldIds.filter((id) => id !== a.payload.id);
        s.details[a.payload.id] = a.payload.fields;
      })
      .addCase(fetchSchemaFields.rejected, (s, a) => {
        s.loadingFieldIds = s.loadingFieldIds.filter((id) => id !== a.meta.arg.id);
        s.fieldErrors[a.meta.arg.id] = a.payload ?? "Could not load the fields";
      })
      .addCase(createSchema.pending, (s) => void (s.saving = true))
      .addCase(createSchema.fulfilled, (s, a) => {
        s.saving = false;
        s.items.unshift(a.payload.schema);
        s.details[a.payload.schema.id] = a.payload.fields;
      })
      .addCase(createSchema.rejected, (s) => void (s.saving = false))
      .addCase(updateSchema.pending, (s) => void (s.saving = true))
      .addCase(updateSchema.fulfilled, (s, a) => {
        s.saving = false;
        s.items = s.items.map((x) => (x.id === a.payload.schema.id ? a.payload.schema : x));
        s.details[a.payload.schema.id] = a.payload.fields;
      })
      .addCase(updateSchema.rejected, (s) => void (s.saving = false))
      .addCase(deleteSchema.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteSchema.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((x) => x.id !== a.payload);
        delete s.details[a.payload];
      })
      .addCase(deleteSchema.rejected, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      })
      .addCase(deleteSchemaField.pending, (s, a) => void s.deletingFieldIds.push(a.meta.arg.fieldId))
      .addCase(deleteSchemaField.fulfilled, (s, a) => {
        const { schemaId, fieldId } = a.payload;
        s.deletingFieldIds = s.deletingFieldIds.filter((id) => id !== fieldId);
        if (s.details[schemaId]) s.details[schemaId] = s.details[schemaId].filter((f) => f.id !== fieldId);
      })
      .addCase(deleteSchemaField.rejected, (s, a) => {
        s.deletingFieldIds = s.deletingFieldIds.filter((id) => id !== a.meta.arg.fieldId);
      });
  },
});

export const schemasReducer = slice.reducer;