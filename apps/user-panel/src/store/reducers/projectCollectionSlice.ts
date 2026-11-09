import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { ProjectCollection, ProjectCollectionInput } from "../../types/projectCollection";
import { projectCollectionsApi } from "../services/userProjectCollectionsApi"; // ★ check this path

export interface ProjectCollectionState {
  items: ProjectCollection[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** which project the current `items` belong to */
  loadedProjectId: number | null;
  saving: boolean;
  deletingIds: number[];
}

const initialState: ProjectCollectionState = {
  items: [],
  status: "idle",
  error: null,
  loadedProjectId: null,
  saving: false,
  deletingIds: [],
};

type Rejected = { rejectValue: string };

/** A different projectId always fetches. The same one is skipped unless { force: true }. */
export const fetchProjectCollection = createAsyncThunk<ProjectCollection[], { projectId: number; force?: boolean }, Rejected>(
  "projectCollections/fetch",
  async ({ projectId }, { rejectWithValue }) => {
    try {
      return await projectCollectionsApi.list(projectId);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ projectId, force }, { getState }) => {
      // ★ key must match the store: projectCollections: ProjectCollectionReducer
      const { status, loadedProjectId } = (getState() as { projectCollections: ProjectCollectionState }).projectCollections;
      if (loadedProjectId !== projectId) return true;
      if (status === "loading") return false;
      return !!force || status === "idle" || status === "failed";
    },
  },
);

export const createProjectCollection = createAsyncThunk<ProjectCollection, ProjectCollectionInput, Rejected>(
  "projectCollections/create",
  async (input, { rejectWithValue }) => {
    try {
      const id = await projectCollectionsApi.create(input);
      return { ...input, id };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const updateProjectCollection = createAsyncThunk<ProjectCollection, ProjectCollection, Rejected>(
  "projectCollections/update",
  async (collection, { rejectWithValue }) => {
    try {
      await projectCollectionsApi.update(collection);
      return collection;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const deleteProjectCollection = createAsyncThunk<number, number, Rejected>(
  "projectCollections/delete",
  async (id, { rejectWithValue }) => {
    try {
      await projectCollectionsApi.remove(id);
      return id;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

const slice = createSlice({
  name: "projectCollections",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProjectCollection.pending, (s, a) => {
      s.status = "loading";
      s.error = null;
      if (s.loadedProjectId !== a.meta.arg.projectId) s.items = []; // drop the previous project's rows
      s.loadedProjectId = a.meta.arg.projectId;
    })
      .addCase(fetchProjectCollection.fulfilled, (s, a) => {
        if (a.meta.arg.projectId !== s.loadedProjectId) return; // stale response
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchProjectCollection.rejected, (s, a) => {
        if (a.meta.arg.projectId !== s.loadedProjectId) return;
        s.status = "failed";
        s.error = a.payload ?? "Could not load collections";
      })
      .addCase(createProjectCollection.pending, (s) => void (s.saving = true))
      .addCase(createProjectCollection.fulfilled, (s, a) => {
        s.saving = false;
        s.items.unshift(a.payload);
      })
      .addCase(createProjectCollection.rejected, (s) => void (s.saving = false))
      .addCase(updateProjectCollection.pending, (s) => void (s.saving = true))
      .addCase(updateProjectCollection.fulfilled, (s, a) => {
        s.saving = false;
        s.items = s.items.map((c) => (c.id === a.payload.id ? a.payload : c));
      })
      .addCase(updateProjectCollection.rejected, (s) => void (s.saving = false))
      .addCase(deleteProjectCollection.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteProjectCollection.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((c) => c.id !== a.payload);
      })
      .addCase(deleteProjectCollection.rejected, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const ProjectCollectionReducer = slice.reducer;