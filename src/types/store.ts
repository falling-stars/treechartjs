export interface SourceDataItem {
  id: string | number;
  parent?: string | number;
  [key: string]: any;
}
export interface StoreItem extends SourceDataItem {
  children: SourceDataItem[];
}
export interface RootData extends SourceDataItem {
  parent: undefined;
  children: StoreItem[]
}
export interface DataMap {
  [id: string]: StoreItem
}
