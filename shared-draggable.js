/**
 * 通用浮动元素拖拽工具
 * --------------------------------------------------
 * 为浮动按钮/面板提供拖拽移动与靠边吸附能力，避免遮挡页面内容。
 *
 * 设计目标：
 *   1. 支持鼠标和触摸事件，兼容移动端。
 *   2. 拖拽结束后自动吸附到最近的屏幕边缘。
 *   3. 位置持久化到 localStorage，刷新后保持用户选择的位置。
 *   4. 使用移动距离区分点击和拖拽（移动超过 5px 才认为是拖拽）。
 *
 * 使用方式：
 *   <script src="../shared-draggable.js"></script>
 *   <script>
 *     SharedDraggable.make(element, {
 *       storageKey: 'my-button-position',  // 存储键
 *       snapThreshold: 30,                 // 吸附阈值（像素）
 *       edgeOffset: 16,                    // 边缘偏移量
 *     });
 *   </script>
 */

(function initSharedDraggable() {
  "use strict";

  /** 默认配置 */
  var DEFAULT_OPTIONS = {
    /** localStorage 键名，用于持久化位置 */
    storageKey: "",
    /** 吸附阈值：元素中心距边缘小于此值时自动吸附（像素） */
    snapThreshold: 30,
    /** 边缘偏移量：吸附后距离屏幕边缘的距离（像素） */
    edgeOffset: 16,
    /** 启动拖拽的最小移动距离（像素） */
    dragThreshold: 5,
  };

  /**
   * 读取 localStorage 中的 JSON 值。
   * @param {string} key 键名
   * @param {*} fallback 兜底值
   * @returns {*} 解析后的值
   */
  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  /**
   * 写入 localStorage 的 JSON 值。
   * @param {string} key 键名
   * @param {*} value 值
   * @returns {void}
   */
  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // 存储空间不足时静默失败
    }
  }

  /**
   * 计算吸附后的最终位置。
   * @param {number} x 当前 X 坐标
   * @param {number} y 当前 Y 坐标
   * @param {number} elWidth 元素宽度
   * @param {number} elHeight 元素高度
   * @param {object} options 配置
   * @returns {{x: number, y: number}}
   */
  function calcSnapPosition(x, y, elWidth, elHeight, options) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var threshold = options.snapThreshold;
    var offset = options.edgeOffset;

    var centerX = x + elWidth / 2;
    var centerY = y + elHeight / 2;

    var distLeft = centerX;
    var distRight = vw - centerX;
    var distTop = centerY;
    var distBottom = vh - centerY;

    var snappedX = x;
    var snappedY = y;

    // 找到最小距离的方向并吸附
    var minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist <= threshold) {
      if (minDist === distLeft) {
        snappedX = offset;
      } else if (minDist === distRight) {
        snappedX = vw - elWidth - offset;
      } else if (minDist === distTop) {
        snappedY = offset;
      } else if (minDist === distBottom) {
        snappedY = vh - elHeight - offset;
      }
    }

    // 确保不超出屏幕边界
    snappedX = Math.max(offset, Math.min(snappedX, vw - elWidth - offset));
    snappedY = Math.max(offset, Math.min(snappedY, vh - elHeight - offset));

    return { x: snappedX, y: snappedY };
  }

  /**
   * 为元素启用拖拽功能。
   * @param {HTMLElement} element 需要拖拽的元素
   * @param {object} [options] 配置选项
   * @returns {{destroy: Function, setPosition: Function}} 控制接口
   */
  function makeDraggable(element, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});

    // 拖拽状态
    var state = {
      isPressed: false,
      isDragging: false,
      startClientX: 0,
      startClientY: 0,
      startElementX: 0,
      startElementY: 0,
    };

    // 保存原始样式
    var originalPosition = element.style.position;
    var originalTop = element.style.top;
    var originalLeft = element.style.left;
    var originalRight = element.style.right;
    var originalBottom = element.style.bottom;

    /**
     * 应用位置到元素。
     * @param {number} x X 坐标
     * @param {number} y Y 坐标
     * @returns {void}
     */
    function applyPosition(x, y) {
      element.style.left = x + "px";
      element.style.top = y + "px";
      element.style.right = "auto";
      element.style.bottom = "auto";
      element.style.position = "fixed";
    }

    /**
     * 获取当前元素位置。
     * @returns {{x: number, y: number}}
     */
    function getCurrentPosition() {
      var rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }

    /**
     * 处理指针按下。
     * @param {MouseEvent|TouchEvent} e 事件对象
     * @returns {void}
     */
    function onPointerDown(e) {
      // 忽略右键点击
      if (e.type === "mousedown" && e.button !== 0) {
        return;
      }

      state.isPressed = true;
      state.isDragging = false;

      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      state.startClientX = clientX;
      state.startClientY = clientY;

      var pos = getCurrentPosition();
      state.startElementX = pos.x;
      state.startElementY = pos.y;
    }

    /**
     * 处理指针移动。
     * @param {MouseEvent|TouchEvent} e 事件对象
     * @returns {void}
     */
    function onPointerMove(e) {
      if (!state.isPressed) {
        return;
      }

      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      var deltaX = clientX - state.startClientX;
      var deltaY = clientY - state.startClientY;
      var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 未达到拖拽阈值，认为是点击
      if (!state.isDragging && distance < opts.dragThreshold) {
        return;
      }

      // 开始拖拽
      if (!state.isDragging) {
        state.isDragging = true;
        element.style.transition = "none";
        element.style.cursor = "grabbing";
      }

      e.preventDefault();

      var newX = state.startElementX + deltaX;
      var newY = state.startElementY + deltaY;
      applyPosition(newX, newY);
    }

    /**
     * 处理指针抬起。
     * @returns {void}
     */
    function onPointerUp() {
      if (!state.isPressed) {
        return;
      }

      var wasDragging = state.isDragging;
      state.isPressed = false;
      state.isDragging = false;
      element.style.cursor = "grab";

      if (wasDragging) {
        // 恢复过渡动画
        element.style.transition = "";

        // 计算吸附位置
        var rect = element.getBoundingClientRect();
        var finalPos = calcSnapPosition(
          rect.left,
          rect.top,
          rect.width,
          rect.height,
          opts,
        );
        applyPosition(finalPos.x, finalPos.y);

        // 持久化位置
        if (opts.storageKey) {
          writeJson(opts.storageKey, finalPos);
        }

        // 阻止后续 click 事件
        element.addEventListener(
          "click",
          function preventClick(e) {
            e.preventDefault();
            e.stopPropagation();
            element.removeEventListener("click", preventClick, true);
          },
          true,
        );
      }
    }

    // 在元素上绑定 mousedown
    element.addEventListener("mousedown", onPointerDown);
    element.addEventListener(
      "touchstart",
      function (e) {
        onPointerDown(e);
      },
      { passive: true },
    );

    // 在 document 上绑定 mousemove 和 mouseup（不移除，保持持续可用）
    document.addEventListener("mousemove", onPointerMove, { passive: false });
    document.addEventListener("mouseup", onPointerUp);
    document.addEventListener("touchmove", onPointerMove, { passive: false });
    document.addEventListener("touchend", onPointerUp);

    // 添加拖拽视觉提示
    element.style.cursor = "grab";
    element.style.touchAction = "none";

    // 初始化位置
    var storedPosition = opts.storageKey
      ? readJson(opts.storageKey, null)
      : null;
    if (storedPosition) {
      applyPosition(storedPosition.x, storedPosition.y);
    }

    return {
      /**
       * 销毁拖拽功能，恢复元素原始状态。
       * @returns {void}
       */
      destroy: function destroy() {
        element.removeEventListener("mousedown", onPointerDown);
        document.removeEventListener("mousemove", onPointerMove);
        document.removeEventListener("mouseup", onPointerUp);
        document.removeEventListener("touchmove", onPointerMove);
        document.removeEventListener("touchend", onPointerUp);
        element.style.cursor = "";
        element.style.touchAction = "";
        element.style.position = originalPosition;
        element.style.top = originalTop;
        element.style.left = originalLeft;
        element.style.right = originalRight;
        element.style.bottom = originalBottom;
      },
      /**
       * 手动设置元素位置。
       * @param {number} x X 坐标
       * @param {number} y Y 坐标
       * @returns {void}
       */
      setPosition: function setPosition(x, y) {
        applyPosition(x, y);
      },
    };
  }

  /**
   * 暴露全局 API。
   */
  window.SharedDraggable = {
    make: makeDraggable,
  };
})();
