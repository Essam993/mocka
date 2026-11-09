export type VariableSection = "params" | "headers" | "body";

export interface EndpointVariable {
  id: number;
  variableId: number | null;
  name: string;
  defaultValue: string;
  description: string;
  required: boolean;
  /** the list endpoints don't return it; it is known after a save, or resolved from the global variable */
  dataTypeId: number | null;
}

/** A row sent to insertEndpointVariables */
export interface VariableWrite {
  id?: number;
  variableId?: number | null;
  name: string;
  dataTypeId: number | null;
  defaultValue: string;
  description: string;
  required: boolean;
}

export interface EndpointContext {
  endpointId: number;
  collectionId: number;
  projectId: number;
}