export interface SourceDataItem {
  id: string | number;
  parent?: string | number;
  [key: string]: any;
}
export interface DataItem extends SourceDataItem{
  children: SourceDataItem[];
}
export interface DataMap {
  [id: string]: DataItem
}
