import './index.scss'
import FollowScroll from './follow-scroll'
import { isElement, isNumber, getArrayIntersection, applyStyle } from './utils'

export default class TreeChart {
  /*  ======== API ======== */
  getKeyByElement(nodeElement) {
    if (!isElement(nodeElement)) return null
    return nodeElement.classList.contains('tree-chart-node') ? nodeElement.getAttribute('data-key') : null
  }

  getNodeElement(key) {
    return this.elements.nodesContainer.querySelector(`.tree-chart-item-${key}`)
  }

  getPreviousSibling(id) {
    try {
      const nodeElement = this.getNodeElement(id)
      return this.getKeyByElement(nodeElement.parentElement.previousElementSibling.querySelector('.tree-chart-node'))
    } catch (e) {
      return null
    }
  }

  getNextSibling(id) {
    try {
      const nodeElement = this.getNodeElement(id)
      return this.getKeyByElement(nodeElement.parentElement.nextElementSibling.querySelector('.tree-chart-node'))
    } catch (e) {
      return null
    }
  }

  getParent(id) {
    try {
      const nodeElement = this.getNodeElement(id)
      return this.getKeyByElement(nodeElement.parentElement.parentElement.previousElementSibling)
    } catch (e) {
      return null
    }
  }

  getChildren(id) {
    const childrenKeys = this.getNodeElement(id).getAttribute('data-children')
    if (!childrenKeys) return []
    return childrenKeys.split(',')
  }

  existChildren(key) {
    const nodeElement = this.getNodeElement(key)
    if (!nodeElement) return false
    return Boolean(nodeElement.getAttribute('data-children'))
  }

  insertNode(targetKey, origin, type) {
    const { allowFold } = this.option
    const targetNode = this.getNodeElement(targetKey)
    // 限制不能给根节点添加兄弟元素
    if (/next|previous/.test(type) && targetNode === this.elements.rootNode) return

    // 处理origin部分
    // 是否需要新建节点
    const needCreateNode = /Object/.test(Object.prototype.toString.call(origin))
    let originKey = null
    let originNode = null
    let originNodeContainer = null
    if (needCreateNode) {
      originKey = origin.id
      originNode = this.createNode(origin)
      originNodeContainer = this.createNodeContainer()
      originNodeContainer.appendChild(originNode)
      this.setNodeEvent(originNode)
    } else {
      originKey = origin
      originNode = this.getNodeElement(originKey)
      originNodeContainer = originNode.parentElement
      // 修改原先节点父节点的data-children属性
      const originParentKey = this.getParent(originKey)
      this.removeChildrenKey(originParentKey, originKey)
      // 如果移动节点后原位置没有兄弟节点的话移除childrenContainer容器和展开收起按钮
      if (!this.existChildren(originParentKey)) {
        this.removeChildrenContainer(originParentKey)
        allowFold && this.removeFoldButton(originParentKey)
      }
    }

    // 处理target部分
    if (type === 'child') {
      // 本身存在子节点的情况，直接插入
      if (this.existChildren(targetKey)) {
        this.getChildrenContainer(targetKey).appendChild(originNodeContainer)
        // 如果目标节点是折叠状态，插入子节点后自动展开
        this.nodeIsFold(targetKey) && this.toggleFold(targetKey)
      } else {
        // 没有任何子节点的话创建一个容器
        const newChildrenContainer = this.createChildrenContainer()
        newChildrenContainer.appendChild(originNodeContainer)
        targetNode.parentElement.appendChild(newChildrenContainer)
        // 没有展开按钮需要新增
        this.createFoldButton(targetNode)
      }
      this.addChildrenKey(targetKey, originKey)
    } else {
      const targetParentKey = this.getParent(targetKey)
      const parentChildrenContainer = this.getChildrenContainer(targetParentKey)
      const targetNodeContainer = targetNode.parentElement
      if (type === 'previous') parentChildrenContainer.insertBefore(originNodeContainer, targetNodeContainer)
      if (type === 'next') parentChildrenContainer.insertBefore(originNodeContainer, targetNodeContainer.nextElementSibling)
      this.addChildrenKey(targetParentKey, originKey)
    }

    this.reloadLink()
  }

  remove(id) {
    const { allowFold } = this.option
    const targetNode = this.getNodeElement(id)
    if (!targetNode) return
    // 不支持移除root节点
    if (targetNode === this.elements.rootNode) return console.warn('not allow remove root node')
    // 修改父节点的data-children
    const parentNodeKey = this.getParent(id)
    this.removeChildrenKey(parentNodeKey, id)
    // 移除当前节点
    const targetNodeContainer = targetNode.parentElement
    targetNodeContainer.parentElement.removeChild(targetNodeContainer)
    // 如果当前节点是唯一的子节点就移除父节点的子容器
    if (!this.existChildren(parentNodeKey)) {
      this.removeChildrenContainer(parentNodeKey)
      allowFold && this.removeFoldButton(parentNodeKey)
    }
    this.reloadLink()
  }

  nodeIsFold(targetKey) {
    return this.getFoldButton(targetKey).classList.contains('is-fold')
  }

  toggleFold(targetKey, option) {
    const foldButton = this.getFoldButton(targetKey)
    if (!foldButton) return
    const { fold, reloadLink } = Object.assign({
      fold: undefined,
      reloadLink: true
    }, option)
    const childNodeContainer = this.getChildrenContainer(targetKey)
    const nodeIsFold = this.nodeIsFold(targetKey)
    if (typeof fold === 'boolean' && nodeIsFold === fold) return
    if (nodeIsFold) {
      childNodeContainer.classList.remove('is-hidden')
      foldButton.classList.remove('is-fold')
    } else {
      childNodeContainer.classList.add('is-hidden')
      foldButton.classList.add('is-fold')
    }
    reloadLink && this.reloadLink()

    const { foldChange } = this.hooks
    if (typeof foldChange === 'function') {
      foldChange(targetKey, this.nodeIsFold(targetKey))
    }
  }

  reRenderNode(targetKey, data) {
    const oldNodeKey = targetKey.toString()
    const newNodeKey = data.id
    const node = this.getNodeElement(oldNodeKey)
    const childrenKeys = this.getChildren(targetKey)

    // 更新key
    if (newNodeKey !== oldNodeKey) {
      const { linkContainer } = this.elements
      const parentNodeKey = this.getParent(oldNodeKey)
      // 替换父节点的children-key
      this.replaceChildrenKey(parentNodeKey, oldNodeKey, newNodeKey)
      // 替换line的类名
      const oldLineClassName = `line-${parentNodeKey}-${oldNodeKey}`
      const parentLine = linkContainer.querySelector(`.${oldLineClassName}`)
      parentLine.classList.remove(oldLineClassName)
      parentLine.classList.add(`line-${parentNodeKey}-${newNodeKey}`)
      childrenKeys.forEach(childKey => {
        const oldChildLineClassName = `line-${oldNodeKey}-${childKey}`
        const childLink = this.linkContainer.querySelector(`.${oldChildLineClassName}`)
        childLink.classList.remove(oldChildLineClassName)
        childLink.classList.add(`line-${newNodeKey}-${childKey}`)
      })
      // 更新position数据
      this.replacePositionNodeKey(oldNodeKey, newNodeKey)
    }

    // 替换节点
    const newNode = this.createNode(data)
    childrenKeys.length && newNode.setAttribute('data-children', childrenKeys.join())
    node.querySelector('.tree-chart-unfold') && this.createFoldButton(newNode)
    const nodeContainer = node.parentElement
    nodeContainer.insertBefore(newNode, node)
    nodeContainer.removeChild(node)
  }

  reloadLink() {
    this.createLink()
    this.resize()
  }

  reRender(data) {
    if (!this.dataValidate(data)) return
    const { nodesContainer } = this.elements
    // 更新nodes
    this.elements.rootNode = null
    nodesContainer.innerHTML = ''
    const nodeContainer = this.createNodeContainer()
    nodesContainer.appendChild(nodeContainer)
    this.createNodes(data, nodeContainer)
    // 更新links
    this.reloadLink()
  }

  /* ================ */

  // 需要取消注册的才使用该函数
  registerEvent(eventType, handler, eventTarget = window) {
    if (!this.eventList) this.eventList = []
    const handlerFunction = handler.bind(this)
    this.eventList.push({ eventTarget, type: eventType, handler: handlerFunction })
    eventTarget.addEventListener(eventType, handlerFunction)
  }

  unregisterEvent() {
    this.eventList.forEach(item => item.eventTarget.removeEventListener(item.type, item.handler))
  }

  addChildrenKey(targetKey, newKey) {
    const targetNodeElement = this.getNodeElement(targetKey)
    const childrenKeys = targetNodeElement.getAttribute('data-children') || ''
    targetNodeElement.setAttribute('data-children', childrenKeys ? `${childrenKeys},${newKey}` : newKey)
  }

  removeChildrenKey(targetKey, removeKey) {
    const childrenKeys = this.getChildren(targetKey)
    if (!childrenKeys.length) return
    const index = childrenKeys.indexOf(removeKey)
    index > -1 && childrenKeys.splice(index, 1)
    const targetNodeElement = this.getNodeElement(targetKey)
    if (childrenKeys.length) {
      targetNodeElement.setAttribute('data-children', childrenKeys.join())
    } else {
      targetNodeElement.removeAttribute('data-children')
    }
  }

  replaceChildrenKey(targetKey, oldKey, newKey) {
    const childrenKeys = this.getChildren(targetKey)
    if (!childrenKeys.length) return
    const index = childrenKeys.indexOf(oldKey)
    if (index === -1) return
    childrenKeys.splice(index, 1, newKey)
    this.getNodeElement(targetKey).setAttribute('data-children', childrenKeys.join())
  }

  createChildrenContainer(className) {
    const container = document.createElement('div')
    container.classList.add('tree-chart-children-container')
    className && container.classList.add(className)
    return container
  }

  getChildrenContainer(targetKey) {
    return this.getNodeElement(targetKey).nextElementSibling
  }

  removeChildrenContainer(targetKey) {
    const container = this.getChildrenContainer(targetKey)
    container.parentElement.removeChild(container)
  }

  dataValidate(data) {
    if (!data) return false
    return !!data.id
  }

  constructor(option) {
    this.initData(option)
    this.createChartElement()
    this.resize()
    this.setEvent()
  }

  initData(inputOption) {
    const option = {
      keyField: 'id', // 作为唯一ID的字段
      isVertical: true,
      distanceX: 40, // item的垂直间距，不小于40
      distanceY: 40, // item的水平间距，不小于40
      allowFold: false, // 是否能折叠
      foldNodeKeys: [], // 初始需要折叠的节点
      draggable: false, // 是否能拖拽item
      dragScroll: false, // 是否开启拖拽滚动
      autoScrollTriggerDistance: 50, // 自动触发滚动的距离
      autoScrollSpeed: 6, // 滚动速度
      line: {
        type: 'bezier',
        smooth: 50 // 光滑程度(0-100，100为直线)
      },
      hook: {},
      ...inputOption
    }
    const { padding, distanceX, distanceY } = option
    if (distanceX < 40) option.distanceX = 40
    if (distanceY < 40) option.distanceY = 40
    // draggable时候最小内边距不能小于30
    const containerPadding = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30,
      ...padding
    }
    for (const key in containerPadding) {
      let paddingValue = containerPadding[key]
      if (!isNumber(paddingValue)) paddingValue = 0
      if (option.draggable && paddingValue < 30) paddingValue = 30
      containerPadding[key] = paddingValue
    }
    this.containerPadding = containerPadding
    this.option = option
    this.elements = {
      container: null,
      ghostContainer: null,
      nodesContainer: null,
      linkContainer: null,
      rootNode: null
    }
    this.initHook()
  }

  initHook() {
    const optionHook = this.option.hook
    this.hooks = {}
    const hookList = [
      'dragStart',
      'dragEnd',
      'click',
      'mouseEnter',
      'mouseLeave',
      'foldChange'
    ]
    hookList.forEach(name => {
      const handler = optionHook[name]
      if (typeof handler === 'function') this.hooks[name] = handler
    })
  }

  createChartElement() {
    const { isVertical, container, data } = this.option
    container.classList.add('tree-chart')
    isVertical && container.classList.add('is-vertical')
    this.elements.container = container
    const nodesContainer = this.createNodesContainer()
    this.elements.nodesContainer = nodesContainer
    this.dataValidate(data) && this.createNodes(data, nodesContainer)
    this.createLinkContainer()
    this.createLink()
    this.createGhostContainer()
  }

  createNodesContainer() {
    const { containerPadding } = this
    const nodesContainer = this.createNodeContainer()
    nodesContainer.classList.add('is-nodes-container')
    for (const direct in containerPadding) {
      if (!/left|top|right|bottom/.test(direct)) continue
      const paddingValue = containerPadding[direct]
      nodesContainer.style[`padding${direct.replace(/^./, $ => $.toUpperCase())}`] = `${paddingValue}px`
    }
    this.elements.container.appendChild(nodesContainer)
    this.elements.nodesContainer = nodesContainer
    const nodeContainer = this.createNodeContainer()
    nodesContainer.append(nodeContainer)
    return nodeContainer
  }

  createNodeContainer() {
    const nodeContainer = document.createElement('div')
    nodeContainer.classList.add('tree-chart-container')
    return nodeContainer
  }

  // 数据数据结构生成节点
  createNodes(data, parentNodeContainer) {
    const { elements } = this
    const { children } = data
    const { allowFold, foldNodeKeys } = this.option
    const existChildren = Array.isArray(children) && children.length > 0

    // 创建节点
    const node = this.createNode(data)
    parentNodeContainer.appendChild(node)

    if (!elements.rootNode) elements.rootNode = node

    if (existChildren) {
      const childrenContainer = this.createChildrenContainer()
      parentNodeContainer.appendChild(childrenContainer)
      if (allowFold) {
        const foldButton = this.createFoldButton(node)
        // 节点需要初始折叠
        if (foldNodeKeys.includes(data.id)) {
          foldButton.classList.add('is-fold')
          childrenContainer.classList.add('is-hidden')
        }
      }

      const childKeys = []
      children.forEach(childData => {
        childKeys.push(childData.id)
        const childNodeContainer = this.createNodeContainer()
        childrenContainer.appendChild(childNodeContainer)
        this.createNodes(childData, childNodeContainer)
      })
      node.setAttribute('data-children', childKeys.join())
    }
  }

  createNode(data) {
    const { draggable, distanceX, distanceY, contentRender, nodeControl } = this.option

    const node = document.createElement('div')
    const key = data.id
    node.classList.add('tree-chart-node', `tree-chart-item-${key}`)
    node.setAttribute('data-key', key)
    applyStyle(node, {
      marginBottom: `${distanceY}px`,
      marginRight: `${distanceX}px`
    })

    const renderContainer = document.createElement('div')
    renderContainer.classList.add('tree-render-container')

    // 生成用户自定义模板
    if (contentRender) {
      const renderResult = contentRender(data)
      if (typeof renderResult === 'string') {
        renderContainer.innerHTML = renderResult.replace(/>\s+</g, '><')
      } else if (isElement(renderResult)) {
        renderContainer.appendChild(renderResult)
      } else {
        renderContainer.innerText = 'Please check contentRender return type is string or element'
      }
    } else {
      renderContainer.innerText = 'option.contentRender is required'
    }
    node.appendChild(renderContainer)

    // 添加节点事件
    this.setNodeEvent(node)

    // 拖拽控制
    if (draggable && nodeControl) {
      const controlConfig = {
        draggable: true,
        insertChild: true,
        insertPrevious: true,
        insertNext: true,
        ...nodeControl(data)
      }
      !controlConfig.draggable && node.classList.add('not-allow-drag')
      !controlConfig.insertChild && node.classList.add('not-allow-insert-child')
      !controlConfig.insertPrevious && node.classList.add('not-allow-insert-previous')
      !controlConfig.insertNext && node.classList.add('not-allow-insert-next')
    }

    return node
  }

  // 设置拖动镜像容器
  createGhostContainer() {
    const ghostContainer = document.createElement('div')
    ghostContainer.classList.add('tree-chart-ghost-container')
    this.elements.container.appendChild(ghostContainer)
    this.elements.ghostContainer = ghostContainer
  }

  // 创建展开收起按钮
  createFoldButton(nodeElement) {
    if (nodeElement.querySelector('.tree-chart-unfold')) return
    const button = document.createElement('div')
    button.classList.add('tree-chart-unfold')
    button.innerHTML = '<div></div><div></div>'
    nodeElement.appendChild(button)
    return button
  }

  getFoldButton(targetKey) {
    const targetNodeElement = this.getNodeElement(targetKey)
    return targetNodeElement.querySelector('.tree-chart-unfold')
  }

  removeFoldButton(targetKey) {
    const foldButton = this.getFoldButton(targetKey)
    foldButton && foldButton.parentElement.removeChild(foldButton)
  }

  createLinkContainer() {
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgElement.classList.add('tree-chart-link-container')
    this.elements.container.appendChild(svgElement)
    this.elements.linkContainer = svgElement
  }

  // 根据节点间父子关系生成连线信息，同时生成节点位置数据
  createLink() {
    const { draggable, isVertical } = this.option
    const { container, nodesContainer, linkContainer } = this.elements
    const { left: containerLeft, top: containerTop } = container.getBoundingClientRect()
    const { scrollLeft, scrollTop } = container

    linkContainer.innerHTML = ''
    draggable && this.initPositionData()

    nodesContainer.querySelectorAll('.tree-chart-node').forEach(nodeElement => {
      const childrenKeys = nodeElement.getAttribute('data-children')
      const { left: nodeLeft, right: nodeRight, top: nodeTop, bottom: nodeBottom } = nodeElement.getBoundingClientRect()
      const nodeKey = this.getKeyByElement(nodeElement)
      const childrenNodeContainer = nodeElement.nextElementSibling
      // 忽略收起状态的节点
      if (childrenKeys && !childrenNodeContainer.classList.contains('is-hidden')) {
        const from = {
          x: nodeLeft - containerLeft + scrollLeft + (isVertical ? nodeElement.offsetWidth / 2 : nodeElement.offsetWidth),
          y: nodeTop - containerTop + scrollTop + (isVertical ? nodeElement.offsetHeight : nodeElement.offsetHeight / 2),
          key: nodeKey
        }
        childrenKeys.split(',').forEach(childNodeKey => {
          const childElement = this.getNodeElement(childNodeKey)
          const { left: childElementLeft, top: childElementTop } = childElement.getBoundingClientRect()
          const { offsetWidth: childElementWidth, offsetHeight: childElementHeight } = childElement
          const to = {
            x: childElementLeft - containerLeft + scrollLeft + (isVertical ? childElementWidth / 2 : 0),
            y: childElementTop - containerTop + scrollTop + (isVertical ? 0 : childElement.offsetHeight / 2),
            key: childNodeKey
          }
          this.drawLine(from, to)
        })
      }
      draggable && this.addPositionData(nodeKey, {
        left: nodeLeft - containerLeft + scrollLeft,
        right: nodeRight - containerLeft + scrollLeft,
        top: nodeTop - containerTop + scrollTop,
        bottom: nodeBottom - containerTop + scrollTop
      })
    })
  }

  // 生成节点位置信息，方便后面的碰撞检测
  initPositionData() {
    this.positionData = {
      left: { sortList: [] },
      right: { sortList: [] },
      top: { sortList: [] },
      bottom: { sortList: [] },
      node: {}
    }
  }

  addPositionData(nodeKey, positionDataItem) {
    const { positionData } = this
    // 保存节点位置信息
    // nodeKey->{left,top,right,bottom }
    positionData.node[nodeKey] = positionDataItem
    for (const direct in positionDataItem) {
      // 获取节点方位数据值
      const positionValue = positionDataItem[direct]
      // 获取数据归类容器，形成position->[...nodeKey]的映射
      const directPositionMap = positionData[direct]
      if (directPositionMap[positionValue]) {
        directPositionMap[positionValue].push(nodeKey)
      } else {
        directPositionMap[positionValue] = [nodeKey]
      }
      // 插入排序，并去重
      // sortList->[...position]
      const sortList = directPositionMap.sortList
      if (sortList.length) {
        for (let index = 0, len = sortList.length; index < len; index++) {
          const currentValue = sortList[index]
          if (positionValue === currentValue) break
          if (positionValue < currentValue) {
            sortList.splice(index, 0, positionValue)
            break
          }
          index === len - 1 && sortList.push(positionValue)
        }
      } else {
        sortList.push(positionValue)
      }
    }
  }

  replacePositionNodeKey(oldKey, newKey) {
    const { positionData } = this
    // 更新node集合
    positionData.node[newKey] = positionData.node[oldKey]
    delete positionData.node[oldKey]
    void ['left', 'top', 'right', 'bottom'].forEach(direct => {
      const directPositionMap = positionData[direct]
      for (const positionValue in directPositionMap) {
        if (positionValue === 'sortList') continue
        const nodeKeyList = directPositionMap[positionValue]
        const oldKeyIndex = nodeKeyList.indexOf(oldKey)
        if (oldKeyIndex > -1) {
          nodeKeyList.splice(oldKeyIndex, 1, newKey)
          break
        }
      }
    })
  }

  setEvent() {
    const { draggable, allowFold, dragScroll } = this.option
    allowFold && this.setFoldEvent()
    this.setClickHook()
    draggable && this.setDragEvent()
    dragScroll && this.setDragScroll()
  }

  setFoldEvent() {
    this.elements.nodesContainer.addEventListener('click', ({ target }) => {
      if (!target.classList.contains('tree-chart-unfold')) return
      this.toggleFold(this.getKeyByElement(target.parentElement))
    })
  }

  // 两点间连线
  drawLine(from, to, isTemp) {
    const { isVertical, allowFold, line } = this.option
    const { linkContainer } = this.elements
    const { type: lineType, smooth } = line

    const lineClassName = `line-${from.key}-${to.key}`
    let link = document.querySelector(`.${lineClassName}`)
    if (!link) {
      link = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      link.classList.add(lineClassName, `line-from-${from.key}`)
      isTemp && link.classList.add('is-temp-line')
      linkContainer.appendChild(link)
    }

    let path = ''
    let { x: fromX, y: fromY } = from
    const { x: toX, y: toY } = to
    // 需要加上fold按钮的宽度
    if (allowFold && this.existChildren(from.key)) isVertical ? fromY += 5 : fromX += 5
    const centerX = (toX - fromX) / 2
    const centerY = (toY - fromY) / 2
    const M = `${fromX} ${fromY}`
    const T = `${toX} ${toY}`

    if (lineType === 'straight') path = `M${M} T ${T}`
    if (lineType === 'broken') {
      let L1 = ''
      let L2 = ''
      if (isVertical) {
        L1 = `${fromX} ${fromY + centerY}`
        L2 = `${toX} ${toY - centerY}`
      } else {
        L1 = `${fromX + centerX} ${fromY}`
        L2 = `${toX - centerX} ${toY}`
      }
      path = `M${M} L${L1} L${L2} L${T}`
    }
    if (lineType === 'bezier') {
      const smoothScale = smooth / 100
      let Q1 = ''
      if (isVertical) {
        Q1 = `${fromX} ${fromY + (centerY - centerY * smoothScale)}`
      } else {
        Q1 = `${fromX + (centerX - centerX * smoothScale)} ${fromY}`
      }
      const Q2 = `${fromX + centerX} ${fromY + centerY}`
      path = `M${M} Q${Q1} ${Q2} T ${T}`
    }

    link.setAttribute('d', path)
  }

  // 沿着事件触发路径向上找node节点
  getCurrentEventNode(eventTarget) {
    const { nodesContainer } = this.elements
    // 忽略展开按钮
    if (eventTarget.classList.contains('tree-chart-unfold')) return null
    let searchElement = eventTarget
    while (nodesContainer !== searchElement) {
      if (searchElement.classList.contains('tree-chart-node')) return searchElement
      searchElement = searchElement.parentElement
    }
    return null
  }

  // 判断是否处于拖动过程
  isDragging() {
    const { dragData } = this
    const { draggable } = this.option
    if (!draggable) return false
    const { ghostTranslateX, ghostTranslateY, key } = dragData
    return key && (ghostTranslateX !== 0 || ghostTranslateY !== 0)
  }

  setClickHook() {
    const { nodesContainer } = this.elements
    const { click: clickHook } = this.hooks
    if (!clickHook) return
    // 用mouseEvent来实现click主要是为了区别dragStart和click的行为
    let mouseDownNode = null
    nodesContainer.addEventListener('mousedown', ({ button, target }) => {
      if (button !== 0) return
      mouseDownNode = this.getCurrentEventNode(target)
    })
    nodesContainer.addEventListener('mouseup', e => {
      const { button, target } = e
      if (button !== 0) return
      const mouseUpNode = this.getCurrentEventNode(target)
      if (mouseUpNode && mouseUpNode === mouseDownNode && !this.isDragging()) {
        clickHook({ key: this.getKeyByElement(mouseUpNode), element: mouseUpNode }, e)
      }
    })
  }

  setNodeEvent(node) {
    const { mouseEnter: enterHook, mouseLeave: leaveHook } = this.hooks
    const argumentData = { key: this.getKeyByElement(node), element: node }
    const contentElement = node.querySelector('.tree-render-container')
    enterHook && contentElement.addEventListener('mouseenter', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      enterHook(argumentData, e)
    })
    leaveHook && contentElement.addEventListener('mouseleave', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      leaveHook(argumentData, e)
    })
  }

  createNodeParams(nodeKey) {
    return {
      key: nodeKey,
      parentKey: this.getParent(nodeKey),
      previousKey: this.getPreviousSibling(nodeKey),
      nextKey: this.getNextSibling(nodeKey)
    }
  }

  initDragData() {
    this.dragData = {
      key: null,
      ghostElement: null,
      ghostTranslateX: 0,
      ghostTranslateY: 0,
      // mousedown事件在节点的触发的偏移位置
      mouseDownOffsetX: 0,
      mouseDownOffsetY: 0
    }
  }

  // 绑定拖动事件
  setDragEvent() {
    const { autoScrollTriggerDistance, autoScrollSpeed, preventDrag } = this.option
    const { container, nodesContainer, ghostContainer } = this.elements
    const { dragStart, dragEnd } = this.hooks
    // 是否触发dragStart事件
    let emitDragStart = true

    this.initDragData()

    nodesContainer.addEventListener('mousedown', e => {
      const { button, clientX, clientY } = e
      if (button !== 0) return
      const dragNode = this.getCurrentEventNode(e.target)
      const dragNodeKey = this.getKeyByElement(dragNode)

      // 根节点不允许拖动
      if (!dragNode || dragNode === this.elements.rootNode) return
      // 用户禁止拖动的节点
      if (dragNode.classList.contains('not-allow-drag')) return
      // preventDrag返回true时阻止拖动
      if (preventDrag && preventDrag({ key: dragNodeKey, element: dragNode }, e)) return

      // 保存偏移量等
      const { left: nodePositionLeft, top: nodePositionTop } = this.positionData.node[dragNodeKey]
      const ghostElement = dragNode.cloneNode(true)
      ghostElement.style.margin = '0px'
      Object.assign(this.dragData, {
        key: dragNodeKey,
        ghostElement,
        mouseDownOffsetX: clientX + container.scrollLeft - nodePositionLeft,
        mouseDownOffsetY: clientY + container.scrollTop - nodePositionTop
      })

      // 跟随滚动
      this.FollowScroll.start(ghostElement)
    })

    nodesContainer.addEventListener('mousemove', e => {
      const { button, movementX, movementY, clientX, clientY, currentTarget } = e
      const { ghostElement, mouseDownOffsetX, mouseDownOffsetY, key } = this.dragData

      if (button !== 0 || !key) return
      // 处理Chrome76版本长按不移动也会触发的情况
      if (movementX === 0 && movementY === 0) return

      // 清除文字选择对拖动的影响
      getSelection && getSelection().removeAllRanges()
      // 光标形状变为move
      currentTarget.classList.add('cursor-move')
      // 添加镜像元素和同步位置
      !ghostContainer.contains(ghostElement) && ghostContainer.appendChild(ghostElement)
      const ghostTranslateX = clientX + container.scrollLeft - mouseDownOffsetX
      const ghostTranslateY = clientY + container.scrollTop - mouseDownOffsetY
      ghostElement.style.transform = `translate(${ghostTranslateX}px, ${ghostTranslateY}px)`
      Object.assign(this.dragData, {
        ghostTranslateX,
        ghostTranslateY
      })
      const ghostPosition = this.getGhostPosition()
      this.setDragEffect(ghostPosition)
      // 跟随滚动
      if (dragStart && emitDragStart) {
        emitDragStart = false
        dragStart({ key, element: this.getNodeElement(key) })
      }
    })

    this.registerEvent('mouseup', () => {
      emitDragStart = true
      const { key: dragKey } = this.dragData
      if (!dragKey) return

      let targetKey = ''
      let type = ''

      const targetNode = nodesContainer.querySelector('.collide-node')
      if (targetNode) {
        targetKey = this.getKeyByElement(targetNode)
        if (targetNode.classList.contains('become-previous')) type = 'previous'
        if (targetNode.classList.contains('become-next')) type = 'next'
        if (targetNode.classList.contains('become-child')) type = 'child'
      }

      // 停止拖动，移除拖动效果
      this.FollowScroll.stop()
      nodesContainer.classList.remove('cursor-move')
      ghostContainer.innerHTML = ''
      this.removeDragEffect()
      this.initDragData()

      if (targetNode) {
        const from = this.createNodeParams(dragKey)
        this.insertNode(targetKey, dragKey, type)
        const to = this.createNodeParams(dragKey)
        // emit dragEndHook
        dragEnd && dragEnd({ from, to, target: targetKey, key: dragKey, type })
      }
    })

    // 处理拖拽过程中滚动的情况
    const oldScroll = {
      top: container.scrollTop,
      left: container.scrollLeft
    }
    this.registerEvent('scroll', ({ target }) => {
      const { key, ghostElement, ghostTranslateY: oldTranslateY, ghostTranslateX: oldTranslateX } = this.dragData
      const { left: oldScrollLeft, top: oldScrollTop } = oldScroll
      const { scrollLeft: currentScrollLeft, scrollTop: currentScrollTop } = target

      if (key && ghostElement) {
        const ghostTranslateX = oldTranslateX + currentScrollLeft - oldScrollLeft
        const ghostTranslateY = oldTranslateY + currentScrollTop - oldScrollTop
        ghostElement.style.transform = `translate(${ghostTranslateX}px, ${ghostTranslateY}px)`
        Object.assign(this.dragData, { ghostTranslateX, ghostTranslateY })
        this.setDragEffect(this.getGhostPosition())
      }
      oldScroll.left = currentScrollLeft
      oldScroll.top = currentScrollTop
    }, container)

    this.FollowScroll = new FollowScroll({
      scrollContainer: container,
      autoScrollTriggerDistance,
      eventContainer: nodesContainer,
      autoScrollSpeed
    })
  }

  getGhostPosition() {
    const { ghostTranslateX, ghostTranslateY, ghostElement } = this.dragData
    return {
      left: ghostTranslateX,
      top: ghostTranslateY,
      right: ghostTranslateX + ghostElement.offsetWidth,
      bottom: ghostTranslateY + ghostElement.offsetHeight
    }
  }

  removeDragEffect() {
    const { nodesContainer, linkContainer } = this.elements
    const tempLink = linkContainer.querySelector('.is-temp-line')
    tempLink && linkContainer.removeChild(tempLink)
    const collideNode = nodesContainer.querySelector('.collide-node')
    collideNode && collideNode.classList.remove('collide-node', 'become-previous', 'become-next', 'become-child')
    const tempChildrenContainer = nodesContainer.querySelector('.temp-children-container')
    tempChildrenContainer && tempChildrenContainer.parentElement.removeChild(tempChildrenContainer)
    const notAllowEffect = nodesContainer.querySelector('.show-not-allow')
    notAllowEffect && notAllowEffect.classList.remove('show-not-allow')
  }

  getCollideType(collideNodeKey, ghostPosition) {
    const { dragData, positionData } = this
    const { isVertical } = this.option
    const { rootNode } = this.elements
    const { key: dragNodeKey } = dragData

    const { top: collideNodeTop, bottom: collideNodeBottom, left: collideNodeLeft, right: collideNodeRight } = positionData.node[collideNodeKey]
    const { left: ghostLeft, right: ghostRight, top: ghostTop, bottom: ghostBottom } = ghostPosition

    const dragNode = this.getNodeElement(dragNodeKey)
    const collideNode = this.getNodeElement(collideNodeKey)

    // 拖到父节点时只能作为兄弟节点插入
    const coverIsParent = collideNodeKey === this.getParent(dragNodeKey)
    // 禁止插入到上一个兄弟节点的下面
    const coverIsPrevious = collideNodeKey === this.getPreviousSibling(dragNodeKey)
    // 禁止插入到下一个兄弟节点的上面
    const coverIsNext = collideNodeKey === this.getNextSibling(dragNodeKey)
    // 权限数据
    const allowConfig = {
      child: !collideNode.classList.contains('not-allow-insert-child') && !coverIsParent,
      next: !collideNode.classList.contains('not-allow-insert-next') && !coverIsPrevious,
      previous: !collideNode.classList.contains('not-allow-insert-previous') && !coverIsNext
    }

    // 如果被覆盖的是根节点的话只允许作为子节点插入
    if (collideNode === rootNode) return allowConfig.child ? 'child' : 'notAllow'
    // 不可拖到子节点上
    if (dragNode.parentElement.contains(collideNode)) return 'notAllow'

    if (isVertical) {
      // 位置偏左或者偏右(50%)则认为是添加兄弟节点
      const offsetValue = (collideNodeRight - collideNodeLeft) * 0.5
      const leftPositionValue = collideNodeLeft + offsetValue
      const rightPositionValue = collideNodeRight - offsetValue
      // 在左边插入
      if (ghostRight <= leftPositionValue && allowConfig.previous) return 'previous'
      // 在右边插入
      if (ghostLeft >= rightPositionValue && allowConfig.next) return 'next'
    } else {
      // 位置偏上或者偏下(50%)则认为是添加兄弟节点
      const offsetValue = (collideNodeBottom - collideNodeTop) * 0.5
      const topPositionValue = collideNodeTop + offsetValue
      const bottomPositionValue = collideNodeBottom - offsetValue
      // 在上方插入
      if (ghostBottom <= topPositionValue && allowConfig.previous) return 'previous'
      // 在下方插入
      if (ghostTop >= bottomPositionValue && allowConfig.next) return 'next'
    }
    // 作为子节点插入
    if (allowConfig.child) return 'child'

    // 不满足自定义控制条件的按照child=>next=>previous的权重取一个
    for (const key in allowConfig) {
      if (allowConfig[key]) return key
    }
    return 'notAllow'
  }

  getCollideLinePosition(collideType, collideNodeKey) {
    const { positionData } = this
    const { isVertical, distanceX, distanceY } = this.option
    const linPositionData = {}
    const { top: collideNodeTop, bottom: collideNodeBottom, left: collideNodeLeft, right: collideNodeRight } = positionData.node[collideNodeKey]
    if (isVertical) {
      // 插入子节点类型
      if (collideType === 'child') {
        linPositionData.from = {
          x: (collideNodeLeft + collideNodeRight) / 2,
          y: collideNodeBottom,
          key: collideNodeKey
        }
        // 有子节点并且子节点展开
        if (this.existChildren(collideNodeKey) && !this.nodeIsFold(collideNodeKey)) {
          const lastChildrenNodeKey = this.getChildren(collideNodeKey).pop()
          const { right: lastChildrenNodeRight, top: lastChildrenNodeTop } = positionData.node[lastChildrenNodeKey]
          linPositionData.to = {
            x: lastChildrenNodeRight + 20,
            y: lastChildrenNodeTop,
            key: 'temp'
          }
          return linPositionData
        }
        // 没有子节点和子节点折叠相同处理
        linPositionData.to = {
          x: (collideNodeLeft + collideNodeRight) / 2,
          y: collideNodeBottom + distanceY,
          key: 'temp'
        }
        return linPositionData
      }
      const parentNodeKey = this.getParent(collideNodeKey)
      const parentPosition = positionData.node[parentNodeKey]
      linPositionData.from = {
        x: (parentPosition.left + parentPosition.right) / 2,
        y: parentPosition.bottom,
        key: parentNodeKey
      }
      linPositionData.to = {
        x: collideType === 'previous' ? collideNodeLeft - 20 : collideNodeRight + 20,
        y: collideNodeTop,
        key: 'temp'
      }
      return linPositionData
    }
    // 插入子节点类型
    if (collideType === 'child') {
      linPositionData.from = {
        x: collideNodeRight,
        y: (collideNodeTop + collideNodeBottom) / 2,
        key: collideNodeKey
      }
      // 有子节点并且子节点展开
      if (this.existChildren(collideNodeKey) && !this.nodeIsFold(collideNodeKey)) {
        const lastChildrenNodeKey = this.getChildren(collideNodeKey).pop()
        const { left: lastChildrenNodeLeft, bottom: lastChildrenNodeBottom } = positionData.node[lastChildrenNodeKey]
        linPositionData.to = {
          x: lastChildrenNodeLeft,
          y: lastChildrenNodeBottom + 20,
          key: 'temp'
        }
        return linPositionData
      }
      // 没有子节点和子节点折叠相同处理
      linPositionData.to = {
        x: collideNodeRight + distanceX,
        y: (collideNodeTop + collideNodeBottom) / 2,
        key: 'temp'
      }
      return linPositionData
    }
    const parentNodeKey = this.getParent(collideNodeKey)
    const parentPosition = positionData.node[parentNodeKey]
    linPositionData.from = {
      x: parentPosition.right,
      y: (parentPosition.top + parentPosition.bottom) / 2,
      key: parentNodeKey
    }
    linPositionData.to = {
      x: collideNodeLeft,
      y: collideType === 'previous' ? collideNodeTop - 20 : collideNodeBottom + 20,
      key: 'temp'
    }
    return linPositionData
  }

  // 生成拖动效果
  createDragEffect(collideNodeKey, ghostPosition) {
    const { positionData } = this
    const collideNode = this.getNodeElement(collideNodeKey)
    const collideType = this.getCollideType(collideNodeKey, ghostPosition)
    if (collideType === 'notAllow') return collideNode.classList.add('show-not-allow')
    collideNode.classList.add(`become-${collideType}`, 'collide-node')
    const { from, to } = this.getCollideLinePosition(collideType, collideNodeKey)
    this.drawLine(from, to, true)
    // 插入子节点类型：不存在子节点，或者子节点被收起，这时候需要创建临时节点
    if (collideType === 'child' && (!this.existChildren(collideNodeKey) || this.nodeIsFold(collideNodeKey))) {
      const { top: collideNodeTop, bottom: collideNodeBottom, left: collideNodeLeft, right: collideNodeRight } = positionData.node[collideNodeKey]
      const chartContent = document.createElement('div')
      chartContent.classList.add('tree-chart-node')
      applyStyle(chartContent, {
        width: `${collideNodeRight - collideNodeLeft}px`,
        height: `${collideNodeBottom - collideNodeTop}px`
      })
      const childrenContainer = this.createChildrenContainer('temp-children-container')
      const chartContainer = this.createNodeContainer(true)
      chartContainer.appendChild(chartContent)
      childrenContainer.appendChild(chartContainer)
      const collideNodeParent = collideNode.parentElement
      if (collideNode.nextElementSibling) {
        collideNodeParent.insertBefore(childrenContainer, collideNode.nextElementSibling)
      } else {
        collideNodeParent.appendChild(childrenContainer)
      }
    }
  }

  // 获取拖动过程中碰撞的元素
  getCollideNode({ left: ghostLeft, right: ghostRight, top: ghostTop, bottom: ghostBottom }) {
    const { key: draggingKey } = this.dragData
    const {
      left: positionLeft,
      right: positionRight,
      top: positionTop,
      bottom: positionBottom,
      node: nodePosition
    } = this.positionData

    // 寻找符合条件最近的位置
    const searchCurrentPosition = (target, sortList, searchLarge) => {
      const listLen = sortList.length
      if (searchLarge) {
        for (let i = 0; i < listLen; i++) {
          if (sortList[i] >= target) return sortList[i]
        }
      } else {
        for (let i = listLen - 1; i > -1; i--) {
          if (sortList[i] <= target) return sortList[i]
        }
      }
      return null
    }
    const currentLeft = searchCurrentPosition(ghostLeft, positionRight.sortList, true)
    const currentTop = searchCurrentPosition(ghostTop, positionBottom.sortList, true)
    const currentRight = searchCurrentPosition(ghostRight, positionLeft.sortList)
    const currentBottom = searchCurrentPosition(ghostBottom, positionTop.sortList)

    // 寻找交叉范围内的节点
    const getRangeList = (markValue, directPositionList, searchLarge) => {
      let result = []
      isNumber(markValue) && directPositionList.sortList.forEach(positionValue => {
        if (searchLarge ? positionValue >= markValue : positionValue <= markValue) {
          result = result.concat(directPositionList[positionValue])
        }
      })
      return result
    }
    // 根据ghost节点左边界和上边界求交集确定在右下方的元素
    const leftCatchNodes = getRangeList(currentLeft, positionRight, true)
    const topCatchNodes = getRangeList(currentTop, positionBottom, true)
    // 根据ghost节点右边界和下边界求交集确定在左上方的元素
    const rightCatchNodes = getRangeList(currentRight, positionLeft)
    const bottomCatchNodes = getRangeList(currentBottom, positionTop)

    // 四个区间求交集确定目标元素
    const collideNodes = getArrayIntersection(leftCatchNodes, topCatchNodes, rightCatchNodes, bottomCatchNodes)
    // 忽略自身
    const draggingNodeIndex = collideNodes.indexOf(draggingKey)
    draggingNodeIndex > -1 && collideNodes.splice(draggingNodeIndex, 1)

    if (!collideNodes.length) return null
    if (collideNodes.length === 1) return collideNodes[0]

    // 如果存在多个被覆盖的节点需要根据覆盖面积决策，取覆盖面最大的节点
    const maxAreaNode = { nodeKey: '', nodeArea: 0 }
    const getArea = nodeKey => {
      const { left: nodeLeft, right: nodeRight, top: nodeTop, bottom: nodeBottom } = nodePosition[nodeKey]
      const x = nodeLeft <= ghostLeft ? nodeRight - ghostLeft : ghostRight - nodeLeft
      const y = nodeTop <= ghostTop ? nodeBottom - ghostTop : ghostBottom - nodeTop
      return x * y
    }
    collideNodes.forEach(nodeKey => {
      const nodeArea = getArea(nodeKey)
      nodeArea > maxAreaNode.nodeArea && Object.assign(maxAreaNode, { nodeKey, nodeArea })
    })
    return maxAreaNode.nodeKey
  }

  setDragEffect(ghostElementPosition) {
    this.removeDragEffect()
    const collideNodeKey = this.getCollideNode(ghostElementPosition)
    collideNodeKey && this.createDragEffect(collideNodeKey, ghostElementPosition)
  }

  resize() {
    const { draggable, isVertical } = this.option
    const { rootNode, nodesContainer, ghostContainer, linkContainer } = this.elements
    if (!rootNode) return

    // 需要先清除旧的尺寸
    applyStyle(nodesContainer, {
      height: 'auto',
      width: 'auto',
      minHeight: 'auto',
      minWidth: 'auto'
    })

    const { clientWidth: nodeContainerWidth, clientHeight: nodeContainerHeight } = nodesContainer
    let width = nodeContainerWidth
    let height = nodeContainerHeight

    // 可拖拽时需要扩展宽度或高度，这样才能插入新节点
    if (draggable) {
      const { width: rootNodeWidth, height: rootNodeHeight } = rootNode.getBoundingClientRect()
      if (isVertical) {
        height += rootNodeHeight
      } else {
        width += rootNodeWidth
      }
    }

    const newWidth = `${width}px`
    const newHeight = `${height}px`

    applyStyle(nodesContainer, {
      height: newHeight,
      width: newWidth,
      minHeight: '100%',
      minWidth: '100%'
    })
    applyStyle(linkContainer, {
      height: newHeight,
      width: newWidth
    })
    draggable && applyStyle(ghostContainer, {
      height: newHeight,
      width: newWidth
    })
  }

  setDragScroll() {
    const { nodesContainer, container } = this.elements
    let lock = true

    const getEventNode = target => {
      if (target.classList.contains('tree-chart-node')) return target
      let searchElement = target
      while (nodesContainer !== searchElement) {
        if (searchElement.classList.contains('tree-chart-node')) return searchElement
        searchElement = searchElement.parentElement
      }
      return null
    }

    nodesContainer.addEventListener('mousedown', e => {
      if (e.button !== 0 || getEventNode(e.target)) return
      container.classList.add('drag-scroll-start')
      lock = false
    })
    nodesContainer.addEventListener('mousemove', e => {
      e.preventDefault()
      if (e.button !== 0 || lock) return
      container.scrollLeft = container.scrollLeft - e.movementX
      container.scrollTop = container.scrollTop - e.movementY
      !container.classList.contains('drag-scroll-move') && container.classList.add('drag-scroll-move')
    })
    this.registerEvent('mouseup', e => {
      if (e.button !== 0) return
      container.classList.remove('drag-scroll-start', 'drag-scroll-move')
      lock = true
    })
  }

  destroy() {
    this.FollowScroll.destroy()
    this.unregisterEvent()
    this.elements.container.innerHTML = ''
    for (const key in this) {
      this[key] = null
    }
  }
}
