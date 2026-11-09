export interface ProjectVariable {
  id: number;
  name: string;
  dataTypeId: number;
  description: string;
  /** set only when the type is Record */
  recordDefId: number | null;
  projectId: number;
}

export type ProjectVariableInput = Omit<ProjectVariable, "id">;

export interface DataType {
  id: number;
  label: string;
}

export interface RecordOption {
  id: number;
  label: string;
}