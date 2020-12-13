export interface SourceDataItem {
  id: string | number;
  parent?: string | number;
  [key: string]: any;
}
export type SourceData = SourceDataItem[]
export interface StoreItem extends SourceDataItem {
  children: SourceDataItem[];
}
export interface DataMap {
  [id: string]: StoreItem
}
