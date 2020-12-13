import { SourceDataItem, StoreItem, SourceData, DataMap } from './types/store'

export default class Store {
  dataMap: DataMap = {}
  root: StoreItem | null = null

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
  remove(id: string) {
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
}
