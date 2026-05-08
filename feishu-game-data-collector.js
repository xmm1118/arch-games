/**
 * 飞书妙搭 + 多维表格 数据收集模块
 * 
 * 功能：
 * 1. 监听来自妙搭的学生身份信息
 * 2. 收集游戏关卡数据
 * 3. 通过postMessage提交数据到妙搭
 * 
 * 使用：在游戏HTML中引入此脚本即可
 */

// ============ 游戏配置 - 每个游戏可以覆盖 ============
window.FEISHU_GAME_CONFIG = window.FEISHU_GAME_CONFIG || {
    gameId: null,      // 游戏ID（如'游戏0'，自动识别也可以）
    gameName: null     // 游戏名称（如'画法几何入门'）
};

// ============ 1. 初始化 - 监听来自妙搭的消息 ============
window.addEventListener('message', function(event) {
    const message = event.data;
    
    // 1.1 学生信息
    if (message.type === 'FEISHU_STUDENT_INFO') {
        localStorage.setItem('feishu_student_info', JSON.stringify({
            studentId: message.studentId,
            studentName: message.studentName,
            className: message.className || ''
        }));
        console.log('✅ 收到学生信息:', message);
        
        // 更新按钮状态
        updateFeishuButton(true);
    }
    
    // 1.2 文件导入响应
    if (message.type === 'FEISHU_FILE_IMPORT_RESPONSE') {
        const { requestId, success, data, error } = message;

        if (success) {
            console.log('文件导入成功:', data.name);
            console.log('文件内容:', data.content);
            // 触发自定义事件，游戏可以监听这个事件来处理文件内容
            const importEvent = new CustomEvent('feishuFileImported', {
                detail: { name: data.name, content: data.content }
            });
            document.dispatchEvent(importEvent);
        } else {
            console.error('文件导入失败:', error);
        }
    }
});

// ============ 2. 请求导入文件（触发妙搭的文件选择器） ============
function requestFileImport(accept = '.json,.txt') {
    const requestId = Date.now().toString();

    window.parent.postMessage({
        type: 'FEISHU_FILE_IMPORT_REQUEST',
        requestId: requestId,
        accept: accept
    }, '*');

    console.log('📥 请求导入文件，类型:', accept);
    return requestId;
}

// ============ 2. 提交成绩函数 ============
function submitToFeishu() {
    const studentInfo = JSON.parse(localStorage.getItem('feishu_student_info') || '{}');

    if (!studentInfo.studentId) {
        alert('请先在左侧填写学生信息！');
        return;
    }

    // 自动识别游戏信息
    const gameInfo = detectGameInfo();
    const gameId = window.FEISHU_GAME_CONFIG.gameId || gameInfo.gameId;
    const gameName = window.FEISHU_GAME_CONFIG.gameName || gameInfo.gameName;

    // 收集游戏数据
    const gameData = {
        type: 'FEISHU_GAME_SUBMIT',
        data: {
            studentId: studentInfo.studentId,
            studentName: studentInfo.studentName,
            className: studentInfo.className,
            gameId: gameId,
            gameName: gameName,
            levelId: window.currentLevel || window.currentLevelId || 1,
            levelName: '关卡' + (window.currentLevel || window.currentLevelId || 1),
            isCompleted: window.levelCompleted || true,
            score: window.currentScore || 0,
            timeSpent: window.timeSpent || window.levelTimeSpent || 0,
            operationData: JSON.stringify(window.operationLog || window.gameState || {}),
            submitTime: new Date().toISOString()
        }
    };

    // 发送给妙搭
    window.parent.postMessage(gameData, '*');
    console.log('📤 成绩已提交:', gameData);
    
    // 按钮反馈
    const btn = document.getElementById('feishu-submit-btn');
    if (btn) {
        btn.innerHTML = '✅ 提交成功';
        setTimeout(() => {
            btn.innerHTML = '📤 提交成绩到飞书';
        }, 2000);
    }
}

// ============ 3. 自动识别游戏信息 ============
function detectGameInfo() {
    const path = window.location.pathname;
    const pathParts = path.split('/');

    let gameDir = '';
    for (let i = pathParts.length - 1; i >= 0; i--) {
        if (pathParts[i] && pathParts[i].indexOf('游戏') === 0) {
            gameDir = pathParts[i];
            break;
        }
    }

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
        gameId: gameDir || '未知游戏',
        gameName: gameNames[gameDir] || gameDir
    };
}

// ============ 4. 更新按钮状态 ============
function updateFeishuButton(hasInfo) {
    const btn = document.getElementById('feishu-submit-btn');
    if (btn) {
        if (hasInfo) {
            btn.innerHTML = '📤 提交成绩到飞书';
            btn.disabled = false;
            btn.style.background = '#1677ff';
        } else {
            btn.innerHTML = '⚠️ 请填写信息';
            btn.disabled = true;
        }
    }
}

// ============ 5. 在页面中添加提交按钮 ============
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.createElement('button');
    btn.id = 'feishu-submit-btn';
    btn.innerHTML = '⚠️ 请填写信息';
    btn.disabled = true;
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 20px;background:#1677ff;color:white;border:none;border-radius:6px;cursor:pointer;z-index:9999;';
    btn.onclick = submitToFeishu;
    document.body.appendChild(btn);

    // 检查是否有学生信息
    if (localStorage.getItem('feishu_student_info')) {
        updateFeishuButton(true);
    }
});

console.log('✅ 飞书妙搭数据收集模块已加载');
