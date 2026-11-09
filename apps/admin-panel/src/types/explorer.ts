export interface ExplorerWorkspace {
  id: number;
  name: string;
  alias: string;
  /** the user the workspace belongs to */
  mockaUserId: number;
  /** everything else the server sent is kept, so an update doesn't lose it */
  [extra: string]: unknown;
}

export interface ExplorerProject {
  id: number;
  name: string;
  description: string;
  workspaceId: number;
  [extra: string]: unknown;
}

export interface ExplorerCollection {
  id: number;
  name: string;
  /** true = auth required */
  required: boolean;
  projectId: number;
}

export interface ExplorerEndpoint {
  id: number;
  path: string;
  method: string;
  description: string;
  apiId: number;
}

/** An API: a group of endpoints inside a collection */
export interface ExplorerApi {
  id: number;
  name: string;
  description: string;
  collectionId: number;
  endpoints: ExplorerEndpoint[];
}

/* what the add / edit forms collect */
export interface WorkspaceInput { name: string; alias: string }
export interface ProjectInput { name: string; description: string }
export interface CollectionInput { name: string; required: boolean }
export interface ApiInput { name: string; description: string }
export interface EndpointInput { path: string; method: string; description: string }