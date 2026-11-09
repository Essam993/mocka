import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { ContentTypes, ContentTypesInput } from "../../types/contentTypes";
import { ContentTypeApi } from "../services/contentTypesApi";

export interface ContentTypeState {
  items: ContentTypes[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** an insert or update is in flight */
  saving: boolean;
  /** ids with a delete in flight */
  deletingIds: number[];
}

const initialState: ContentTypeState = { items: [], status: "idle", error: null, saving: false, deletingIds: [] };

type Rejected = { rejectValue: string };
type State = { httpCodes: ContentTypeState };

/** keeps the list in status-code order: 200, 201, … 504 */
const sorted = (list: ContentTypes[]) => [...list].sort((a, b) => (a.id - b.id));

/** Loaded once and reused. Retries after a failure, or on { force: true }. */
export const fetchContentTypes = createAsyncThunk<ContentTypes[], { force?: boolean } | undefined, Rejected>(
  "contentTypes/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await ContentTypeApi.list();
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as State).httpCodes;
      if (status === "loading") return false;
      return !!arg?.force || status === "idle" || status === "failed";
    },
  },
);

/** The store only changes after the server confirms the new id */
export const createContentTypes = createAsyncThunk<ContentTypes, ContentTypesInput, Rejected>("contentTypes/create", async (input, { rejectWithValue }) => {
  try {
    return await ContentTypeApi.insert(input);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateContentTypes = createAsyncThunk<ContentTypes, ContentTypes, Rejected>("contentTypes/update", async (code, { rejectWithValue }) => {
  try {
    return await ContentTypeApi.update(code);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteContentTypes = createAsyncThunk<number, number, Rejected>("contentTypes/delete", async (id, { rejectWithValue }) => {
  try {
    await ContentTypeApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const slice = createSlice({
  name: "contentTypes",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchContentTypes.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchContentTypes.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = sorted(a.payload);
      })
      .addCase(fetchContentTypes.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Could not load the content types";
      })
      .addCase(createContentTypes.pending, (s) => void (s.saving = true))
      .addCase(createContentTypes.fulfilled, (s, a) => {
        s.saving = false;
        if (!s.items.some((c) => c.id === a.payload.id)) s.items = sorted([...s.items, a.payload]);
      })
      .addCase(createContentTypes.rejected, (s) => void (s.saving = false))
      .addCase(updateContentTypes.pending, (s) => void (s.saving = true))
      .addCase(updateContentTypes.fulfilled, (s, a) => {
        s.saving = false;
        s.items = sorted(s.items.map((c) => (c.id === a.payload.id ? a.payload : c)));
      })
      .addCase(updateContentTypes.rejected, (s) => void (s.saving = false))
      .addCase(deleteContentTypes.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteContentTypes.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((c) => c.id !== a.payload);
      })
      .addCase(deleteContentTypes.rejected, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const contentTypesReducer = slice.reducer;