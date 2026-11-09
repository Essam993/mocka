import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { userProjectApi } from "../services/userProjectApi";
import { UserProject, UserProjectInput } from "../../types/userProject";

export interface UserProjectsState {
  items: UserProject[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** which workspace the current `items` belong to (null = unfiltered) */
  loadedWorkspaceId: number | null;
  saving: boolean;
  deletingIds: number[];
}

const initialState: UserProjectsState = {
  items: [],
  status: "idle",
  error: null,
  loadedWorkspaceId: null,
  saving: false,
  deletingIds: [],
};

type Rejected = { rejectValue: string };

/** Another workspace always fetches. The same one is skipped unless { force: true }. */
export const fetchUserProjects = createAsyncThunk<UserProject[], { workspaceId?: number | null; force?: boolean } | undefined, Rejected>(
  "userProjects/fetch",
  async (arg, { rejectWithValue }) => {
    try {
      return await userProjectApi.list(arg?.workspaceId ?? undefined);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status, loadedWorkspaceId } = (getState() as { userProjects: UserProjectsState }).userProjects;
      if (loadedWorkspaceId !== (arg?.workspaceId ?? null)) return true;
      if (status === "loading") return false;
      return !!arg?.force || status === "idle" || status === "failed";
    },
  },
);

export const createUserProject = createAsyncThunk<UserProject, UserProjectInput, Rejected>("userProjects/create", async (input, { rejectWithValue }) => {
  try {
    const id = await userProjectApi.create(input); // throws without an id, so `items` is never patched
    return { ...input, id } as UserProject;
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
      const ws = a.meta.arg?.workspaceId ?? null;
      s.status = "loading";
      s.error = null;
      if (s.loadedWorkspaceId !== ws) s.items = []; // don't flash another workspace's projects
      s.loadedWorkspaceId = ws;
    })
      .addCase(fetchUserProjects.fulfilled, (s, a) => {
        if ((a.meta.arg?.workspaceId ?? null) !== s.loadedWorkspaceId) return; // stale response
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchUserProjects.rejected, (s, a) => {
        if ((a.meta.arg?.workspaceId ?? null) !== s.loadedWorkspaceId) return;
        s.status = "failed";
        s.error = a.payload ?? "Could not load user projects";
      })
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
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const userProjectsReducer = slice.reducer;