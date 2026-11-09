import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { attachPersistence, configureApi, logout, setStoragePrefix, sharedReducers } from "@repo/shared";
import { usersReducer } from "./reducers/usersSlice";
import { userProjectsReducer } from "./reducers/userProjectSlice";
import { ProjectCollectionReducer } from "./reducers/projectCollectionSlice";
import { collectionApisReducer } from "./reducers/collectionApiSlice";
import { LookupsReducer } from "./reducers/lookupsSlice";
import { workspaceReducer } from "./reducers/workspaceSlice";
import { scopeReducer } from "./reducers/scopeSlice";
import { projectVariablesReducer } from "./reducers/projectVariableSlice";
import { dataTypesReducer } from "./reducers/dataTypeSlice";
import { schemasReducer } from "./reducers/schemaSlice";
import { endpointVariablesReducer } from "./reducers/endpointVariableSlice";
import { endpointResponsesReducer } from "./reducers/endpointResponseSlice";
import { apiDataReducer } from "./reducers/apiDataSlice";

setStoragePrefix("user-panel"); // keeps token/theme separate from the other panel

export const store = configureStore({
  reducer: {
    ...sharedReducers, // auth + theme
    users: usersReducer,
    userProjects: userProjectsReducer,
    projectCollections: ProjectCollectionReducer,
    collectionApis: collectionApisReducer,
    Lookups: LookupsReducer,
    workspaces: workspaceReducer,
    scope: scopeReducer,
    projectVariables: projectVariablesReducer,
    dataTypes: dataTypesReducer,
    schemas: schemasReducer,
    endpointVariables: endpointVariablesReducer,
    endpointResponses: endpointResponsesReducer,
    apiData: apiDataReducer,
    // add the user panel's other slices here
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
