export interface Workspace {
  id: number;
  name: string;
  alias?: string;
  type?: string;
  projectsCount?: number;
}

export interface WorkspaceInput {
  name: string;
  alias: string;
}