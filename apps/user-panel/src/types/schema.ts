/** A row of the left panel */
export interface Schema {
  id: number;
  name: string;
  projectId: number;
}

/** One field (variable) inside a schema */
export interface SchemaField {
  /** server id of the field; missing for a field that was just added */
  id?: number;
  name: string;
  dataTypeId: number;
  description: string;
  required: boolean;
  /** the nested schema, set only when the field's type is Record */
  recordDefId: number | null;
}

export interface SchemaInput {
  name: string;
  projectId: number;
  fields: SchemaField[];
}