/**
 * 统一页面适配器。
 * 用途：从不同游戏页面的现有标题、状态对象、DOM 节点中读取游戏编号、关卡、分数和可快照目标。
 */
(function initGameSubmissionAdapters(global) {
  "use strict";

  /**
   * 页面路径与游戏信息的映射表。
   * 用途：优先使用已知目录名锁定游戏编号与游戏名称，减少自动识别偏差。
   * @type {Array<{match: RegExp, gameId: string, gameName: string}>}
   */
  var GAME_MAPPINGS = [
    {
      match: /游戏0画法几何与建筑制图基础/i,
      gameId: "游戏0",
      gameName: "画法几何与建筑制图基础",
    },
    { match: /游戏1场地分析系统/i, gameId: "游戏1", gameName: "场地分析系统" },
    { match: /游戏2平面布局系统/i, gameId: "游戏2", gameName: "平面布局系统" },
    {
      match: /游戏3体块设计系统v2\.0/i,
      gameId: "游戏3",
      gameName: "体块设计系统",
    },
    { match: /游戏4立面造型系统/i, gameId: "游戏4", gameName: "立面造型系统" },
    { match: /游戏5空间体验系统/i, gameId: "游戏5", gameName: "空间体验系统" },
    { match: /游戏6建筑性能模拟/i, gameId: "游戏6", gameName: "建筑性能模拟" },
    { match: /游戏7方案优化迭代/i, gameId: "游戏7", gameName: "方案优化迭代" },
    { match: /游戏8构造设计系统/i, gameId: "游戏8", gameName: "构造设计系统" },
    {
      match: /游戏9碳排放计算系统/i,
      gameId: "游戏9",
      gameName: "碳排放计算系统",
    },
    {
      match: /游戏10室内设计系统/i,
      gameId: "游戏10",
      gameName: "室内设计系统",
    },
    {
      match: /游戏11效果图生成系统/i,
      gameId: "游戏11",
      gameName: "效果图生成系统",
    },
    {
      match: /游戏12方案汇报系统/i,
      gameId: "游戏12",
      gameName: "方案汇报系统",
    },
    {
      match: /游戏13外墙构造深化/i,
      gameId: "游戏13",
      gameName: "外墙构造深化",
    },
    {
      match: /游戏14隔墙与内装修/i,
      gameId: "游戏14",
      gameName: "隔墙与内装修",
    },
    { match: /游戏15楼板与地面/i, gameId: "游戏15", gameName: "楼板与地面" },
    {
      match: /游戏16屋顶构造深化/i,
      gameId: "游戏16",
      gameName: "屋顶构造深化",
    },
    {
      match: /游戏17门窗构造深化/i,
      gameId: "游戏17",
      gameName: "门窗构造深化",
    },
    {
      match: /游戏18节点构造深化/i,
      gameId: "游戏18",
      gameName: "节点构造深化",
    },
    {
      match: /游戏19施工造价与工程管理系统/i,
      gameId: "游戏19",
      gameName: "施工造价与工程管理系统",
    },
  ];

  /**
   * 状态对象候选列表。
   * 用途：优先扫描项目中已存在的常见游戏状态对象。
   * @type {string[]}
   */
  var STATE_CANDIDATES = ["GameState", "gameState", "state", "appState"];

  /**
   * 读取安全文本。
   * @param {string} selector DOM 选择器。
   * @returns {string} 去除空白后的文本。
   */
  function readText(selector) {
    var element = document.querySelector(selector);
    return element ? String(element.textContent || "").trim() : "";
  }

  /**
   * 读取安全属性值。
   * @param {Array<string>} keys 点路径数组。
   * @returns {*} 读取到的值。
   */
  function readGlobalPath(keys) {
    var current = global;
    var index = 0;

    /**
     * 遍历路径并在任一节点缺失时提前终止。
     * @returns {*} 目标值或 undefined。
     */
    for (index = 0; index < keys.length; index += 1) {
      if (
        current == null ||
        (typeof current !== "object" && typeof current !== "function")
      ) {
        return undefined;
      }
      current = current[keys[index]];
    }
    return current;
  }

  /**
   * 在多个路径中读取第一个有效值。
   * @param {Array<Array<string>>} paths 路径列表。
   * @returns {*} 第一个非空值。
   */
  function readFirstPath(paths) {
    var index = 0;

    /**
     * 顺序尝试各候选路径，优先返回真实存在的值。
     * @returns {*} 第一个有效结果。
     */
    for (index = 0; index < paths.length; index += 1) {
      var value = readGlobalPath(paths[index]);
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return undefined;
  }

  /**
   * 转换为可序列化的 JSON 安全对象。
   * @param {*} value 任意值。
   * @returns {*} 可被 JSON 序列化的对象。
   */
  function toSerializable(value) {
    var seen = [];

    /**
     * 在循环引用场景下返回占位文本，避免序列化报错。
     * @param {string} key 属性名。
     * @param {*} currentValue 当前值。
     * @returns {*} 可序列化值。
     */
    function replacer(key, currentValue) {
      if (typeof currentValue === "function") {
        return "[Function]";
      }
      if (currentValue && typeof currentValue === "object") {
        if (seen.indexOf(currentValue) >= 0) {
          return "[Circular]";
        }
        seen.push(currentValue);
      }
      return currentValue;
    }

    try {
      return JSON.parse(JSON.stringify(value, replacer));
    } catch (error) {
      return {
        error: "序列化失败",
        message: String(error && error.message ? error.message : error),
      };
    }
  }

  /**
   * 根据页面路径和标题识别当前游戏。
   * @returns {{gameId: string, gameName: string}}
   */
  function detectGameInfo() {
    var sourceText = [
      global.location ? global.location.pathname : "",
      document.title,
      readText(".logo-text"),
      readText(".game-title"),
      readText(".game-badge"),
      readText("header h1"),
      readText("h1"),
    ].join(" ");
    var index = 0;

    /**
     * 优先使用已知目录模式匹配，保证当前仓库内各游戏目录能稳定识别。
     * @returns {{gameId: string, gameName: string}}
     */
    for (index = 0; index < GAME_MAPPINGS.length; index += 1) {
      if (GAME_MAPPINGS[index].match.test(sourceText)) {
        return {
          gameId: GAME_MAPPINGS[index].gameId,
          gameName: GAME_MAPPINGS[index].gameName,
        };
      }
    }

    /**
     * 如果目录映射未命中，则退化到从标题中提取“游戏X”编号。
     * @type {RegExpMatchArray | null}
     */
    var fallbackMatch = sourceText.match(/(游戏\d+)/);
    return {
      gameId: fallbackMatch ? fallbackMatch[1] : "未识别游戏",
      gameName:
        readText(".logo-text") ||
        readText(".game-title") ||
        document.title ||
        "未识别页面",
    };
  }

  /**
   * 读取候选状态对象快照。
   * @returns {Object<string, *>}
   */
  function readStateSnapshot() {
    var snapshot = {};
    var index = 0;

    /**
     * 仅收集当前页面已存在的常用状态对象，避免把整个 window 序列化进提交包。
     * @returns {Object<string, *>}
     */
    for (index = 0; index < STATE_CANDIDATES.length; index += 1) {
      var stateValue = global[STATE_CANDIDATES[index]];
      if (
        stateValue &&
        (typeof stateValue === "object" || typeof stateValue === "function")
      ) {
        snapshot[STATE_CANDIDATES[index]] = toSerializable(stateValue);
      }
    }

    return snapshot;
  }

  /**
   * 读取当前关卡编号。
   * @returns {string}
   */
  function detectLevelId() {
    var rawLevel = readFirstPath([
      ["GameState", "currentLevel"],
      ["gameState", "currentLevel"],
      ["state", "currentLevel"],
      ["state", "currentPhaseId"],
      ["state", "currentPhase"],
      ["appState", "currentLevel"],
    ]);

    if (rawLevel !== undefined) {
      return String(rawLevel);
    }

    return (
      readText("#currentLevel") ||
      readText("[data-current-level]") ||
      readText(".level-badge span") ||
      ""
    );
  }

  /**
   * 读取当前关卡名称。
   * @param {string} levelId 当前关卡编号。
   * @returns {string}
   */
  function detectLevelName(levelId) {
    var stateLevelName = readFirstPath([
      ["GameState", "currentLevelName"],
      ["gameState", "currentLevelName"],
      ["state", "currentLevelName"],
      ["state", "currentPhaseName"],
    ]);

    if (stateLevelName) {
      return String(stateLevelName);
    }

    var domLevelName =
      readText("#currentLevelName") ||
      readText(".current-level-name") ||
      readText(".level-name") ||
      readText(".current-stage-name");

    if (domLevelName) {
      return domLevelName;
    }

    /**
     * 如果存在全局 LEVELS 数组，则尝试通过当前关卡编号反查标题。
     * @type {*}
     */
    var levels = global.LEVELS;
    if (Array.isArray(levels) && levelId) {
      var numericLevel = Number(levelId);
      if (!Number.isNaN(numericLevel) && levels[numericLevel - 1]) {
        var currentLevel = levels[numericLevel - 1];
        if (currentLevel && currentLevel.title) {
          return String(currentLevel.title);
        }
      }
    }

    return levelId ? "关卡" + levelId : "";
  }

  /**
   * 读取当前分数。
   * @returns {string}
   */
  function detectScore() {
    var rawScore = readFirstPath([
      ["GameState", "score"],
      ["gameState", "score"],
      ["state", "score"],
      ["state", "totalScore"],
      ["appState", "score"],
    ]);

    if (rawScore !== undefined) {
      return String(rawScore);
    }

    return (
      readText("#scoreValue") ||
      readText("#scoreDisplay") ||
      readText(".score-display span") ||
      readText(".score-value") ||
      ""
    );
  }

  /**
   * 读取可用于截图的目标。
   * @returns {{canvas: HTMLCanvasElement|null, element: Element|null}}
   */
  function detectCaptureTarget() {
    var canvas = document.querySelector("canvas");
    var element =
      document.querySelector(".main-container") ||
      document.querySelector(".app-shell") ||
      document.querySelector(".workspace") ||
      document.querySelector("main") ||
      document.body;

    return {
      canvas: canvas || null,
      element: element || null,
    };
  }

  /**
   * 读取页面可见的说明/帮助入口。
   * @returns {Element|null}
   */
  function detectGuideTrigger() {
    var selectors = [
      "[data-tooltip='帮助']",
      ".tool-btn",
      ".help-btn",
      ".guide-btn",
      "button[title*='说明']",
      "button[title*='帮助']",
    ];
    var index = 0;

    /**
     * 优先从显式帮助按钮中选取入口，便于共享桥接脚本挂接学生信息流程。
     * @returns {Element|null}
     */
    for (index = 0; index < selectors.length; index += 1) {
      var element = document.querySelector(selectors[index]);
      if (element) {
        return element;
      }
    }
    return null;
  }

  /**
   * 生成统一提交上下文。
   * @returns {{
   * gameId: string,
   * gameName: string,
   * levelId: string,
   * levelName: string,
   * score: string,
   * captureTargets: {canvas: HTMLCanvasElement|null, element: Element|null},
   * exportHandlers: string[],
   * stateSnapshot: Object<string, *>,
   * guideTrigger: Element|null
   * }}
   */
  function getSubmissionContext() {
    var gameInfo = detectGameInfo();
    var levelId = detectLevelId();
    var levelName = detectLevelName(levelId);
    var score = detectScore();
    var exportHandlers = [];
    var exportCandidateNames = [
      "exportScreenshot",
      "exportPlan",
      "exportData",
      "exportReport",
      "downloadReport",
      "exportMaterialPackage",
    ];
    var index = 0;

    /**
     * 只登记当前页面存在的导出函数名，由提交桥接层决定是否作为提示或兜底信息使用。
     * @returns {string[]}
     */
    for (index = 0; index < exportCandidateNames.length; index += 1) {
      if (typeof global[exportCandidateNames[index]] === "function") {
        exportHandlers.push(exportCandidateNames[index]);
      }
    }

    return {
      gameId: gameInfo.gameId,
      gameName: gameInfo.gameName,
      levelId: levelId,
      levelName: levelName,
      score: score,
      captureTargets: detectCaptureTarget(),
      exportHandlers: exportHandlers,
      stateSnapshot: readStateSnapshot(),
      guideTrigger: detectGuideTrigger(),
    };
  }

  /**
   * 导出适配器 API。
   */
  global.GameSubmissionAdapters = {
    getSubmissionContext: getSubmissionContext,
  };
})(window);
