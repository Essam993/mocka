export interface dataTypes {
  id: number;
  name: string;
  label: string;
}

export interface dataTypesInput {
  name: string;
  label: string;
}

export interface dataTypesUpdate extends dataTypesInput {
  id: number;
}