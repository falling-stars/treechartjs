import { SourceDataItem, StoreItem, SourceData, DataMap } from './types/store'

export default class Store {
  dataMap: DataMap = {}
  public root: StoreItem | null = null

  constructor(sourceData: SourceData) {
    this.setup(sourceData)
  }
  setup(sourceData: SourceData) {
    this.dataMap = {}
    this.root = this.formatData(sourceData)
  }
  formatData(sourceData: SourceData): StoreItem | null {
    const { dataMap } = this
    let root: SourceDataItem | null = null
    sourceData.forEach(item => {
      const { id, parent } = item
      if (dataMap[id]) {
        Object.assign(dataMap[id], item)
      } else {
        dataMap[id] = Object.assign(item, { children: [] })
      }
      if (parent !== undefined) {
        if (dataMap[parent]) {
          dataMap[parent].children.push(item)
        } else {
          dataMap[parent] = { id: parent, children: [item] }
        }
      } else {
        root = item
      }
    })
    return root
  }
  remove(id: string | number) {
    const targetItem = this.dataMap[id]
    if (!targetItem) return
    const { parent } = targetItem
    if (parent === undefined) {
      this.dataMap = {}
      this.root = null
    } else {
      delete this.dataMap[id]
      const { children } = this.dataMap[parent]
      const index = children.findIndex(item => item.id === id)
      index > -1 && children.splice(index, 1)
    }
  }
  add(sourceDataItem: SourceDataItem, index?: number) {
    const { dataMap } = this
    const { id, parent } = sourceDataItem
    // 存在相同id的数据
    if (dataMap[id]) return
    const newItem = dataMap[id] = { ...sourceDataItem, children: [] }
    if (parent !== undefined) {
      const parentItem = dataMap[parent]
      parentItem && parentItem.children.splice(index || parentItem.children.length, 0, newItem)
      return
    }
    this.root = newItem
  }
}
