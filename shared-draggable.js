/**
 * @file shared-draggable.js
 * @description 通用拖拽工具 - 为浮动按钮提供拖拽+靠边吸附+位置持久化功能
 * @version 1.0.0
 *
 * 功能：
 * - 鼠标/触摸拖拽移动元素
 * - 移动距离超过5px才触发拖拽（区分点击和拖拽）
 * - 靠边自动吸附
 * - localStorage 位置持久化
 *
 * 使用方式：
 *   SharedDraggable.make(element, storageKey)
 */

(function initSharedDraggable(global) {
  "use strict";

  /** 吸附阈值（像素） */
  var SNAP_THRESHOLD = 8;
  /** 移动距离阈值（像素）- 超过此距离才触发拖拽 */
  var MOVE_THRESHOLD = 5;

  /**
   * 启用元素的拖拽功能
   * @param {HTMLElement} element - 要拖拽的元素
   * @param {string} storageKey - localStorage 中的存储键名
   * @returns {{ resetPosition: Function }} 控制对象
   */
  function make(element, storageKey) {
    if (!element) return { resetPosition: function () {} };

    var isDragging = false;
    var startX = 0;
    var startY = 0;
    var startLeft = 0;
    var startTop = 0;
    var hasMoved = false;

    /** 从 localStorage 恢复位置 */
    restorePosition();

    /** 绑定事件（初始化时绑定一次，不再移除） */
    element.addEventListener("mousedown", onMouseDown);
    element.addEventListener("touchstart", onTouchStart, { passive: false });

    return { resetPosition: resetPosition };

    /** ========== 事件处理 ========== */

    function onMouseDown(e) {
      if (e.button !== 0) return;
      startDrag(e.clientX, e.clientY);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e) {
      moveDrag(e.clientX, e.clientY);
    }

    function onMouseUp() {
      endDrag();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      startDrag(t.clientX, t.clientY);
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    }

    function onTouchMove(e) {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      var t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    }

    function onTouchEnd() {
      endDrag();
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    }

    /** ========== 拖拽逻辑 ========== */

    function startDrag(x, y) {
      var rect = element.getBoundingClientRect();
      isDragging = true;
      hasMoved = false;
      startX = x;
      startY = y;
      startLeft = rect.left;
      startTop = rect.top;
      element.style.transition = "none";
    }

    function moveDrag(x, y) {
      if (!isDragging) return;
      var dx = x - startX;
      var dy = y - startY;
      if (!hasMoved && Math.sqrt(dx * dx + dy * dy) < MOVE_THRESHOLD) {
        return;
      }
      hasMoved = true;
      var newLeft = startLeft + dx;
      var newTop = startTop + dy;
      element.style.position = "fixed";
      element.style.left = newLeft + "px";
      element.style.top = newTop + "px";
      element.style.right = "auto";
      element.style.bottom = "auto";
    }

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      if (!hasMoved) return;
      snapToEdge();
      savePosition();
    }

    /** ========== 吸附逻辑 ========== */

    function snapToEdge() {
      var rect = element.getBoundingClientRect();
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var left = rect.left;
      var top = rect.top;
      var right = vw - rect.right;
      var bottom = vh - rect.bottom;

      var snapped = false;
      var snapLeft = left;
      var snapTop = top;

      // 只有当元素靠近边缘时才吸附
      if (left < SNAP_THRESHOLD) {
        snapLeft = 0;
        snapped = true;
      } else if (right < SNAP_THRESHOLD) {
        snapLeft = vw - rect.width;
        snapped = true;
      }

      if (top < SNAP_THRESHOLD) {
        snapTop = 0;
        snapped = true;
      } else if (bottom < SNAP_THRESHOLD) {
        snapTop = vh - rect.height;
        snapped = true;
      }

      if (snapped) {
        element.style.transition = "left 0.2s ease, top 0.2s ease";
        element.style.left = snapLeft + "px";
        element.style.top = snapTop + "px";
      }
    }

    /** ========== 持久化 ========== */

    function savePosition() {
      try {
        var rect = element.getBoundingClientRect();
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var data = {
          left: rect.left / vw,
          top: rect.top / vh,
          vw: vw,
          vh: vh,
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {}
    }

    function restorePosition() {
      try {
        var raw = localStorage.getItem(storageKey);
        if (!raw) return;
        var data = JSON.parse(raw);
        if (!data || typeof data.left !== "number") return;
        element.style.position = "fixed";
        element.style.left = data.left * window.innerWidth + "px";
        element.style.top = data.top * window.innerHeight + "px";
        element.style.right = "auto";
        element.style.bottom = "auto";
      } catch (e) {}
    }

    function resetPosition() {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
      element.style.position = "";
      element.style.left = "";
      element.style.top = "";
      element.style.right = "";
      element.style.bottom = "";
      element.style.transition = "";
    }
  }

  /** ========== 全局导出 ========== */
  global.SharedDraggable = { make: make };
})(window);
