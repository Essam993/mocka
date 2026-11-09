import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const KEY = "mocka.scope";

export interface ScopeState {
  workspaceId: number | null;
  projectId: number | null;
  collectionId: number | null;
}

const load = (): ScopeState => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return { workspaceId: raw?.workspaceId ?? null, projectId: raw?.projectId ?? null, collectionId: raw?.collectionId ?? null };
  } catch {
    return { workspaceId: null, projectId: null, collectionId: null };
  }
};

export const saveScope = (s: ScopeState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable, the selection just won't persist */
  }
};

const slice = createSlice({
  name: "scope",
  initialState: load,
  reducers: {
    /** Changing workspace clears the project and collection; the defaults are picked once their lists load */
    setWorkspace(s, a: PayloadAction<number | null>) {
      if (s.workspaceId !== a.payload) {
        s.workspaceId = a.payload;
        s.projectId = null;
        s.collectionId = null;
      }
    },
    /** Changing project clears the collection */
    setProject(s, a: PayloadAction<number | null>) {
      if (s.projectId !== a.payload) {
        s.projectId = a.payload;
        s.collectionId = null;
      }
    },
    setCollection(s, a: PayloadAction<number | null>) {
      s.collectionId = a.payload;
    },
  },
});

export const { setWorkspace, setProject, setCollection } = slice.actions;
export const scopeReducer = slice.reducer;