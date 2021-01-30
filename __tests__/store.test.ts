import Store from '../src/store'
import { StoreItem } from '../src/types/store'

const dataList = [
  { id: 211, parent: 21 },
  { id: 21, parent: 2 },
  { id: 2, parent: 0 },
  { id: 12, parent: 1 },
  { id: 11, parent: 1 },
  { id: 1, parent: 0 },
  { id: 0 }
]
const formatData: StoreItem = {
  id: 0,
  children: [
    {
      id: 2,
      parent: 0,
      children: [
        {
          id: 21,
          parent: 2,
          children: [
            {
              id: 211,
              parent: 21,
              children: []
            }
          ]
        }
      ]
    },
    {
      id: 1,
      parent: 0,
      children: [
        {
          id: 12,
          parent: 1,
          children: []
        },
        {
          id: 11,
          parent: 1,
          children: []
        }
      ]
    }
  ]
}

const store = new Store(dataList)

test('new store', () => {
  expect(store.root).toEqual(formatData)
})
test('remove store item', () => {
  store.remove(2)
  store.remove(12)
  formatData.children.splice(0, 1)
  formatData.children[0].children.splice(0, 1)
  expect(store.root).toEqual(formatData)
})
test('add store item', () => {
  // 重复id项
  store.add({ id: 1, parent: 0 })
  store.add({ id: 3, parent: 0 })
  store.add({ id: 31, parent: 3 })
  formatData.children.push({
    id: 3,
    parent: 0,
    children: [{ id: 31, parent: 3, children: [] }]
  })
  expect(store.root).toEqual(formatData)
})
