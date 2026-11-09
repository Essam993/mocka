import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { FolderKanban, LibraryBig, Braces, FolderTree } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchUserProjects } from "../store/reducers/userProjectSlice";
import type { ProjectCollection } from "../types/projectCollection";
import { TreeNav, TreeNode } from "@repo/shared";
import { projectCollectionsApi } from "../store/services/userProjectCollectionsApi";

type Meta = { kind: "root" | "project" | "collection" | "api"; projectId?: number; collectionId?: number };
interface ApiItem { id: number; name: string }

/** ★ Replace with your real APIs endpoint/service when it exists */
async function loadApis(_collectionId: number): Promise<ApiItem[]> {
  return []; // e.g. (await api.get(".../getCollectionApis", { params: { collectionId } })).data.data
}

const collectionsPath = (p: number) => `/projects/${p}/collections`;
const apisPath = (p: number, c: number) => `${collectionsPath(p)}/${c}/apis`;

export default function ProjectsTree({ onSelect }: { onSelect: (path: string) => void }) {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const projects = useAppSelector((s) => s.userProjects.items);

  const [collections, setCollections] = useState<Record<number, ProjectCollection[]>>({});
  const [apis, setApis] = useState<Record<number, ApiItem[]>>({});
  const [loading, setLoading] = useState<string[]>([]);

  // no force: the thunk skips the request if the list is already loaded
  useEffect(() => {
    dispatch(fetchUserProjects({}));
  }, [dispatch]);

  const run = async (key: string, job: () => Promise<void>) => {
    setLoading((l) => [...l, key]);
    try {
      await job();
    } catch {
      /* keep whatever is cached; the tree just shows what it has */
    } finally {
      setLoading((l) => l.filter((k) => k !== key));
    }
  };

  const onExpand = (n: TreeNode<Meta>) => {
    const m = n.data;
    if (m?.kind === "project" && m.projectId != null) {
      const id = m.projectId;
      run(n.key, async () => {
        const collectionsForProject = await projectCollectionsApi.list(id);
        setCollections((c) => ({ ...c, [id]: collectionsForProject }));
      });
    } else if (m?.kind === "collection" && m.collectionId != null) {
      const id = m.collectionId;
      run(n.key, async () => {
        const apisForCollection = await loadApis(id);
        setApis((a) => ({ ...a, [id]: apisForCollection }));
      });
    }
  };

  const nodes: TreeNode<Meta>[] = [
    {
      key: "/projects",
      label: "Projects",
      icon: <FolderTree className="size-4" />,
      isParent: true,
      data: { kind: "root" },
      children: projects.map((p) => ({
        key: collectionsPath(p.id),
        label: p.name,
        icon: <FolderKanban className="size-4" />,
        isParent: true,
        data: { kind: "project", projectId: p.id },
        children: collections[p.id]?.map((c) => ({
          key: apisPath(p.id, c.id),
          label: c.name,
          icon: <LibraryBig className="size-4" />,
          isParent: true,
          data: { kind: "collection", projectId: p.id, collectionId: c.id },
          children: apis[c.id]?.map((a) => ({
            key: `${apisPath(p.id, c.id)}/${a.id}`,
            label: a.name,
            icon: <Braces className="size-4" />,
            data: { kind: "api", projectId: p.id, collectionId: c.id },
          })),
        })),
      })),
    },
  ];

  return (
    <TreeNav<Meta>
      nodes={nodes}
      activeKey={pathname}
      loadingKeys={loading}
      defaultOpenKeys={["/projects"]}
      onExpand={onExpand}
      onSelect={(n) => onSelect(n.key)}
    />
  );
}