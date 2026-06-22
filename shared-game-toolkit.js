/**
 * 共享游戏工具条
 * --------------------------------------------------
 * 统一为所有正式游戏页提供：截图、导出文件、撤销、重置、评分判定。
 *
 * 设计目标：
 *   1. 不依赖任何外部库，可直接挂在 HTML 页脚使用。
 *   2. 不破坏页面已有的撤销/重置/导出/截图实现，使用「适配优先」策略：
 *      - 若页面已声明对应 hook（且 hook 返回 true），则使用页面原生实现；
 *      - 否则共享工具条回退到内置实现，避免行为不一致。
 *   3. 评分判定支持两类规则：
 *      - 操作完成型（completion）：要求达成 N 个关键操作即得分；
 *      - 评价达标型（evaluation）：要求建筑评价分数 ≥ 阈值才能得分。
 *   4. 视觉位置避开飞书作业提交按钮（右下），工具条放在左下角并默认折叠为
 *      单个圆形浮动入口，点击展开按钮组与达标状态条；移动端折叠后只占
 *      角落 56px，不遮挡主舞台。
 *   5. 通过 `hideSelectors` 让页面声明哪些旧按钮由工具条接管，避免与页面
 *      原有按钮在视觉上重复（保留 DOM 与原有事件，仅隐藏显示）。
 *
 * 使用方式（在游戏页 <body> 末尾追加）：
 *   <script src="../shared-game-toolkit.js" defer></script>
 *   <script>
 *     window.SHARED_GAME_TOOLKIT_CONFIG = {
 *       gameId: '游戏4',
 *       gameTitle: '立面造型系统',
 *       captureTarget: '.canvas-area',
 *       scoring: { type: 'completion', threshold: 4, total: 5,
 *                  description: '完成 4 项关键操作即可达标' },
 *       hideSelectors: ['#legacy-undo-btn', '#legacy-clear-btn'],
 *       hooks: {
 *         capture:    () => false,
 *         exportFile: () => (typeof exportDesign === 'function' ? (exportDesign(), true) : false),
 *         undo:       () => (typeof undoAction   === 'function' ? (undoAction(),   true) : false),
 *         reset:      () => (typeof clearCanvas  === 'function' ? (clearCanvas(),  true) : false),
 *         readScore:  () => window.gameState?.completedTasks?.size ?? 0
 *       }
 *     };
 *   </script>
 */

(function initSharedGameToolkit() {
  "use strict";

  /**
   * 工具条挂载入口
   * @returns {void}
   */
  function bootstrap() {
    // 防御：避免重复挂载
    if (document.getElementById("shared-game-toolkit-root")) {
      return;
    }
    const config = normalizeConfig(window.SHARED_GAME_TOOLKIT_CONFIG || {});
    injectStyles();
    const root = renderToolbar(config);
    document.body.appendChild(root);
    // 隐藏页面里被本工具条接管的旧按钮（保留 DOM 与事件，仅隐藏外观）
    hideLegacyButtons(config);
    // 默认展示当前评分判定状态
    refreshScore(config);
    // 监听窗口尺寸变化，避免移动端被遮挡
    window.addEventListener("resize", () => positionToolbar(root));
    positionToolbar(root);
  }

  /**
   * 规范化配置对象，补齐默认值
   * @param {object} userConfig 页面自定义配置
   * @returns {object} 完整配置
   */
  function normalizeConfig(userConfig) {
    const scoring = Object.assign(
      {
        type: "completion",
        threshold: 1,
        total: 1,
        description: "完成关键操作即可达标",
      },
      userConfig.scoring || {},
    );
    const hooks = Object.assign(
      {
        /** 截图回调，返回 true 表示已由页面处理 */
        capture: () => false,
        /** 撤销回调，返回 true 表示已由页面处理 */
        undo: () => false,
        /** 重置回调，返回 true 表示已由页面处理 */
        reset: () => false,
        /** 导出文件回调，返回 true 表示已由页面处理 */
        exportFile: () => false,
        /** 读取分数/操作数 */
        readScore: () => 0,
      },
      userConfig.hooks || {},
    );
    return {
      gameId: userConfig.gameId || "游戏",
      gameTitle: userConfig.gameTitle || "工作台",
      captureTarget: userConfig.captureTarget || "body",
      // 页面声明的「需被本工具条接管」的旧按钮选择器；防止视觉重复
      hideSelectors: Array.isArray(userConfig.hideSelectors)
        ? userConfig.hideSelectors
        : [],
      scoring,
      hooks,
    };
  }

  /**
   * 注入工具条样式
   * @returns {void}
   */
  function injectStyles() {
    if (document.getElementById("shared-game-toolkit-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "shared-game-toolkit-style";
    style.textContent = `
            #shared-game-toolkit-root {
                position: fixed;
                left: 16px;
                bottom: 16px;
                z-index: 99988;
                font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            }
            #shared-game-toolkit-root .sgt-fab {
                width: 48px;
                height: 48px;
                border-radius: 999px;
                border: none;
                cursor: pointer;
                background: linear-gradient(135deg, #4f6ef7, #6886ff);
                color: #ffffff;
                font-size: 20px;
                line-height: 1;
                box-shadow: 0 12px 28px rgba(79, 110, 247, 0.32);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #shared-game-toolkit-root .sgt-fab:hover {
                transform: translateY(-1px);
            }
            #shared-game-toolkit-root .sgt-panel {
                position: absolute;
                left: 0;
                bottom: 56px;
                width: min(280px, calc(100vw - 32px));
                display: none;
                flex-direction: column;
                gap: 8px;
                background: rgba(255, 255, 255, 0.96);
                border: 1px solid rgba(76, 102, 192, 0.18);
                box-shadow: 0 18px 36px rgba(47, 69, 145, 0.16);
                backdrop-filter: blur(16px);
                padding: 12px;
                border-radius: 14px;
            }
            #shared-game-toolkit-root.sgt-open .sgt-panel {
                display: flex;
            }
            #shared-game-toolkit-root .sgt-status {
                background: rgba(244, 247, 255, 0.9);
                border: 1px solid rgba(76, 102, 192, 0.16);
                border-radius: 10px;
                padding: 8px 10px;
                font-size: 12px;
                line-height: 1.5;
                color: #18212f;
            }
            #shared-game-toolkit-root .sgt-status .sgt-pass {
                color: #2bb48a;
                font-weight: 600;
            }
            #shared-game-toolkit-root .sgt-status .sgt-pending {
                color: #d68244;
                font-weight: 600;
            }
            #shared-game-toolkit-root .sgt-bar {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
            }
            #shared-game-toolkit-root .sgt-btn {
                appearance: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                line-height: 1.2;
                padding: 8px 10px;
                border-radius: 8px;
                background: linear-gradient(135deg, #4f6ef7, #6886ff);
                color: #ffffff;
                box-shadow: 0 4px 10px rgba(79, 110, 247, 0.22);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            #shared-game-toolkit-root .sgt-btn:hover {
                transform: translateY(-1px);
            }
            #shared-game-toolkit-root .sgt-btn.secondary {
                background: rgba(255, 255, 255, 0.95);
                color: #1d2742;
                border: 1px solid rgba(76, 102, 192, 0.22);
                box-shadow: none;
            }
            #shared-game-toolkit-root .sgt-btn.full {
                grid-column: span 2;
            }
            /* 隐藏被工具条接管的旧按钮，保留事件 */
            .sgt-legacy-hidden {
                display: none !important;
            }
            @media (max-width: 768px) {
                #shared-game-toolkit-root {
                    left: 12px;
                    bottom: 12px;
                }
                #shared-game-toolkit-root .sgt-panel {
                    width: min(260px, calc(100vw - 24px));
                }
            }
        `;
    document.head.appendChild(style);
  }

  /**
   * 渲染工具条 DOM（折叠浮窗），并启用拖拽功能。
   * @param {object} config 完整配置
   * @returns {HTMLElement}
   */
  function renderToolbar(config) {
    const root = document.createElement("div");
    root.id = "shared-game-toolkit-root";

    // 折叠态：单个浮动入口；展开后才显示按钮组与状态条
    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "sgt-fab";
    fab.title = "游戏工具：截图 / 导出 / 撤销 / 重置 / 评分（可拖拽）";
    fab.textContent = "🛠️";
    fab.addEventListener("click", () => {
      root.classList.toggle("sgt-open");
      if (root.classList.contains("sgt-open")) {
        refreshScore(config);
      }
    });
    root.appendChild(fab);

    const panel = document.createElement("div");
    panel.className = "sgt-panel";

    // 状态条：展示评分类型与达标情况
    const status = document.createElement("div");
    status.className = "sgt-status";
    status.id = "sgt-status";
    status.textContent = "加载中…";
    panel.appendChild(status);

    // 按钮区
    const bar = document.createElement("div");
    bar.className = "sgt-bar";

    appendButton(bar, "📸 截图", "primary", () => captureScreenshot(config));
    appendButton(bar, "📤 导出", "primary", () => triggerExport(config));
    appendButton(bar, "↩️ 撤销", "secondary", () => triggerUndo(config));
    appendButton(bar, "🧹 重置", "secondary", () => triggerReset(config));
    appendButton(bar, "🏅 刷新评分", "secondary full", () =>
      refreshScore(config, true),
    );

    panel.appendChild(bar);
    root.appendChild(panel);

    // 启用拖拽功能（延迟检测 SharedDraggable）
    enableDraggable(root, "sgt-toolbar-position");

    return root;
  }

  /**
   * 创建并追加按钮
   * @param {HTMLElement} container 容器
   * @param {string} label 按钮文字
   * @param {string} variant 视觉级别（可包含 'secondary'、'full'）
   * @param {Function} onClick 点击回调
   * @returns {void}
   */
  function appendButton(container, label, variant, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    const classes = ["sgt-btn"];
    if (variant && variant.includes("secondary")) classes.push("secondary");
    if (variant && variant.includes("full")) classes.push("full");
    btn.className = classes.join(" ");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    container.appendChild(btn);
  }

  /**
   * 隐藏被本工具条接管的旧按钮，避免视觉重复
   * @param {object} config 完整配置
   * @returns {void}
   */
  function hideLegacyButtons(config) {
    if (!config.hideSelectors || config.hideSelectors.length === 0) {
      return;
    }
    config.hideSelectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          el.classList.add("sgt-legacy-hidden");
        });
      } catch (err) {
        console.warn(
          "[shared-toolkit] hideSelectors 选择器无效：",
          selector,
          err,
        );
      }
    });
  }

  /**
   * 计算工具条相对位置；当左下方有固定底栏时上移避让
   * @param {HTMLElement} root 工具条根元素
   * @returns {void}
   */
  function positionToolbar(root) {
    const candidates = [
      ".app-footer",
      ".bottom-toolbar",
      ".dock",
      ".sticky-footer",
    ];
    let offset = 16;
    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (el && getComputedStyle(el).position === "fixed") {
        const rect = el.getBoundingClientRect();
        // 仅当底栏出现在工具条所在的左下角区域才避让
        if (rect.left < window.innerWidth / 2) {
          offset = Math.max(offset, rect.height + 12);
          break;
        }
      }
    }
    root.style.bottom = `${offset}px`;
  }

  /**
   * 动态加载 html2canvas 库（CDN），返回 Promise。
   * 如果页面上已存在 window.html2canvas 则直接 resolve。
   * @returns {Promise<Function>} html2canvas 函数
   */
  function ensureHtml2Canvas() {
    if (typeof window.html2canvas === "function") {
      return Promise.resolve(window.html2canvas);
    }
    // 去重：避免重复插入 <script>
    const existing = document.getElementById("sgt-html2canvas-cdn");
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => {
          if (typeof window.html2canvas === "function") {
            resolve(window.html2canvas);
          } else {
            reject(new Error("html2canvas 加载后未找到"));
          }
        });
        existing.addEventListener("error", () =>
          reject(new Error("html2canvas CDN 加载失败")),
        );
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "sgt-html2canvas-cdn";
      script.src =
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.onload = () => {
        if (typeof window.html2canvas === "function") {
          resolve(window.html2canvas);
        } else {
          reject(new Error("html2canvas 加载后未找到"));
        }
      };
      script.onerror = () => reject(new Error("html2canvas CDN 加载失败"));
      document.head.appendChild(script);
    });
  }

  /**
   * 截图：优先调用页面提供的 capture hook（如 html2canvas 或现成方案），
   *      若 hook 返回 false，再回退到内置 html2canvas 实现。
   *      截图完成后同时存储到共享位置供提交流程读取。
   * @param {object} config 配置
   * @returns {Promise<void>}
   */
  async function captureScreenshot(config) {
    // 优先调用页面 hook
    const handled = safeCall(config.hooks.capture);
    if (handled === true) {
      toast("已通过页面截图功能保存");
      return;
    }
    try {
      const html2canvas = await ensureHtml2Canvas();
      const target =
        document.querySelector(config.captureTarget) || document.body;
      const canvas = await html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scale: 2,
      });
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const fileName = `${config.gameId}-截图-${formatTime()}.png`;
            downloadBlob(blob, fileName);
            // 将截图存储到共享位置，供提交流程读取
            Promise.resolve(canvas.toDataURL("image/png")).then((dataUrl) => {
              storeScreenshotArtifact(dataUrl, fileName);
              toast("已保存截图（可随作业提交）");
            });
          } else {
            toast("截图失败（toBlob 返回空）");
          }
        },
        "image/png",
        1.0,
      );
    } catch (err) {
      console.error("[shared-toolkit] 截图失败：", err);
      toast("截图失败：" + (err.message || "未知错误"));
    }
  }

  /**
   * 触发文件下载
   * @param {Blob} blob 数据
   * @param {string} filename 文件名
   * @returns {void}
   */
  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /**
   * 时间戳，用于文件名
   * @returns {string}
   */
  function formatTime() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  /**
   * 触发导出：优先用页面 hook，否则导出当前评分摘要 JSON。
   *      导出完成后同时存储到共享位置供提交流程读取。
   * @param {object} config 配置
   * @returns {void}
   */
  function triggerExport(config) {
    const handled = safeCall(config.hooks.exportFile);
    if (handled === true) {
      // 页面原生导出已执行，存储一个标记表示已导出
      storeExportArtifact(
        JSON.stringify({ source: "native-export", timestamp: new Date().toISOString() }),
        `${config.gameId}-原生导出-${formatTime()}.json`,
        "application/json"
      );
      toast("已导出文件（可随作业提交）");
      return;
    }
    const summary = buildScoreSummary(config);
    const content = JSON.stringify(summary, null, 2);
    const fileName = `${config.gameId}-学习摘要-${formatTime()}.json`;
    const blob = new Blob([content], {
      type: "application/json;charset=utf-8",
    });
    downloadBlob(blob, fileName);
    // 将导出文件存储到共享位置，供提交流程读取
    storeExportArtifact(content, fileName, "application/json");
    toast("已导出学习摘要（可随作业提交）");
  }

  /**
   * 触发撤销：优先用页面 hook
   * @param {object} config 配置
   * @returns {void}
   */
  function triggerUndo(config) {
    const handled = safeCall(config.hooks.undo);
    if (handled === false || handled === undefined) {
      toast("当前页面暂无可撤销的操作");
      return;
    }
    toast("已撤销上一步");
    refreshScore(config);
  }

  /**
   * 触发重置：优先用页面 hook
   * @param {object} config 配置
   * @returns {void}
   */
  function triggerReset(config) {
    const ok = window.confirm("确定要重置当前进度吗？此操作不可撤销。");
    if (!ok) {
      return;
    }
    const handled = safeCall(config.hooks.reset);
    if (handled === false || handled === undefined) {
      toast("当前页面暂无可重置的状态");
      return;
    }
    toast("已重置当前进度");
    refreshScore(config);
  }

  /**
   * 安全调用 hook，吞掉异常并打印日志
   * @param {Function} fn 钩子
   * @returns {*} 钩子返回值
   */
  function safeCall(fn) {
    try {
      return typeof fn === "function" ? fn() : false;
    } catch (err) {
      console.warn("[shared-toolkit] hook 调用异常：", err);
      return false;
    }
  }

  /**
   * 计算当前是否达标
   * @param {object} config 配置
   * @returns {{value:number, passed:boolean, label:string}}
   */
  function evaluateScoring(config) {
    const value = Number(safeCall(config.hooks.readScore)) || 0;
    const { type, threshold, total } = config.scoring;
    const passed = value >= threshold;
    const label =
      type === "evaluation"
        ? `建筑评价 ${value} / ${total}（达标 ≥ ${threshold}）`
        : `已完成操作 ${value} / ${total}（达标 ≥ ${threshold}）`;
    return { value, passed, label };
  }

  /**
   * 构建可导出的评分摘要对象
   * @param {object} config 配置
   * @returns {object}
   */
  function buildScoreSummary(config) {
    const result = evaluateScoring(config);
    return {
      game: `${config.gameId} ${config.gameTitle}`,
      scoringType: config.scoring.type,
      threshold: config.scoring.threshold,
      total: config.scoring.total,
      currentValue: result.value,
      passed: result.passed,
      description: config.scoring.description,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * 刷新评分状态条
   * @param {object} config 配置
   * @param {boolean} [verbose=false] 是否同时弹出提示
   * @returns {void}
   */
  function refreshScore(config, verbose = false) {
    const status = document.getElementById("sgt-status");
    if (!status) {
      return;
    }
    const result = evaluateScoring(config);
    const tag = result.passed
      ? '<span class="sgt-pass">✅ 已达标</span>'
      : '<span class="sgt-pending">⏳ 未达标</span>';
    status.innerHTML = `${tag}　${escapeHtml(result.label)}　·　${escapeHtml(config.scoring.description)}`;
    if (verbose) {
      toast(result.passed ? "当前已达标" : "当前未达标，继续努力");
    }
  }

  /**
   * 简易 toast，避免依赖第三方库
   * @param {string} message 提示文本
   * @returns {void}
   */
  function toast(message) {
    const node = document.createElement("div");
    node.textContent = message;
    node.style.cssText = `
            position: fixed; left: 50%; bottom: 88px; transform: translateX(-50%);
            background: rgba(24, 33, 47, 0.92); color: #fff; padding: 8px 14px;
            border-radius: 999px; font-size: 13px; z-index: 10000;
            box-shadow: 0 12px 24px rgba(0,0,0,0.18); pointer-events: none;
            transition: opacity .2s ease; opacity: 1;
        `;
    document.body.appendChild(node);
    setTimeout(() => {
      node.style.opacity = "0";
      setTimeout(() => node.remove(), 240);
    }, 1600);
  }

  /**
   * 转义 HTML
   * @param {string} s 输入
   * @returns {string}
   */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * 确保 SharedDraggable 已加载。
   * 用途：动态加载 shared-draggable.js，确保拖拽功能可用。
   * @returns {Promise<void>}
   */
  function ensureSharedDraggable() {
    if (window.SharedDraggable) {
      return Promise.resolve();
    }
    // 检查是否已有 script 标签
    var existing = document.getElementById("shared-draggable-script");
    if (existing) {
      return new Promise(function (resolve) {
        var checkInterval = window.setInterval(function () {
          if (window.SharedDraggable) {
            window.clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    }
    // 动态加载脚本
    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.id = "shared-draggable-script";
      script.src = "../shared-draggable.js";
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        resolve(); // 加载失败也继续，只是没有拖拽功能
      };
      document.head.appendChild(script);
    });
  }

  /**
   * 启用元素的拖拽功能。
   * 用途：确保 SharedDraggable 可用后启用拖拽。
   * @param {HTMLElement} element 需要拖拽的元素
   * @param {string} storageKey 位置存储键名
   * @returns {void}
   */
  function enableDraggable(element, storageKey) {
    ensureSharedDraggable().then(function () {
      if (window.SharedDraggable) {
        window.SharedDraggable.make(element, {
          storageKey: storageKey,
          snapThreshold: 30,
          edgeOffset: 16,
        });
      }
    });
  }

  // 等待 DOM 就绪后再挂载
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

  /**
   * 共享工件存储位置。
   * 用途：截图和导出完成后将结果存储到此处，供飞书提交桥接读取。
   * 结构：{ screenshot: {name, type, dataUrl} | null, exports: [{name, type, content}] }
   */
  if (!window.__sgtArtifacts) {
    window.__sgtArtifacts = { screenshot: null, exports: [] };
  }

  /**
   * 将截图结果存储到共享位置。
   * 用途：截图完成后调用，将 DataURL 格式的截图存入 __sgtArtifacts.screenshot。
   * @param {string} dataUrl 截图的 DataURL
   * @param {string} fileName 文件名
   * @returns {void}
   */
  function storeScreenshotArtifact(dataUrl, fileName) {
    if (!window.__sgtArtifacts) {
      window.__sgtArtifacts = { screenshot: null, exports: [] };
    }
    window.__sgtArtifacts.screenshot = {
      name: fileName || "screenshot.png",
      type: "image/png",
      dataUrl: dataUrl,
      size: dataUrl.length,
    };
  }

  /**
   * 将导出文件存储到共享位置。
   * 用途：导出完成后调用，将导出的文件内容存入 __sgtArtifacts.exports。
   * @param {string} content 文件内容
   * @param {string} fileName 文件名
   * @param {string} fileType MIME 类型
   * @returns {void}
   */
  function storeExportArtifact(content, fileName, fileType) {
    if (!window.__sgtArtifacts) {
      window.__sgtArtifacts = { screenshot: null, exports: [] };
    }
    window.__sgtArtifacts.exports.push({
      name: fileName || "export.json",
      type: fileType || "application/json",
      content: content,
      size: content.length,
    });
  }

  // 暴露给页面，方便事件后主动刷新评分
  window.SharedGameToolkit = {
    /** 主动刷新评分判定 */
    refresh: () => {
      const config = normalizeConfig(window.SHARED_GAME_TOOLKIT_CONFIG || {});
      refreshScore(config);
    },
    /** 存储截图到共享位置，供提交流程读取 */
    storeScreenshot: storeScreenshotArtifact,
    /** 存储导出文件到共享位置，供提交流程读取 */
    storeExport: storeExportArtifact,
    /** 获取当前共享工件 */
    getArtifacts: () => window.__sgtArtifacts,
    /** 清空共享工件 */
    clearArtifacts: () => {
      window.__sgtArtifacts = { screenshot: null, exports: [] };
    },
  };
})();
