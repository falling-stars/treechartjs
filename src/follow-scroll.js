export default class FollowScroll {
  constructor(option) {
    const { scrollContainer, eventContainer, scrollTriggerDistance } = option
    this.scrollContainer = scrollContainer
    this.eventContainer = eventContainer
    this.triggerDistance = scrollTriggerDistance || 0
    this.targetNode = null
    this.interval = 0
    this.directData = {
      left: false,
      right: false,
      top: false,
      bottom: false
    }
    this.setEvent()
  }

  setEvent() {
    const { scrollContainer, eventContainer, triggerDistance, directData } = this
    this.mouseMoveHandler = e => {
      const { button, movementX, movementY } = e
      // 处理Chrome76版本长按不移动也会触发的情况
      if (movementX === 0 && movementY === 0) return
      const { targetNode } = this
      if (button || !targetNode) return

      const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = scrollContainer
      const { left: scrollContainerLeft, right: scrollContainerRight, top: scrollContainerTop, bottom: scrollContainerBottom } = scrollContainer.getBoundingClientRect()
      const { left: targetNodeLeft, right: targetNodeRight, top: targetNodeTop, bottom: targetNodeBottom } = targetNode.getBoundingClientRect()

      if (targetNodeLeft - scrollContainerLeft < triggerDistance) directData.left = true
      if (targetNodeTop - scrollContainerTop < triggerDistance) directData.top = true
      if (scrollContainerRight - targetNodeRight < triggerDistance) directData.right = true
      if (scrollContainerBottom - targetNodeBottom < triggerDistance) directData.bottom = true
      if (movementX > 0 || scrollLeft === 0) directData.left = false
      if (movementY > 0 || scrollTop === 0) directData.top = false
      if (movementX < 0 || scrollLeft + clientWidth >= scrollWidth) directData.right = false
      if (movementY < 0 || scrollTop + clientHeight >= scrollHeight) directData.bottom = false

      this.triggerScroll()
    }
    eventContainer.addEventListener('mousemove', this.mouseMoveHandler)
  }

  triggerScroll() {
    const { directData, scrollContainer } = this
    let existDirect = false
    for (const key in directData) {
      if (directData[key]) {
        existDirect = true
        break
      }
    }
    if (!existDirect) return this.stop()
    if (this.interval) return
    this.interval = setInterval(() => {
      let { scrollLeft, scrollTop } = scrollContainer
      if (directData.left) scrollLeft--
      if (directData.right) scrollLeft++
      if (directData.top) scrollTop--
      if (directData.bottom) scrollTop++
      scrollContainer.scrollLeft = scrollLeft
      scrollContainer.scrollTop = scrollTop
    }, 20)
  }

  start(targetNode) {
    this.targetNode = targetNode
  }

  stop() {
    this.targetNode = null
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
  }

  destroy() {
    this.eventContainer.removeEventListener('mousemove', this.mouseMoveHandler)
    this.targetNode = this.scrollContainer = this.eventContainer = null
    this.interval = 0
  }
}
