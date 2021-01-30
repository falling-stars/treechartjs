export interface SourceDataItem {
  id: string | number;
  parent?: string | number;
  [key: string]: any;
}
export interface StoreItem extends SourceDataItem {
  children: StoreItem[];
}
export interface StoreMap {
  [id: string]: StoreItem
}
