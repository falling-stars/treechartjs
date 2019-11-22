import './index.scss'

const isElement = data => /HTML/.test(Object.prototype.toString.call(data)) && data.nodeType === 1
const childrenIsFold = node => Boolean(node.querySelector('.can-unfold'))

class TreeChart {
  constructor(options) {
    this.options = Object.assign(
      {
        keyField: 'id',
        distanceX: 60,
        distanceY: 60,
        draggable: false,
        // 光滑程度
        smooth: 50,
        scrollSpeed: 8,
        // 触发滚动的距离
        scrollTriggerDistance: 50,
        unfold: false
      },
      options
    )
    this.draggable = this.options.draggable
    this.unfold = this.options.unfold
    this.rootContainer = options.container
    this.rootContainer.classList.add('tree-chart')
    this.createNodes(options.data, this.rootContainer, true)
    this.unfold && this.setUnfold()
    this.createLink()
    this.setEventHook()
    if (this.draggable) {
      this.setDrag()
      this.foolowScrollData = {
        interval: null,
        direct: ''
      }
    }
    this.resize()
  }

  createNode(data) {
    const node = document.createElement('div')
    const key = this.getKey(data)
    node.classList.add('tree-chart-content', `tree-chart-item-${key}`)
    node.setAttribute('data-key', key)

    const renderContainer = document.createElement('div')
    renderContainer.classList.add('tree-render-container')

    // 生成用户自定义模板
    const contentRender = this.options.contentRender
    if (typeof contentRender === 'function') {
      const renderResult = contentRender(data)
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

    // 拖拽控制
    if (this.draggable) {
      const options = this.options
      const dragControl = options.dragControl
      if (typeof dragControl === 'function') {
        const controlConfig = Object.assign({
          drag: true,
          insertChild: true,
          insertPrevious: true,
          insertNext: true
        }, dragControl(data))
        !controlConfig.drag && node.classList.add('not-allow-drag')
        !controlConfig.insertChild && node.classList.add('not-allow-insert-child')
        !controlConfig.insertPrevious && node.classList.add('not-allow-insert-previous')
        !controlConfig.insertNext && node.classList.add('not-allow-insert-next')
      }
    }

    return node
  }

  createNodeContainer() {
    const nodeContainer = document.createElement('div')
    nodeContainer.classList.add('tree-chart-container')
    nodeContainer.style.marginBottom = `${this.options.distanceY}px`
    return nodeContainer
  }

  // 数据数据结构生成节点
  createNodes(data, parentNodeContainer, isRoot) {
    const options = this.options
    const existChildren = Array.isArray(data.children) && data.children.length

    const nodeContainer = this.createNodeContainer()
    const node = this.createNode(data)

    // 创建展开收起按钮
    if (existChildren && this.unfold) {
      this.addUnfoldElement(node)
    }

    nodeContainer.appendChild(node)
    parentNodeContainer.appendChild(nodeContainer)

    if (isRoot) {
      nodeContainer.classList.add('is-node-container')
      const padding = Object.assign({
        top: 30,
        right: 30,
        bottom: 30,
        left: 30
      }, options.padding)
      for (const key in padding) {
        if (padding.hasOwnProperty(key) && /left|top|right|bottom/.test(key)) {
          let paddingValue = padding[key]
          if (isNaN(paddingValue) || paddingValue < 0) continue
          if (this.draggable && /top|bottom/.test(key) && paddingValue < 30) paddingValue = 30
          nodeContainer.style[`padding${key.replace(/^./, $ => $.toUpperCase())}`] = `${paddingValue}px`
        }
      }
      this.rootNode = node
      this.rootNodeContainer = nodeContainer
    }

    if (existChildren) {
      const childrenContainer = document.createElement('div')
      childrenContainer.classList.add('tree-chart-children-container')
      childrenContainer.style.marginLeft = `${options.distanceX}px`
      nodeContainer.appendChild(childrenContainer)
      const childrenKeys = []
      for (const key in data.children) {
        if (data.children.hasOwnProperty(key)) {
          childrenKeys.push(this.getKey(data.children[key]))
          this.createNodes(data.children[key], childrenContainer)
        }
      }
      node.setAttribute('data-children', childrenKeys.join())
    }
  }

  addUnfoldElement(node) {
    const unfoldElement = document.createElement('div')
    unfoldElement.classList.add('tree-chart-unfold')
    unfoldElement.innerHTML = '<div></div><div></div>'
    node.appendChild(unfoldElement)
  }

  // 根据节点间父子关系生成连线信息
  createLink() {
    const rootContainer = this.rootContainer
    const rootNodeContainer = this.rootNodeContainer
    if (this.linkContainer) {
      this.linkContainer.innerHTML = ''
    } else {
      const linkContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      this.linkContainer = linkContainer
      linkContainer.classList.add('tree-chart-link-container')
      rootContainer.appendChild(linkContainer)
    }

    const { left: offsetLeftValue, top: offsetTopValue } = rootContainer.getBoundingClientRect()
    const { scrollLeft, scrollTop } = rootContainer
    const nodeList = rootNodeContainer.querySelectorAll('.tree-chart-content')

    this.setPositionData('init')
    for (const item of nodeList) {
      const childrenKeys = item.getAttribute('data-children')
      const itemLayout = item.getBoundingClientRect()
      const itemKey = this.getKey(item)
      const childrenNodeContainer = item.nextElementSibling
      // 忽略收起状态的节点
      if (childrenKeys && !childrenNodeContainer.classList.contains('is-hidden')) {
        const from = {
          x: itemLayout.left - offsetLeftValue + item.offsetWidth + scrollLeft,
          y: itemLayout.top - offsetTopValue + item.offsetHeight / 2 + scrollTop,
          key: itemKey
        }
        childrenKeys.split(',').forEach(childKey => {
          const childrenElement = this.getNode(childKey)
          const childrenLayout = childrenElement.getBoundingClientRect()
          const to = {
            x: childrenLayout.left - offsetLeftValue + scrollLeft,
            y: childrenLayout.top - offsetTopValue + childrenElement.offsetHeight / 2 + scrollTop,
            key: childKey
          }
          this.drawLine(from, to)
        })
      }
      this.draggable && this.setPositionData('add', {
        left: itemLayout.left - offsetLeftValue + scrollLeft,
        right: itemLayout.right - offsetLeftValue + scrollLeft,
        top: itemLayout.top - offsetTopValue + scrollTop,
        bottom: itemLayout.bottom - offsetTopValue + scrollTop,
        key: itemKey
      })
    }
    this.draggable && this.setPositionData('sort')
  }

  // 两点间连线
  drawLine(from, to) {
    const options = this.options
    const lineClassName = `line-${from.key}-${to.key}`
    let link = null
    if (document.querySelector(`.${lineClassName}`)) {
      link = document.querySelector(`.${lineClassName}`)
    } else {
      link = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      link.classList.add(lineClassName, `line-from-${from.key}`)
      this.linkContainer.appendChild(link)
    }
    const centerX = (to.x - from.x) / 2
    const centerY = (to.y - from.y) / 2
    const M = `${from.x} ${from.y}`
    const L = `${to.x} ${to.y}`
    const Q1 = `${from.x + centerX - options.smooth / 100 * centerX} ${from.y}`
    const Q2 = `${from.x + centerX} ${from.y + centerY}`
    link.setAttribute('d', `M${M} Q${Q1} ${Q2} T ${L}`)
  }

  setUnfold() {
    this.rootNodeContainer.addEventListener('click', ({ target }) => {
      if (!target.classList.contains('tree-chart-unfold')) return
      this.toggleFold(target)
    })
  }

  toggleFold(data) {
    let unfoldElement = null
    if (typeof data === 'string') {
      unfoldElement = this.rootNodeContainer.querySelector(`.tree-chart-item-${data} .tree-chart-unfold`)
    } else if (isElement(data)) {
      unfoldElement = data
    }
    if (unfoldElement) {
      const childNodeContainer = unfoldElement.parentElement.nextElementSibling
      if (unfoldElement.classList.contains('can-unfold')) {
        childNodeContainer.classList.remove('is-hidden')
        unfoldElement.classList.remove('can-unfold')
      } else {
        childNodeContainer.classList.add('is-hidden')
        unfoldElement.classList.add('can-unfold')
      }
      this.reloadLink()
    }
  }

  // 生成节点位置信息
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
          for (const keyName in data) {
            const keyValue = data.key
            if (data.hasOwnProperty(keyName) && /left|right|top|bottom/.test(keyName)) {
              const currentValue = data[keyName]
              const targetAttribute = this[keyName]
              targetAttribute.list.indexOf(currentValue) === -1 && targetAttribute.list.push(currentValue)
              if (targetAttribute[currentValue]) {
                targetAttribute[currentValue].push(keyValue)
              } else {
                targetAttribute[currentValue] = [keyValue]
              }
              this[keyValue] = data
            }
          }
        }
      }
    }
    const positionData = this.positionData
    if (operation === 'add') positionData.addData(data)
    if (operation === 'sort') {
      for (const key in positionData) {
        if (positionData.hasOwnProperty(key) && positionData[key].list) {
          positionData[key].list.sort((a, b) => a - b)
        }
      }
    }
  }

  reRender(data) {
    this.rootNodeContainer.innerHTML = ''
    this.createNodes(data, this.rootContainer, false)
    this.unfold && this.setUnfold()
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
    node.querySelector('.tree-chart-unfold') && this.addUnfoldElement(newNode)
    parentElement.insertBefore(newNode, node)
    parentElement.removeChild(node)
    this.setNodeHook(newNode)
  }

  reloadLink() {
    this.resize()
    this.createLink()
  }

  getNode(key) {
    return this.rootNodeContainer.querySelector(`.tree-chart-item-${key}`)
  }

  getKey(data) {
    return isElement(data) ? data.getAttribute('data-key') : data[this.options.keyField].toString()
  }

  getParentKey(key) {
    const node = this.getNode(key)
    if (node) {
      const parentNode = this.getParentNode(node)
      if (parentNode) {
        return this.getKey(parentNode)
      } else {
        return null
      }
    }
    return null
  }

  getPreviousKey(key) {
    const node = this.getNode(key)
    if (node) {
      const previousNode = this.getPreviousSiblingNode(node)
      if (previousNode) {
        return this.getKey(previousNode)
      } else {
        return null
      }
    }
    return null
  }

  getNextKey(key) {
    const node = this.getNode(key)
    if (node) {
      const nextNode = this.getNextSiblingNode(node)
      if (nextNode) {
        return this.getKey(nextNode)
      } else {
        return null
      }
    }
    return null
  }

  getParentNode(target) {
    try {
      const node = isElement(target) ? target : this.getNode(target)
      return node.parentElement.parentElement.previousElementSibling
    } catch (e) {
      return null
    }
  }

  getPreviousSiblingNode(target) {
    try {
      const node = isElement(target) ? target : this.getNode(target)
      return node.parentElement.previousElementSibling.querySelector('.tree-chart-content')
    } catch (e) {
      return null
    }
  }

  getNextSiblingNode(target) {
    try {
      const node = isElement(target) ? target : this.getNode(target)
      return node.parentElement.nextElementSibling.querySelector('.tree-chart-content')
    } catch (e) {
      return null
    }
  }

  insertNode(target, origin, type) {
    const targetNode = isElement(target) ? target : this.getNode(target)
    const targetNodeContainer = targetNode.parentElement
    const targetParentNode = this.getParentNode(targetNode)

    // 限制不能给根节点添加兄弟元素
    if (targetNode === this.rootNode && /next|previous/.test(type)) return

    const isNewNode = /Object/.test(Object.prototype.toString.call(origin))

    let originNode = null
    if (isNewNode) {
      originNode = this.createNode(origin)
    } else {
      originNode = isElement(origin) ? origin : this.getNode(origin)
    }
    let originNodeContainer = null
    if (isNewNode) {
      originNodeContainer = this.createNodeContainer()
      originNodeContainer.appendChild(originNode)
    } else {
      originNodeContainer = originNode.parentElement
    }
    const originKey = this.getKey(isNewNode ? origin : originNode)
    const originParentNode = this.getParentNode(originNode)

    if (type === 'child') {
      const childContainer = targetNodeContainer.querySelector('.tree-chart-children-container')
      // 本身存在子节点的情况
      if (childContainer) {
        childContainer.appendChild(originNodeContainer)
        const childKeyStr = targetNode.getAttribute('data-children') || ''
        targetNode.setAttribute('data-children', `${childKeyStr},${originKey}`)
      } else {
        // 没有任何子节点的话创建一个容器
        const newChildContainer = document.createElement('div')
        newChildContainer.classList.add('tree-chart-children-container')
        newChildContainer.style.marginLeft = `${this.options.distanceX}px`
        newChildContainer.appendChild(originNodeContainer)
        targetNodeContainer.appendChild(newChildContainer)
        targetNode.setAttribute('data-children', originKey)
      }
    }
    if (type === 'previous') {
      targetNodeContainer.parentElement.insertBefore(originNodeContainer, targetNodeContainer)
      targetParentNode.setAttribute('data-children', `${targetParentNode.getAttribute('data-children')},${originKey}`)
    }
    if (type === 'next') {
      targetNodeContainer.parentElement.insertBefore(originNodeContainer, targetNodeContainer.nextElementSibling)
      targetParentNode.setAttribute('data-children', `${targetParentNode.getAttribute('data-children')},${originKey}`)
    }

    // 删除原先的节点的data-children
    if (!isNewNode) {
      const oldChildrenKeys = originParentNode.getAttribute('data-children').split(',')
      if (oldChildrenKeys.length > 1) {
        oldChildrenKeys.splice(oldChildrenKeys.indexOf(originKey), 1)
        originParentNode.setAttribute('data-children', oldChildrenKeys.join())
      } else {
        originParentNode.removeAttribute('data-children')
        originParentNode.parentElement.removeChild(originParentNode.nextElementSibling)
      }
    }

    // 处理收起展开状态
    if (this.unfold) {
      // 节点被移除后没有子节点就移除展开元素
      if (!isNewNode && !originParentNode.nextElementSibling) {
        const originUnfoldElement = originParentNode.querySelector('.tree-chart-unfold')
        originUnfoldElement && originParentNode.removeChild(originUnfoldElement)
      }
      // 作为子节点插入的元素检测父新的父元素是否有展开按钮
      if (type === 'child') {
        const targetUnfoldElement = targetNode.querySelector('.tree-chart-unfold')
        !targetUnfoldElement && this.addUnfoldElement(targetNode)
      }
    }

    isNewNode && this.setNodeHook(originNode)
    this.reloadLink()
  }

  removeNode(target) {
    const targetKey = isElement(target) ? this.getKey(target) : target
    const targetNode = isElement(target) ? target : this.getNode(target)
    if (targetNode) {
      if (targetNode === this.rootNode) return
      const targetNodeContainer = targetNode.parentElement
      const parentNode = this.getParentNode(targetNode)

      // 删除父节点data-children
      const parentChildrenKeys = parentNode.getAttribute('data-children').split(',')
      const targetIndex = parentChildrenKeys.indexOf(targetKey)
      targetIndex > -1 && parentChildrenKeys.splice(targetIndex, 1)
      parentNode.setAttribute('data-children', parentChildrenKeys.join())

      // 移除当前节点
      targetNodeContainer.parentElement.removeChild(targetNodeContainer)
      this.reloadLink()
    }
  }

  getCurrentEventNode(target) {
    // 忽略展开按钮
    if (target.classList.contains('tree-chart-unfold')) return
    if (target.classList.contains('tree-chart-content')) return target
    let searchElement = target
    while (this.rootNodeContainer !== searchElement) {
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

  setEventHook() {
    const options = this.options
    const rootNodeContainer = this.rootNodeContainer

    // 用mouseEvent来实现click主要是为了区别dragstart和click的行为
    const clickHook = options.onclick
    if (typeof clickHook === 'function') {
      let oldNode = null
      rootNodeContainer.addEventListener('mousedown', e => {
        if (e.button !== 0) return
        oldNode = this.getCurrentEventNode(e.target)
      })
      rootNodeContainer.addEventListener('mouseup', e => {
        if (e.button !== 0) return
        const node = this.getCurrentEventNode(e.target)
        if (!node) return
        node === oldNode && !this.isDragging() && clickHook({ key: this.getKey(node), element: node }, e)
      })
    }

    if (typeof options.mouseenter === 'function' || typeof options.mouseleave === 'function') {
      rootNodeContainer.querySelectorAll('.tree-render-container').forEach(node => {
        this.setNodeHook(node)
      })
    }
  }

  setNodeHook(node) {
    const options = this.options
    const mouseenterHook = options.mouseenter
    const mouseleaveHook = options.mouseleave
    const argumentData = { key: this.getKey(node), element: node }
    typeof mouseenterHook === 'function' && node.addEventListener('mouseenter', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      mouseenterHook(argumentData, e)
    })
    typeof mouseleaveHook === 'function' && node.addEventListener('mouseleave', e => {
      // 忽略拖动被覆盖的情况
      if (this.isDragging()) return
      mouseleaveHook(argumentData, e)
    })
  }

  // 绑定拖动事件
  setDrag() {
    const options = this.options
    const rootNodeContainer = this.rootNodeContainer
    const rootContainer = this.rootContainer

    // 设置镜像层
    const ghostContainer = document.createElement('div')
    ghostContainer.classList.add('tree-chart-ghost-container')
    rootContainer.appendChild(ghostContainer)

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
    const dragstartHook = typeof options.ondragstart === 'function' && options.ondragstart

    rootNodeContainer.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      const dragNode = this.getCurrentEventNode(e.target)
      if (!dragNode) return
      // 根节点不允许拖动
      if (dragNode === this.rootNode) return
      // 用户禁止拖动的节点
      if (dragNode.classList.contains('not-allow-drag')) return
      dragData.element = dragNode
      dragData.ghostElement = dragNode.cloneNode(true)
      const { left, top } = this.positionData[this.getKey(dragNode)]
      dragData.eventOffsetX = e.clientX + rootContainer.scrollLeft - left
      dragData.eventOffsetY = e.clientY + rootContainer.scrollTop - top
    })
    rootNodeContainer.addEventListener('mousemove', e => {
      if (e.button !== 0) return
      if (dragData.element) {
        // 处理Chrome76版本长按不移动也会触发的情况
        if (e.movementX === 0 && e.movementY === 0) return
        // 清除文字选择对拖动的影响
        getSelection ? getSelection().removeAllRanges() : document.selection.empty()
        rootNodeContainer.classList.add('cursor-move')
        // 添加镜像元素
        !dragData.ghostContainer.contains(dragData.ghostElement) && dragData.ghostContainer.appendChild(dragData.ghostElement)
        dragData.ghostTranslateX = e.clientX + rootContainer.scrollLeft - dragData.eventOffsetX
        dragData.ghostTranslateY = e.clientY + rootContainer.scrollTop - dragData.eventOffsetY
        dragData.ghostElement.style.transform = `translate(${dragData.ghostTranslateX}px, ${dragData.ghostTranslateY}px)`
        const ghostPosition = this.getGhostPosition()
        this.setDragEffect(ghostPosition)
        // 跟随滚动
        this.followScroll(ghostPosition)
        if (!dragstartLock && dragstartHook) {
          dragstartLock = true
          dragstartHook({ key: this.getKey(dragData.element), element: dragData.element.childNodes[0] })
        }
      }
    })
    rootNodeContainer.addEventListener('mouseup', e => {
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
        this.insertNode(targetNode, dragNode, type)
        // 如果目标节点是折叠状态，插入子节点后自动展开
        if (type === 'child' && childrenIsFold(targetNode)) {
          this.toggleFold(this.getKey(targetNode))
        }
        const dragendHook = options.ondragend
        typeof dragendHook === 'function' && dragendHook(
          { key: this.getKey(targetNode), element: targetNode },
          { key: this.getKey(dragNode), element: dragNode },
          type)
      }
    })

    const cancelDrag = () => {
      if (!dragData.element) return
      this.rootNodeContainer.classList.remove('cursor-move')
      dragData.element = null
      dragData.ghostContainer.innerHTML = ''
      dragData.ghostElement = null
      dragData.ghostTranslateX = 0
      dragData.ghostTranslateY = 0
      dragData.eventOffsetX = 0
      dragData.eventOffsetY = 0
      this.removeDragEffect()
      this.stopFollowScroll()
      this.resize()
    }
    this.cancelDrag = cancelDrag.bind(this)
    window.addEventListener('mouseup', this.cancelDrag)

    // 考虑滚动情况
    const oldScroll = {
      top: rootContainer.scrollTop,
      left: rootContainer.scrollLeft
    }
    rootContainer.addEventListener('scroll', () => {
      if (dragData.element && dragData.ghostElement) {
        dragData.ghostTranslateY = dragData.ghostTranslateY + rootContainer.scrollTop - oldScroll.top
        dragData.ghostTranslateX = dragData.ghostTranslateX + rootContainer.scrollLeft - oldScroll.left
        dragData.ghostElement.style.transform = `translate(${dragData.ghostTranslateX}px, ${dragData.ghostTranslateY}px)`
        this.setDragEffect(this.getGhostPosition())
      }
      oldScroll.top = rootContainer.scrollTop
      oldScroll.left = rootContainer.scrollLeft
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
    const tempLink = this.linkContainer.querySelector('.line-from-to')
    tempLink && this.linkContainer.removeChild(tempLink)
    const collideNode = document.querySelector('.collide-node')
    collideNode && collideNode.classList.remove('collide-node', 'become-previous', 'become-next', 'become-child')
    const tempChildrenContainer = document.querySelector('.temp-children-container')
    tempChildrenContainer && tempChildrenContainer.parentElement.removeChild(tempChildrenContainer)
  }

  // 生成拖动效果
  createDragEffect(coverNode, { top: ghostTop, bottom: ghostBottom }) {
    let insertType = ''
    let from = null
    let to = null

    const dragElement = this.dragData.element
    const coverNodeKey = this.getKey(coverNode)
    const { top: coverNodeTop, bottom: coverNodeBottom, left: coverNodeLeft, right: coverNodeRight } = this.positionData[coverNodeKey]

    // 拖到父节点时只能作为兄弟节点插入
    const coverIsParent = coverNode === this.getParentNode(dragElement)
    // 禁止插入到下一个兄弟节点的上面
    const coverIsNext = coverNode === this.getNextSiblingNode(dragElement)
    // 禁止插入到上一个兄弟节点的下面
    const coverIsPrevious = coverNode === this.getPreviousSiblingNode(dragElement)

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
    if (!existAllow) return

    // 如果被覆盖的是根节点的话只允许作为子节点插入
    if (coverNode === this.rootNode) {
      if (!allowConfig.child) return
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

      if (insertType === '') return
    }
    coverNode.classList.add(`become-${insertType}`, 'collide-node')

    if (insertType === 'previous' || insertType === 'next') {
      const parentKey = this.getKey(this.getParentNode(coverNode))
      const parentPosition = this.positionData[parentKey]
      from = {
        x: parentPosition.right,
        y: (parentPosition.top + parentPosition.bottom) / 2,
        key: 'from'
      }
      to = {
        x: coverNodeLeft,
        y: insertType === 'previous' ? coverNodeTop - 20 : coverNodeBottom + 20,
        key: 'to'
      }
    } else {
      const createTempChildNode = () => {
        const childrenContainer = document.createElement('div')
        childrenContainer.classList.add('tree-chart-children-container', 'temp-children-container')
        childrenContainer.style.marginLeft = `${this.options.distanceX}px`

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
          x: coverNodeRight + this.options.distanceX,
          y: (coverNodeTop + coverNodeBottom) / 2,
          key: 'to'
        }
        this.resize()
      }
      from = {
        x: coverNodeRight,
        y: (coverNodeTop + coverNodeBottom) / 2,
        key: 'from'
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
            key: 'to'
          }
        }
      } else {
        // 没有子节点的情况创建一个临时节点
        createTempChildNode()
      }
    }

    this.drawLine(from, to)
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
      !isNaN(flagItem) && data.list.forEach(item => {
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
      // 不可拖到子节点上
      if (this.dragData.element.parentElement.contains(node)) return
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
    const { clientWidth, clientHeight } = this.rootNodeContainer
    const linkContainer = this.linkContainer
    linkContainer.setAttribute('width', `${clientWidth}px`)
    linkContainer.setAttribute('height', `${clientHeight}px`)
    if (this.dragData.ghostContainer) {
      const ghostContainerStyle = this.dragData.ghostContainer.style
      ghostContainerStyle.width = `${clientWidth}px`
      ghostContainerStyle.height = `${clientHeight}px`
    }
  }

  followScroll({ left, top, right, bottom }) {
    const rootContainer = this.rootContainer
    const { scrollLeft, scrollTop, clientWidth, clientHeight, scrollWidth, scrollHeight } = rootContainer
    const distance = this.options.scrollTriggerDistance
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
      const scrollSpeed = this.options.scrollSpeed
      this.foolowScrollData.interval = setInterval(() => {
        if (direct === 'Left' || direct === 'Top') {
          rootContainer[`scroll${direct}`] -= scrollSpeed
        } else {
          if (direct === 'Right') {
            rootContainer.scrollLeft += scrollSpeed
          } else {
            rootContainer.scrollTop += scrollSpeed
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
    this.foolowScrollData.interval && clearInterval(this.foolowScrollData.interval)
    if (clearDirect) this.foolowScrollData.direct = ''
  }

  destroy() {
    if (this.draggable) {
      window.removeEventListener('mouseup', this.cancelDrag)
    }
  }
}

export default TreeChart