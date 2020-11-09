# treechartjs

![image](https://i.loli.net/2020/10/23/t73zrISF9aBTXe1.gif)

## 特征
- 轻量的图形库，没有任何依赖，构建后的大小仅为32KB
- 支持节点展开/收起
- 可以拖拽节点进行编辑
- 支持拖拽移动图层
- 支持多种方案限制节点的操作并提示

## 安装
```sh
npm install treechartjs
```
或者
```sh
yarn add treechartjs
```

## 使用方法
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

## 配置项
### keyField
Type: `String`
Default: `'id'`

用来标识节点的属性，需要保证该属性的唯一性，如果出现了重复的值，将会导致使用过程中出现问题，属性的值必须为`string`类型

### data
Type: `Array`
Default: `undefined`

用于渲染图形的数据源，格式如下:
```javascript
    {
      id: '1',
      children: [{
          id: '11', 
          children: [{ id: '111' }] 
        }]
    },
```
其中`id`和`children`是必须的，`children`是一个`Array`类型,`id`可以替换为`keyField`所定义的值，可以增加其他自定义属性提供给`contentRender`使用:
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

### container
Type: `HTMLElement`
Default: `undefined`

图形的父元素，初始化之后会被添加`tree-chart`类名，节点过多的情况下可以设置`overflow: auto`来滚动查看

### contentRender
Type: `Function`
Default: `undefined`

自定义的渲染函数，可以返回`HTMLElement`或者`HTMLText`，参数`data`是节点对应的数据

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
或 
```javascript
{
    contentRender(data) {
        return `<div class="node-${data.id}">${data.name}</div>`
    }
}
```



### isVertical
Type: `Boolean`
Default: `true`

树的排布方向，默认垂直排布，如果设置为`false`，将会横向排布:

![image](https://i.loli.net/2020/10/23/kV2IuimL1jG8rX7.gif)

### distanceX
Type: `Number`
Default: `40`

两个节点间的水平间距，这个值不能小于`40`

### distanceY
Type: `Number`
Default: `40`

两个节点间的垂直间距，这个值不能小于`40`

### allowFold
Type: `Boolean`
Default: `false`

子节点是否能够折叠，如果设置为`true`，可以通过点击或使用API进行展开和折叠

### foldNodeKeys
Type: `Array`
Default: `[]`

需要在初始状态时候折叠的节点，如果传入的`key`存在对应的节点，该节点的子节点将会被折叠

### draggable
Type: `Boolean`
Default: `false`

设置为`true`可以开启节点拖拽功能

### dragScroll
Type: `Boolean`
Default: `false`

设置为`true`后可以拖拽非节点区域触发界面滚动:
![image](https://i.loli.net/2020/10/23/BAYascS3EQZ9CVW.gif)

### autoScrollTriggerDistance
Type: `Number`
Default: `50`

正在拖拽的节点如果靠近边界，并且还有剩余节点没有显示的情况下会触发自动滚动。默认情况下拖拽节点与边界的距离如果小于`50px`就会触发滚动，可以通过设置`autoScrollTriggerDistance`来改变这个临界值，这个值必须大于`0`

### line
Type: `Object`
Default: `{ type: 'bezier', smooth: 50 }`

设置节点间连接线的形状和光滑程度

##### line.type
Type: `String`

type | example
---|---
straight | ![image](https://i.loli.net/2020/10/23/VDMJEN7GqZktCIx.png)
broken | ![image](https://i.loli.net/2020/10/23/pId6uWJKPc3xZfi.png)
bezier | ![image](https://i.loli.net/2020/10/23/FdHPjwbN7p3fTsQ.png)

##### line.smooth
Type: `Number`

想要启用这个配置需要先设定`line.type === bezier`，`smooth`的取值在`0~100`之间，`line.smooth === 100`时候连接线将会变成直线

### nodeControl
Type: `Function`
Default: `undefined`

想要启用这个配置需要先设定`option.draggable === true`，通过`option.nodeControl`可以控制节点是否能被拖拽和插入子节点或相邻节点
```javascript
{
    nodeControl(data) {
        return {
              draggable: true, // 目标节点能够被拖拽
              insertChild: true, // 目标节点能够插入子节点
              insertPrevious: true, // 目标节点能够插入PreviousNode
              insertNext: true // 目标节点能够插入NextNode
        }
    }
}
```

使`id === 1`的节点无法被拖拽：
```javascript
{
    nodeControl(data) {
        return {
            draggable: data.id !== 1
        }
    }
}
```

注意：`nodeControl`只能限制鼠标的拖拽行为，但是无法限制`chart.insertNode`方法

### preventDrag
Type: `Function`
Default: `undefined`

想要启用这个配置需要先设定`option.draggable === true`，在节点被拖拽之前会触发`option.preventDrag`，如果返回值为`true`的话会阻止当前节点的拖拽。和`option.nodeControl`不同的是，`option.nodeControl`只会在初始化阶段执行，但是`option.preventDrag`会在每一次拖拽之前执行。

使`id === 1`的节点在拖拽前被阻止：
```javascript
{
    preventDrag(data) {
        return  data.id === 1
    }
}
```
### hook
Type: `Object`
Default: `{}`

```javascript
{
    hook: {
        dragStart() {/* something */},
        dragEnd() {/* something */}
    }
}
```

##### hook.dragStart
Type: `Function`
Default: `undefined`

节点的拖拽行为开始时会触发`option.dragStart`方法
```javascript
{
    hook: {
        dragStart(params) {
            console.log(data) // { element, key }
        }
    }
}
```

##### hook.dragEnd
Type: `Function`
Default: `undefined`

节点的拖拽行为停止并且产生了位置变化会触发`option.dragEnd`方法
```javascript
{
    hook: {
        dragEnd(params) {
            console.log(params) // { key, target, type, from, to }
        }
    }
}
```
`params.key`：代表被拖拽的节点的key

`params.target`：代表目标节点(被碰撞的节点)的key

`params.type`：可能的值有：`previous`、`next`和`child`

`params.from`和`params.to`代表了节点移动前和移动后的位置信息

##### hook.click
Type: `Function`
Default: `undefined`

节点被点击时会触发`option.click`方法
```javascript
{
    hook: {
        click(params, event) {
            console.log(params, event) // ({ element, key }, event)
        }
    }
}
```

##### hook.mouseEnter
Type: `Function`
Default: `undefined`

鼠标进入节点区域时会触发`option.mouseEnter`方法
```javascript
{
    hook: {
        mouseEnter(params, event) {
            console.log(params, event) // ({ element, key }, event)
        }
    }
}
```

##### hook.mouseLeave
Type: `Function`
Default: `undefined`

鼠标离开节点区域时会触发`option.mouseLeave`方法
```javascript
{
    hook: {
        mouseLeave(params, event) {
            console.log(params, event) // ({ element, key }, event)
        }
    }
}
```

##### hook.foldChange
Type: `Function`
Default: `undefined`

节点折叠状态变化的时候会触发`option.foldChange`
```javascript
{
    hook: {
        foldChange(nodeKey, isFold) {
            console.log(nodeKey, isFold) // ('2', true)
        }
    }
}
```

## API

#### getNodeElement

`getNodeElement(nodeKey: string): string`

根据传入的`nodeKey`获取节点对应的`element`
```javascript
chart.getNodeElement('1') // HTMLElement
```

#### getKeyByElement

`getKeyByElement(nodeElement: HTMLElement): HTMLElement`

获取`nodeElement`节点对应的`nodeKey`
```javascript
chart.getKeyByElement(document.querySelector('.tree-chart-item-1')) // nodeKey: 1
```

#### getPreviousKey

`getPreviousKey(nodeKey: string): string`

根据传入的`nodeKey`获取前一个兄弟节点的`nodeKey`
```javascript
chart.getKeyByElement('3') // nodeKey: 2
```

#### getNextKey

`getNextKey(nodeKey: string): string`

根据传入的`nodeKey`获取后一个兄弟节点的`nodeKey`
```javascript
chart.getNextKey('2') // nodeKey: 3
```

#### getParentKey

`getParentKey(nodeKey: string): string`

根据传入的`nodeKey`获取父节点的`nodeKey`
```javascript
chart.getNextKey('2') // nodeKey: 1
```

#### getChildrenKeys

`getChildrenKeys(nodeKey: string): Array<string>`

根据传入的`nodeKey`获取子节点的`nodeKey`列表，需要注意这里只返回一级子节点的`nodeKey`
```javascript
chart.getChildrenKeys('1') // nodeKeys: ['1', '2']
```

#### existChildren

`existChildren(nodeKey: string): boolean`

判断`nodeKey`对应的节点是否存在子节点
```javascript
chart.existChildren('1') // true
```

#### insertNode

`insertNode(targetKey: string, origin: string | object, type: string): void`
- targetKey
>目标节点的`nodeKey`，这个节点并不是需要移动的节点
- origin
>参数值可以是`nodeKey`或`object`，如果是`nodeKey`代表需要操作的节点，如果为`object`则会创建一个新的节点进行操作，`object`的格式应该是`option.data`的一个子项
- type
>可能的值有`child`、`previous`和`next`，分别代表作为子节点插入、作为上一个兄弟节点插入和作为下一个兄弟节点插入

可以通过`insertNode`新增节点或移动现有的节点
```javascript
chart.insertNode('1', '2', 'child') // 将key为2的节点作为1的子节点插入
chart.insertNode('1', '2', 'previous') // 将key为2的节点作为1的上一个兄弟节点插入
chart.insertNode('1', '2', 'next') // 将key为2的节点作为1的下一个兄弟节点插入

const newNodeData = {
    id: '8',
    name: 'jack',
    age: 24
}
chart.insertNode('1', newNodeData, 'child') // 为key为1的节点创建一个新的子节点
```
>注意：任何情况下都无法对根节点插入兄弟节点

#### removeNode

`removeNode(nodeKey: string): void`

删除`nodeKey`对应的节点
```javascript
chart.removeNode('3') // key为3的节点被删除
```

#### nodeIsFold

`nodeIsFold(nodeKey: string): boolean`

根据传入的`nodeKey`判断对应的节点是否被折叠
```javascript
chart.nodeIsFold('2') // false
```

#### toggleFold

`toggleFold(nodeKey: string, option?: { fold: boolean, reloadLink: boolean }): void`

`nodeKey`对应的节点会改变折叠状态：
```javascript
chart.toggleFold('2')
```
可以设置`option.fold`指定折叠状态：
```javascript
chart.toggleFold('2', { fold: true }) // 折叠nodeKey为2的节点
```
如果大量节点需要改变折叠状态，可以设置`option.reloadLink = false`和手动执行`chart.reloadLink()`提高性能：
```javascript
['1', '2', '3', '4', '5', '6'].forEach(nodeKey => {
    chart.toggleFold(nodeKey, { reloadLink: false })
})
chart.reloadLink()
```

#### reRenderNode

`reRenderNode(nodeKey: string, nodeData: object): void`

根据传入的`nodeData`对目标节点重新渲染
```javascript
const nodeData = {
    id: '2',
    name: 'jeck',
    age: 32
}
chart.reRenderNode('2', nodeData) // key为2的节点被重新渲染
```

#### reloadLink

`reloadLink(): void`

对图形中所有的连接线重新渲染
```javascript
chart.reloadLink()
```

#### reRender

`reRender(data: object): void`

使用新的数据对整个图形进行渲染，`data`的格式应该和`option.data`保持一致
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
