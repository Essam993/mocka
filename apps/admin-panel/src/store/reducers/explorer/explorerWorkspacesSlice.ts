import { workspaceLevel } from "../../services/explorerApi";
import { createLevelSlice } from "../levelSlice";

/** workspaces of a user: byParent[mockaUserId] */
export const explorerWorkspaces = createLevelSlice("explorerWorkspaces", workspaceLevel);