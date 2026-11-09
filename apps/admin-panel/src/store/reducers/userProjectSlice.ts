import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { userProjectApi } from "../services/userProjectApi";
import { UserProject, UserProjectInput } from "../../types/userProject";

export interface UserProjectsState {
  items: UserProject[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** which user the current `items` belong to */
  loadedUserId: number | null;
  /** true while a create/update request is in flight (drives the form's Save button) */
  saving: boolean;
  /** ids with a delete request in flight (drives row-level loading) */
  deletingIds: number[];
}

const initialState: UserProjectsState = {
  items: [],
  status: "idle",
  error: null,
  loadedUserId: null,
  saving: false,
  deletingIds: [],
};

type Rejected = { rejectValue: string };

/**
 * Loads the list for a user. Skipped when the same user is already loaded or loading,
 * unless { force: true } (Refresh button). A different userId always refetches.
 */
export const fetchUserProjects = createAsyncThunk<UserProject[], { userId: number; force?: boolean }, Rejected>(
  "userProjects/fetch",
  async ({ userId }, { rejectWithValue }) => {
    try {
      return await userProjectApi.list(userId);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ userId, force }, { getState }) => {
      const { status, loadedUserId } = (getState() as { userProjects: UserProjectsState }).userProjects;
      if (loadedUserId !== userId) return true; // different id → always fetch
      if (status === "loading") return false; // same id already in flight
      return !!force || status === "idle" || status === "failed";
    },
  },
);

export const createUserProject = createAsyncThunk<UserProject, UserProjectInput, Rejected>("userProjects/create", async (input, { rejectWithValue }) => {
  try {
    const id = await userProjectApi.create(input);
    return { ...input, id }; // the server only returns the id, so we build the row ourselves
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateUserProject = createAsyncThunk<UserProject, UserProject, Rejected>("userProjects/update", async (userProject, { rejectWithValue }) => {
  try {
    await userProjectApi.update(userProject);
    return userProject;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteUserProject = createAsyncThunk<number, number, Rejected>("userProjects/delete", async (id, { rejectWithValue }) => {
  try {
    await userProjectApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const slice = createSlice({
  name: "userProjects",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchUserProjects.pending, (s, a) => {
      s.status = "loading";
      s.error = null;
      // switching to another user: drop the previous user's rows right away
      if (s.loadedUserId !== a.meta.arg.userId) s.items = [];
      s.loadedUserId = a.meta.arg.userId;
    })
      .addCase(fetchUserProjects.fulfilled, (s, a) => {
        if (a.meta.arg.userId !== s.loadedUserId) return; // stale response for an old user
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchUserProjects.rejected, (s, a) => {
        if (a.meta.arg.userId !== s.loadedUserId) return; // stale response for an old user
        s.status = "failed";
        s.error = a.payload ?? "Could not load user projects";
      })
      // create / update / delete patch the list in place — no refetch
      .addCase(createUserProject.pending, (s) => void (s.saving = true))
      .addCase(createUserProject.fulfilled, (s, a) => {
        s.saving = false;
        s.items.unshift(a.payload);
      })
      .addCase(createUserProject.rejected, (s) => void (s.saving = false))
      .addCase(updateUserProject.pending, (s) => void (s.saving = true))
      .addCase(updateUserProject.fulfilled, (s, a) => {
        s.saving = false;
        s.items = s.items.map((u) => (u.id === a.payload.id ? a.payload : u));
      })
      .addCase(updateUserProject.rejected, (s) => void (s.saving = false))
      .addCase(deleteUserProject.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteUserProject.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((u) => u.id !== a.payload);
      })
      .addCase(deleteUserProject.rejected, (s, a) => {
        // previously missing: without this the row's spinner never stopped on a failed delete
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const userProjectsReducer = slice.reducer;