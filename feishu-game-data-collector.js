/**
 * 游戏系统 - 飞书妙搭数据收集模块
 * 
 * 功能：
 * 1. 监听来自妙搭的学生身份信息
 * 2. 收集游戏关卡数据
 * 3. 通过postMessage提交数据到妙搭
 * 
 * 使用：在游戏HTML中引入此脚本即可
 */

(function() {
    'use strict';

    // ============ 配置 ============
    const CONFIG = {
        STORAGE_KEY: 'feishu_student_info',
        BUTTON_ID: 'feishu-submit-btn',
        DEBUG: true
    };

    // ============ 全局状态 ============
    let hasStudentInfo = false;

    // ============ 初始化 ============
    function init() {
        // 1. 从localStorage读取已保存的学生信息
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
            hasStudentInfo = true;
            if (CONFIG.DEBUG) console.log('📚 已读取学生信息:', JSON.parse(stored));
        }

        // 2. 监听来自妙搭的postMessage
        window.addEventListener('message', handleMessage);

        // 3. DOM加载完成后初始化按钮
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initSubmitButton);
        } else {
            initSubmitButton();
        }

        if (CONFIG.DEBUG) console.log('✅ 飞书游戏数据收集模块已初始化');
    }

    // ============ 消息处理 ============
    function handleMessage(event) {
        // 安全性校验（生产环境建议限制origin）
        // if (event.origin !== 'https://feishu.cn') return;

        const message = event.data;

        if (message.type === 'FEISHU_STUDENT_INFO') {
            handleStudentInfo(message);
        }
    }

    function handleStudentInfo(message) {
        // 1. 保存到localStorage
        const studentData = {
            studentId: message.studentId,
            studentName: message.studentName,
            className: message.className
        };
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(studentData));

        // 2. 更新状态和按钮
        hasStudentInfo = true;
        updateSubmitButtonState(true);

        if (CONFIG.DEBUG) console.log('✅ 学生信息已接收并保存:', studentData);
    }

    // ============ 提交按钮 ============
    function initSubmitButton() {
        // 检查按钮是否已存在
        let submitBtn = document.getElementById(CONFIG.BUTTON_ID);

        // 如果不存在，创建一个浮动按钮
        if (!submitBtn) {
            submitBtn = createFloatingButton();
            document.body.appendChild(submitBtn);
        }

        // 绑定点击事件
        submitBtn.addEventListener('click', submitToFeishu);

        // 设置初始状态
        updateSubmitButtonState(hasStudentInfo);
    }

    function createFloatingButton() {
        const btn = document.createElement('button');
        btn.id = CONFIG.BUTTON_ID;
        btn.innerHTML = '📤 提交成绩到飞书';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 24px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s;
        `;

        // hover效果
        btn.onmouseover = function() {
            if (!this.disabled) {
                this.style.background = '#218838';
                this.style.transform = 'translateY(-2px)';
            }
        };
        btn.onmouseout = function() {
            if (!this.disabled) {
                this.style.background = '#28a745';
                this.style.transform = 'translateY(0)';
            }
        };

        return btn;
    }

    function updateSubmitButtonState(hasInfo) {
        const submitBtn = document.getElementById(CONFIG.BUTTON_ID);
        if (submitBtn) {
            if (hasInfo) {
                submitBtn.innerHTML = '📤 提交成绩到飞书';
                submitBtn.disabled = false;
                submitBtn.style.background = '#28a745';
                submitBtn.style.cursor = 'pointer';
            } else {
                submitBtn.innerHTML = '⚠️ 请先填写学生信息';
                submitBtn.disabled = true;
                submitBtn.style.background = '#6c757d';
                submitBtn.style.cursor = 'not-allowed';
            }
        }
    }

    // ============ 数据收集 ============
    function detectGameInfo() {
        const path = window.location.pathname;
        const pathParts = path.split('/');

        // 从路径中提取游戏目录名
        let gameDir = '';
        for (let i = pathParts.length - 1; i >= 0; i--) {
            if (pathParts[i] && pathParts[i].indexOf('游戏') === 0) {
                gameDir = pathParts[i];
                break;
            }
        }

        if (!gameDir) {
            // 如果没找到，尝试从URL中提取
            for (let i = 0; i < pathParts.length; i++) {
                if (pathParts[i].indexOf('游戏') === 0) {
                    gameDir = pathParts[i];
                    break;
                }
            }
        }

        // 游戏ID就是目录名
        const gameId = gameDir || '未知游戏';

        // 游戏名称映射
        const gameNames = {
            '游戏0画法几何与建筑制图基础': '画法几何与建筑制图基础',
            '游戏1场地分析系统': '场地分析系统',
            '游戏2平面布局系统': '平面布局系统',
            '游戏3体块设计系统v2.0': '体块设计系统',
            '游戏4立面造型系统': '立面造型系统',
            '游戏5空间体验系统': '空间体验系统',
            '游戏6建筑性能模拟': '建筑性能模拟',
            '游戏7方案优化迭代': '方案优化迭代',
            '游戏8构造设计系统': '构造设计系统',
            '游戏9碳排放计算系统': '碳排放计算系统',
            '游戏10室内设计系统': '室内设计系统',
            '游戏11效果图生成系统': '效果图生成系统',
            '游戏12方案汇报系统': '方案汇报系统',
            '游戏13外墙构造深化': '外墙构造深化',
            '游戏14隔墙与内装修': '隔墙与内装修',
            '游戏15楼板与地面': '楼板与地面',
            '游戏16屋顶构造深化': '屋顶构造深化',
            '游戏17门窗构造深化': '门窗构造深化',
            '游戏18节点构造深化': '节点构造深化',
            '游戏19施工造价与工程管理系统': '施工造价与工程管理系统'
        };

        return {
            gameId: gameId,
            gameName: gameNames[gameId] || gameId
        };
    }

    function collectLevelData() {
        const studentInfo = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
        const gameInfo = detectGameInfo();

        // 尝试从全局变量或DOM中获取关卡数据
        const levelId = window.currentLevelId || 
                         window.gameState?.currentLevel ||
                         getLevelFromDOM() || 1;

        const levelName = window.currentLevelName ||
                          window.gameState?.levelName ||
                          `关卡${levelId}`;

        const isCompleted = window.levelCompleted ||
                           window.gameState?.completed ||
                           false;

        const score = window.currentScore ||
                     window.gameState?.score ||
                     0;

        const timeSpent = window.levelTimeSpent ||
                         window.gameState?.timeSpent ||
                         Math.floor((Date.now() - (window.gameStartTime || Date.now())) / 1000);

        return {
            // 学生信息
            studentId: studentInfo.studentId || '',
            studentName: studentInfo.studentName || '',
            className: studentInfo.className || '',

            // 游戏信息
            gameId: gameInfo.gameId,
            gameName: gameInfo.gameName,
            levelId: levelId,
            levelName: levelName,

            // 游戏结果
            isCompleted: isCompleted,
            score: score,
            timeSpent: timeSpent,

            // 附加数据
            operationData: JSON.stringify(window.operationLog || window.gameState || {}),
            submitTime: new Date().toISOString()
        };
    }

    function getLevelFromDOM() {
        // 尝试从DOM中获取关卡信息
        const levelElements = document.querySelectorAll('[data-level], .level, .stage');
        if (levelElements.length > 0) {
            const levelText = levelElements[0].textContent;
            const match = levelText.match(/\d+/);
            if (match) return parseInt(match[0]);
        }
        return null;
    }

    // ============ 提交函数 ============
    async function submitToFeishu() {
        const submitBtn = document.getElementById(CONFIG.BUTTON_ID);

        // 1. 校验：检查学生信息是否存在
        if (!hasStudentInfo) {
            alert('⚠️ 请先在妙搭左侧面板填写学生信息！');
            return;
        }

        // 2. 更新按钮状态
        submitBtn.innerHTML = '🔄 正在同步...';
        submitBtn.disabled = true;
        submitBtn.style.background = '#007bff';

        try {
            // 3. 收集数据
            const data = collectLevelData();

            // 4. 发送postMessage给妙搭
            window.parent.postMessage({
                type: 'FEISHU_GAME_SUBMIT',
                data: data
            }, '*');

            if (CONFIG.DEBUG) console.log('📤 数据已发送到妙搭:', data);

            // 5. 显示成功（实际应该等待妙搭的回调确认）
            setTimeout(() => {
                submitBtn.innerHTML = '✅ 提交成功';
                submitBtn.style.background = '#28a745';
                setTimeout(() => {
                    submitBtn.innerHTML = '📤 提交成绩到飞书';
                    submitBtn.disabled = false;
                }, 2000);
            }, 1000);

        } catch (error) {
            console.error('❌ 提交失败:', error);
            submitBtn.innerHTML = '❌ 提交失败，重试';
            submitBtn.style.background = '#dc3545';
            submitBtn.disabled = false;
        }
    }

    // ============ 暴露给全局的API ============
    window.FeishuGameData = {
        submit: submitToFeishu,
        collectData: collectLevelData,
        getGameInfo: detectGameInfo,
        hasInfo: () => hasStudentInfo,
        setLevel: function(levelId, levelName, score, completed) {
            window.currentLevelId = levelId;
            window.currentLevelName = levelName;
            window.currentScore = score;
            window.levelCompleted = completed;
            if (CONFIG.DEBUG) console.log('🎮 关卡数据已更新:', {levelId, levelName, score, completed});
        }
    };

    // ============ 启动 ============
    init();

})();
