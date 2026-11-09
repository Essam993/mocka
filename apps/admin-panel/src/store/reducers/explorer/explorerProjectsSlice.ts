import { projectLevel } from "../../services/explorerApi";
import { explorerWorkspaces } from "./explorerWorkspacesSlice";
import { createLevelSlice } from "../levelSlice";

/** projects of a workspace: byParent[workspaceId] */
export const explorerProjects = createLevelSlice("explorerProjects", projectLevel, (b) => {
  // deleting a workspace drops the projects cached under it
  b.addCase(explorerWorkspaces.remove.fulfilled, (s, a) => {
    delete s.byParent[a.payload.id];
  });
});