# treechartjs
`treechartjs` can generate tree diagrams based on structured data, and supports node expansion/collapse. Nodes can be edited through API or drag-and-drop behavior. Its size is very small and has no dependencies. The size after construction is only 25KB.
[[中文文档](https://github.com/grajs/treechartjs/blob/master/doc/README.zh.md)]

![image](https://i.loli.net/2020/10/23/t73zrISF9aBTXe1.gif)

## Installation
```sh
npm install treechartjs
```
or
```sh
yarn add treechartjs
```

## Usage
```javascript
import TreeChart from 'treechartjs'
import 'treechartjs/dist/index.css'

const chart = new TreeChart(...option)
```
example:
```javascript
import TreeChart from 'treechartjs'
import 'treechartjs/dist/index.css'

const chart = new TreeChart({
  data: [/*tree data*/],
  container: document.querySelector('.target'), /*chart container HTMLElement*/
  contentRender() {
    /*render function*/
  }
})
```

## Option
#### keyField
Type: `String`
Default: `'id'`

The attribute used to identify the node. The uniqueness of the attribute needs to be guaranteed. If there are duplicate values, it will cause problems in the use process. The value of the attribute must be of type `string`

#### data
Type: `Array`
Default: `undefined`

The data source used to render graphics, the format is as follows:
```javascript
    {
      id: '1',
      children: [{
          id: '11', 
          children: [{ id: '111' }] 
        }]
    },
```
Among them, `id` and `children` are required, `children` is an `Array` type, `id` can be replaced with the value defined by `keyField`, and other custom attributes can be added for use by `contentRender`:
```javascript
    {
      id: '1',
      name: 'parent',
      age: 45,
      children: [{
          id: '11',
          name: 'son',
          age: 19
        }]
    },
```

#### container
Type: `HTMLElement`
Default: `undefined`

The parent element of the chart. After initialization, the class name of `tree-chart` will be added. If there are too many nodes, you can set `overflow: auto` to scroll through.

#### contentRender
Type: `Function`
Default: `undefined`

Custom rendering function can return `HTMLElement` or `HTMLText`, and the parameter `data` is the data corresponding to the node

example:
```javascript
{
    contentRender(data) {
        const node = document.createElement('div')
        node.innerText = data.name
        return container
    }
}
```
or
```javascript
{
    contentRender(data) {
        return `<div class="node-${data.id}">${data.name}</div>`
    }
}
```



#### isVertical
Type: `Boolean`
Default: `true`

The arrangement direction of the tree, the default arrangement is vertical, if set to `false`, it will be arranged horizontally:

![image](https://i.loli.net/2020/10/23/kV2IuimL1jG8rX7.gif)

#### distanceX
Type: `Number`
Default: `40`

The horizontal distance between two nodes, this value cannot be less than 40

#### distanceY
Type: `Number`
Default: `40`

The vertical distance between two nodes, this value cannot be less than 40

#### allowFold
Type: `Boolean`
Default: `false`

Whether child nodes can be collapsed, if set to `true`, they can be expanded and collapsed by clicking or using API

#### foldNodeKeys
Type: `Array`
Default: `[]`

Nodes that need to be collapsed in the initial state, if there is a corresponding node in the passed `key`, the child nodes of the node will be collapsed

#### draggable
Type: `Boolean`
Default: `false`

Set to `true` to enable node dragging function

#### dragScroll
Type: `Boolean`
Default: `false`

After set to `true`, you can drag non-node areas to trigger interface scrolling:
![image](https://i.loli.net/2020/10/23/BAYascS3EQZ9CVW.gif)

#### autoScrollTriggerDistance
Type: `Number`
Default: `50`

If the dragging node is close to the boundary and there are remaining nodes that are not displayed, automatic scrolling will be triggered. By default, the distance between the dragging node and the boundary will be triggered if the distance is less than `50px`. This can be changed by setting `autoScrollTriggerDistance` Critical value, this value must be greater than `0`

#### line
Type: `Object`
Default: `{ type: 'bezier', smooth: 50 }`

Set the shape and smoothness of the connecting line between nodes

##### line.type
Type: `String`

type | example
---|---
straight | ![image](https://i.loli.net/2020/10/23/VDMJEN7GqZktCIx.png)
broken | ![image](https://i.loli.net/2020/10/23/pId6uWJKPc3xZfi.png)
bezier | ![image](https://i.loli.net/2020/10/23/FdHPjwbN7p3fTsQ.png)

##### line.smooth
Type: `Number`

Only effective when `line.type === bezier`, the value is between `0~100`, the connecting line will become a straight line when `line.smooth === 100`

#### nodeControl
Type: `Function`
Default: `undefined`

In the case of `option.draggable === true`, through `option.nodeControl` you can control whether the node can be dragged and inserted into child nodes or adjacent nodes
```javascript
{
    nodeControl(data) {
        return {
              draggable: true, // The target node can be dragged
              insertChild: true, // The target node can insert child nodes
              insertPrevious: true, // The target node can be inserted into PreviousNode
              insertNext: true // The target node can be inserted into NextNode
        }
    }
}
```

Make the node with ʻid === 1` unable to be dragged:
```javascript
{
    nodeControl(data) {
        return {
            draggable: data.id !== 1
        }
    }
}
```

Note: `nodeControl` can only limit the dragging behavior of the mouse, but not the `chart.insertNode` method

#### preventDrag
Type: `Function`
Default: `undefined`

In the case of `option.draggable === true`, `option.preventDrag` will be triggered before the node is dragged. If the return value is `true`, the drag of the current node will be prevented. Unlike `option.nodeControl`, `option.nodeControl` will only be executed during the initialization phase, but `option.preventDrag` will be executed before each drag.

Make the node with `id === 1` blocked before dragging:
```javascript
{
    preventDrag(data) {
        return  data.id === 1
    }
}
```
#### dragStart
Type: `Function`
Default: `undefined`

The `option.dragStart` method will be triggered when the dragging behavior of the node starts
```javascript
{
    dragStart(params) {
        console.log(data) // { element, key }
    }
}
```

#### dragEnd
Type: `Function`
Default: `undefined`

The dragging behavior of the node stops and the position change will trigger the `option.dragEnd` method
```javascript
{
    dragEnd(params) {
        console.log(params) // { key, target, type, from, to }
    }
}
```
`params.key`: the key representing the node being dragged

`params.target`: the key representing the target node (the node that was collided)

`params.type`: possible values are: `previous`, `next` and `child`

`params.from` and `params.to`: represents the location information before and after the node moves

#### click
Type: `Function`
Default: `undefined`

The `option.click` method will be triggered when the node is clicked
```javascript
{
    click(params) {
        console.log(params) // { element, key }
    }
}
```

#### mouseEnter
Type: `Function`
Default: `undefined`

The `option.mouseEnter` method will be triggered when the mouse enters the node area
```javascript
{
    mouseEnter(params) {
        console.log(params) // { element, key }
    }
}
```

#### mouseLeave
Type: `Function`
Default: `undefined`

The `option.mouseLeave` method will be triggered when the mouse leaves the node area
```javascript
{
    mouseLeave(params) {
        console.log(params) // { element, key }
    }
}
```

## API

#### getNodeElement

`getNodeElement(nodeKey: string): string`

Get the `element` corresponding to the node according to the passed `nodeKey`
```javascript
chart.getNodeElement('1') // HTMLElement
```

#### getKeyByElement

`getKeyByElement(nodeElement: HTMLElement): HTMLElement`

Get the `nodeKey` corresponding to the `nodeElement` node
```javascript
chart.getKeyByElement(document.querySelector('.tree-chart-item-1')) // nodeKey: 1
```

#### getPreviousKey

`getPreviousKey(nodeKey: string): string`

Get the `nodeKey` of the previous sibling node according to the passed `nodeKey`
```javascript
chart.getKeyByElement('3') // nodeKey: 2
```

#### getNextKey

`getNextKey(nodeKey: string): string`

Obtain the `nodeKey` of the next sibling node according to the passed `nodeKey`
```javascript
chart.getNextKey('2') // nodeKey: 3
```

#### getParentKey

`getParentKey(nodeKey: string): string`

Get the `nodeKey` of the parent node according to the passed `nodeKey`
```javascript
chart.getNextKey('2') // nodeKey: 1
```

#### getChildrenKeys

`getChildrenKeys(nodeKey: string): Array<string>`

Get the `nodeKey` list of the child nodes according to the passed `nodeKey`. Note that only the `nodeKey` of the first-level child nodes are returned here.
```javascript
chart.getChildrenKeys('1') // nodeKeys: ['1', '2']
```

#### existChildren

`existChildren(nodeKey: string): boolean`

Determine whether the node corresponding to `nodeKey` has child nodes
```javascript
chart.existChildren('1') // true
```

#### insertNode

`insertNode(targetKey: string, origin: string | object, type: string): void`
- targetKey
>The `nodeKey` of the target node, this node is not the node that needs to be moved
- origin
>The parameter value can be `nodeKey` or `object`. If it is `nodeKey`, it represents the node that needs to be operated. If it is `object`, a new node will be created for operation. The format of `object` should be `option.data` A child of
- type
>The possible values are `child`, `previous` and `next`, which represent insert as a child node, insert as the previous sibling node, and insert as the next sibling node, respectively

You can add new nodes or move existing nodes through `insertNode`
```javascript
chart.insertNode('1', '2', 'child') // Insert the node with key 2 as a child node of 1
chart.insertNode('1', '2', 'previous') // Insert the node with key 2 as the previous sibling node of 1
chart.insertNode('1', '2', 'next') // Insert the node with key 2 as the next sibling node of 1

const newNodeData = {
    id: '8',
    name: 'jack',
    age: 24
}
chart.insertNode('1', newNodeData, 'child') // Create a new child node for the node with key 1
```
>Note: Under no circumstances can you insert a sibling node to the root node

#### removeNode

`removeNode(nodeKey: string): void`

Delete the node corresponding to `nodeKey`
```javascript
chart.removeNode('3') // The node with key 3 is deleted
```

#### nodeIsFold

`nodeIsFold(nodeKey: string): boolean`

Determine whether the corresponding node is collapsed according to the passed `nodeKey`
```javascript
chart.nodeIsFold('2') // false
```

#### toggleFold

`toggleFold(nodeKey: string): void`

The node corresponding to `nodeKey` will change the collapsed state
```javascript
chart.toggleFold('2')
```

#### reRenderNode

`reRenderNode(nodeKey: string, nodeData: object): void`

Re-render the target node according to the incoming `nodeData`
```javascript
const nodeData = {
    id: '2',
    name: 'jeck',
    age: 32
}
chart.reRenderNode('2', nodeData) // The node with key 2 is re-rendered
```

#### reloadLink

`reloadLink(): void`

Re-render all the connecting lines in the chart
```javascript
chart.reloadLink()
```

#### reRender

`reRender(data: object): void`

Use the new data to render the entire chart, the format of `data` should be consistent with `option.data`
```javascript
const data = {
      id: '1',
      children: [{
          id: '11', 
          children: [{ id: '111' }] 
        }]
    }
    
chart.reRender(data)
```
