import { collectionLevel } from "../../services/explorerApi";
import { explorerProjects } from "./explorerProjectsSlice";
import { createLevelSlice } from "../levelSlice";

/** collections of a project: byParent[projectId] */
export const explorerCollections = createLevelSlice("explorerCollections", collectionLevel, (b) => {
  b.addCase(explorerProjects.remove.fulfilled, (s, a) => {
    delete s.byParent[a.payload.id];
  });
});