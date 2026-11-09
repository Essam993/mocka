import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchWorkspaces } from "../store/reducers/workspaceSlice";
import { fetchUserProjects } from "../store/reducers/userProjectSlice";
import { fetchProjectCollection } from "../store/reducers/projectCollectionSlice"; // ★ your path
import { fetchCollectionApis } from "../store/reducers/collectionApiSlice";
import { saveScope, setCollection, setProject, setWorkspace } from "../store/reducers/scopeSlice";

/** Keeps workspace → project → collection → APIs in sync and selects the first item at each level by default. */
export function useWorkspaceScope(enabled: boolean) {
  const dispatch = useAppDispatch();
  const { workspaceId, projectId, collectionId } = useAppSelector((s) => s.scope);
  const ws = useAppSelector((s) => s.workspaces);
  const pr = useAppSelector((s) => s.userProjects);
  const co = useAppSelector((s) => s.projectCollections);
  const ca = useAppSelector((s) => s.collectionApis);

  // ignore lists that belong to another workspace / project / collection
  const projects = pr.loadedWorkspaceId === workspaceId ? pr.items : [];
  const collections = co.loadedProjectId === projectId ? co.items : [];
  const workspace = ws?.items.find((w) => w?.id === workspaceId);
  const project = projects?.find((p) => p?.id === projectId);
  const collection = collections.find((c) => c?.id === collectionId);
  const pid = project?.id;
  const cid = collection?.id;
  const apis = ca.loadedCollectionId === cid ? ca.items : [];

  // 1. workspaces
  useEffect(() => {
    if (enabled) dispatch(fetchWorkspaces({ force: true }));
  }, [dispatch, enabled]);

  // 2. default workspace = first one
  useEffect(() => {
    if (!enabled || ws.status !== "succeeded") return;
    const next = ws.items.some((w) => w.id === workspaceId) ? workspaceId : (ws.items[0]?.id ?? null);
    if (next !== workspaceId) dispatch(setWorkspace(next));
  }, [dispatch, enabled, ws.status, ws.items, workspaceId]);

  // 3. projects of the selected workspace
  useEffect(() => {
    if (enabled && workspaceId != null) dispatch(fetchUserProjects({ workspaceId }));
  }, [dispatch, enabled, workspaceId]);

  // 4. default project = first one of that workspace
  useEffect(() => {
    if (!enabled || pr.status !== "succeeded" || pr.loadedWorkspaceId !== workspaceId) return;
    const next = pr?.items.some((p) => p.id === projectId) ? projectId : (pr.items[0]?.id ?? null);
    if (next !== projectId) dispatch(setProject(next));
  }, [dispatch, enabled, pr.status, pr.items, pr.loadedWorkspaceId, workspaceId, projectId]);

  // 5. collections of the selected project
  useEffect(() => {
    if (enabled && pid != null) dispatch(fetchProjectCollection({ projectId: pid }));
  }, [dispatch, enabled, pid]);

  // 6. default collection = first one of that project
  useEffect(() => {
    if (!enabled || co.status !== "succeeded" || co.loadedProjectId !== projectId) return;
    const list = co.items.filter(Boolean);
    const next = list.some((c) => c.id === collectionId) ? collectionId : (list[0]?.id ?? null);
    if (next !== collectionId) dispatch(setCollection(next));
  }, [dispatch, enabled, co.status, co.items, co.loadedProjectId, projectId, collectionId]);

  // 7. APIs of the selected collection (the APIs page reuses them, the request is skipped when already loaded)
  useEffect(() => {
    if (enabled && cid != null) dispatch(fetchCollectionApis({ collectionId: cid }));
  }, [dispatch, enabled, cid]);

  // remember the selection
  useEffect(() => saveScope({ workspaceId, projectId, collectionId }), [workspaceId, projectId, collectionId]);

  return {
    workspaces: ws.items,
    workspace,
    projects,
    project,
    collections,
    collection,
    apis,
    loadingWorkspaces: ws.status === "loading",
    loadingProjects: pr.status === "loading",
    loadingCollections: co.status === "loading",
    loadingApis: ca.status === "loading",
    selectWorkspace: (id: number) => dispatch(setWorkspace(id)),
    selectProject: (id: number) => dispatch(setProject(id)),
    selectCollection: (id: number) => dispatch(setCollection(id)),
  };
}