import { SourceDataItem, StoreItem, StoreMap } from './types/store'

export default class Store {
  storeMap: StoreMap = {}
  public root: StoreItem | null = null

  constructor(sourceData: SourceDataItem[]) {
    this.setup(sourceData)
  }
  setup(sourceData: SourceDataItem[]) {
    this.storeMap = {}
    this.root = this.formatData(sourceData)
  }
  formatData(sourceData: SourceDataItem[]): StoreItem | null {
    const { storeMap } = this
    let root: SourceDataItem | null = null
    sourceData.forEach(item => {
      const { id, parent } = item
      const existItem = storeMap[id]
      const newStoreItem = existItem ? Object.assign(existItem, item) : storeMap[id] = { ...item, children: [] }
      if (parent === undefined) return root = newStoreItem
      if (storeMap[parent]) return storeMap[parent].children.push(newStoreItem)
      storeMap[parent] = { id: parent, children: [newStoreItem] }
    })
    return root
  }
  remove(id: string | number) {
    const targetItem = this.storeMap[id]
    if (!targetItem) return
    const { parent } = targetItem
    if (parent === undefined) {
      this.storeMap = {}
      this.root = null
    } else {
      delete this.storeMap[id]
      const { children } = this.storeMap[parent]
      const index = children.findIndex(item => item.id === id)
      index > -1 && children.splice(index, 1)
    }
  }
  add(sourceDataItem: SourceDataItem, index?: number) {
    const { storeMap } = this
    const { id, parent } = sourceDataItem
    // 存在相同id的数据
    if (storeMap[id]) return
    const newItem = storeMap[id] = { ...sourceDataItem, children: [] }
    if (parent !== undefined) {
      const parentItem = storeMap[parent]
      parentItem && parentItem.children.splice(index || parentItem.children.length, 0, newItem)
      return
    }
    this.root = newItem
  }
}
