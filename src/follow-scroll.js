export class FollowScroll {
  constructor(option) {
    const { scrollContainer, scrollTriggerDistance } = option
    this.scrollContainer = scrollContainer
    this.triggerDistance = scrollTriggerDistance
    this.targetNode = null
    this.directData = {
      left: false,
      right: false,
      top: false,
      bottom: false
    }
    this.setEvent()
  }

  setEvent() {
    this.mouseMoveHandler = e => {
      const { button, movementX, movementY, scrollContainer, triggerDistance } = e
      const { targetNode } = this
      if (button || !targetNode) return
      // 处理Chrome76版本长按不移动也会触发的情况
      if (movementX === 0 && movementY === 0) return
      console.log(movementX)
    }
    window.addEventListener('mousemove', this.mouseMoveHandler)
  }

  start(targetNode) {
    this.targetNode = targetNode
  }

  stop() {
    this.targetNode = null
  }

  destroy() {
    window.removeEventListener('mousemove', this.mouseMoveHandler)
  }
}
