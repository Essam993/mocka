import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { User, UserInput } from "../../types/userTypes";
import { usersApi } from "../services/usersApi";

export interface UsersState {
  items: User[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** true while a create/update request is in flight (drives the form's Save button) */
  saving: boolean;
  /** ids with a delete request in flight (drives row-level loading) */
  deletingIds: number[];
}

const initialState: UsersState = { items: [], status: "idle", error: null, saving: false, deletingIds: [] };

type Rejected = { rejectValue: string };

/** Loads the list once. Calling it again is a no-op unless { force: true } (the Refresh button). */
export const fetchUsers = createAsyncThunk<User[], { force?: boolean } | undefined, Rejected>(
  "users/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await usersApi.list();
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as { users: UsersState }).users;
      if (status === "loading") return false;
      return !!arg?.force || status === "idle" || status === "failed";
    },
  },
);

export const createUser = createAsyncThunk<User, UserInput, Rejected>("users/create", async (input, { rejectWithValue }) => {
  try {
    const id = await usersApi.create(input);
    return { ...input, id }; // the server only returns the id, so we build the row ourselves
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateUser = createAsyncThunk<User, User, Rejected>("users/update", async (user, { rejectWithValue }) => {
  try {
    await usersApi.update(user);
    return user;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteUser = createAsyncThunk<number, number, Rejected>("users/delete", async (id, { rejectWithValue }) => {
  try {
    await usersApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const slice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchUsers.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchUsers.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchUsers.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Could not load users";
      })
      // create / update / delete patch the list in place — no refetch
      .addCase(createUser.pending, (s) => void (s.saving = true))
      .addCase(createUser.fulfilled, (s, a) => {
        s.saving = false;
        s.items.unshift(a.payload);
      })
      .addCase(createUser.rejected, (s) => void (s.saving = false))
      .addCase(updateUser.pending, (s) => void (s.saving = true))
      .addCase(updateUser.fulfilled, (s, a) => {
        s.saving = false;
        s.items = s.items.map((u) => (u.id === a.payload.id ? a.payload : u));
      })
      .addCase(updateUser.rejected, (s) => void (s.saving = false))
      .addCase(deleteUser.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteUser.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((u) => u.id !== a.payload);
      })
      .addCase(deleteUser.rejected, (s, a) => void (s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg)));
  },
});

export const usersReducer = slice.reducer;
