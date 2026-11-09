import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { attachPersistence, configureApi, logout, setStoragePrefix, sharedReducers } from "@repo/shared";
import { usersReducer } from "./reducers/usersSlice";
import { userProjectsReducer } from "./reducers/userProjectSlice";
import workspaceReducer from "./reducers/workspaceSlice";
import { explorerWorkspaces } from "./reducers/explorer/explorerWorkspacesSlice";
import { explorerProjects } from "./reducers/explorer/explorerProjectsSlice";
import { explorerCollections } from "./reducers/explorer/explorerCollectionsSlice";
import { explorerApis } from "./reducers/explorer/explorerApisSlice";
import { httpCodesReducer } from "./reducers/httpCodesSlice";
import { httpMethodReducer } from "./reducers/httpMethodSlice";
import { contentTypesReducer } from "./reducers/contentTypesSlice";
import { protocolsReducer } from "./reducers/protocolsSlice";
import { DataTypesReducer } from "./reducers/dataTypesSlice";

setStoragePrefix("admin-panel"); // keeps token/theme separate from the other panel

export const store = configureStore({
  reducer: {
    ...sharedReducers, // auth + theme
    users: usersReducer,
    userProjects: userProjectsReducer,
    workspaces: workspaceReducer,
    explorerWorkspaces: explorerWorkspaces.reducer,
    explorerProjects: explorerProjects.reducer,
    explorerCollections: explorerCollections.reducer,
    explorerApis: explorerApis.reducer,
    httpCodes: httpCodesReducer,
    httpMethods: httpMethodReducer,
    contentTypes: contentTypesReducer,
    protocols: protocolsReducer,
    dataTypes: DataTypesReducer
    // add the admin panel's other slices here
  },
});
attachPersistence(store);

configureApi({
  appKey: process.env.REACT_APP_KEY, // from .env → REACT_APP_KEY, sent as App-Key on every request
  // no baseURL needed: requests go through the Vite proxy in dev and the same host in production
  getToken: () => store.getState().auth.accessToken,
  onUnauthorized: () => store.dispatch(logout()),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
/** Typed hooks that also know about this app's own slices (users, …) */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
