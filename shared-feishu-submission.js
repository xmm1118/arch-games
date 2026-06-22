/**
 * 统一飞书作业提交桥接脚本。
 * 用途：在各游戏页面中提供学生信息采集、游客模式提示、截图/快照收集和妙搭提交草稿传递能力。
 */
(function initFeishuSubmissionBridge(global) {
  "use strict";

  /**
   * 本地存储键常量。
   * 用途：统一保存学生资料、提交草稿和妙搭配置，避免不同页面键名不一致。
   * @type {{profile: string, draft: string, config: string}}
   */
  var STORAGE_KEYS = {
    profile: "feishu_submission_profile",
    draft: "feishu_submission_last_draft",
    config: "feishu_submission_runtime_config",
    ranking: "feishu_submission_ranking_cache",
  };

  /**
   * 运行时默认配置。
   * 用途：为所有页面提供可直接工作的默认游客模式与统一妙搭提交地址。
   * @type {{
   * classOptions: string[],
   * miaodaSubmitUrl: string,
   * allowGuestSubmit: boolean,
   * submitWindowName: string,
   * ranking: {
   * enabled: boolean,
   * semester: string,
   * courseName: string,
   * displayCount: number,
   * showClassBoard: boolean,
   * allowGuest: boolean,
   * scope: string,
   * initialData: Object<string, *>
   * }
   * }}
   */
  var DEFAULT_CONFIG = {
    classOptions: ["建筑2301班", "建筑2302班", "建筑2303班", "游客"],
    miaodaSubmitUrl: "https://wavk97moa3e.aiforce.cloud/app/app_4ke3mggtgq97f",
    allowGuestSubmit: true,
    submitWindowName: "feishu-submission-window",
    ranking: {
      enabled: false,
      semester: "",
      courseName: "建筑课程游戏化教学",
      displayCount: 10,
      showClassBoard: true,
      allowGuest: true,
      scope: "page-level",
      initialData: {},
    },
  };

  /**
   * 当前页面运行状态。
   * 用途：在弹窗、待执行帮助动作和最近提交结果之间共享临时数据。
   * @type {{
   * toastTimer: number | null,
   * pendingGuideAction: Function | null,
   * lastPayload: Object | null,
   * activeBoardType: string
   * }}
   */
  var runtimeState = {
    toastTimer: null,
    pendingGuideAction: null,
    lastPayload: null,
    activeBoardType: "overall",
  };

  /**
   * 读取本地 JSON。
   * @param {string} key 本地存储键。
   * @param {*} fallback 兜底值。
   * @returns {*} 解析后的值。
   */
  function readJson(key, fallback) {
    try {
      var rawValue = global.localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  /**
   * 写入本地 JSON。
   * @param {string} key 本地存储键。
   * @param {*} value 待写入值。
   * @returns {void}
   */
  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      showToast("本地缓存空间不足，无法保存完整草稿。", "warning");
    }
  }

  /**
   * 合并运行时配置。
   * @returns {{
   * classOptions: string[],
   * miaodaSubmitUrl: string,
   * allowGuestSubmit: boolean,
   * submitWindowName: string
   * }}
   */
  function getRuntimeConfig() {
    var localConfig = readJson(STORAGE_KEYS.config, {});
    var pageConfig = global.FEISHU_SUBMISSION_CONFIG || {};
    var mergedConfig = Object.assign(
      {},
      DEFAULT_CONFIG,
      localConfig,
      pageConfig,
    );
    mergedConfig.ranking = Object.assign(
      {},
      DEFAULT_CONFIG.ranking,
      localConfig.ranking || {},
      pageConfig.ranking || {},
    );
    return mergedConfig;
  }

  /**
   * 生成当前页面的排行榜缓存键。
   * @param {{ranking?: Object<string, *>}} config 当前运行时配置。
   * @param {Object|null} context 页面上下文。
   * @returns {string}
   */
  function getRankingCacheKey(config, context) {
    var safeContext = context || {};
    return [
      "ranking",
      config.ranking && config.ranking.semester
        ? config.ranking.semester
        : "default-semester",
      config.ranking && config.ranking.courseName
        ? config.ranking.courseName
        : "default-course",
      safeContext.gameId || "unknown-game",
      safeContext.levelId || "unknown-level",
    ].join("::");
  }

  /**
   * 读取排行榜缓存。
   * @param {string} cacheKey 缓存键。
   * @returns {Object<string, *>|null}
   */
  function getRankingCache(cacheKey) {
    var allCache = readJson(STORAGE_KEYS.ranking, {});
    return allCache && allCache[cacheKey] ? allCache[cacheKey] : null;
  }

  /**
   * 写入排行榜缓存。
   * @param {string} cacheKey 缓存键。
   * @param {Object<string, *>} value 排行榜数据。
   * @returns {void}
   */
  function setRankingCache(cacheKey, value) {
    var allCache = readJson(STORAGE_KEYS.ranking, {});
    allCache[cacheKey] = value;
    writeJson(STORAGE_KEYS.ranking, allCache);
  }

  /**
   * 获取当前用户在排行榜中的显示名。
   * @param {{studentId: string, className: string, studentName: string, identityType: string}} profile 学生资料。
   * @returns {string}
   */
  function getAnonymousName(profile) {
    var safeProfile = profile || {};
    var studentId = String(safeProfile.studentId || "");
    var className = String(safeProfile.className || "游客");
    var studentName = String(safeProfile.studentName || "");
    if (safeProfile.identityType === "游客" || className === "游客") {
      return "游客-" + (studentId.slice(-3) || "匿名");
    }
    return (
      className +
      "-***-" +
      (studentId.slice(-4) || studentName.slice(-1) || "匿名")
    );
  }

  /**
   * 标准化榜单条目。
   * @param {Array<Object<string, *>>} entries 原始条目。
   * @param {Object} profile 当前用户资料。
   * @returns {Array<Object<string, *>>}
   */
  function normalizeRankingEntries(entries, profile) {
    return (entries || []).map(function mapRankingEntry(entry, index) {
      var entryStudentId = String(entry.studentId || "");
      var isCurrentUser = Boolean(
        profile &&
        profile.studentId &&
        entryStudentId &&
        profile.studentId === entryStudentId,
      );
      return {
        rank: Number(entry.rank || index + 1),
        studentId: entryStudentId,
        studentName: String(entry.studentName || ""),
        className: String(entry.className || ""),
        identityType: String(entry.identityType || "正式学生"),
        score: String(
          entry.score != null ? entry.score : entry.highestScore || "",
        ),
        achievedAt: String(
          entry.achievedAt || entry.highestScoreTime || entry.submitTime || "",
        ),
        isCurrentUser: isCurrentUser,
        displayName: isCurrentUser
          ? String(entry.studentName || profile.studentName || "我")
          : String(entry.displayName || getAnonymousName(entry)),
      };
    });
  }

  /**
   * 创建默认排行榜快照。
   * @param {Object} context 当前页面上下文。
   * @param {Object} profile 当前学生资料。
   * @returns {Object<string, *>}
   */
  function createDefaultRankingSnapshot(context, profile) {
    return {
      gameId: context && context.gameId ? context.gameId : "未识别游戏",
      gameName:
        context && context.gameName
          ? context.gameName
          : document.title || "未识别页面",
      levelId: context && context.levelId ? context.levelId : "",
      levelName: context && context.levelName ? context.levelName : "",
      updatedAt: "",
      overall: {
        title: "全体榜",
        entries: [],
        selfRank: null,
      },
      class: {
        title: "班级榜",
        entries: [],
        selfRank: null,
      },
      currentUser: {
        studentId: profile.studentId || "",
        studentName: profile.studentName || "",
        className: profile.className || "",
      },
    };
  }

  /**
   * 加载最近一次保存的学生资料。
   * @returns {{
   * studentId: string,
   * className: string,
   * studentName: string,
   * identityType: string
   * }}
   */
  function getSavedProfile() {
    return Object.assign(
      {
        studentId: "",
        className: "",
        studentName: "",
        identityType: "正式学生",
      },
      readJson(STORAGE_KEYS.profile, {}),
    );
  }

  /**
   * 保存学生资料。
   * @param {{
   * studentId: string,
   * className: string,
   * studentName: string,
   * identityType: string
   * }} profile 学生资料。
   * @returns {void}
   */
  function saveProfile(profile) {
    writeJson(STORAGE_KEYS.profile, profile);
  }

  /**
   * 确保 SharedDraggable 已加载。
   * 用途：动态加载 shared-draggable.js，确保拖拽功能可用。
   * @returns {Promise<void>}
   */
  function ensureSharedDraggable() {
    if (global.SharedDraggable) {
      return Promise.resolve();
    }
    // 检查是否已有 script 标签
    var existing = document.getElementById("shared-draggable-script");
    if (existing) {
      return new Promise(function (resolve) {
        var checkInterval = global.setInterval(function () {
          if (global.SharedDraggable) {
            global.clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    }
    // 动态加载脚本
    return new Promise(function (resolve, reject) {
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
      if (global.SharedDraggable) {
        global.SharedDraggable.make(element, {
          storageKey: storageKey,
          snapThreshold: 30,
          edgeOffset: 16,
        });
      }
    });
  }

  /**
   * 确保页面上存在统一入口按钮，并启用拖拽功能。
   * @returns {HTMLButtonElement}
   */
  function ensureEntryButton() {
    var existingButton = document.querySelector(".feishu-submit-entry");
    if (existingButton) {
      return existingButton;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "feishu-submit-entry";
    button.innerHTML = '<span>作业提交</span><span aria-hidden="true">↗</span>';
    button.addEventListener("click", function handleEntryClick() {
      openSubmitFlow();
    });
    document.body.appendChild(button);

    // 启用拖拽功能（延迟检测 SharedDraggable）
    enableDraggable(button, "feishu-submit-entry-position");

    return button;
  }

  /**
   * 确保页面上存在提示条。
   * @returns {HTMLDivElement}
   */
  function ensureToast() {
    var existingToast = document.querySelector(".feishu-toast");
    if (existingToast) {
      return existingToast;
    }

    var toast = document.createElement("div");
    toast.className = "feishu-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
    return toast;
  }

  /**
   * 弹出提示。
   * @param {string} message 提示文本。
   * @param {"info"|"success"|"warning"|"danger"} tone 语气。
   * @returns {void}
   */
  function showToast(message, tone) {
    var toast = ensureToast();
    toast.textContent = message;
    toast.dataset.tone = tone || "info";
    toast.classList.add("is-visible");

    if (runtimeState.toastTimer) {
      global.clearTimeout(runtimeState.toastTimer);
    }

    runtimeState.toastTimer = global.setTimeout(function hideToast() {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  /**
   * 排行榜展开状态标记。
   * 用途：记录排行榜面板当前是否展开，用于切换显示/隐藏。
   * @type {boolean}
   */
  var isRankingPanelOpen = false;

  /**
   * 确保页面上存在排行榜 FAB 入口按钮，并启用拖拽功能。
   * 用途：创建圆形按钮，点击后切换排行榜面板的展开/折叠状态。
   * @returns {HTMLButtonElement}
   */
  function ensureRankingFab() {
    var existingFab = document.querySelector(".feishu-ranking-fab");
    if (existingFab) {
      return existingFab;
    }

    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "feishu-ranking-fab";
    fab.innerHTML = "🏆";
    fab.setAttribute("aria-label", "排行榜");
    fab.addEventListener("click", function handleFabClick() {
      toggleRankingPanel();
    });
    document.body.appendChild(fab);

    // 启用拖拽功能（延迟检测 SharedDraggable）
    enableDraggable(fab, "feishu-ranking-fab-position");

    return fab;
  }

  /**
   * 切换排行榜面板的展开/折叠状态。
   * 用途：用户点击 FAB 按钮时调用，展开或收起排行榜面板。
   * @returns {void}
   */
  function toggleRankingPanel() {
    var panel = ensureRankingPanel();
    isRankingPanelOpen = !isRankingPanelOpen;
    if (isRankingPanelOpen) {
      panel.classList.add("is-open");
    } else {
      panel.classList.remove("is-open");
    }
  }

  /**
   * 关闭排行榜面板。
   * 用途：在特定场景下（如打开提交流程时）自动收起排行榜，避免遮挡。
   * @returns {void}
   */
  function closeRankingPanel() {
    isRankingPanelOpen = false;
    var panel = document.querySelector(".feishu-ranking-panel");
    if (panel) {
      panel.classList.remove("is-open");
    }
  }

  /**
   * 确保页面上存在排行榜容器。
   * @returns {HTMLDivElement}
   */
  function ensureRankingPanel() {
    var existingPanel = document.querySelector(".feishu-ranking-panel");
    if (existingPanel) {
      return existingPanel;
    }

    var panel = document.createElement("div");
    panel.className = "feishu-ranking-panel";
    panel.innerHTML = [
      '<div class="feishu-ranking-panel__header">',
      '<div class="feishu-ranking-panel__title-wrap">',
      '<div class="feishu-ranking-panel__eyebrow">页面排行榜</div>',
      '<h3 class="feishu-ranking-panel__title">当前关卡榜单</h3>',
      "</div>",
      '<div class="feishu-ranking-panel__tabs"></div>',
      "</div>",
      '<div class="feishu-ranking-panel__meta"></div>',
      '<div class="feishu-ranking-panel__self"></div>',
      '<div class="feishu-ranking-panel__list"></div>',
      '<div class="feishu-ranking-panel__empty feishu-hidden"></div>',
    ].join("");
    document.body.appendChild(panel);
    return panel;
  }

  /**
   * 读取当前页面上下文。
   * @returns {Object}
   */
  function getCurrentContext() {
    var adapters = global.GameSubmissionAdapters;
    return adapters && typeof adapters.getSubmissionContext === "function"
      ? adapters.getSubmissionContext()
      : {
          gameId: "未识别游戏",
          gameName: document.title || "未识别页面",
          levelId: "",
          levelName: "",
          score: "",
        };
  }

  /**
   * 返回当前启用的榜单键。
   * @returns {string}
   */
  function getActiveBoardType() {
    return runtimeState.activeBoardType === "class" ? "class" : "overall";
  }

  /**
   * 根据配置决定是否显示排行榜。
   * @returns {boolean}
   */
  function isRankingEnabled() {
    var config = getRuntimeConfig();
    return Boolean(config.ranking && config.ranking.enabled);
  }

  /**
   * 生成排行榜标签页。
   * @param {HTMLElement} panel 排行榜容器。
   * @param {Object} config 运行时配置。
   * @returns {void}
   */
  function renderRankingTabs(panel, config) {
    var tabs = panel.querySelector(".feishu-ranking-panel__tabs");
    var activeBoardType = getActiveBoardType();
    var tabsHtml = [
      '<button type="button" class="feishu-ranking-tab' +
        (activeBoardType === "overall" ? " is-active" : "") +
        '" data-board="overall">全体榜</button>',
    ];

    if (config.ranking && config.ranking.showClassBoard) {
      tabsHtml.push(
        '<button type="button" class="feishu-ranking-tab' +
          (activeBoardType === "class" ? " is-active" : "") +
          '" data-board="class">班级榜</button>',
      );
    }

    tabs.innerHTML = tabsHtml.join("");
    Array.prototype.forEach.call(
      tabs.querySelectorAll(".feishu-ranking-tab"),
      function bindTabClick(button) {
        button.onclick = function handleBoardSwitch() {
          runtimeState.activeBoardType = button.dataset.board || "overall";
          renderRankingPanel();
        };
      },
    );
  }

  /**
   * 渲染排行榜主体。
   * 用途：根据配置决定是否显示排行榜 FAB 和面板，并更新面板内容。
   * @returns {void}
   */
  function renderRankingPanel() {
    var panel = ensureRankingPanel();
    var fab = ensureRankingFab();
    var config = getRuntimeConfig();
    var context = getCurrentContext();
    var profile = getSavedProfile();
    var cacheKey = getRankingCacheKey(config, context);
    var snapshot =
      getRankingCache(cacheKey) ||
      (config.ranking && config.ranking.initialData
        ? config.ranking.initialData
        : createDefaultRankingSnapshot(context, profile));
    var boardKey = getActiveBoardType();
    var boardData = snapshot[boardKey] || { entries: [], selfRank: null };
    var normalizedEntries = normalizeRankingEntries(boardData.entries, profile);
    var meta = panel.querySelector(".feishu-ranking-panel__meta");
    var selfBlock = panel.querySelector(".feishu-ranking-panel__self");
    var listBlock = panel.querySelector(".feishu-ranking-panel__list");
    var emptyBlock = panel.querySelector(".feishu-ranking-panel__empty");
    var title = panel.querySelector(".feishu-ranking-panel__title");
    var displayCount = Number(
      (config.ranking && config.ranking.displayCount) || 10,
    );

    if (!isRankingEnabled()) {
      panel.classList.remove("is-open");
      fab.classList.add("feishu-hidden");
      return;
    }

    fab.classList.remove("feishu-hidden");
    renderRankingTabs(panel, config);
    title.textContent =
      (snapshot.levelName || context.levelName || "当前关卡") + " 排行榜";
    meta.innerHTML = [
      "<span>学期：" +
        escapeHtml(config.ranking.semester || "未配置") +
        "</span>",
      "<span>课程：" +
        escapeHtml(config.ranking.courseName || "未配置") +
        "</span>",
      "<span>更新时间：" +
        escapeHtml(snapshot.updatedAt || "等待正式提交后更新") +
        "</span>",
    ].join("");

    selfBlock.innerHTML = [
      '<div class="feishu-ranking-panel__self-card">',
      '<div class="feishu-ranking-panel__self-label">我的名次</div>',
      '<div class="feishu-ranking-panel__self-value">' +
        escapeHtml(String(boardData.selfRank || "待上榜")) +
        "</div>",
      '<div class="feishu-ranking-panel__self-meta">' +
        escapeHtml(
          profile.studentName || getAnonymousName(profile) || "未填写信息",
        ) +
        " · " +
        escapeHtml(profile.className || "未填写班级") +
        "</div>",
      "</div>",
    ].join("");

    if (!normalizedEntries.length) {
      listBlock.innerHTML = "";
      emptyBlock.classList.remove("feishu-hidden");
      emptyBlock.textContent =
        "当前页面已开启排行榜，但还没有正式提交后的榜单数据。妙搭提交成功后，可通过回写排行榜快照来刷新这里。";
      return;
    }

    emptyBlock.classList.add("feishu-hidden");
    listBlock.innerHTML = normalizedEntries
      .slice(0, displayCount)
      .map(function renderRankingItem(entry) {
        return [
          '<div class="feishu-ranking-item' +
            (entry.isCurrentUser ? " is-self" : "") +
            '">',
          '<div class="feishu-ranking-item__rank">#' +
            escapeHtml(String(entry.rank)) +
            "</div>",
          '<div class="feishu-ranking-item__main">',
          '<div class="feishu-ranking-item__name">' +
            escapeHtml(entry.displayName) +
            "</div>",
          '<div class="feishu-ranking-item__meta">' +
            escapeHtml(
              entry.className ||
                (entry.identityType === "游客" ? "游客" : "未分班"),
            ) +
            " · " +
            escapeHtml(entry.achievedAt || "等待记录最佳达成时间") +
            "</div>",
          "</div>",
          '<div class="feishu-ranking-item__score">' +
            escapeHtml(entry.score || "0") +
            "</div>",
          "</div>",
        ].join("");
      })
      .join("");
  }

  /**
   * 刷新排行榜缓存并重绘页面。
   * @param {Object<string, *>} rankingSnapshot 排行榜快照。
   * @returns {void}
   */
  function updateRankingSnapshot(rankingSnapshot) {
    var config = getRuntimeConfig();
    var context = getCurrentContext();
    var cacheKey = getRankingCacheKey(config, context);
    var profile = getSavedProfile();
    var safeSnapshot = Object.assign(
      {},
      createDefaultRankingSnapshot(context, profile),
      rankingSnapshot || {},
    );
    safeSnapshot.overall = Object.assign(
      { title: "全体榜", entries: [], selfRank: null },
      safeSnapshot.overall || {},
    );
    safeSnapshot.class = Object.assign(
      { title: "班级榜", entries: [], selfRank: null },
      safeSnapshot.class || {},
    );
    setRankingCache(cacheKey, safeSnapshot);
    renderRankingPanel();
  }

  /**
   * 生成人类可读时间。
   * @param {Date} date 时间对象。
   * @returns {string}
   */
  function formatTime(date) {
    return (
      [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-") +
      " " +
      [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
        String(date.getSeconds()).padStart(2, "0"),
      ].join(":")
    );
  }

  /**
   * 创建通用弹窗外壳。
   * @param {string} id 弹窗 ID。
   * @param {string} title 主标题。
   * @param {string} description 描述文案。
   * @returns {{overlay: HTMLDivElement, body: HTMLDivElement, footer: HTMLDivElement}}
   */
  function createModalShell(id, title, description) {
    var existingOverlay = document.getElementById(id);
    if (existingOverlay) {
      return {
        overlay: existingOverlay,
        body: existingOverlay.querySelector(".feishu-modal__body"),
        footer: existingOverlay.querySelector(".feishu-modal__footer"),
      };
    }

    var overlay = document.createElement("div");
    overlay.id = id;
    overlay.className = "feishu-modal-overlay";
    overlay.innerHTML = [
      '<div class="feishu-modal" role="dialog" aria-modal="true">',
      '<div class="feishu-modal__header">',
      '<div class="feishu-modal__eyebrow">飞书作业提交</div>',
      '<h2 class="feishu-modal__title"></h2>',
      '<p class="feishu-modal__desc"></p>',
      "</div>",
      '<div class="feishu-modal__body"></div>',
      '<div class="feishu-modal__footer"></div>',
      "</div>",
    ].join("");
    overlay.querySelector(".feishu-modal__title").textContent = title;
    overlay.querySelector(".feishu-modal__desc").textContent = description;
    overlay.addEventListener("click", function handleOverlayClick(event) {
      if (event.target === overlay) {
        closeModal(overlay);
      }
    });
    document.body.appendChild(overlay);

    return {
      overlay: overlay,
      body: overlay.querySelector(".feishu-modal__body"),
      footer: overlay.querySelector(".feishu-modal__footer"),
    };
  }

  /**
   * 打开弹窗。
   * @param {HTMLElement} overlay 弹窗遮罩层。
   * @returns {void}
   */
  function openModal(overlay) {
    overlay.classList.add("is-open");
  }

  /**
   * 关闭弹窗。
   * @param {HTMLElement} overlay 弹窗遮罩层。
   * @returns {void}
   */
  function closeModal(overlay) {
    overlay.classList.remove("is-open");
  }

  /**
   * 创建学生信息字段。
   * @param {string} label 标签文本。
   * @param {string} name 字段名。
   * @param {string} value 字段值。
   * @param {string} hint 提示文案。
   * @returns {string}
   */
  function buildInputField(label, name, value, hint) {
    return [
      '<label class="feishu-field">',
      '<span class="feishu-field__label">',
      label,
      "</span>",
      '<input name="',
      name,
      '" value="',
      escapeHtml(value || ""),
      '" />',
      '<span class="feishu-field__hint">',
      hint,
      "</span>",
      "</label>",
    ].join("");
  }

  /**
   * 创建班级下拉字段。
   * @param {string} value 当前值。
   * @returns {string}
   */
  /**
   * 构建班级选择字段。
   * 用途：从 ClassConfig 读取班级列表，生成下拉选择框。
   * @param {string} value 当前选中的班级名称
   * @returns {string} HTML 字符串
   */
  function buildClassSelectField(value) {
    var classes = [];
    var courses = [];
    var semesters = [];

    // 优先从 ClassConfig 获取班级配置
    if (global.ClassConfig) {
      classes = global.ClassConfig.getClasses() || [];
      courses = global.ClassConfig.getCourses() || [];
      semesters = global.ClassConfig.getSemesters() || [];
    }

    // 构建班级选项
    var classOptions = ["游客"];
    classes.forEach(function (cls) {
      if (cls.className && classOptions.indexOf(cls.className) === -1) {
        classOptions.push(cls.className);
      }
    });

    var optionsHtml = classOptions
      .map(function renderOption(option) {
        var isSelected = option === value ? " selected" : "";
        return (
          '<option value="' +
          escapeHtml(option) +
          '"' +
          isSelected +
          ">" +
          escapeHtml(option) +
          "</option>"
        );
      })
      .join("");

    // 构建学期选项
    var semesterOptions = semesters
      .map(function (s) {
        return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>";
      })
      .join("");

    // 构建课程选项
    var courseOptions = courses
      .map(function (c) {
        return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + "</option>";
      })
      .join("");

    return [
      '<label class="feishu-field">',
      '<span class="feishu-field__label">班级</span>',
      '<select name="className" id="feishu-class-select">',
      optionsHtml,
      "</select>",
      '<span class="feishu-field__hint">选择班级后自动填充课程信息。</span>',
      "</label>",
      '<label class="feishu-field">',
      '<span class="feishu-field__label">课程</span>',
      '<select name="courseName" id="feishu-course-select">',
      courseOptions,
      "</select>",
      "</label>",
      '<label class="feishu-field">',
      '<span class="feishu-field__label">学期</span>',
      '<select name="semester" id="feishu-semester-select">',
      semesterOptions,
      "</select>",
      "</label>",
    ].join("");
  }

  /**
   * 转义 HTML 文本。
   * @param {string} value 原始文本。
   * @returns {string}
   */
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * 判断当前资料是否完整。
   * @param {{
   * studentId: string,
   * className: string,
   * studentName: string,
   * identityType: string
   * }} profile 学生资料。
   * @returns {boolean}
   */
  function isProfileComplete(profile) {
    if (profile.identityType === "游客") {
      return Boolean(profile.className);
    }
    return Boolean(
      profile.studentId && profile.className && profile.studentName,
    );
  }

  /**
   * 从表单中提取学生资料。
   * @param {HTMLFormElement} form 表单实例。
   * @returns {{
   * studentId: string,
   * className: string,
   * studentName: string,
   * identityType: string
   * }}
   */
  function readProfileFromForm(form) {
    return {
      studentId: String(form.studentId.value || "").trim(),
      className: String(form.className.value || "").trim(),
      studentName: String(form.studentName.value || "").trim(),
      identityType: String(form.identityType.value || "正式学生").trim(),
      courseName: form.courseName ? String(form.courseName.value || "").trim() : "",
      semester: form.semester ? String(form.semester.value || "").trim() : "",
    };
  }

  /**
   * 打开学生信息采集弹窗。
   * @param {Function|null} onSaved 保存成功后的回调。
   * @returns {void}
   */
  function openProfileModal(onSaved) {
    var shell = createModalShell(
      "feishu-profile-modal",
      "先确认学生信息",
      "你可以先以游客身份体验游戏；只有正式提交作业时，系统才会要求你跳转到妙搭并进入飞书登录。",
    );
    var profile = getSavedProfile();
    shell.body.innerHTML = [
      '<form id="feishu-profile-form" class="feishu-grid">',
      '<div class="feishu-chip-row">',
      '<span class="feishu-chip">游客可直接体验</span>',
      '<span class="feishu-chip">正式提交时再登录</span>',
      "</div>",
      '<div class="feishu-grid feishu-grid--2">',
      buildInputField(
        "学号",
        "studentId",
        profile.studentId,
        "正式学生提交时必填。若仅体验，可先切换为游客身份。",
      ),
      buildClassSelectField(profile.className || "游客"),
      buildInputField(
        "姓名",
        "studentName",
        profile.studentName,
        "正式学生提交时必填。",
      ),
      '<label class="feishu-field"><span class="feishu-field__label">身份类型</span><select name="identityType">' +
        '<option value="正式学生"' +
        (profile.identityType === "正式学生" ? " selected" : "") +
        ">正式学生</option>" +
        '<option value="游客"' +
        (profile.identityType === "游客" ? " selected" : "") +
        ">游客</option>" +
        '</select><span class="feishu-field__hint">游客不会阻止你体验页面，提交时也会被明确标记为游客记录。</span></label>',
      "</div>",
      '<div class="feishu-status-note" data-tone="info">如果你现在只是演示或熟悉系统，可以先保存为游客；稍后提交作业前再改成正式学生资料即可。</div>',
      "</form>",
    ].join("");
    shell.footer.innerHTML = [
      '<button type="button" class="feishu-btn-ghost" data-action="cancel">稍后再说</button>',
      '<button type="button" class="feishu-btn-secondary" data-action="guest">保存为游客</button>',
      '<button type="button" class="feishu-btn-primary" data-action="save">保存并继续</button>',
    ].join("");

    var form = shell.body.querySelector("#feishu-profile-form");
    var cancelButton = shell.footer.querySelector("[data-action='cancel']");
    var guestButton = shell.footer.querySelector("[data-action='guest']");
    var saveButton = shell.footer.querySelector("[data-action='save']");

    cancelButton.onclick = function handleCancelClick() {
      closeModal(shell.overlay);
      showToast("已保留当前页面，你可以先继续体验。", "info");
    };

    guestButton.onclick = function handleGuestClick() {
      form.identityType.value = "游客";
      form.className.value = "游客";
      form.studentId.value = "";
      form.studentName.value = "";
      saveProfile(readProfileFromForm(form));
      closeModal(shell.overlay);
      showToast("已切换为游客模式。", "success");
      if (typeof onSaved === "function") {
        onSaved(getSavedProfile());
      }
    };


    // 班级选择变化时自动填充课程和学期
    var classSelect = form.querySelector("#feishu-class-select");
    var courseSelect = form.querySelector("#feishu-course-select");
    var semesterSelect = form.querySelector("#feishu-semester-select");

    if (classSelect && courseSelect && semesterSelect) {
      classSelect.addEventListener("change", function handleClassChange() {
        var selectedClass = classSelect.value;
        if (global.ClassConfig && selectedClass !== "游客") {
          var courseName = global.ClassConfig.getCourseByClassName(selectedClass);
          if (courseName && courseSelect) {
            // 找到匹配的课程选项并选中
            for (var i = 0; i < courseSelect.options.length; i++) {
              if (courseSelect.options[i].value === courseName) {
                courseSelect.selectedIndex = i;
                break;
              }
            }
          }
        }
      });
    }

    saveButton.onclick = function handleSaveClick() {
      var nextProfile = readProfileFromForm(form);
      if (!isProfileComplete(nextProfile)) {
        showToast("请先补全当前身份所需的信息。", "warning");
        return;
      }
      saveProfile(nextProfile);
      closeModal(shell.overlay);
      showToast("学生信息已保存。", "success");
      if (typeof onSaved === "function") {
        onSaved(nextProfile);
      }
    };

    openModal(shell.overlay);
  }

  /**
   * 将 DataURL 转换为便于传输的文件描述。
   * @param {string} dataUrl DataURL 文本。
   * @param {string} fileName 文件名。
   * @returns {{name: string, type: string, dataUrl: string, size: number}}
   */
  function buildDataUrlFile(dataUrl, fileName) {
    return {
      name: fileName,
      type:
        String(dataUrl.split(";")[0] || "").replace("data:", "") ||
        "application/octet-stream",
      dataUrl: dataUrl,
      size: dataUrl.length,
    };
  }

  /**
   * 生成标准化 JSON 文件。
   * @param {Object} payload 提交载荷。
   * @returns {{name: string, type: string, content: string, size: number}}
   */
  function buildJsonArtifact(payload) {
    var content = JSON.stringify(payload, null, 2);
    return {
      name: "submission.json",
      type: "application/json",
      content: content,
      size: content.length,
    };
  }

  /**
   * 尝试从画布或 DOM 元素提取截图。
   * 优先使用 canvas.toDataURL（原生，无外部依赖）；
   * 若无 canvas，则动态加载 html2canvas 对 DOM 元素截图。
   * @param {{canvas: HTMLCanvasElement|null, element: Element|null}} captureTargets 快照目标。
   * @returns {Promise<{name: string, type: string, dataUrl: string, size: number}|null>}
   */
  function captureScreenshot(captureTargets) {
    // 优先使用原生 canvas.toDataURL（无外部依赖，最快）
    if (
      captureTargets &&
      captureTargets.canvas &&
      typeof captureTargets.canvas.toDataURL === "function"
    ) {
      try {
        var screenshotUrl = captureTargets.canvas.toDataURL("image/png");
        return Promise.resolve(
          buildDataUrlFile(screenshotUrl, "screenshot.png"),
        );
      } catch (error) {
        // canvas 被污染或其他错误，继续尝试 html2canvas
      }
    }
    // 回退：使用 html2canvas 对 DOM 元素截图
    var target = (captureTargets && captureTargets.element) || document.body;
    return ensureHtml2Canvas()
      .then(function (html2canvas) {
        return html2canvas(target, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          scale: 2,
        });
      })
      .then(function (canvas) {
        return new Promise(function (resolve) {
          canvas.toBlob(
            function (blob) {
              if (!blob) {
                resolve(null);
                return;
              }
              var reader = new FileReader();
              reader.onloadend = function () {
                resolve(
                  buildDataUrlFile(reader.result || "", "screenshot.png"),
                );
              };
              reader.onerror = function () {
                resolve(null);
              };
              reader.readAsDataURL(blob);
            },
            "image/png",
            1.0,
          );
        });
      })
      .catch(function () {
        return null;
      });
  }

  /**
   * 确保 html2canvas 已加载（CDN 动态注入，去重）。
   * @returns {Promise<Function>} html2canvas 函数
   */
  function ensureHtml2Canvas() {
    if (typeof global.html2canvas === "function") {
      return Promise.resolve(global.html2canvas);
    }
    var existing = document.getElementById("sgt-html2canvas-cdn");
    if (existing) {
      return new Promise(function (resolve, reject) {
        existing.addEventListener("load", function () {
          if (typeof global.html2canvas === "function") {
            resolve(global.html2canvas);
          } else {
            reject(new Error("html2canvas loaded but not found"));
          }
        });
        existing.addEventListener("error", function () {
          reject(new Error("html2canvas CDN load failed"));
        });
      });
    }
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.id = "sgt-html2canvas-cdn";
      script.src =
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.onload = function () {
        if (typeof global.html2canvas === "function") {
          resolve(global.html2canvas);
        } else {
          reject(new Error("html2canvas loaded but not found"));
        }
      };
      script.onerror = function () {
        reject(new Error("html2canvas CDN load failed"));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * 读取共享工具条的工件（截图和导出文件）。
   * 用途：从 window.__sgtArtifacts 读取共享工具条存储的截图和导出结果。
   * @returns {{screenshot: Object|null, exports: Array<Object>}}
   */
  function readSharedToolkitArtifacts() {
    var sgtArtifacts = global.__sgtArtifacts;
    if (!sgtArtifacts) {
      return { screenshot: null, exports: [] };
    }
    return {
      screenshot: sgtArtifacts.screenshot || null,
      exports: Array.isArray(sgtArtifacts.exports) ? sgtArtifacts.exports : [],
    };
  }

  /**
   * 生成提交载荷。
   * 用途：构建完整的提交数据，包括学生信息、游戏状态、截图和导出文件。
   *      优先使用共享工具条的截图，若无则尝试从 canvas 获取。
   * @returns {Promise<Object>}
   */
  function buildSubmissionPayload() {
    var adapters = global.GameSubmissionAdapters;
    var context =
      adapters && typeof adapters.getSubmissionContext === "function"
        ? adapters.getSubmissionContext()
        : {
            gameId: "未识别游戏",
            gameName: document.title || "未识别页面",
            levelId: "",
            levelName: "",
            score: "",
            captureTargets: { canvas: null, element: document.body },
            exportHandlers: [],
            stateSnapshot: {},
            guideTrigger: null,
          };
    var profile = getSavedProfile();
    var config = getRuntimeConfig();
    var currentTime = new Date();
    var sharedArtifacts = readSharedToolkitArtifacts();

    return captureScreenshot(context.captureTargets).then(
      function (screenshotArtifact) {
        // 优先使用共享工具条的截图（用户手动截图的结果）
        var finalScreenshot =
          sharedArtifacts.screenshot || screenshotArtifact;

        var payload = {
          submissionId: "submission-" + currentTime.getTime(),
          student: {
            studentId: profile.studentId,
            className: profile.className,
            studentName: profile.studentName,
            identityType: profile.identityType,
          },
          game: {
            gameId: context.gameId,
            gameName: context.gameName,
            levelId: context.levelId,
            levelName: context.levelName,
            score: context.score,
            pageUrl: global.location ? global.location.href : "",
            pageTitle: document.title || "",
          },
          artifacts: {
            screenshot: finalScreenshot,
            exports: [],
            fallbackSubmissionJson: null,
            availableExportHandlers: context.exportHandlers,
          },
          snapshot: context.stateSnapshot,
          clientMeta: {
            clientSubmitTime: currentTime.toISOString(),
            clientSubmitTimeText: formatTime(currentTime),
            userAgent: global.navigator ? global.navigator.userAgent : "",
            fromGuideButton: Boolean(runtimeState.pendingGuideAction),
          },
          rankingContext: {
            enabled: Boolean(config.ranking && config.ranking.enabled),
            semester: String((config.ranking && config.ranking.semester) || ""),
            courseName: String(
              (config.ranking && config.ranking.courseName) || "",
            ),
            scope: String(
              (config.ranking && config.ranking.scope) || "page-level",
            ),
            showClassBoard: Boolean(
              config.ranking && config.ranking.showClassBoard,
            ),
            allowGuest: Boolean(config.ranking && config.ranking.allowGuest),
          },
        };

        // 合并共享工具条的导出文件
        sharedArtifacts.exports.forEach(function (exportItem) {
          payload.artifacts.exports.push(exportItem);
        });

        payload.artifacts.fallbackSubmissionJson = buildJsonArtifact(payload);
        payload.artifacts.exports.push(
          payload.artifacts.fallbackSubmissionJson,
        );
        return payload;
      },
    );
  }

  /**
   * 渲染提交确认弹窗。
   * @param {Object} payload 提交载荷。
   * @returns {void}
   */
  function openSubmitModal(payload) {
    var shell = createModalShell(
      "feishu-submit-modal",
      "检查作品并正式提交",
      "正式提交会跳转到妙搭提交页。若尚未登录飞书，将在妙搭侧触发登录；取消登录不会影响继续游玩。",
    );
    var screenshot = payload.artifacts.screenshot;
    var exportFiles = payload.artifacts.exports || [];
    var config = getRuntimeConfig();
    shell.body.innerHTML = [
      '<div class="feishu-chip-row">',
      '<span class="feishu-chip">当前游戏：' +
        escapeHtml(payload.game.gameId || "未识别") +
        "</span>",
      '<span class="feishu-chip">当前关卡：' +
        escapeHtml(payload.game.levelName || payload.game.levelId || "未识别") +
        "</span>",
      '<span class="feishu-chip">当前评分：' +
        escapeHtml(payload.game.score || "未读取") +
        "</span>",
      '<span class="feishu-chip">排行榜：' +
        escapeHtml(
          payload.rankingContext && payload.rankingContext.enabled
            ? "已开启"
            : "当前页面未开启",
        ) +
        "</span>",
      "</div>",
      '<div class="feishu-summary">',
      '<div class="feishu-summary__card">',
      '<h3 class="feishu-summary__title">学生信息</h3>',
      '<div class="feishu-summary__meta">',
      "<div>身份：" +
        escapeHtml(payload.student.identityType || "正式学生") +
        "</div>",
      "<div>学号：" +
        escapeHtml(payload.student.studentId || "未填写") +
        "</div>",
      "<div>班级：" +
        escapeHtml(payload.student.className || "未填写") +
        "</div>",
      "<div>姓名：" +
        escapeHtml(payload.student.studentName || "未填写") +
        "</div>",
      "</div>",
      "</div>",
      '<div class="feishu-summary__card">',
      '<h3 class="feishu-summary__title">提交内容</h3>',
      '<div class="feishu-summary__meta">',
      "<div>页面地址：" + escapeHtml(payload.game.pageUrl || "") + "</div>",
      "<div>客户端提交时间：" +
        escapeHtml(payload.clientMeta.clientSubmitTimeText) +
        "</div>",
      "<div>排名范围：" +
        escapeHtml(
          payload.rankingContext && payload.rankingContext.scope === "class"
            ? "班级排名"
            : "全体排名",
        ) +
        "</div>",
      "<div>生成文件：" +
        (payload.artifacts.exports || []).length +
        " 个</div>",
      "</div>",
      "</div>",
      '<div class="feishu-summary__card">',
      '<h3 class="feishu-summary__title">截图预览</h3>',
      '<div class="feishu-summary__preview">',
      screenshot
        ? '<img alt="截图预览" src="' + escapeHtml(screenshot.dataUrl) + '" />'
        : '<div class="feishu-status-note" data-tone="warning">当前页面没有可直接提取的画布截图，提交时仍会携带状态快照和 submission.json。</div>',
      "</div>",
      "</div>",
      '<div class="feishu-summary__card">',
      '<h3 class="feishu-summary__title">生成文件</h3>',
      '<div class="feishu-file-list">',
      exportFiles
        .map(function renderExportFile(file) {
          return (
            '<div class="feishu-file-item"><span>' +
            escapeHtml(file.name) +
            "</span><span>" +
            escapeHtml(String(file.size || 0)) +
            " B</span></div>"
          );
        })
        .join(""),
      "</div>",
      "</div>",
      '<div class="feishu-status-note" data-tone="' +
        (config.miaodaSubmitUrl ? "info" : "warning") +
        '">' +
        (function() {
          if (!config.miaodaSubmitUrl) {
            return "当前尚未配置妙搭提交地址。系统会先缓存草稿和 submission.json，待你配置妙搭 URL 后可再次提交。";
          }
          try {
            var inIframe = global.self !== global.top;
            if (inIframe) {
              return "点击\u201c提交\u201d后，数据将直接发送到妙搭页面（当前在iframe嵌入模式）。";
            } else {
              return "点击\u201c跳转妙搭提交\u201d后，将打开妙搭页面并发送数据（当前在独立网页模式）。";
            }
          } catch (e) {
            return "点击\u201c跳转妙搭提交\u201d后，将把当前草稿发送到妙搭页面。";
          }
        })() +
        "</div>",
      "</div>",
    ].join("");
    shell.footer.innerHTML = [
      '<button type="button" class="feishu-btn-ghost" data-action="back">返回游戏</button>',
      '<button type="button" class="feishu-btn-secondary" data-action="edit">修改资料</button>',
      '<button type="button" class="feishu-btn-primary" data-action="submit">' +
        (function() {
          try {
            return (global.self !== global.top) ? "提交" : "跳转妙搭提交";
          } catch (e) {
            return "跳转妙搭提交";
          }
        })() +
        '</button>',
    ].join("");

    shell.footer.querySelector("[data-action='back']").onclick =
      function handleBackClick() {
        closeModal(shell.overlay);
        showToast("你可以继续游玩，稍后再提交。", "info");
      };

    shell.footer.querySelector("[data-action='edit']").onclick =
      function handleEditClick() {
        openProfileModal(function reopenSubmitAfterSave() {
          closeModal(shell.overlay);
          openSubmitFlow();
        });
      };

    shell.footer.querySelector("[data-action='submit']").onclick =
      function handleSubmitClick() {
        writeJson(STORAGE_KEYS.draft, payload);
        runtimeState.lastPayload = payload;
        if (!config.miaodaSubmitUrl) {
          closeModal(shell.overlay);
          showToast(
            "草稿已缓存；请先在共享配置中补充妙搭提交地址。",
            "warning",
          );
          return;
        }
        sendDraftToMiaoda(payload, config.miaodaSubmitUrl);
        closeModal(shell.overlay);
      };

    openModal(shell.overlay);
  }

  /**
   * 向妙搭窗口发送草稿。
   * @param {Object} payload 提交载荷。
   * @param {string} targetUrl 妙搭地址。
   * @returns {void}
   */
  function sendDraftToMiaoda(payload, targetUrl) {
    var config = getRuntimeConfig();
    var messagePayload = {
      type: "FEISHU_SUBMISSION_DRAFT",
      payload: payload,
    };

    /**
     * 检查当前页面是否在 iframe 中。
     * @returns {boolean}
     */
    function isInIframe() {
      try {
        return global.self !== global.top;
      } catch (e) {
        return true;
      }
    }

    // 情况1：当前页面在 iframe 中，直接向父页面发送数据
    if (isInIframe()) {
      try {
        global.parent.postMessage(messagePayload, "*");
        showToast("已向妙搭页面发送提交数据。", "success");
      } catch (e) {
        console.warn("[feishu-submission] postMessage 到父页面失败:", e);
        showToast("数据发送失败，请联系管理员。", "warning");
      }
      return;
    }

    // 情况2：当前页面不在 iframe 中，打开新窗口
    // 将数据存储到 localStorage，供新窗口读取
    try {
      localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(payload));
      localStorage.setItem(
        STORAGE_KEYS.draft + "_timestamp",
        new Date().toISOString()
      );
    } catch (e) {
      console.warn("[feishu-submission] 无法存储草稿到 localStorage:", e);
    }

    var submitWindow = global.open(targetUrl, config.submitWindowName);
    var attempt = 0;

    if (!submitWindow) {
      showToast("浏览器拦截了新窗口，请允许弹窗后重试。数据已保存到本地。", "warning");
      return;
    }

    /**
     * 连续尝试 postMessage，兼容新窗口尚未完成加载的场景。
     * @returns {void}
     */
    function postDraft() {
      attempt += 1;
      try {
        submitWindow.postMessage(messagePayload, "*");
      } catch (e) {
        console.warn("[feishu-submission] postMessage 失败:", e);
      }
      if (attempt < 10) {
        global.setTimeout(postDraft, 700);
      }
    }

    postDraft();
    showToast(
      "已打开妙搭提交页；数据已保存到本地存储。",
      "success",
    );
  }

  /**
   * 统一打开提交流程。
   * 用途：关闭排行榜面板，检查学生资料，然后打开提交弹窗。
   * @returns {void}
   */
  function openSubmitFlow() {
    closeRankingPanel();
    var profile = getSavedProfile();
    if (!isProfileComplete(profile)) {
      openProfileModal(function continueAfterSave() {
        openSubmitFlow();
      });
      return;
    }

    buildSubmissionPayload().then(function handlePayload(payload) {
      openSubmitModal(payload);
    });
  }

  /**
   * 判断当前按钮是否属于说明/帮助入口。
   * @param {Element|null} element 当前点击元素。
   * @returns {boolean}
   */
  function isGuideTriggerElement(element) {
    if (!element) {
      return false;
    }

    var text = [
      element.textContent || "",
      element.getAttribute("title") || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("data-tooltip") || "",
    ]
      .join(" ")
      .trim();

    return /帮助|说明|提示|引导|关卡介绍|任务说明/.test(text);
  }

  /**
   * 安装说明入口拦截器。
   * @returns {void}
   */
  function installGuideInterceptor() {
    document.addEventListener(
      "click",
      function handleGuideClick(event) {
        var target =
          event.target && typeof event.target.closest === "function"
            ? event.target.closest("button, a, [role='button']")
            : null;
        var profile = getSavedProfile();

        if (!isGuideTriggerElement(target)) {
          return;
        }
        if (target && target.dataset.feishuBypass === "1") {
          return;
        }
        if (isProfileComplete(profile)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        runtimeState.pendingGuideAction = function replayGuideAction() {
          if (!target) {
            return;
          }
          target.dataset.feishuBypass = "1";
          target.click();
          global.setTimeout(function clearBypassFlag() {
            delete target.dataset.feishuBypass;
          }, 60);
        };

        openProfileModal(function continueGuideFlow() {
          if (runtimeState.pendingGuideAction) {
            runtimeState.pendingGuideAction();
            runtimeState.pendingGuideAction = null;
          }
        });
      },
      true,
    );
  }

  /**
   * 响应妙搭回写结果。
   * @returns {void}
   */
  function installSubmissionResultListener() {
    global.addEventListener("message", function handleSubmissionMessage(event) {
      var data = event.data;
      if (!data || data.type !== "FEISHU_SUBMISSION_RESULT") {
        return;
      }

      if (data.status === "success") {
        if (data.rankingSnapshot) {
          updateRankingSnapshot(data.rankingSnapshot);
        }
        showToast("作业提交成功，已等待飞书侧记录服务端提交时间。", "success");
      } else if (data.status === "cancelled") {
        showToast("你已取消登录或提交，当前草稿仍然保留。", "warning");
      } else {
        showToast("提交失败，请稍后重试或检查妙搭配置。", "danger");
      }
    });
  }

  /**
   * 初始化桥接能力。
   * @returns {void}
   */
  function bootstrap() {
    if (!document.body || document.body.dataset.feishuSubmissionReady === "1") {
      return;
    }
    document.body.dataset.feishuSubmissionReady = "1";
    ensureEntryButton();
    ensureToast();
    ensureRankingPanel();
    renderRankingPanel();
    installGuideInterceptor();
    installSubmissionResultListener();
  }

  /**
   * 在 DOM 可用后启动统一提交流程。
   * @returns {void}
   */
  function onReady() {
    bootstrap();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }

  /**
   * 导出桥接 API，便于页面调试和妙搭联调。
   */
  global.FeishuSubmissionBridge = {
    openProfileModal: openProfileModal,
    openSubmitFlow: openSubmitFlow,
    getSavedProfile: getSavedProfile,
    renderRankingPanel: renderRankingPanel,
    updateRankingSnapshot: updateRankingSnapshot,
    toggleRankingPanel: toggleRankingPanel,
    closeRankingPanel: closeRankingPanel,
    getLastDraft: function getLastDraft() {
      return readJson(STORAGE_KEYS.draft, null);
    },
  };
})(window);
