/** id + name pair returned by getHttpCodes and getContentTypes */
export interface LookupOption {
  id: number;
  name: string;
}
export type HttpCode = LookupOption;
export type ContentType = LookupOption;

export interface ResponseVariable {
  id: number;
  variableId: number | null;
  name: string;
  defaultValue: string;
  description: string;
  required: boolean;
  /** the list endpoint doesn't send it; it is known after a save, or taken from the global variable */
  dataTypeId: number | null;
}

export interface EndpointResponse {
  id: number;
  httpCodeId: number | null;
  contentTypeId: number | null;
  name: string;
  /** share of the calls */
  percentage: number;
  /** milliseconds */
  delay: number;
  variables: ResponseVariable[];
}

/** statusId: 1 = active, 0 = delete. `id` and `variableId` are never sent when inserting. */
export interface ResponseVariableWrite {
  id?: number;
  variableId?: number | null;
  name: string;
  dataTypeId: number | null;
  defaultValue: string;
  description: string;
  required: boolean;
  statusId: 0 | 1;
}

export interface ResponseWrite {
  /** missing when inserting */
  id?: number;
  httpCodeId: number | null;
  contentTypeId: number | null;
  name: string;
  percentage: number;
  delay: number;
  /** only 0, when the whole response is deleted */
  statusId?: 0 | 1;
  variables: ResponseVariableWrite[];
}