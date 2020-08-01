import './index.scss'

const isElement = data => /HTML/.test(Object.prototype.toString.call(data)) && data.nodeType === 1
const isNumber = data => /Number/.test(Object.prototype.toString.call(data))
const childrenIsFold = node => Boolean(node.querySelector('.is-fold'))
const setNotAllowEffect = node => node.classList.add('show-not-allow')

class TreeChart {
  /* API */
  getKeyByElement(nodeElement) {
    if (!isElement(nodeElement)) return null
    return nodeElement.classList.contains('tree-chart-node') ? nodeElement.getAttribute('data-key') : null
  }

  getNodeElement(key) {
    return this.nodesContainer.querySelector(`.tree-chart-item-${key}`)
  }

  getPreviousKey(target) {
    return this.getKeyByElement(this.getPreviousNode(target))
  }

  getNextKey(target) {
    return this.getKeyByElement(this.getNextNode(target))
  }

  getParentKey(key) {
    return this.getKeyByElement(this.getParentNodeElement(key))
  }

  getChildrenKeys(key) {
    const childrenKeys = this.getNodeElement(key).getAttribute('data-children')
    if (!childrenKeys) return []
    return childrenKeys.split(',')
  }

  existChildren(key) {
    const nodeElement = this.getNodeElement(key)
    if (!nodeElement) return false
    return Boolean(nodeElement.getAttribute('data-children'))
  }

  insertNode(targetKey, origin, type, unReloadLink) {
    const targetNode = this.getNodeElement(targetKey)
    // 限制不能给根节点添加兄弟元素
    if (/next|previous/.test(type) && targetNode === this.rootNode) return

    // 处理origin部分
    // 是否需要新建节点
    const needCreateNode = /Object/.test(Object.prototype.toString.call(origin))
    let originKey = null
    let originNode = null
    let originNodeContainer = null
    if (needCreateNode) {
      originKey = this.getKeyField(origin)
      originNode = this.createNode(origin)
      originNodeContainer = this.createNodeContainer()
      originNodeContainer.appendChild(originNode)
      this.setNodeEvent(originNode)
    } else {
      originKey = origin
      originNode = this.getNodeElement(originKey)
      originNodeContainer = originNode.parentElement
      // 修改原先节点父节点的data-children属性
      const originParentKey = this.getParentKey(originKey)
      this.removeChildrenKey(originParentKey, originKey)
      // 如果移动节点后原位置没有兄弟节点的话移除childrenContainer容器和展开收起按钮
      if (!this.existChildren(originParentKey)) {
        this.removeChildrenContainer(originParentKey)
        this.allowFold && this.removeFoldButton(originParentKey)
      }
    }

    // 处理target部分
    if (type === 'child') {
      // 本身存在子节点的情况，直接插入
      if (this.existChildren(targetKey)) {
        this.getChildrenContainer(targetKey).appendChild(originNodeContainer)
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
      const targetParentKey = this.getParentKey(targetKey)
      const parentChildrenContainer = this.getChildrenContainer(targetParentKey)
      const targetNodeContainer = targetNode.parentElement
      if (type === 'previous') parentChildrenContainer.insertBefore(originNodeContainer, targetNodeContainer)
      if (type === 'next') parentChildrenContainer.insertBefore(originNodeContainer, targetNodeContainer.nextElementSibling)
      this.addChildrenKey(targetParentKey, originKey)
    }

    !unReloadLink && this.reloadLink()
  }

  removeNode(targetKey) {
    const targetNode = this.getNodeElement(targetKey)
    if (!targetNode) return
    // 不支持移除root节点
    if (targetNode === this.rootNode) return console.warn('not allow remove root node')
    // 修改父节点的data-children
    const parentNodeKey = this.getParentKey(targetKey)
    this.removeChildrenKey(parentNodeKey, targetKey)
    // 移除当前节点
    const targetNodeContainer = targetNode.parentElement
    targetNodeContainer.parentElement.removeChild(targetNodeContainer)
    // 如果当前节点是唯一的子节点就移除父节点的子容器
    if (!this.existChildren(parentNodeKey)) {
      this.removeChildrenContainer(parentNodeKey)
      this.allowFold && this.removeFoldButton(parentNodeKey)
    }
    this.reloadLink()
  }

  nodeIsFold(targetKey) {
    return this.getFoldButton(targetKey).classList.contains('is-fold')
  }

  reRenderNode(targetKey, data) {
    const oldNodeKey = targetKey.toString()
    const newNodeKey = this.getKeyField(data)
    const node = this.getNodeElement(oldNodeKey)
    const childrenKeys = this.getChildrenKeys(targetKey)

    // 更新key
    if (newNodeKey !== oldNodeKey) {
      const { linkContainer } = this
      const parentNodeKey = this.getParentKey(oldNodeKey)
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
    const { nodesContainer } = this
    // 更新nodes
    nodesContainer.innerHTML = ''
    const nodeContainer = this.createNodeContainer()
    nodesContainer.appendChild(nodeContainer)
    this.createNodes(data, nodeContainer, true)
    // 更新links
    this.reloadLink()
  }

  /* == */

  addChildrenKey(targetKey, newKey) {
    const targetNodeElement = this.getNodeElement(targetKey)
    const childrenKeys = targetNodeElement.getAttribute('data-children') || ''
    targetNodeElement.setAttribute('data-children', childrenKeys ? `${childrenKeys},${newKey}` : newKey)
  }

  removeChildrenKey(targetKey, removeKey) {
    const childrenKeys = this.getChildrenKeys(targetKey)
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
    const childrenKeys = this.getChildrenKeys(targetKey)
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
    container.style.marginLeft = `${this.option.distanceX}px`
    return container
  }

  getChildrenContainer(targetKey) {
    return this.getNodeElement(targetKey).nextElementSibling
  }

  removeChildrenContainer(targetKey) {
    const container = this.getChildrenContainer(targetKey)
    container.parentElement.removeChild(container)
  }

  getParentNodeElement(key) {
    const currentNodeElement = this.getNodeElement(key)
    const nodeContainerElement = currentNodeElement.parentElement
    if (!nodeContainerElement) return null
    const parentNodeChildrenElement = nodeContainerElement.parentElement
    if (!parentNodeChildrenElement) return null
    const parentNodeElement = parentNodeChildrenElement.previousElementSibling
    if (!parentNodeElement) return null
    return parentNodeElement
  }

  getKeyField(data) {
    return data[this.option.keyField].toString() || null
  }

  constructor(option) {
    this.mergeOption(option)
    this.createChartElement()
    this.resize()
    this.setEvent()
  }

  mergeOption(data) {
    const option = {
      keyField: 'id', // 作为唯一ID的字段
      distanceX: 60, // item的垂直间距
      distanceY: 60, // item的水平间距
      draggable: false, // 是否能拖拽item
      allowFold: false, // 是否能折叠
      dragScroll: false, // 是否开启拖拽滚动
      scrollTriggerDistance: 50, // 触发滚动的距离
      smooth: 50, // 光滑程度(0-100，100为直线)
      scrollSpeed: 8, // 滚动速度
      extendSpace: 0, // 实际内容之外的扩展距离(目前只支持水平方向)
      ...data
    }
    option.padding = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30,
      ...option.padding
    }
    const { draggable, allowFold, dragScroll } = option
    this.draggable = draggable
    this.allowFold = allowFold
    this.dragScroll = dragScroll
    this.option = option
    this.initHooks()
  }

  initHooks() {
    const controlHooks = [
      'dragControl',
      'preventDrag'
    ]
    const eventHooks = [
      'dragStart',
      'dragEnd',
      'click',
      'mouseEnter',
      'mouseLeave'
    ]
    const hookList = ['contentRender', ...controlHooks, ...eventHooks]
    this.hooks = {}
    hookList.forEach(name => {
      const handler = this.option[name]
      if (typeof handler === 'function') this.hooks[name] = handler
    })
  }

  createChartElement() {
    const { container, data } = this.option
    container.classList.add('tree-chart')
    this.container = container
    this.createNodes(data, this.createNodesContainer())
    this.createLinkContainer()
    this.createLink()
    this.createGhostContainer()
  }

  createNodesContainer() {
    const { option, container } = this
    const { padding } = option
    const nodesContainer = this.createNodeContainer()
    nodesContainer.classList.add('is-nodes-container')
    for (const key in padding) {
      if (/left|top|right|bottom/.test(key)) {
        let value = padding[key]
        if (!isNumber(value) || value < 0) continue
        if (this.draggable && /top|bottom/.test(key) && value < 30) value = 30
        nodesContainer.style[`padding${key.replace(/^./, $ => $.toUpperCase())}`] = `${value}px`
      }
    }
    container.appendChild(nodesContainer)
    this.nodesContainer = nodesContainer
    const nodeContainer = this.createNodeContainer()
    nodesContainer.append(nodeContainer)
    return nodeContainer
  }

  createNodeContainer() {
    const { distanceY } = this.option
    const nodeContainer = document.createElement('div')
    nodeContainer.classList.add('tree-chart-container')
    nodeContainer.style.marginBottom = `${distanceY}px`
    return nodeContainer
  }

  // 数据数据结构生成节点
  createNodes(data, parentNodeContainer, reRender) {
    const { allowFold, rootNode } = this
    const { children } = data
    const existChildren = Array.isArray(children) && children.length > 0

    // 创建节点
    const node = this.createNode(data)
    allowFold && existChildren && this.createFoldButton(node)
    parentNodeContainer.appendChild(node)

    // 初始化或重新渲染的时候
    if (!rootNode || reRender) this.rootNode = node

    if (existChildren) {
      const childKeys = []
      const childrenContainer = this.createChildrenContainer()
      children.forEach(childData => {
        childKeys.push(this.getKeyField(childData))
        const childNodeContainer = this.createNodeContainer()
        childrenContainer.appendChild(childNodeContainer)
        this.createNodes(childData, childNodeContainer)
      })
      node.setAttribute('data-children', childKeys.join())
      parentNodeContainer.appendChild(childrenContainer)
    }
  }

  createNode(data) {
    const node = document.createElement('div')
    const key = this.getKeyField(data)
    node.classList.add('tree-chart-node', `tree-chart-item-${key}`)
    node.setAttribute('data-key', key)

    const renderContainer = document.createElement('div')
    renderContainer.classList.add('tree-render-container')

    // 生成用户自定义模板
    if (this.hooks.contentRender) {
      const renderResult = this.hooks.contentRender(data)
      if (typeof renderResult === 'string') {
        renderContainer.innerHTML = renderResult.replace(/>\s+</g, '><')
      } else if (isElement(renderResult)) {
        renderContainer.appendChild(renderResult)
      } else {
        renderContainer.innerText = 'Please check contentRender return type is string or element'
      }
    } else {
      renderContainer.innerText = 'Please set contentRender function'
    }
    node.appendChild(renderContainer)

    // 添加节点事件
    this.setNodeEvent(node)

    // 拖拽控制
    if (this.draggable && this.hooks.dragControl) {
      const controlConfig = Object.assign({
        drag: true,
        insertChild: true,
        insertPrevious: true,
        insertNext: true
      }, this.hooks.dragControl(data))
      !controlConfig.drag && node.classList.add('not-allow-drag')
      !controlConfig.insertChild && node.classList.add('not-allow-insert-child')
      !controlConfig.insertPrevious && node.classList.add('not-allow-insert-previous')
      !controlConfig.insertNext && node.classList.add('not-allow-insert-next')
    }

    return node
  }

  // 设置拖动镜像容器
  createGhostContainer() {
    const { container } = this
    const ghostContainer = document.createElement('div')
    ghostContainer.classList.add('tree-chart-ghost-container')
    container.appendChild(ghostContainer)
    this.ghostContainer = ghostContainer
  }

  // 创建展开收起按钮
  createFoldButton(nodeElement) {
    if (nodeElement.querySelector('.tree-chart-unfold')) return
    const button = document.createElement('div')
    button.classList.add('tree-chart-unfold')
    button.innerHTML = '<div></div><div></div>'
    nodeElement.appendChild(button)
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
    const { container } = this
    const linkContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    linkContainer.classList.add('tree-chart-link-container')
    container.appendChild(linkContainer)
    this.linkContainer = linkContainer
  }

  // 根据节点间父子关系生成连线信息，同时生成节点位置数据
  createLink() {
    const { container, nodesContainer, linkContainer, draggable } = this
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
          x: nodeLeft - containerLeft + nodeElement.offsetWidth + scrollLeft,
          y: nodeTop - containerTop + nodeElement.offsetHeight / 2 + scrollTop,
          key: nodeKey
        }
        childrenKeys.split(',').forEach(childNodeKey => {
          const childrenElement = this.getNodeElement(childNodeKey)
          const childrenLayout = childrenElement.getBoundingClientRect()
          const to = {
            x: childrenLayout.left - containerLeft + scrollLeft,
            y: childrenLayout.top - containerTop + childrenElement.offsetHeight / 2 + scrollTop,
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
    const { allowFold, draggable } = this
    allowFold && this.setFoldEvent()
    this.setClickHook()
    draggable && this.setDrag()
    this.setDragScroll()
  }

  setFoldEvent() {
    this.nodesContainer.addEventListener('click', ({ target }) => {
      if (!target.classList.contains('tree-chart-unfold')) return
      this.toggleNodeFold(this.getKeyByElement(target.parentElement))
    })
  }

  // 两点间连线
  drawLine(from, to, isTemp) {
    const { option, linkContainer } = this
    const lineClassName = `line-${from.key}-${to.key}`
    let link = null
    if (document.querySelector(`.${lineClassName}`)) {
      link = document.querySelector(`.${lineClassName}`)
    } else {
      link = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      link.classList.add(lineClassName, `line-from-${from.key}`)
      isTemp && link.classList.add('is-temp-line')
      linkContainer.appendChild(link)
    }
    const centerX = (to.x - from.x) / 2
    const centerY = (to.y - from.y) / 2
    const M = `${from.x} ${from.y}`
    const T = `${to.x} ${to.y}`
    const Q1 = `${from.x + centerX - option.smooth / 100 * centerX} ${from.y}`
    const Q2 = `${from.x + centerX} ${from.y + centerY}`
    link.setAttribute('d', `M${M} Q${Q1} ${Q2} T ${T}`)
  }

  toggleNodeFold(targetKey) {
    const foldButton = this.getFoldButton(targetKey)
    if (!foldButton) return
    const childNodeContainer = this.getChildrenContainer(targetKey)
    if (this.nodeIsFold(targetKey)) {
      childNodeContainer.classList.remove('is-hidden')
      foldButton.classList.remove('is-fold')
    } else {
      childNodeContainer.classList.add('is-hidden')
      foldButton.classList.add('is-fold')
    }
    this.reloadLink()
  }

  getPreviousNode(target) {
    try {
      const node = isElement(target) ? target : this.getNodeElement(target)
      return node.parentElement.previousElementSibling.querySelector('.tree-chart-node')
    } catch (e) {
      return null
    }
  }

  getNextNode(target) {
    try {
      const node = isElement(target) ? target : this.getNodeElement(target)
      return node.parentElement.nextElementSibling.querySelector('.tree-chart-node')
    } catch (e) {
      return null
    }
  }

  getCurrentEventNode(target) {
    const { nodesContainer } = this
    // 忽略展开按钮
    if (target.classList.contains('tree-chart-unfold')) return null
    if (target.classList.contains('tree-chart-node')) return target
    let searchElement = target
    while (nodesContainer !== searchElement) {
      if (searchElement.classList.contains('tree-chart-node')) return searchElement
      searchElement = searchElement.parentElement
    }
    return null
  }

  // 判断是否处于拖动过程
  isDragging() {
    if (!this.draggable) return false
    const { ghostTranslateX, ghostTranslateY, element } = this.dragData
    return element && (ghostTranslateX !== 0 || ghostTranslateY !== 0)
  }

  setClickHook() {
    const { nodesContainer, hooks } = this
    const { click: clickHook } = hooks
    if (!clickHook) return
    // 用mouseEvent来实现click主要是为了区别dragStart和click的行为
    let mouseDownNode = null
    nodesContainer.addEventListener('mousedown', ({ button, target }) => {
      if (button !== 0 || target.classList.contains('tree-chart-unfold')) return
      mouseDownNode = this.getCurrentEventNode(target)
    })
    nodesContainer.addEventListener('mouseup', e => {
      const { button, target } = e
      if (button !== 0 || target.classList.contains('tree-chart-unfold')) return
      const mouseUpNode = this.getCurrentEventNode(target)
      if (mouseUpNode && mouseUpNode === mouseDownNode && !this.isDragging()) {
        clickHook({ key: this.getKeyByElement(mouseUpNode), element: mouseUpNode }, e)
      }
    })
  }

  setNodeEvent(node) {
    const { mouseEnter: enterHook, mouseLeave: leaveHook } = this.hooks
    const argumentData = { key: this.getKeyByElement(node), element: node }
    enterHook && node.addEventListener('mouseenter', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      enterHook(argumentData, e)
    })
    leaveHook && node.addEventListener('mouseleave', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      leaveHook(argumentData, e)
    })
  }

  // 绑定拖动事件
  setDrag() {
    const { ghostContainer, container, nodesContainer, hooks } = this
    let dragstartLock = false
    const dragData = this.dragData = {
      key: null,
      element: null,
      ghostElement: null,
      ghostTranslateX: 0,
      ghostTranslateY: 0,
      // mousedown事件在节点的触发位置
      eventOffsetX: 0,
      eventOffsetY: 0
    }

    nodesContainer.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      const dragNode = this.getCurrentEventNode(e.target)
      if (!dragNode) return
      // 根节点不允许拖动
      if (dragNode === this.rootNode) return
      // 用户禁止拖动的节点
      if (dragNode.classList.contains('not-allow-drag')) return
      const dragNodeKey = this.getKeyByElement(dragNode)
      if (hooks.preventDrag && hooks.preventDrag(e, { key: dragNodeKey, element: dragNode })) return
      dragData.key = dragNodeKey
      dragData.element = dragNode
      dragData.ghostElement = dragNode.cloneNode(true)
      const { left, top } = this.positionData.node[this.getKeyByElement(dragNode)]
      dragData.eventOffsetX = e.clientX + container.scrollLeft - left
      dragData.eventOffsetY = e.clientY + container.scrollTop - top
    })
    nodesContainer.addEventListener('mousemove', e => {
      if (e.button !== 0) return
      if (dragData.element) {
        // 处理Chrome76版本长按不移动也会触发的情况
        if (e.movementX === 0 && e.movementY === 0) return
        // 清除文字选择对拖动的影响
        getSelection ? getSelection().removeAllRanges() : document.selection.empty()
        nodesContainer.classList.add('cursor-move')
        // 添加镜像元素
        !ghostContainer.contains(dragData.ghostElement) && ghostContainer.appendChild(dragData.ghostElement)
        dragData.ghostTranslateX = e.clientX + container.scrollLeft - dragData.eventOffsetX
        dragData.ghostTranslateY = e.clientY + container.scrollTop - dragData.eventOffsetY
        dragData.ghostElement.style.transform = `translate(${dragData.ghostTranslateX}px, ${dragData.ghostTranslateY}px)`
        const ghostPosition = this.getGhostPosition()
        this.setDragEffect(ghostPosition)
        // 跟随滚动
        this.followScroll(ghostPosition)
        if (!dragstartLock && hooks.dragStart) {
          dragstartLock = true
          hooks.dragStart({ key: this.getKeyByElement(dragData.element), element: dragData.element.childNodes[0] })
        }
      }
    })
    const createParams = node => {
      const nodeKey = this.getKeyByElement(node)
      return {
        parentKey: this.getParentKey(nodeKey),
        parentNode: this.getParentNodeElement(nodeKey),
        previousKey: this.getPreviousKey(node),
        previousNode: this.getPreviousNode(node),
        nextKey: this.getNextKey(node),
        nextNode: this.getNextNode(node)
      }
    }
    nodesContainer.addEventListener('mouseup', e => {
      if (e.button !== 0) return
      dragstartLock = false
      const targetNode = document.querySelector('.collide-node')
      if (targetNode) {
        const dragNode = dragData.element
        let type = ''
        if (targetNode.classList.contains('become-previous')) type = 'previous'
        if (targetNode.classList.contains('become-next')) type = 'next'
        if (targetNode.classList.contains('become-child')) type = 'child'
        this.cancelDrag()
        const from = createParams(dragNode)
        this.insertNode(this.getKeyByElement(targetNode), this.getKeyByElement(dragNode), type)
        // 如果目标节点是折叠状态，插入子节点后自动展开
        if (type === 'child' && childrenIsFold(targetNode)) {
          this.toggleNodeFold(this.getKeyByElement(targetNode))
        }
        hooks.dragEnd && hooks.dragEnd(
          from,
          createParams(dragNode),
          { key: this.getKeyByElement(dragNode), element: dragNode },
          { key: this.getKeyByElement(targetNode), element: targetNode },
          type)
      }
    })

    const cancelDrag = () => {
      if (!dragData.element) return
      nodesContainer.classList.remove('cursor-move')
      dragData.key = null
      dragData.element = null
      ghostContainer.innerHTML = ''
      dragData.ghostElement = null
      dragData.ghostTranslateX = 0
      dragData.ghostTranslateY = 0
      dragData.eventOffsetX = 0
      dragData.eventOffsetY = 0
      this.removeDragEffect()
      this.stopFollowScroll()
    }
    this.cancelDrag = cancelDrag.bind(this)
    window.addEventListener('mouseup', this.cancelDrag)

    // 考虑滚动情况
    const oldScroll = {
      top: container.scrollTop,
      left: container.scrollLeft
    }
    container.addEventListener('scroll', () => {
      if (dragData.element && dragData.ghostElement) {
        dragData.ghostTranslateY = dragData.ghostTranslateY + container.scrollTop - oldScroll.top
        dragData.ghostTranslateX = dragData.ghostTranslateX + container.scrollLeft - oldScroll.left
        dragData.ghostElement.style.transform = `translate(${dragData.ghostTranslateX}px, ${dragData.ghostTranslateY}px)`
        this.setDragEffect(this.getGhostPosition())
      }
      oldScroll.top = container.scrollTop
      oldScroll.left = container.scrollLeft
    })
  }

  getGhostPosition() {
    const dragData = this.dragData
    return {
      left: dragData.ghostTranslateX,
      top: dragData.ghostTranslateY,
      right: dragData.ghostTranslateX + dragData.ghostElement.offsetWidth,
      bottom: dragData.ghostTranslateY + dragData.ghostElement.offsetHeight
    }
  }

  removeDragEffect() {
    const tempLink = this.linkContainer.querySelector('.is-temp-line')
    tempLink && this.linkContainer.removeChild(tempLink)
    const collideNode = document.querySelector('.collide-node')
    collideNode && collideNode.classList.remove('collide-node', 'become-previous', 'become-next', 'become-child')
    const tempChildrenContainer = document.querySelector('.temp-children-container')
    tempChildrenContainer && tempChildrenContainer.parentElement.removeChild(tempChildrenContainer)
    const notAllowEffect = document.querySelector('.show-not-allow')
    notAllowEffect && notAllowEffect.classList.remove('show-not-allow')
  }

  // 生成拖动效果
  createDragEffect(coverNode, { top: ghostTop, bottom: ghostBottom }) {
    let insertType = ''
    let from = null
    let to = null

    const { element: dragElement, key: dragNodeKey } = this.dragData
    // 不可拖到子节点上
    if (dragElement.parentElement.contains(coverNode)) return setNotAllowEffect(coverNode)

    const coverNodeKey = this.getKeyByElement(coverNode)
    const {
      top: coverNodeTop,
      bottom: coverNodeBottom,
      left: coverNodeLeft,
      right: coverNodeRight
    } = this.positionData.node[coverNodeKey]

    // 拖到父节点时只能作为兄弟节点插入
    const coverIsParent = coverNode === this.getParentNodeElement(dragNodeKey)
    // 禁止插入到下一个兄弟节点的上面
    const coverIsNext = coverNode === this.getNextNode(dragElement)
    // 禁止插入到上一个兄弟节点的下面
    const coverIsPrevious = coverNode === this.getPreviousNode(dragElement)

    const allowConfig = {
      child: !coverNode.classList.contains('not-allow-insert-child') && !coverIsParent,
      next: !coverNode.classList.contains('not-allow-insert-next') && !coverIsPrevious,
      previous: !coverNode.classList.contains('not-allow-insert-previous') && !coverIsNext
    }

    let existAllow = false
    for (const key in allowConfig) {
      if (allowConfig[key]) {
        existAllow = true
        break
      }
    }
    if (!existAllow) return setNotAllowEffect(coverNode)

    // 如果被覆盖的是根节点的话只允许作为子节点插入
    if (coverNode === this.rootNode) {
      if (!allowConfig.child) return setNotAllowEffect(coverNode)
      insertType = 'child'
    } else {
      // 位置偏上或者偏下(45%)则认为是添加兄弟节点
      const offsetValue = (coverNodeBottom - coverNodeTop) * 0.45
      const topPositionValue = coverNodeTop + offsetValue
      const bottomPositionValue = coverNodeBottom - offsetValue

      if (ghostBottom <= topPositionValue) {
        // 在上方插入
        insertType = 'previous'
      } else if (ghostTop >= bottomPositionValue) {
        // 在下方插入
        insertType = 'next'
      } else {
        // 作为子节点插入
        insertType = 'child'
      }

      // 不满足自定义控制条件的按照child=>next=>previous的权重取一个
      if (!allowConfig[insertType]) {
        insertType = ''
        for (const key in allowConfig) {
          if (allowConfig[key]) {
            insertType = key
            break
          }
        }
      }

      if (insertType === '') return setNotAllowEffect(coverNode)
    }
    coverNode.classList.add(`become-${insertType}`, 'collide-node')

    if (insertType === 'previous' || insertType === 'next') {
      const parentNodeKey = this.getParentKey(this.getKeyByElement(coverNode))
      const parentPosition = this.positionData.node[parentNodeKey]
      from = {
        x: parentPosition.right,
        y: (parentPosition.top + parentPosition.bottom) / 2,
        key: parentNodeKey
      }
      to = {
        x: coverNodeLeft,
        y: insertType === 'previous' ? coverNodeTop - 20 : coverNodeBottom + 20,
        key: 'temp'
      }
    } else {
      const createTempChildNode = () => {
        const chartContent = document.createElement('div')
        chartContent.classList.add('tree-chart-node', 'temp-chart-content')
        chartContent.style.width = `${coverNodeRight - coverNodeLeft}px`
        chartContent.style.height = `${coverNodeBottom - coverNodeTop}px`

        const chartContainer = document.createElement('div')
        chartContainer.classList.add('tree-chart-container')
        chartContainer.appendChild(chartContent)

        const childrenContainer = this.createChildrenContainer('temp-children-container')
        childrenContainer.appendChild(chartContainer)
        coverNode.parentElement.appendChild(childrenContainer)

        to = {
          x: coverNodeRight + this.option.distanceX,
          y: (coverNodeTop + coverNodeBottom) / 2,
          key: 'temp'
        }
      }
      from = {
        x: coverNodeRight,
        y: (coverNodeTop + coverNodeBottom) / 2,
        key: coverNodeKey
      }
      // 有子节点的情况
      if (coverNode.nextElementSibling) {
        // 拖到收起状态的节点需要创建临时节点
        if (childrenIsFold(coverNode)) {
          createTempChildNode()
        } else {
          const childNodeList = coverNode.nextElementSibling.childNodes
          const insertPreviousKey = this.getKeyByElement(childNodeList[childNodeList.length - 1].querySelector('.tree-chart-node'))
          const { left: childPreviousLeft, bottom: childPreviousBottom } = this.positionData.node[insertPreviousKey]
          to = {
            x: childPreviousLeft,
            y: childPreviousBottom + 20,
            key: 'temp'
          }
        }
      } else {
        // 没有子节点的情况创建一个临时节点
        createTempChildNode()
      }
    }

    this.drawLine(from, to, true)
  }

  // 获取拖动过程中碰撞的元素
  getCollideNode({ left, right, top, bottom }) {
    const { dragData, positionData } = this
    const draggingElementKey = this.getKeyByElement(dragData.element)
    // Find current collide contentElement position
    const searchCurrent = (target, list, searchLarge) => {
      const listLen = list.length
      if (searchLarge) {
        for (let i = 0; i < listLen; i++) {
          if (list[i] >= target) return list[i]
        }
      } else {
        for (let i = listLen - 1; i > -1; i--) {
          if (list[i] <= target) return list[i]
        }
      }
      return null
    }

    const getRangeList = (flagItem, data, direct = 'after') => {
      let result = []
      isNumber(flagItem) && data.sortList.forEach(item => {
        if (direct === 'before' ? item <= flagItem : item >= flagItem) {
          result = result.concat(data[item])
        }
      })
      return result
    }

    const leftList = positionData.left.sortList
    const topList = positionData.top.sortList
    const rightList = positionData.right.sortList
    const bottomList = positionData.bottom.sortList

    // 寻找边界内的坐标
    const searchLeft = searchCurrent(left, rightList, true)
    const searchTop = searchCurrent(top, bottomList, true)
    const searchRight = searchCurrent(right, leftList)
    const searchBottom = searchCurrent(bottom, topList)

    const leftTopCollide = []
    const rightBottomCollide = []

    // 左顶点和上顶点求交集确定在右下方的元素
    const leftCatchList = getRangeList(searchLeft, positionData.right)
    const topCatchList = getRangeList(searchTop, positionData.bottom)
    leftCatchList.forEach(item => {
      if (item !== draggingElementKey && topCatchList.includes(item)) {
        leftTopCollide.push(item)
      }
    })

    // 右顶点和下顶点求交集确定在左上方的元素
    const rightCatchList = getRangeList(searchRight, positionData.left, 'before')
    const bottomCatchList = getRangeList(searchBottom, positionData.top, 'before')
    rightCatchList.forEach(item => {
      if (item !== draggingElementKey && bottomCatchList.includes(item)) {
        rightBottomCollide.push(item)
      }
    })

    // 两个区间求交集确定目标元素
    const collideNode = []
    leftTopCollide.forEach(nodeKey => {
      if (!rightBottomCollide.includes(nodeKey)) return
      const node = this.getNodeElement(nodeKey)
      collideNode.push({ node, key: nodeKey, position: this.positionData.node[nodeKey] })
    })

    if (!collideNode.length) return null
    if (collideNode.length === 1) return collideNode[0].node

    // 如果存在多个被覆盖的节点需要根据覆盖面积决策，被覆盖的节点最多有四个
    const isLeft = position => position.left <= left
    const isTop = position => position.top <= top

    // 面积计算
    const setArea = (type, item) => {
      const collidePosition = item.position
      switch (type) {
        case 'leftTop':
          item.area = (collidePosition.right - left) * (collidePosition.bottom - top)
          break
        case 'leftBottom':
          item.area = (collidePosition.right - left) * (bottom - collidePosition.top)
          break
        case 'rightTop':
          item.area = (right - collidePosition.left) * (collidePosition.bottom - top)
          break
        case 'rightBottom':
          item.area = (right - collidePosition.left) * (bottom - collidePosition.top)
      }
    }
    collideNode.forEach(item => {
      const itemPosition = item.position
      if (isLeft(itemPosition)) {
        setArea(isTop(itemPosition) ? 'leftTop' : 'leftBottom', item)
        // 左侧
      } else {
        // 右侧
        setArea(isTop(itemPosition) ? 'rightTop' : 'rightBottom', item)
      }
    })
    collideNode.sort((a, b) => b.area - a.area)
    return collideNode[0].node
  }

  setDragEffect(ghostElementPosition) {
    this.removeDragEffect()
    const collideNode = this.getCollideNode(ghostElementPosition)
    collideNode && this.createDragEffect(collideNode, ghostElementPosition)
  }

  resize() {
    const { option, nodesContainer, linkContainer, draggable, ghostContainer } = this
    const { style: nodesContainerStyle } = nodesContainer

    // 重新渲染的情况需要先清除旧的尺寸
    nodesContainerStyle.width = 'auto'
    nodesContainerStyle.minWidth = 'auto'

    const { clientWidth: nodeContainerWidth, clientHeight: nodeContainerHeight } = nodesContainer
    const width = `${draggable ? nodeContainerWidth + option.extendSpace : nodeContainerWidth}px`
    const height = `${nodeContainerHeight}px`

    nodesContainerStyle.width = width
    nodesContainerStyle.minWidth = '100%'
    linkContainer.setAttribute('width', width)
    linkContainer.setAttribute('height', height)
    if (draggable) {
      const { style: ghostContainerStyle } = ghostContainer
      ghostContainerStyle.width = width
      ghostContainerStyle.height = height
    }
  }

  followScroll({ left, top, right, bottom }) {
    if (!this.dragScroll) return
    const container = this.container
    const { scrollLeft, scrollTop, clientWidth, clientHeight, scrollWidth, scrollHeight } = container
    const distance = this.option.scrollTriggerDistance
    let direct = ''
    const hasRightContent = scrollWidth - scrollLeft > clientWidth
    const hasBottomContent = scrollHeight - scrollTop > clientHeight
    if (scrollLeft > 0 && left < scrollLeft + distance) {
      direct = 'Left'
    } else if (scrollTop > 0 && top < scrollTop + distance) {
      direct = 'Top'
    } else if (hasRightContent && clientWidth + scrollLeft - distance < right) {
      direct = 'Right'
    } else if (hasBottomContent && clientHeight + scrollTop - distance < bottom) {
      direct = 'Bottom'
    } else {
      return this.stopFollowScroll()
    }
    if (this.foolowScrollData.direct !== direct) {
      this.stopFollowScroll(false)
      this.foolowScrollData.direct = direct
      const scrollSpeed = this.option.scrollSpeed
      this.foolowScrollData.interval = setInterval(() => {
        if (direct === 'Left' || direct === 'Top') {
          container[`scroll${direct}`] -= scrollSpeed
        } else {
          if (direct === 'Right') {
            container.scrollLeft += scrollSpeed
          } else {
            container.scrollTop += scrollSpeed
          }
        }
        let stop = false
        switch (direct) {
          case 'Left':
            stop = scrollLeft === 0
            break
          case 'Top':
            stop = scrollTop === 0
            break
          case 'Right':
            stop = scrollLeft + clientWidth === scrollWidth
            break
          case 'Bottom':
            stop = !scrollTop > 0
        }
        stop && this.stopFollowScroll()
      }, 20)
    }
  }

  stopFollowScroll(clearDirect = true) {
    if (!this.dragScroll) return
    this.foolowScrollData.interval && clearInterval(this.foolowScrollData.interval)
    if (clearDirect) this.foolowScrollData.direct = ''
  }

  setDragScroll() {
    const { dragScroll, container, nodesContainer } = this
    if (!dragScroll) return
    this.foolowScrollData = { interval: null, direct: '' }
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
      lock = false
    })
    nodesContainer.addEventListener('mousemove', e => {
      e.preventDefault()
      if (e.button !== 0 || lock) return
      container.scrollLeft = container.scrollLeft - e.movementX
      container.scrollTop = container.scrollTop - e.movementY
    })
    this.cancelDragScroll = e => {
      if (e.button !== 0) return
      lock = true
    }
    window.addEventListener('mouseup', this.cancelDragScroll)
  }

  destroy() {
    this.cancelDrag && window.removeEventListener('mouseup', this.cancelDrag)
    this.cancelDragScroll && window.removeEventListener('mouseup', this.cancelDragScroll)
  }
}

export default TreeChart
