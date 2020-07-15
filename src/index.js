import './index.scss'

const isElement = data => /HTML/.test(Object.prototype.toString.call(data)) && data.nodeType === 1
const isNumber = data => /Number/.test(Object.prototype.toString.call(data))
const childrenIsFold = node => Boolean(node.querySelector('.can-unfold'))
const hasChildren = node => Boolean(node.getAttribute('data-children'))
const removeUnfoldElement = node => {
  const unfoldElement = node.querySelector('.tree-chart-unfold')
  unfoldElement && node.removeChild(unfoldElement)
}
const getChildrenContainer = node => node.nextElementSibling
const removeChildrenContainer = node => {
  const childrenContainer = getChildrenContainer(node)
  childrenContainer.parentElement.removeChild(childrenContainer)
}
const addChildrenKey = (node, key) => {
  const oldChildrenKey = node.getAttribute('data-children')
  if (oldChildrenKey) {
    node.setAttribute('data-children', `${oldChildrenKey},${key}`)
  } else {
    node.setAttribute('data-children', key)
  }
}
const removeChildrenKey = (node, key) => {
  const oldChildrenKey = node.getAttribute('data-children')
  if (oldChildrenKey) {
    const keyList = oldChildrenKey.split(',')
    const index = keyList.indexOf(key)
    index > -1 && keyList.splice(index, 1)
    if (keyList.length) {
      node.setAttribute('data-children', keyList.join())
    } else {
      node.removeAttribute('data-children')
    }
  }
}
const setNotAllowEffect = node => node.classList.add('show-not-allow')

class TreeChart {
  constructor(option) {
    this.mergeOption(option)
    this.createElement()
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

  createElement() {
    const { container, data } = this.option
    container.classList.add('tree-chart')
    this.container = container
    this.createNodes(data, container)
    this.createLink()
  }

  // 数据数据结构生成节点
  createNodes(data, parentNodeContainer, reRender) {
    const { children } = data
    const existChildren = Array.isArray(children) && children.length > 0

    const nodeContainer = reRender ? parentNodeContainer : this.createNodeContainer()
    // 创建节点
    const node = this.createNode(data)
    this.allowFold && existChildren && this.createFoldButton(node)
    nodeContainer.appendChild(node)
    !reRender && parentNodeContainer.appendChild(nodeContainer)

    // 初始化时候
    if (!this.nodesContainer) {
      nodeContainer.classList.add('is-node-container')
      const { padding } = this.option
      for (const key in padding) {
        if (/left|top|right|bottom/.test(key)) {
          let value = padding[key]
          if (!isNumber(value) || value < 0) continue
          if (this.draggable && /top|bottom/.test(key) && value < 30) value = 30
          nodeContainer.style[`padding${key.replace(/^./, $ => $.toUpperCase())}`] = `${value}px`
        }
      }
      this.rootNode = node
      this.nodesContainer = nodeContainer
    }

    if (existChildren) {
      const childrenContainer = document.createElement('div')
      childrenContainer.classList.add('tree-chart-children-container')
      childrenContainer.style.marginLeft = `${this.option.distanceX}px`
      nodeContainer.appendChild(childrenContainer)
      const childKeys = []
      children.forEach(child => {
        childKeys.push(this.getKey(child))
        this.createNodes(child, childrenContainer)
      })
      node.setAttribute('data-children', childKeys.join())
    }
  }

  createNode(data) {
    const node = document.createElement('div')
    const key = this.getKey(data)
    node.classList.add('tree-chart-content', `tree-chart-item-${key}`)
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

    // 节点事件
    this.setNodeEvent(renderContainer)

    // 拖拽控制
    if (this.draggable) {
      if (this.hooks.dragControl) {
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
    }

    return node
  }

  // 创建展开收起按钮
  createFoldButton(nodeElement) {
    if (nodeElement.querySelector('.tree-chart-unfold')) return
    const button = document.createElement('div')
    button.classList.add('tree-chart-unfold')
    button.innerHTML = '<div></div><div></div>'
    nodeElement.appendChild(button)
  }

  // 根据节点间父子关系生成连线信息
  createLink() {
    const { container, nodesContainer, linkContainer } = this
    // 创建容器
    if (linkContainer) {
      this.linkContainer.innerHTML = ''
    } else {
      const newLinkContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      newLinkContainer.classList.add('tree-chart-link-container')
      container.appendChild(newLinkContainer)
      this.linkContainer = newLinkContainer
    }

    const { left: offsetLeftValue, top: offsetTopValue } = container.getBoundingClientRect()
    const { scrollLeft, scrollTop } = container
    const nodeList = nodesContainer.querySelectorAll('.tree-chart-content')

    this.setPositionData('init')

    for (const item of nodeList) {
      const childrenKeys = item.getAttribute('data-children')
      const itemLayout = item.getBoundingClientRect()
      const nodeKey = this.getKey(item)
      const childrenNodeContainer = item.nextElementSibling
      // 忽略收起状态的节点
      if (childrenKeys && !childrenNodeContainer.classList.contains('is-hidden')) {
        const from = {
          x: itemLayout.left - offsetLeftValue + item.offsetWidth + scrollLeft,
          y: itemLayout.top - offsetTopValue + item.offsetHeight / 2 + scrollTop,
          key: nodeKey
        }
        childrenKeys.split(',').forEach(childNodeKey => {
          const childrenElement = this.getNode(childNodeKey)
          const childrenLayout = childrenElement.getBoundingClientRect()
          const to = {
            x: childrenLayout.left - offsetLeftValue + scrollLeft,
            y: childrenLayout.top - offsetTopValue + childrenElement.offsetHeight / 2 + scrollTop,
            key: childNodeKey
          }
          this.drawLine(from, to)
        })
      }
      this.draggable && this.setPositionData('add', {
        left: itemLayout.left - offsetLeftValue + scrollLeft,
        right: itemLayout.right - offsetLeftValue + scrollLeft,
        top: itemLayout.top - offsetTopValue + scrollTop,
        bottom: itemLayout.bottom - offsetTopValue + scrollTop,
        key: nodeKey
      })
    }
    this.draggable && this.setPositionData('sort')
  }

  // 生成节点位置信息，方便后面的碰撞检测
  setPositionData(operation, data) {
    if (operation === 'init') {
      this.positionData = {
        left: {
          list: []
        },
        right: {
          list: []
        },
        top: {
          list: []
        },
        bottom: {
          list: []
        },
        addData(data) {
          const { key: nodeKey } = data
          for (const direct in data) {
            if (!/left|right|top|bottom/.test(direct)) continue
            const positionValue = data[direct]
            const directData = this[direct]
            !directData.list.includes(positionValue) && directData.list.push(positionValue)
            if (directData[positionValue]) {
              directData[positionValue].push(nodeKey)
            } else {
              directData[positionValue] = [nodeKey]
            }
            this[nodeKey] = data
          }
        }
      }
    }
    const positionData = this.positionData
    if (operation === 'add') positionData.addData(data)
    if (operation === 'sort') {
      for (const key in positionData) {
        if (!positionData[key].list) continue
        positionData[key].list.sort((a, b) => a - b)
      }
    }
  }

  setEvent() {
    this.allowFold && this.setFoldEvent()
    this.setClickHook()
    this.setDrag()
    this.resize()
    this.setDragScroll()
  }

  setFoldEvent() {
    this.nodesContainer.addEventListener('click', ({ target }) => {
      if (!target.classList.contains('tree-chart-unfold')) return
      this.toggleFold(target)
    })
  }

  createNodeContainer() {
    const { distanceY } = this.option
    const nodeContainer = document.createElement('div')
    nodeContainer.classList.add('tree-chart-container')
    nodeContainer.style.marginBottom = `${distanceY}px`
    return nodeContainer
  }

  // 两点间连线
  drawLine(from, to, isTemp) {
    const option = this.option
    const lineClassName = `line-${from.key}-${to.key}`
    let link = null
    if (document.querySelector(`.${lineClassName}`)) {
      link = document.querySelector(`.${lineClassName}`)
    } else {
      link = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      link.classList.add(lineClassName, `line-from-${from.key}`)
      isTemp && link.classList.add('is-temp-line')
      this.linkContainer.appendChild(link)
    }
    const centerX = (to.x - from.x) / 2
    const centerY = (to.y - from.y) / 2
    const M = `${from.x} ${from.y}`
    const L = `${to.x} ${to.y}`
    const Q1 = `${from.x + centerX - option.smooth / 100 * centerX} ${from.y}`
    const Q2 = `${from.x + centerX} ${from.y + centerY}`
    link.setAttribute('d', `M${M} Q${Q1} ${Q2} T ${L}`)
  }

  toggleFold(data, isFold) {
    let unfoldElement = null
    if (typeof data === 'string') {
      unfoldElement = this.nodesContainer.querySelector(`.tree-chart-item-${data} .tree-chart-unfold`)
    } else if (isElement(data)) {
      unfoldElement = data
    }
    if (unfoldElement) {
      const childNodeContainer = unfoldElement.parentElement.nextElementSibling
      const isUnfold = unfoldElement.classList.contains('can-unfold')
      if (isUnfold === isFold) return
      if (isUnfold) {
        childNodeContainer.classList.remove('is-hidden')
        unfoldElement.classList.remove('can-unfold')
      } else {
        childNodeContainer.classList.add('is-hidden')
        unfoldElement.classList.add('can-unfold')
      }
      this.reloadLink()
    }
  }

  reRender(data) {
    this.nodesContainer.innerHTML = ''
    this.createNodes(data, this.nodesContainer, true)
    this.reloadLink()
  }

  reRenderNode(key, data) {
    const oldKey = key.toString()
    const newKey = this.getKey(data)
    const node = this.getNode(oldKey)
    const parentElement = node.parentElement
    const childrenKeys = node.getAttribute('data-children')

    if (newKey !== oldKey) {
      // 替换父节点的children-key
      const parentNode = this.getParentNode(node)
      const parentChildrenKey = parentNode.getAttribute('data-children')
      const regExp = new RegExp(oldKey)
      parentNode.setAttribute('data-children', parentChildrenKey.replace(regExp, newKey))
      // 替换连线的类名
      const parentKey = this.getParentKey(oldKey)
      const parentLineClassName = `line-${parentKey}-${oldKey}`
      const parentLink = this.linkContainer.querySelector(`.${parentLineClassName}`)
      parentLink.classList.add(`line-${parentKey}-${newKey}`)
      parentLink.classList.remove(parentLineClassName)
      if (childrenKeys) {
        childrenKeys.split(',').forEach(childKey => {
          const childLineClassName = `line-${oldKey}-${childKey}`
          const childLink = this.linkContainer.querySelector(`.${childLineClassName}`)
          childLink.classList.add(`line-${newKey}-${childKey}`)
          childLink.classList.remove(childLineClassName)
        })
      }
      // 替换position数据
      const positionData = this.positionData
      positionData[newKey] = positionData[oldKey]
      positionData[newKey].key = newKey
      delete positionData[oldKey]
      const fieldNames = ['left', 'top', 'right', 'bottom']
      fieldNames.forEach(fieldName => {
        const redirectData = positionData[fieldName]
        for (const redirectKey in redirectData) {
          const redirectItem = redirectData[redirectKey]
          const oldKeyIndex = redirectItem.indexOf(oldKey)
          oldKeyIndex > -1 && redirectItem.splice(oldKeyIndex, 1, newKey)
        }
      })
    }

    // 替换节点
    const newNode = this.createNode(data)
    childrenKeys && newNode.setAttribute('data-children', childrenKeys)
    node.querySelector('.tree-chart-unfold') && this.createFoldButton(newNode)
    parentElement.insertBefore(newNode, node)
    parentElement.removeChild(node)
    this.setNodeEvent(newNode)
  }

  reloadLink() {
    this.resize()
    this.createLink()
  }

  getNode(key) {
    return this.nodesContainer.querySelector(`.tree-chart-item-${key}`)
  }

  getParentNode(target) {
    try {
      const node = isElement(target) ? target : this.getNode(target)
      return node.parentElement.parentElement.previousElementSibling
    } catch (e) {
      return null
    }
  }

  getPreviousNode(target) {
    try {
      const node = isElement(target) ? target : this.getNode(target)
      return node.parentElement.previousElementSibling.querySelector('.tree-chart-content')
    } catch (e) {
      return null
    }
  }

  getNextNode(target) {
    try {
      const node = isElement(target) ? target : this.getNode(target)
      return node.parentElement.nextElementSibling.querySelector('.tree-chart-content')
    } catch (e) {
      return null
    }
  }

  getKey(target) {
    if (target === null) return null
    return isElement(target) ? target.getAttribute('data-key') : target[this.option.keyField].toString()
  }

  getParentKey(target) {
    return this.getKey(this.getParentNode(target))
  }

  getPreviousKey(target) {
    return this.getKey(this.getPreviousNode(target))
  }

  getNextKey(target) {
    return this.getKey(this.getNextNode(target))
  }

  insertNode(target, origin, type, unReloadLink) {
    const targetNode = isElement(target) ? target : this.getNode(target)
    // 限制不能给根节点添加兄弟元素
    if (targetNode === this.rootNode && /next|previous/.test(type)) return

    const targetNodeContainer = targetNode.parentElement
    const targetParentNode = this.getParentNode(targetNode)

    const addNewNode = /Object/.test(Object.prototype.toString.call(origin))

    let originNode = null
    if (addNewNode) {
      originNode = this.createNode(origin)
    } else {
      originNode = isElement(origin) ? origin : this.getNode(origin)
    }
    let originNodeContainer = null
    if (addNewNode) {
      originNodeContainer = this.createNodeContainer()
      originNodeContainer.appendChild(originNode)
    } else {
      originNodeContainer = originNode.parentElement
    }
    const originKey = this.getKey(addNewNode ? origin : originNode)
    const originParentNode = this.getParentNode(originNode)

    if (type === 'child') {
      // 本身存在子节点的情况
      if (hasChildren(targetNode)) {
        getChildrenContainer(targetNode).appendChild(originNodeContainer)
      } else {
        // 没有任何子节点的话创建一个容器
        const newChildContainer = document.createElement('div')
        newChildContainer.classList.add('tree-chart-children-container')
        newChildContainer.style.marginLeft = `${this.option.distanceX}px`
        newChildContainer.appendChild(originNodeContainer)
        targetNode.parentElement.appendChild(newChildContainer)
      }
      addChildrenKey(targetNode, originKey)
    } else {
      const parentChildrenContainer = getChildrenContainer(targetParentNode)
      if (type === 'previous') {
        parentChildrenContainer.insertBefore(originNodeContainer, targetNodeContainer)
      }
      if (type === 'next') {
        parentChildrenContainer.insertBefore(originNodeContainer, targetNodeContainer.nextElementSibling)
      }
      addChildrenKey(targetParentNode, originKey)
    }

    if (!addNewNode) {
      // 删除原先的节点的data-children
      removeChildrenKey(originParentNode, originKey)
      // 如果移动节点后原位置没有兄弟节点的话移除childrenContainer容器
      if (!hasChildren(originParentNode)) {
        originParentNode.parentElement.removeChild(getChildrenContainer(originParentNode))
      }
    }

    // 处理收起展开状态
    if (this.allowFold) {
      // 处理节点原位置的状态，没有子节点的话就移除对应元素
      if (!addNewNode && !hasChildren(originParentNode)) {
        removeUnfoldElement(originParentNode)
      }
      if (type === 'child') {
        hasChildren(targetNode) && this.createFoldButton(targetNode)
      }
    }

    addNewNode && this.setNodeEvent(originNode)
    !unReloadLink && this.reloadLink()
  }

  removeNode(target) {
    const targetKey = isElement(target) ? this.getKey(target) : target.toString()
    const targetNode = isElement(target) ? target : this.getNode(target)
    if (targetNode) {
      if (targetNode === this.rootNode) return
      const targetNodeContainer = targetNode.parentElement
      const parentNode = this.getParentNode(targetNode)

      // 删除父节点data-children
      removeChildrenKey(parentNode, targetKey)

      // 移除当前节点
      targetNodeContainer.parentElement.removeChild(targetNodeContainer)

      // 如果当前节点是唯一的子节点就移除对应效果
      if (!hasChildren(parentNode)) {
        removeChildrenContainer(parentNode)
        this.allowFold && removeUnfoldElement(parentNode)
      }
      this.reloadLink()
    }
  }

  getCurrentEventNode(target) {
    // 忽略展开按钮
    if (target.classList.contains('tree-chart-unfold')) return null
    if (target.classList.contains('tree-chart-content')) return target
    let searchElement = target
    while (this.nodesContainer !== searchElement) {
      if (searchElement.classList.contains('tree-chart-content')) return searchElement
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
    const { click: clickHook } = this.hooks
    if (!clickHook) return
    const nodesContainer = this.nodesContainer
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
        clickHook({ key: this.getKey(mouseUpNode), element: mouseUpNode }, e)
      }
    })
  }

  setNodeEvent(node) {
    const hooks = this.hooks
    if (!hooks.mouseEnter && !hooks.mouseLeave) return
    const argumentData = { key: this.getKey(node), element: node }
    hooks.mouseEnter && node.addEventListener('mouseenter', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      hooks.mouseEnter(argumentData, e)
    })
    hooks.mouseLeave && node.addEventListener('mouseleave', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      hooks.mouseLeave(argumentData, e)
    })
  }

  // 绑定拖动事件
  setDrag() {
    if (!this.draggable) return
    const hooks = this.hooks
    const nodesContainer = this.nodesContainer
    const container = this.container

    // 设置镜像层
    const ghostContainer = document.createElement('div')
    ghostContainer.classList.add('tree-chart-ghost-container')
    container.appendChild(ghostContainer)

    const dragData = this.dragData = {
      element: null,
      ghostContainer,
      ghostElement: null,
      ghostTranslateX: 0,
      ghostTranslateY: 0,
      // mousedown事件在节点的触发位置
      eventOffsetX: 0,
      eventOffsetY: 0
    }

    let dragstartLock = false

    nodesContainer.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      const dragNode = this.getCurrentEventNode(e.target)
      if (!dragNode) return
      // 根节点不允许拖动
      if (dragNode === this.rootNode) return
      // 用户禁止拖动的节点
      if (dragNode.classList.contains('not-allow-drag')) return
      if (hooks.preventDrag && hooks.preventDrag(e, { key: this.getKey(dragNode), element: dragNode })) return
      dragData.element = dragNode
      dragData.ghostElement = dragNode.cloneNode(true)
      const { left, top } = this.positionData[this.getKey(dragNode)]
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
        !dragData.ghostContainer.contains(dragData.ghostElement) && dragData.ghostContainer.appendChild(dragData.ghostElement)
        dragData.ghostTranslateX = e.clientX + container.scrollLeft - dragData.eventOffsetX
        dragData.ghostTranslateY = e.clientY + container.scrollTop - dragData.eventOffsetY
        dragData.ghostElement.style.transform = `translate(${dragData.ghostTranslateX}px, ${dragData.ghostTranslateY}px)`
        const ghostPosition = this.getGhostPosition()
        this.setDragEffect(ghostPosition)
        // 跟随滚动
        this.followScroll(ghostPosition)
        if (!dragstartLock && hooks.dragStart) {
          dragstartLock = true
          hooks.dragStart({ key: this.getKey(dragData.element), element: dragData.element.childNodes[0] })
        }
      }
    })
    const createParams = node => ({
      parentKey: this.getParentKey(node),
      parentNode: this.getParentNode(node),
      previousKey: this.getPreviousKey(node),
      previousNode: this.getPreviousNode(node),
      nextKey: this.getNextKey(node),
      nextNode: this.getNextNode(node)
    })
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
        this.insertNode(targetNode, dragNode, type)
        // 如果目标节点是折叠状态，插入子节点后自动展开
        if (type === 'child' && childrenIsFold(targetNode)) {
          this.toggleFold(this.getKey(targetNode))
        }
        hooks.dragEnd && hooks.dragEnd(
          from,
          createParams(dragNode),
          { key: this.getKey(dragNode), element: dragNode },
          { key: this.getKey(targetNode), element: targetNode },
          type)
      }
    })

    const cancelDrag = () => {
      if (!dragData.element) return
      this.nodesContainer.classList.remove('cursor-move')
      dragData.element = null
      dragData.ghostContainer.innerHTML = ''
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

    const dragElement = this.dragData.element
    // 不可拖到子节点上
    if (dragElement.parentElement.contains(coverNode)) return setNotAllowEffect(coverNode)

    const coverNodeKey = this.getKey(coverNode)
    const { top: coverNodeTop, bottom: coverNodeBottom, left: coverNodeLeft, right: coverNodeRight } = this.positionData[coverNodeKey]

    // 拖到父节点时只能作为兄弟节点插入
    const coverIsParent = coverNode === this.getParentNode(dragElement)
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
      const parentKey = this.getKey(this.getParentNode(coverNode))
      const parentPosition = this.positionData[parentKey]
      from = {
        x: parentPosition.right,
        y: (parentPosition.top + parentPosition.bottom) / 2,
        key: parentKey
      }
      to = {
        x: coverNodeLeft,
        y: insertType === 'previous' ? coverNodeTop - 20 : coverNodeBottom + 20,
        key: 'temp'
      }
    } else {
      const createTempChildNode = () => {
        const childrenContainer = document.createElement('div')
        childrenContainer.classList.add('tree-chart-children-container', 'temp-children-container')
        childrenContainer.style.marginLeft = `${this.option.distanceX}px`

        const chartContainer = document.createElement('div')
        chartContainer.classList.add('tree-chart-container')

        const chartContent = document.createElement('div')
        chartContent.classList.add('tree-chart-content', 'temp-chart-content')
        chartContent.style.width = `${coverNodeRight - coverNodeLeft}px`
        chartContent.style.height = `${coverNodeBottom - coverNodeTop}px`

        chartContainer.appendChild(chartContent)
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
          const insertPreviousKey = this.getKey(childNodeList[childNodeList.length - 1].querySelector('.tree-chart-content'))
          const { left: childPreviousLeft, bottom: childPreviousBottom } = this.positionData[insertPreviousKey]
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
    const draggingElementKey = this.getKey(this.dragData.element)
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
      isNumber(flagItem) && data.list.forEach(item => {
        if (direct === 'before' ? item <= flagItem : item >= flagItem) {
          result = result.concat(data[item])
        }
      })
      return result
    }

    const positionData = this.positionData
    const leftList = positionData.left.list
    const topList = positionData.top.list
    const rightList = positionData.right.list
    const bottomList = positionData.bottom.list

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
    leftTopCollide.forEach(item => {
      if (!rightBottomCollide.includes(item)) return
      const node = this.getNode(item)
      collideNode.push({ node, key: item, position: this.positionData[item] })
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
    const option = this.option
    const nodesContainer = this.nodesContainer

    nodesContainer.style.width = 'auto'
    nodesContainer.style.minWidth = 'auto'
    let { clientWidth: width, clientHeight: height } = nodesContainer
    width = `${this.draggable ? width + option.extendSpace : width}px`
    height = `${height}px`
    nodesContainer.style.width = width
    nodesContainer.style.minWidth = '100%'

    const linkContainer = this.linkContainer
    linkContainer.setAttribute('width', width)
    linkContainer.setAttribute('height', height)

    if (this.draggable) {
      const ghostContainerStyle = this.dragData.ghostContainer.style
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
    if (!this.dragScroll) return
    this.foolowScrollData = {
      interval: null,
      direct: ''
    }
    const container = this.container
    const nodesContainer = this.nodesContainer
    let lock = true

    const getEventNode = target => {
      if (target.classList.contains('tree-chart-content')) return target
      let searchElement = target
      while (this.nodesContainer !== searchElement) {
        if (searchElement.classList.contains('tree-chart-content')) return searchElement
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
