/**
 * 游戏12：方案汇报系统
 * 建筑师成长之路 - 游戏化教学平台
 */

// ========================================
// 应用状态管理
// ========================================
const AppState = {
    currentModule: 'overview',
    currentLevel: 1,
    levelProgress: [0, 0, 0, 0, 0],
    importedData: {},
    pptData: {
        template: 'minimal',
        slides: [],
        pages: 10
    },
    scriptData: {
        segments: [],
        totalTime: 0
    },
    qaData: {
        questions: [],
        answers: []
    },
    evalData: {
        ratings: {},
        comment: ''
    },
    recordings: [],
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    presentationIndex: 0,
    presentationPaused: false,
    timerInterval: null,
    recordingTimer: null,
    recordingDuration: 0
};

// ========================================
// 关卡配置
// ========================================
const LEVELS = [
    {
        id: 1,
        title: '方案梳理与整合',
        description: '学会整理和整合设计方案',
        objectives: {
            completed: '设计方案已整理完成',
            next: '开始制作PPT'
        },
        tasks: [
            { id: 't1-1', text: '从游戏2/3/4/8/9/11导入设计数据', completed: false },
            { id: 't1-2', text: '分类整理设计成果', completed: false },
            { id: 't1-3', text: '生成方案目录结构', completed: false },
            { id: 't1-4', text: '确定汇报逻辑和重点', completed: false }
        ],
        outputs: ['方案整理清单', '汇报大纲']
    },
    {
        id: 2,
        title: 'PPT制作入门',
        description: '掌握PPT制作的基本方法',
        objectives: {
            completed: 'PPT基础框架已完成',
            next: '准备汇报脚本'
        },
        tasks: [
            { id: 't2-1', text: '选择PPT模板', completed: false },
            { id: 't2-2', text: '创建10页核心页面', completed: false },
            { id: 't2-3', text: '填充内容和图片', completed: false },
            { id: 't2-4', text: '调整版式和配色', completed: false }
        ],
        outputs: ['初步PPT文件', '内容清单']
    },
    {
        id: 3,
        title: '汇报脚本与演讲准备',
        description: '学习如何准备汇报脚本',
        objectives: {
            completed: '汇报脚本已完善',
            next: '学习汇报技巧'
        },
        tasks: [
            { id: 't3-1', text: '基于PPT生成汇报脚本', completed: false },
            { id: 't3-2', text: '编辑和优化讲稿', completed: false },
            { id: 't3-3', text: '计算演讲时间', completed: false },
            { id: 't3-4', text: '练习3次，录音回听', completed: false }
        ],
        outputs: ['最终汇报脚本', '录音文件']
    },
    {
        id: 4,
        title: '汇报技巧与互动',
        description: '掌握汇报技巧和互动方法',
        objectives: {
            completed: '技巧清单已完成',
            next: '完成综合实战汇报'
        },
        tasks: [
            { id: 't4-1', text: '学习开场技巧', completed: false },
            { id: 't4-2', text: '学习结尾技巧', completed: false },
            { id: 't4-3', text: '预设5个常见问题及答案', completed: false },
            { id: 't4-4', text: '模拟汇报1次', completed: false }
        ],
        outputs: ['汇报技巧清单', '问答准备']
    },
    {
        id: 5,
        title: '综合实战 - 完整汇报',
        description: '完成一次完整的方案汇报',
        objectives: {
            completed: '恭喜完成所有任务！',
            next: '可继续优化或重新开始'
        },
        tasks: [
            { id: 't5-1', text: '完善PPT（20页以上）', completed: false },
            { id: 't5-2', text: '准备完整汇报脚本（10-15分钟）', completed: false },
            { id: 't5-3', text: '准备问答清单（10个问题）', completed: false },
            { id: 't5-4', text: '完成自我评估', completed: false }
        ],
        outputs: ['完整PPT', '汇报脚本', '问答清单', '评估表', '材料包']
    }
];

// ========================================
// PPT模板配置
// ========================================
const PPT_TEMPLATES = [
    {
        id: 'minimal',
        name: '极简现代风',
        icon: '📄',
        description: '简洁大方，突出内容',
        primaryColor: '#2563eb',
        bgColor: '#ffffff'
    },
    {
        id: 'academic',
        name: '学术汇报风',
        icon: '📚',
        description: '稳重专业，适合答辩',
        primaryColor: '#7c3aed',
        bgColor: '#fef3c7'
    },
    {
        id: 'business',
        name: '商业提案风',
        icon: '💼',
        description: '商务正式，突出数据',
        primaryColor: '#0891b2',
        bgColor: '#dbeafe'
    },
    {
        id: 'art',
        name: '艺术展示风',
        icon: '🎨',
        description: '创意十足，视觉冲击',
        primaryColor: '#db2777',
        bgColor: '#fce7f3'
    },
    {
        id: 'tech',
        name: '科技未来风',
        icon: '🚀',
        description: '前沿酷炫，技术展示',
        primaryColor: '#059669',
        bgColor: '#d1fae5'
    }
];

// ========================================
// 汇报技巧内容
// ========================================
const TIPS_CONTENT = {
    opening: {
        title: '开场技巧',
        icon: '🎯',
        subtitle: '如何吸引听众注意力',
        content: `
            <h4>好的开场是成功的一半</h4>
            <p>开场的前30秒决定了听众是否会继续关注你的演讲。一个精彩的开场能让评审老师眼前一亮，留下良好的第一印象。</p>
            
            <h4>五种有效的开场方式</h4>
            <ul>
                <li><strong>数据开场</strong>：用震撼的数据吸引注意力</li>
                <li><strong>问题开场</strong>：提出一个引人思考的问题</li>
                <li><strong>故事开场</strong>：讲述一个与设计相关的故事</li>
                <li><strong>对比开场</strong>：展示设计前后的对比</li>
                <li><strong>引用开场</strong>：引用名言或行业趋势</li>
            </ul>
            
            <div class="tip-example">
                <h5>💡 优秀开场示例</h5>
                <p>"在过去的100年里，建筑业的碳排放占全球总量的40%。而我们的设计，通过被动式建筑技术和可再生能源的结合，可以将建筑全生命周期的碳排放降低75%。今天，我将为大家介绍这个创新的可持续设计方案..."</p>
            </div>
        `,
        video: '优秀开场案例分析'
    },
    structure: {
        title: '主体结构',
        icon: '🏗️',
        subtitle: '逻辑清晰的汇报框架',
        content: `
            <h4>经典汇报结构</h4>
            <p>一个结构清晰的汇报就像一座坚固的建筑，每个部分都有其独特的功能和位置。</p>
            
            <ul>
                <li><strong>背景分析</strong>（10%）- 为什么做这个设计</li>
                <li><strong>设计理念</strong>（15%）- 设计思考和创意来源</li>
                <li><strong>方案介绍</strong>（40%）- 设计的核心内容</li>
                <li><strong>技术亮点</strong>（20%）- 创新点和专业技术</li>
                <li><strong>总结展望</strong>（15%）- 成果和未来方向</li>
            </ul>
            
            <h4>过渡技巧</h4>
            <p>使用过渡句让汇报更流畅："了解了背景之后，让我们来看看具体的设计方案..."</p>
            
            <div class="tip-example">
                <h5>💡 过渡句示例</h5>
                <ul>
                    <li>"基于以上分析，我们提出了以下设计方案..."</li>
                    <li>"接下来，我想重点介绍这个设计的核心创新点..."</li>
                    <li>"除了设计本身，这个方案在技术层面也有独特之处..."</li>
                </ul>
            </div>
        `,
        video: '结构清晰的汇报示范'
    },
    language: {
        title: '语言表达',
        icon: '🗣️',
        subtitle: '简洁有力的表达方式',
        content: `
            <h4>语言表达原则</h4>
            <ul>
                <li><strong>简洁</strong>：避免冗长，每个观点一句话说清</li>
                <li><strong>具体</strong>：用数据和实例支撑观点</li>
                <li><strong>专业</strong>：使用正确的建筑术语</li>
                <li><strong>生动</strong>：适当使用比喻和类比</li>
            </ul>
            
            <h4>语速和停顿</h4>
            <p>正常语速：每分钟150-180字</p>
            <ul>
                <li>重点内容前停顿，引起注意</li>
                <li>每个章节后停顿，给听众消化时间</li>
                <li>关键数据后停顿，确保听众记住</li>
            </ul>
            
            <div class="tip-example">
                <h5>💡 表达技巧</h5>
                <p>"这个建筑面积为12,000平方米" vs "这个建筑大约有16个标准篮球场那么大"</p>
                <p class="text-muted">后者更直观，容易让非专业人士理解</p>
            </div>
        `
    },
    body: {
        title: '肢体语言',
        icon: '🙋',
        subtitle: '自信从容的舞台表现',
        content: `
            <h4>站姿与移动</h4>
            <ul>
                <li>站姿稳重，重心均匀分布</li>
                <li>面向听众，与观众保持眼神接触</li>
                <li>适当移动，但不要来回踱步</li>
                <li>必要时指向屏幕或板书</li>
            </ul>
            
            <h4>手势运用</h4>
            <ul>
                <li>开放性手势传递自信</li>
                <li>手势与语言内容配合</li>
                <li>避免小动作（摸头发、插兜等）</li>
            </ul>
            
            <h4>眼神交流</h4>
            <ul>
                <li>与不同区域的听众都有眼神接触</li>
                <li>看PPT时快速扫视，不要长时间背对观众</li>
                <li>遇到提问时，看着提问者认真倾听</li>
            </ul>
            
            <div class="tip-example">
                <h5>💡 练习建议</h5>
                <p>对着镜子练习，或用手机录像回看，观察自己的肢体语言是否自然。</p>
            </div>
        `
    },
    interaction: {
        title: '互动技巧',
        icon: '🤝',
        subtitle: '让听众参与进来',
        content: `
            <h4>互动的重要性</h4>
            <p>适度的互动可以拉近与听众的距离，让汇报更有吸引力。</p>
            
            <ul>
                <li><strong>提问互动</strong>：适当抛出问题引导思考</li>
                <li><strong>眼神互动</strong>：通过眼神传递自信和真诚</li>
                <li><strong>引用听众观点</strong>："正如大家所感受到的..."</li>
                <li><strong>邀请参与</strong>：邀请听众体验或尝试</li>
            </ul>
            
            <h4>应对提问</h4>
            <ul>
                <li>认真倾听，不要打断</li>
                <li>确认理解，必要时复述问题</li>
                <li>坦诚回答，不知道的不要编造</li>
                <li>回答后确认是否满意</li>
            </ul>
            
            <div class="tip-example">
                <h5>💡 应对刁难问题</h5>
                <p>"这是一个很好的问题，让我想想..." "关于这一点，我认为..." "您提出的这个角度很有意思，我可以这样回答..."</p>
            </div>
        `
    },
    closing: {
        title: '结尾技巧',
        icon: '🎬',
        subtitle: '留下深刻印象',
        content: `
            <h4>好的结尾特征</h4>
            <ul>
                <li>总结核心要点，加深印象</li>
                <li>回应开场，形成呼应</li>
                <li>展望未来，留有余韵</li>
                <li>感谢听众，从容收尾</li>
            </ul>
            
            <h4>三种经典结尾方式</h4>
            <ul>
                <li><strong>总结式</strong>：回顾要点，强化记忆</li>
                <li><strong>升华式</strong>：将主题上升到更高层面</li>
                <li><strong>号召式</strong>：发出倡议或邀请行动</li>
            </ul>
            
            <div class="tip-example">
                <h5>💡 优秀结尾示例</h5>
                <p>"回顾今天的设计，我们始终坚持一个核心理念：建筑应该与自然和谐共生。我相信，随着更多可持续建筑理念的普及，我们的城市将会变得更加绿色、更加宜居。感谢各位的聆听，欢迎批评指正！"</p>
            </div>
        `,
        video: '精彩结尾案例'
    }
};

// ========================================
// Q&A问题库
// ========================================
const QA_CATEGORIES = [
    {
        id: 'concept',
        name: '设计理念相关',
        icon: '💡',
        questions: [
            {
                q: '你的设计灵感来源是什么？',
                a: '我的设计灵感主要来源于对场地的深入分析和对使用者需求的调研。在设计初期，我对基地进行了详细的环境分析，包括日照、风向、周边建筑形态等，在此基础上提出了"融入自然"的设计理念，力求让建筑与环境和谐共生。'
            },
            {
                q: '你的设计如何体现可持续理念？',
                a: '项目采用了多种可持续策略：1）被动式设计减少能耗；2）可再生能源系统提供部分电力；3）雨水收集系统满足景观灌溉；4）本地材料降低运输能耗；5）绿化屋面改善热工性能。综合碳排放较传统建筑降低40%。'
            }
        ]
    },
    {
        id: 'technical',
        name: '技术细节相关',
        icon: '🔧',
        questions: [
            {
                q: '构造节点的防水措施是如何处理的？',
                a: '在屋面与墙体交接处，我们采用了三级防水体系：1）结构层采用防水混凝土；2）防水卷材双层铺设；3）节点处附加防水层并设置排水槽。此外，在保温层设置了防潮层，防止冷凝水产生。'
            },
            {
                q: '建筑结构体系的选择依据是什么？',
                a: '结构体系的选择综合考虑了以下因素：1）建筑高度和跨度需求；2）使用空间的灵活性要求；3）施工周期和造价控制；4）与建筑造型的协调。最终选择了钢筋混凝土框架结构，局部采用钢结构实现大跨度空间。'
            }
        ]
    },
    {
        id: 'environmental',
        name: '环保性能相关',
        icon: '🌿',
        questions: [
            {
                q: '建筑的全生命周期碳排放如何计算？',
                a: '我们的碳排放计算涵盖建筑全生命周期三个阶段：1）隐含碳（材料生产和施工）约占45%；2）运营碳（运行能耗）约占50%；3）拆除处置碳约占5%。通过优化设计和选用低碳材料，项目生命周期碳排放降低了35%。'
            },
            {
                q: '如何保证室内的舒适度？',
                a: '室内舒适度通过以下措施保证：1）高性能外保温减少冷热损失；2）可调节外遮阳控制太阳辐射；3）自然通风优化减少空调依赖；4）地板辐射供暖提供均匀热环境；5）新风系统保证空气品质。设计达到绿色建筑三星标准。'
            }
        ]
    },
    {
        id: 'innovation',
        name: '创新点相关',
        icon: '💎',
        questions: [
            {
                q: '你设计中最具创新性的部分是什么？',
                a: '我认为最创新的是"呼吸幕墙"系统的应用。这种双层幕墙不仅具有良好的热工性能，还能根据室外风向自动调节开合角度，实现自然通风的最大化。配合智能控制系统，可根据室内CO2浓度自动调节新风量。'
            }
        ]
    },
    {
        id: 'feasibility',
        name: '可行性相关',
        icon: '📊',
        questions: [
            {
                q: '这个方案的造价如何控制？',
                a: '造价控制主要通过以下方式实现：1）标准化构件减少异形构件；2）选用性价比高的本地材料；3）优化结构设计减少建材用量；4）采用装配式施工降低人工成本。综合造价较同类项目提高约5%，但全生命周期成本降低25%。'
            },
            {
                q: '这个设计如何落地实施？',
                a: '设计充分考虑了实施可行性：1）采用成熟技术和常规材料；2）施工节点详细标注；3）预留了设备管线和检修空间；4）制定了分阶段实施计划。方案可操作性已通过专家论证。'
            }
        ]
    },
    {
        id: 'cost',
        name: '成本效益相关',
        icon: '💰',
        questions: [
            {
                q: '初期投资较高，如何看待回报周期？',
                a: '虽然初期投资增加约8%，但通过以下途径可在8-10年内收回增量成本：1）能耗降低40%节约运营费用；2）维护成本降低30%；3）获得绿色建筑认证提升资产价值；4）碳配额交易带来潜在收益。长期经济效益显著。'
            }
        ]
    }
];

// ========================================
// 应用主类
// ========================================
class PresentationSystem {
    constructor() {
        this.state = { ...AppState };
        this.init();
    }

    init() {
        this.renderLevelNav();
        this.renderLevelDots();
        this.updateLevelInfo();
        this.updateTaskList();
        this.updateOutputList();
        this.renderScoreOverview();
        this.switchModule('overview');
        this.loadProgress();
        this.setupFileUpload();
        this.showWelcomeGuide();
    }

    // ========================================
    // 导航与模块切换
    // ========================================
    switchModule(module) {
        this.state.currentModule = module;
        
        // 更新工具栏按钮状态
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.module === module);
        });

        // 渲染对应模块
        const workspace = document.getElementById('workspace');
        switch (module) {
            case 'overview':
                workspace.innerHTML = this.renderOverviewModule();
                break;
            case 'ppt':
                workspace.innerHTML = this.renderPPTModule();
                this.initPPTEditor();
                break;
            case 'script':
                workspace.innerHTML = this.renderScriptModule();
                break;
            case 'tips':
                workspace.innerHTML = this.renderTipsModule();
                this.initTipsNavigation();
                break;
            case 'qa':
                workspace.innerHTML = this.renderQAModule();
                this.initQANavigation();
                break;
            case 'eval':
                workspace.innerHTML = this.renderEvalModule();
                this.initEvaluation();
                break;
            case 'tools':
                workspace.innerHTML = this.renderToolsModule();
                break;
            default:
                workspace.innerHTML = this.renderOverviewModule();
        }
    }

    switchLevel(level) {
        this.state.currentLevel = level;
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
        });
        this.renderLevelDots();
        this.updateLevelInfo();
        this.updateTaskList();
        this.updateOutputList();
        
        // 渲染对应关卡内容
        const workspace = document.getElementById('workspace');
        workspace.innerHTML = this.renderLevelContent(level);
        this.initLevelContent(level);
    }

    // ========================================
    // 渲染函数
    // ========================================
    renderLevelNav() {
        const nav = document.getElementById('levelNav');
        nav.innerHTML = LEVELS.map(level => `
            <button class="level-btn ${level.id === 1 ? 'active' : ''}" 
                    data-level="${level.id}" 
                    onclick="app.switchLevel(${level.id})">
                <span class="level-num">${level.id}</span>
                <span class="level-name">${level.title}</span>
            </button>
        `).join('');
    }

    renderLevelDots() {
        const dots = document.getElementById('levelDots');
        dots.innerHTML = LEVELS.map(level => `
            <div class="level-dot ${level.id === this.state.currentLevel ? 'active' : ''} ${this.state.levelProgress[level.id - 1] >= 100 ? 'completed' : ''}"
                 onclick="app.switchLevel(${level.id})"></div>
        `).join('');
        
        document.getElementById('currentLevelDisplay').textContent = this.state.currentLevel;
    }

    updateLevelInfo() {
        const level = LEVELS[this.state.currentLevel - 1];
        document.getElementById('levelInfo').innerHTML = `
            <h4>关卡 ${level.id}: ${level.title}</h4>
            <p>${level.description}</p>
        `;
        this.renderScoreOverview();
    }

    /**
     * 根据当前关卡状态生成统一的评分说明卡片。
     * @returns {{score:number,status:string,description:string,rules:Array<{icon:string,label:string,points:number}>}}
     */
    getLevelScoreSummary() {
        const level = LEVELS[this.state.currentLevel - 1];
        const completedCount = level.tasks.filter(task => task.completed).length;
        const progressRatio = level.tasks.length === 0 ? 0 : completedCount / level.tasks.length;
        const importedReady = Object.keys(this.state.importedData).length > 0 ? 15 : 0;
        const outputReady = level.outputs.filter(output => this.isOutputReady(output)).length * 5;
        const baseScore = Math.round(progressRatio * 60) + importedReady + Math.min(outputReady, 25);
        const score = Math.min(100, baseScore);

        let status = '待提升';
        let description = '先完成任务清单，再补齐成果产出。';

        if (score >= 85) {
            status = '优秀';
            description = '内容完整、逻辑清晰，已经达到较好的汇报状态。';
        } else if (score >= 70) {
            status = '良好';
            description = '主体内容比较完整，继续优化表达和成果细节。';
        } else if (score >= 50) {
            status = '进行中';
            description = '基础结构已建立，建议优先完成当前关卡核心任务。';
        }

        return {
            score,
            status,
            description,
            rules: [
                { icon: '✅', label: '完成度', points: 40 },
                { icon: '🧠', label: '逻辑清晰度', points: 25 },
                { icon: '🗣️', label: '表达质量', points: 20 },
                { icon: '📦', label: '成果完整度', points: 15 }
            ]
        };
    }

    /**
     * 渲染右侧统一评分卡，保持不同页面的评分说明一致。
     * @returns {void}
     */
    renderScoreOverview() {
        const container = document.getElementById('scoreOverviewCard');
        if (!container) return;

        const summary = this.getLevelScoreSummary();
        container.innerHTML = `
            <div class="score-overview-head">
                <div class="score-overview-value">${summary.score}</div>
                <span class="score-overview-badge">${summary.status}</span>
            </div>
            <p class="score-overview-desc">${summary.description}</p>
            <div class="score-rule-list">
                ${summary.rules.map(rule => `
                    <div class="score-rule-item">
                        <span class="score-rule-label"><span>${rule.icon}</span><span>${rule.label}</span></span>
                        <span class="score-rule-points">${rule.points} 分</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 首次进入页面时显示统一引导弹窗，让页面提示逻辑保持一致。
     * @returns {void}
     */
    showWelcomeGuide() {
        const guideKey = 'presentationSystemWelcomeShown';
        if (sessionStorage.getItem(guideKey)) return;
        sessionStorage.setItem(guideKey, '1');
        this.showModal('welcomeModal');
    }

    updateTaskList() {
        const level = LEVELS[this.state.currentLevel - 1];
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = level.tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : 'pending'}">
                <span class="icon">${task.completed ? '✓' : '○'}</span>
                <span>${task.text}</span>
            </div>
        `).join('');
        this.renderScoreOverview();
    }

    updateOutputList() {
        const level = LEVELS[this.state.currentLevel - 1];
        const outputList = document.getElementById('outputList');
        outputList.innerHTML = level.outputs.map(output => `
            <div class="output-item">
                <span class="status ${this.isOutputReady(output) ? 'ready' : 'pending'}">
                    ${this.isOutputReady(output) ? '✓' : '○'}
                </span>
                <span>${output}</span>
            </div>
        `).join('');
        this.renderScoreOverview();
    }

    isOutputReady(output) {
        // 检查产出是否准备就绪
        if (output.includes('PPT') && this.state.pptData.slides.length > 0) return true;
        if (output.includes('脚本') && this.state.scriptData.segments.length > 0) return true;
        if (output.includes('问答') && this.state.qaData.questions.length > 0) return true;
        if (output.includes('评估') && Object.keys(this.state.evalData.ratings).length > 0) return true;
        return false;
    }

    // ========================================
    // 模块内容渲染
    // ========================================
    renderOverviewModule() {
        return `
            <div class="module-header">
                <h2 class="module-title">方案整合系统</h2>
                <p class="module-subtitle">整理和汇总所有前置游戏的设计成果</p>
            </div>
            
            <div class="level-content">
                <div class="level-header">
                    <h2>欢迎来到方案汇报系统</h2>
                    <p>这是建筑师成长之路 Phase 1 核心流程的最后一个必做游戏。在这里，你将学习如何将设计方案清晰、有力地展示和汇报。</p>
                </div>
                
                <div class="grid-3 mt-3">
                    <div class="card">
                        <div class="card-header">
                            <h3>📥 数据导入</h3>
                        </div>
                        <div class="card-body">
                            <p class="text-muted mb-2">从以下游戏中导入设计数据：</p>
                            <div class="game-sources compact">
                                <div class="source-item small">✅ 游戏2 - 平面布局系统</div>
                                <div class="source-item small">✅ 游戏3 - 体块设计系统</div>
                                <div class="source-item small">✅ 游戏4 - 立面造型系统</div>
                                <div class="source-item small">✅ 游戏8 - 构造设计系统</div>
                                <div class="source-item small">✅ 游戏9 - 碳排放计算系统</div>
                                <div class="source-item small">✅ 游戏11 - 效果图生成系统</div>
                            </div>
                            <button class="btn btn-primary mt-2" onclick="app.importGameData()">
                                <span class="icon">📥</span> 导入设计数据
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3>📊 数据预览</h3>
                        </div>
                        <div class="card-body" id="dataPreviewLarge">
                            ${this.renderDataPreview()}
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3>📋 方案大纲</h3>
                        </div>
                        <div class="card-body">
                            <div class="outline-structure">
                                <div class="outline-item"><span class="num">1</span> 封面</div>
                                <div class="outline-item"><span class="num">2</span> 目录</div>
                                <div class="outline-item"><span class="num">3</span> 设计背景与理念</div>
                                <div class="outline-item"><span class="num">4</span> 平面设计分析</div>
                                <div class="outline-item"><span class="num">5</span> 体块与空间</div>
                                <div class="outline-item"><span class="num">6</span> 立面与造型</div>
                                <div class="outline-item"><span class="num">7</span> 构造技术</div>
                                <div class="outline-item"><span class="num">8</span> 环保性能</div>
                                <div class="outline-item"><span class="num">9</span> 效果图展示</div>
                                <div class="outline-item"><span class="num">10</span> 总结与展望</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-3">
                    <div class="card-header">
                        <h3>📈 设计数据汇总</h3>
                    </div>
                    <div class="card-body">
                        <div class="data-charts">
                            ${this.renderDataCharts()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDataPreview() {
        const data = this.state.importedData;
        const keys = Object.keys(data);
        
        if (keys.length === 0) {
            return `<p class="empty-hint">暂无导入数据<br><small>点击上方按钮导入</small></p>`;
        }
        
        return `
            <div class="data-preview-list">
                ${keys.map(key => `
                    <div class="data-item">
                        <span class="icon">📄</span>
                        <span>${this.getGameName(key)}</span>
                        <span class="text-muted">${data[key] ? '已导入' : '未导入'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getGameName(key) {
        const names = {
            game2: '平面布局系统',
            game3: '体块设计系统',
            game4: '立面造型系统',
            game8: '构造设计系统',
            game9: '碳排放计算系统',
            game11: '效果图生成系统'
        };
        return names[key] || key;
    }

    renderDataCharts() {
        const data = this.state.importedData;
        const hasData = Object.values(data).some(v => v);
        
        if (!hasData) {
            return `<p class="empty-hint text-center">导入数据后将自动生成图表</p>`;
        }
        
        return `
            <div class="chart-card">
                <h4>设计完成度</h4>
                <div class="bar-chart">
                    ${['game2', 'game3', 'game4', 'game8', 'game9', 'game11'].map(key => `
                        <div class="bar-item">
                            <span class="bar-label">${this.getGameName(key).replace('系统', '')}</span>
                            <div class="bar-track">
                                <div class="bar-fill" style="width: ${data[key] ? 100 : 0}%">
                                    ${data[key] ? '100%' : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="chart-card">
                <h4>数据统计</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <div class="value">${Object.values(data).filter(v => v).length}</div>
                        <div class="label">已导入模块</div>
                    </div>
                    <div class="stat-item">
                        <div class="value">${Object.values(data).filter(v => v).length * 16.7 | 0}%</div>
                        <div class="label">总体进度</div>
                    </div>
                    <div class="stat-item">
                        <div class="value">${Object.keys(data).length}</div>
                        <div class="label">设计数据项</div>
                    </div>
                    <div class="stat-item">
                        <div class="value">待完善</div>
                        <div class="label">下一步</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPPTModule() {
        return `
            <div class="module-header">
                <h2 class="module-title">PPT生成系统</h2>
                <p class="module-subtitle">选择模板、编辑页面、生成专业汇报PPT</p>
            </div>
            
            <div class="tabs">
                <button class="tab-btn active" onclick="app.switchPPTTab('templates')">选择模板</button>
                <button class="tab-btn" onclick="app.switchPPTTab('editor')">页面编辑</button>
                <button class="tab-btn" onclick="app.switchPPTTab('preview')">预览导出</button>
            </div>
            
            <div class="tab-content active" id="ppt-templates">
                ${this.renderTemplates()}
            </div>
            <div class="tab-content" id="ppt-editor">
                ${this.renderPPTEditor()}
            </div>
            <div class="tab-content" id="ppt-preview">
                ${this.renderPPTPreview()}
            </div>
        `;
    }

    renderTemplates() {
        return `
            <div class="template-grid">
                ${PPT_TEMPLATES.map(template => `
                    <div class="template-card ${this.state.pptData.template === template.id ? 'selected' : ''}"
                         onclick="app.selectTemplate('${template.id}')">
                        <div class="template-preview ${template.id}">
                            <span>${template.icon}</span>
                        </div>
                        <div class="template-info">
                            <h4>${template.name}</h4>
                            <p>${template.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="card mt-3">
                <div class="card-header">
                    <h3>配色方案</h3>
                </div>
                <div class="card-body">
                    <div class="color-palettes">
                        <div class="color-palette selected" onclick="app.selectPalette('blue')">
                            <div class="colors">
                                <span style="background:#2563eb"></span>
                                <span style="background:#3b82f6"></span>
                                <span style="background:#1d4ed8"></span>
                            </div>
                            <span>专业蓝</span>
                        </div>
                        <div class="color-palette" onclick="app.selectPalette('green')">
                            <div class="colors">
                                <span style="background:#059669"></span>
                                <span style="background:#10b981"></span>
                                <span style="background:#047857"></span>
                            </div>
                            <span>环保绿</span>
                        </div>
                        <div class="color-palette" onclick="app.selectPalette('purple')">
                            <div class="colors">
                                <span style="background:#7c3aed"></span>
                                <span style="background:#a78bfa"></span>
                                <span style="background:#5b21b6"></span>
                            </div>
                            <span>学术紫</span>
                        </div>
                        <div class="color-palette" onclick="app.selectPalette('orange')">
                            <div class="colors">
                                <span style="background:#ea580c"></span>
                                <span style="background:#f97316"></span>
                                <span style="background:#c2410c"></span>
                            </div>
                            <span>活力橙</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPPTEditor() {
        return `
            <div class="ppt-editor">
                <div class="ppt-slides-list">
                    <h4>页面列表</h4>
                    <div id="slidesList">
                        ${this.renderSlidesList()}
                    </div>
                    <button class="btn btn-secondary mt-2" onclick="app.addSlide()">
                        <span class="icon">➕</span> 添加页面
                    </button>
                </div>
                
                <div class="ppt-preview">
                    <div class="ppt-preview-header">
                        <span>幻灯片预览</span>
                        <span class="text-muted" id="currentSlideNum">1 / ${this.state.pptData.slides.length || 1}</span>
                    </div>
                    <div class="ppt-preview-content">
                        ${this.renderSlidePreview()}
                    </div>
                </div>
                
                <div class="ppt-properties">
                    <h4>页面属性</h4>
                    <div class="form-group">
                        <label class="form-label">页面标题</label>
                        <input type="text" class="form-input" id="slideTitle" placeholder="输入页面标题" onchange="app.updateSlideTitle(this.value)">
                    </div>
                    <div class="form-group">
                        <label class="form-label">页面类型</label>
                        <select class="form-select" id="slideType" onchange="app.updateSlideType(this.value)">
                            <option value="cover">封面</option>
                            <option value="toc">目录</option>
                            <option value="text">文字页</option>
                            <option value="image">图片页</option>
                            <option value="chart">图表页</option>
                            <option value="end">结尾页</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">页面内容</label>
                        <textarea class="form-textarea" id="slideContent" placeholder="输入页面内容" onchange="app.updateSlideContent(this.value)"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">备注（演讲提示）</label>
                        <textarea class="form-textarea" id="slideNotes" placeholder="输入演讲备注" onchange="app.updateSlideNotes(this.value)" style="min-height:60px"></textarea>
                    </div>
                    <button class="btn btn-primary mt-2" onclick="app.saveCurrentSlide()">
                        <span class="icon">💾</span> 保存页面
                    </button>
                </div>
            </div>
        `;
    }

    renderSlidesList() {
        if (this.state.pptData.slides.length === 0) {
            return '<p class="empty-hint">点击添加页面开始</p>';
        }
        
        return this.state.pptData.slides.map((slide, index) => `
            <div class="slide-item ${index === this.state.currentSlideIndex ? 'active' : ''}" 
                 onclick="app.selectSlide(${index})"
                 draggable="true"
                 ondragstart="app.dragSlideStart(event, ${index})"
                 ondragover="app.dragSlideOver(event)"
                 ondrop="app.dropSlide(event, ${index})">
                <div class="slide-num">${index + 1}. ${slide.title || '未命名'}</div>
                <div class="slide-type">${this.getSlideTypeName(slide.type)}</div>
            </div>
        `).join('');
    }

    getSlideTypeName(type) {
        const names = {
            cover: '封面',
            toc: '目录',
            text: '文字',
            image: '图片',
            chart: '图表',
            end: '结尾'
        };
        return names[type] || '文字';
    }

    renderSlidePreview() {
        const slides = this.state.pptData.slides;
        const slide = slides[this.state.currentSlideIndex] || {
            title: '封面',
            type: 'cover',
            content: '建筑设计汇报'
        };
        
        const template = PPT_TEMPLATES.find(t => t.id === this.state.pptData.template) || PPT_TEMPLATES[0];
        
        return `
            <div class="ppt-slide-frame" style="background:${template.bgColor}">
                ${slide.type === 'cover' ? `
                    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
                        <h1 style="color:${template.primaryColor};font-size:28px;margin-bottom:16px">${slide.title || '建筑设计汇报'}</h1>
                        <p style="color:#666;font-size:16px">${slide.content || '建筑师成长之路'}</p>
                    </div>
                ` : `
                    <h2 style="color:${template.primaryColor};font-size:22px;margin-bottom:20px;border-bottom:2px solid ${template.primaryColor};padding-bottom:12px">
                        ${slide.title || '页面标题'}
                    </h2>
                    <div style="flex:1;font-size:14px;line-height:1.8">
                        ${slide.content || '请输入页面内容...'}
                    </div>
                `}
            </div>
        `;
    }

    renderPPTPreview() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>PPT预览与导出</h3>
                </div>
                <div class="card-body">
                    <div class="preview-info">
                        <div class="info-item">
                            <span class="label">模板</span>
                            <span class="value">${PPT_TEMPLATES.find(t => t.id === this.state.pptData.template)?.name || '极简现代风'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">页数</span>
                            <span class="value">${this.state.pptData.slides.length} 页</span>
                        </div>
                        <div class="info-item">
                            <span class="label">状态</span>
                            <span class="value ${this.state.pptData.slides.length > 0 ? 'text-success' : ''}">
                                ${this.state.pptData.slides.length > 0 ? '已保存' : '待编辑'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="export-info mt-3">
                        <h4>📋 导出说明</h4>
                        <p class="text-muted">由于浏览器限制，无法直接生成.pptx文件。我们提供以下方案：</p>
                        <ul class="mt-2">
                            <li>生成PPT内容清单（JSON格式）</li>
                            <li>提供详细的手动制作指南</li>
                            <li>生成可复制的文案素材</li>
                        </ul>
                    </div>
                    
                    <div class="flex gap-1 mt-3">
                        <button class="btn btn-primary" onclick="app.exportPPTContent()">
                            <span class="icon">📄</span> 导出内容清单
                        </button>
                        <button class="btn btn-secondary" onclick="app.exportPPTCopy()">
                            <span class="icon">📋</span> 复制文案素材
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <div class="card-header">
                    <h3>手动制作指南</h3>
                </div>
                <div class="card-body">
                    <div class="guide-steps">
                        <div class="guide-step">
                            <span class="step-num">1</span>
                            <div class="step-content">
                                <h4>创建新PPT</h4>
                                <p>打开PowerPoint/WPS，创建一个空白演示文稿</p>
                            </div>
                        </div>
                        <div class="guide-step">
                            <span class="step-num">2</span>
                            <div class="step-content">
                                <h4>应用模板</h4>
                                <p>选择"${PPT_TEMPLATES.find(t => t.id === this.state.pptData.template)?.name}"主题风格</p>
                            </div>
                        </div>
                        <div class="guide-step">
                            <span class="step-num">3</span>
                            <div class="step-content">
                                <h4>复制内容</h4>
                                <p>使用下方文案素材快速填充内容</p>
                            </div>
                        </div>
                        <div class="guide-step">
                            <span class="step-num">4</span>
                            <div class="step-content">
                                <h4>插入图片</h4>
                                <p>从游戏11效果图生成系统导出图片并插入</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderScriptModule() {
        return `
            <div class="module-header">
                <h2 class="module-title">汇报脚本生成系统</h2>
                <p class="module-subtitle">基于PPT内容自动生成讲稿，支持编辑和演示模式</p>
            </div>
            
            <div class="grid-2">
                <div class="script-editor-panel">
                    <div class="card">
                        <div class="card-header">
                            <h3>脚本管理</h3>
                            <div class="flex gap-1">
                                <button class="btn btn-sm btn-secondary" onclick="app.generateScript()">
                                    <span class="icon">✨</span> 智能生成
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="app.addScriptSegment()">
                                    <span class="icon">➕</span> 添加段落
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="script-list" id="scriptList">
                                ${this.renderScriptList()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="script-sidebar">
                    <div class="script-meta card">
                        <div class="card-body">
                            <h4 class="mb-2">📊 脚本统计</h4>
                            <div class="script-meta-item">
                                <span>段落数</span>
                                <span class="text-primary">${this.state.scriptData.segments.length}</span>
                            </div>
                            <div class="script-meta-item">
                                <span>总时长</span>
                                <span class="text-primary">${this.formatTime(this.state.scriptData.totalTime)}</span>
                            </div>
                            <div class="script-meta-item">
                                <span>建议语速</span>
                                <span>150-180字/分钟</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tips-box">
                        <h4>💡 演讲技巧</h4>
                        <ul>
                            <li>每段结束后适当停顿</li>
                            <li>重点内容语速放慢</li>
                            <li>数字和时间要准确</li>
                            <li>保持眼神交流</li>
                        </ul>
                    </div>
                    
                    <div class="card">
                        <div class="card-body">
                            <h4 class="mb-2">🎤 练习功能</h4>
                            <button class="btn btn-secondary" onclick="app.startPresentation()" style="width:100%">
                                <span class="icon">▶️</span> 演示模式
                            </button>
                            <button class="btn btn-secondary mt-2" onclick="app.toggleRecordingOverlay()" style="width:100%">
                                <span class="icon">🎤</span> 录音练习
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <div class="card-header">
                    <h3>脚本编辑器</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">段落标题</label>
                        <input type="text" class="form-input" id="segmentTitle" placeholder="例如：开场白、设计理念...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">讲稿内容</label>
                        <textarea class="form-textarea" id="segmentContent" placeholder="输入讲稿内容..." style="min-height:150px"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">情感标记</label>
                        <div class="emotion-tags">
                            <span class="emotion-tag" data-emotion="calm" onclick="app.setEmotion('calm')">平静</span>
                            <span class="emotion-tag" data-emotion="exciting" onclick="app.setEmotion('exciting')">激昂</span>
                            <span class="emotion-tag" data-emotion="humor" onclick="app.setEmotion('humor')">幽默</span>
                            <span class="emotion-tag" data-emotion="serious" onclick="app.setEmotion('serious')">严肃</span>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button class="btn btn-primary" onclick="app.saveSegment()">保存段落</button>
                        <button class="btn btn-secondary" onclick="app.clearSegmentForm()">清空</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderScriptList() {
        if (this.state.scriptData.segments.length === 0) {
            return `<p class="empty-hint">暂无脚本内容<br><small>点击"智能生成"基于PPT内容生成</small></p>`;
        }
        
        return this.state.scriptData.segments.map((seg, index) => `
            <div class="script-segment ${index === this.state.currentSegmentIndex ? 'active' : ''}" 
                 onclick="app.selectSegment(${index})">
                <div class="segment-header">
                    <span class="segment-title">${seg.title || '未命名段落'}</span>
                    <span class="segment-time">${this.formatTime(seg.duration || 60)}</span>
                </div>
                <div class="segment-content">${seg.content.substring(0, 80)}${seg.content.length > 80 ? '...' : ''}</div>
                <div class="segment-meta">
                    <span class="emotion-badge">${this.getEmotionName(seg.emotion)}</span>
                    <button class="btn-sm" onclick="event.stopPropagation();app.deleteSegment(${index})">删除</button>
                </div>
            </div>
        `).join('');
    }

    getEmotionName(emotion) {
        const names = { calm: '平静', exciting: '激昂', humor: '幽默', serious: '严肃' };
        return names[emotion] || '平静';
    }

    renderTipsModule() {
        return `
            <div class="module-header">
                <h2 class="module-title">汇报技巧学习</h2>
                <p class="module-subtitle">掌握专业的汇报方法和表达技巧</p>
            </div>
            
            <div class="tips-container">
                <div class="tips-nav">
                    ${Object.entries(TIPS_CONTENT).map(([key, tip], index) => `
                        <div class="tip-nav-item ${index === 0 ? 'active' : ''}" 
                             data-tip="${key}" 
                             onclick="app.switchTip('${key}')">
                            <span class="icon">${tip.icon}</span>
                            <div class="info">
                                <h4>${tip.title}</h4>
                                <p>${tip.subtitle}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="tips-content" id="tipsContent">
                    ${this.renderTipContent('opening')}
                </div>
            </div>
        `;
    }

    renderTipContent(tipKey) {
        const tip = TIPS_CONTENT[tipKey];
        if (!tip) return '';
        
        return `
            <div class="tip-detail">
                <h3><span>${tip.icon}</span> ${tip.title}</h3>
                <div class="content">
                    ${tip.content}
                </div>
            </div>
            
            ${tip.video ? `
                <div class="tip-detail">
                    <h3>📺 ${tip.video}</h3>
                    <div class="video-placeholder">
                        <div class="placeholder-icon">▶️</div>
                        <p class="text-muted">视频教程开发中...</p>
                        <p class="small text-muted">建议先学习文字内容，然后搜索网络上的优秀案例</p>
                    </div>
                </div>
            ` : ''}
            
            <div class="tip-detail">
                <h3>📝 练习任务</h3>
                <div class="practice-tasks">
                    <div class="practice-task">
                        <h4>✏️ 练习1</h4>
                        <p>根据所选主题，准备3种不同的开场方案</p>
                        <textarea class="form-textarea mt-1" placeholder="写下你的开场方案..."></textarea>
                    </div>
                    <div class="practice-task mt-2">
                        <h4>🎤 练习2</h4>
                        <p>对着镜子或手机录像，练习2分钟的开场陈述</p>
                        <button class="btn btn-secondary mt-1" onclick="app.toggleRecordingOverlay()">
                            <span class="icon">🎤</span> 开始录音
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderQAModule() {
        return `
            <div class="module-header">
                <h2 class="module-title">Q&A准备系统</h2>
                <p class="module-subtitle">预设可能的问题并准备答案，从容应对答辩</p>
            </div>
            
            <div class="qa-container">
                <div class="qa-list">
                    <div class="tabs">
                        <button class="tab-btn active" onclick="app.switchQATab('library')">问题库</button>
                        <button class="tab-btn" onclick="app.switchQATab('custom')">自定义问答</button>
                    </div>
                    
                    <div class="tab-content active" id="qa-library">
                        ${this.renderQALibrary()}
                    </div>
                    <div class="tab-content" id="qa-custom">
                        ${this.renderQACustom()}
                    </div>
                </div>
                
                <div class="qa-sidebar">
                    <div class="card">
                        <div class="card-body">
                            <h4>📊 问答统计</h4>
                            <div class="stat-grid mt-2">
                                <div class="stat-item">
                                    <div class="value">${this.state.qaData.questions.length}</div>
                                    <div class="label">已准备</div>
                                </div>
                                <div class="stat-item">
                                    <div class="value">${QA_CATEGORIES.length * 2}</div>
                                    <div class="label">问题库</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="qa-generator">
                        <h4>✨ 智能生成</h4>
                        <p class="text-muted small">基于你的设计数据，智能生成潜在问题</p>
                        <button class="btn btn-primary mt-2" onclick="app.generateQA()" style="width:100%">
                            <span class="icon">✨</span> 生成问答
                        </button>
                    </div>
                    
                    <div class="tips-box">
                        <h4>💡 答辩技巧</h4>
                        <ul>
                            <li>认真倾听，不要打断</li>
                            <li>确认理解后作答</li>
                            <li>不知道的不要乱说</li>
                            <li>保持自信和谦逊</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    renderQALibrary() {
        return QA_CATEGORIES.map(cat => `
            <div class="qa-category">
                <h4 class="category-title">
                    <span>${cat.icon}</span> ${cat.name}
                </h4>
                ${cat.questions.map((q, i) => `
                    <div class="qa-item ${this.isQAExpanded(cat.id, i) ? 'expanded' : ''}">
                        <div class="qa-item-header" onclick="app.toggleQA('${cat.id}', ${i})">
                            <h4>
                                <span class="icon">❓</span>
                                ${q.q}
                            </h4>
                            <span class="expand-icon">${this.isQAExpanded(cat.id, i) ? '▲' : '▼'}</span>
                        </div>
                        <div class="qa-item-body">
                            <div class="qa-answer">${q.a}</div>
                            <button class="btn btn-sm btn-secondary mt-1" onclick="app.addToMyQA('${cat.id}', ${i})">
                                <span class="icon">➕</span> 添加到我的问答
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    renderQACustom() {
        return `
            <div class="custom-qa-form">
                <div class="form-group">
                    <label class="form-label">问题</label>
                    <input type="text" class="form-input" id="customQuestion" placeholder="输入自定义问题...">
                </div>
                <div class="form-group">
                    <label class="form-label">参考答案</label>
                    <textarea class="form-textarea" id="customAnswer" placeholder="输入参考答案..." style="min-height:120px"></textarea>
                </div>
                <button class="btn btn-primary" onclick="app.addCustomQA()">
                    <span class="icon">➕</span> 添加问答
                </button>
            </div>
            
            <div class="my-qa-list mt-3">
                <h4 class="mb-2">我的问答列表</h4>
                ${this.state.qaData.questions.length === 0 ? 
                    '<p class="empty-hint">暂无自定义问答</p>' :
                    this.state.qaData.questions.map((item, index) => `
                        <div class="qa-item expanded">
                            <div class="qa-item-header">
                                <h4><span class="icon">❓</span> ${item.q}</h4>
                            </div>
                            <div class="qa-item-body">
                                <div class="qa-answer">${item.a}</div>
                                <button class="btn btn-sm btn-danger mt-1" onclick="app.deleteQA(${index})">
                                    <span class="icon">🗑️</span> 删除
                                </button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;
    }

    renderEvalModule() {
        return `
            <div class="module-header">
                <h2 class="module-title">汇报评估系统</h2>
                <p class="module-subtitle">全面评估汇报表现，发现不足持续改进</p>
            </div>
            
            <div class="eval-container">
                <div class="eval-summary">
                    <div class="score" id="evalScore">--</div>
                    <div class="label">综合评分</div>
                </div>
                
                <div class="eval-section mt-3">
                    <h3><span>📋</span> 内容完整性</h3>
                    ${this.renderEvalItem('completeness', '设计内容完整', '涵盖所有设计要点和技术细节')}
                    ${this.renderEvalItem('logic', '逻辑清晰', '汇报结构合理，层次分明')}
                    ${this.renderEvalItem('creativity', '创新亮点', '设计有自己的特色和创新点')}
                </div>
                
                <div class="eval-section">
                    <h3><span>🎤</span> 表达流畅度</h3>
                    ${this.renderEvalItem('fluency', '语言流畅', '表达清晰，无明显停顿')}
                    ${this.renderEvalItem('speed', '语速控制', '快慢适中，有节奏感')}
                    ${this.renderEvalItem('tone', '语调变化', '有轻重缓急，不单调')}
                </div>
                
                <div class="eval-section">
                    <h3><span>⏱️</span> 时间控制</h3>
                    ${this.renderEvalItem('time', '时间把握', '在规定时间内完成汇报')}
                    ${this.renderEvalItem('balance', '内容平衡', '各部分时间分配合理')}
                </div>
                
                <div class="eval-section">
                    <h3><span>👁️</span> 视觉呈现</h3>
                    ${this.renderEvalItem('ppt', 'PPT质量', '排版美观，内容清晰')}
                    ${this.renderEvalItem('images', '图片质量', '效果图和分析图专业')}
                </div>
                
                <div class="eval-section">
                    <h3><span>🤝</span> 互动表现</h3>
                    ${this.renderEvalItem('eye', '眼神交流', '与听众有良好眼神互动')}
                    ${this.renderEvalItem('body', '肢体语言', '姿态自然，手势得当')}
                    ${this.renderEvalItem('qa', '问答环节', '回答问题得体、自信')}
                </div>
                
                <div class="eval-section">
                    <h3>📝 综合评语</h3>
                    <div class="eval-comment">
                        <textarea class="form-textarea" id="evalComment" 
                                  placeholder="写下你的评语和建议..." 
                                  onchange="app.updateEvalComment(this.value)"></textarea>
                    </div>
                </div>
                
                <div class="flex justify-between mt-3">
                    <button class="btn btn-secondary" onclick="app.resetEval()">
                        <span class="icon">🔄</span> 重置评估
                    </button>
                    <button class="btn btn-primary" onclick="app.saveEval()">
                        <span class="icon">💾</span> 保存评估
                    </button>
                </div>
                
                <div class="card mt-3">
                    <div class="card-header">
                        <h3>🏆 评估标准参考</h3>
                    </div>
                    <div class="card-body">
                        <div class="eval-standards">
                            <div class="standard-item">
                                <span class="score-range">90-100</span>
                                <span class="grade">优秀</span>
                                <span class="desc">汇报非常出色，有感染力</span>
                            </div>
                            <div class="standard-item">
                                <span class="score-range">80-89</span>
                                <span class="grade">良好</span>
                                <span class="desc">汇报完整，表达流畅</span>
                            </div>
                            <div class="standard-item">
                                <span class="score-range">70-79</span>
                                <span class="grade">中等</span>
                                <span class="desc">基本完整，有待提升</span>
                            </div>
                            <div class="standard-item">
                                <span class="score-range"><70</span>
                                <span class="grade">需改进</span>
                                <span class="desc">内容或表达有明显不足</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEvalItem(key, title, desc) {
        const rating = this.state.evalData.ratings[key] || 0;
        return `
            <div class="eval-item">
                <div class="eval-criteria">
                    ${title}
                    <small>${desc}</small>
                </div>
                <div class="eval-rating">
                    ${[1,2,3,4,5].map(n => `
                        <div class="rating-star ${rating >= n ? 'active' : ''}" 
                             onclick="app.setRating('${key}', ${n})">${n}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderToolsModule() {
        return `
            <div class="module-header">
                <h2 class="module-title">第三方工具使用指南</h2>
                <p class="module-subtitle">在专业工具中完成方案汇报的实际操作</p>
            </div>
            
            <div class="tools-container">
                <div class="tool-category">
                    <h3>📊 PowerPoint / WPS 演示</h3>
                    <div class="tool-card">
                        <div class="tool-header">
                            <span class="tool-icon">📑</span>
                            <span class="tool-name">PPT制作指南</span>
                        </div>
                        <div class="tool-content">
                            <div class="step-list">
                                <div class="step-item">
                                    <span class="step-num">1</span>
                                    <div class="step-content">
                                        <h4>选择模板</h4>
                                        <p>打开 PowerPoint/WPS，在模板库中选择适合的模板</p>
                                        <div class="tip-box">💡 推荐使用"商务"、"学术"或"简洁"风格模板</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">2</span>
                                    <div class="step-content">
                                        <h4>设置页面尺寸</h4>
                                        <p>设计 → 幻灯片大小 → 选择"16:9"宽屏比例</p>
                                        <div class="tip-box">💡 确保投影仪和屏幕显示比例一致</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">3</span>
                                    <div class="step-content">
                                        <h4>插入图片</h4>
                                        <p>插入 → 图片 → 选择游戏11导出的效果图</p>
                                        <div class="tip-box">💡 使用"裁剪"工具调整图片大小和比例</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">4</span>
                                    <div class="step-content">
                                        <h4>设置字体和格式</h4>
                                        <p>选择合适的字体（推荐：微软雅黑、思源黑体）</p>
                                        <div class="tip-box">💡 正文不小于18号字，标题不小于32号字</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">5</span>
                                    <div class="step-content">
                                        <h4>导出PDF</h4>
                                        <p>文件 → 导出 → 创建PDF</p>
                                        <div class="tip-box">💡 PDF格式兼容性更好，适合打印和分享</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tool-category">
                    <h3>🎤 演讲录制工具</h3>
                    <div class="tool-card">
                        <div class="tool-header">
                            <span class="tool-icon">🎙️</span>
                            <span class="tool-name">录制演讲视频</span>
                        </div>
                        <div class="tool-content">
                            <div class="step-list">
                                <div class="step-item">
                                    <span class="step-num">1</span>
                                    <div class="step-content">
                                        <h4>打开录制软件</h4>
                                        <p>推荐使用：OBS Studio、Camtasia 或 QQ录屏</p>
                                        <div class="tip-box">💡 手机录制也是不错的选择</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">2</span>
                                    <div class="step-content">
                                        <h4>设置录制区域</h4>
                                        <p>选择录制"窗口"或"全屏"</p>
                                        <div class="tip-box">💡 确保PPT内容清晰可见</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">3</span>
                                    <div class="step-content">
                                        <h4>开始录制</h4>
                                        <p>先播放PPT，然后开始录制</p>
                                        <div class="tip-box">💡 录制前先清空桌面，只保留必要程序</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">4</span>
                                    <div class="step-content">
                                        <h4>检查录制效果</h4>
                                        <p>回放检查声音、画面是否清晰</p>
                                        <div class="tip-box">💡 注意语速、发音和肢体语言</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">5</span>
                                    <div class="step-content">
                                        <h4>导出视频</h4>
                                        <p>导出为MP4格式，便于分享</p>
                                        <div class="tip-box">💡 注意文件大小，避免过大</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tool-category">
                    <h3>📝 笔记与录音工具</h3>
                    <div class="tool-card">
                        <div class="tool-header">
                            <span class="tool-icon">📋</span>
                            <span class="tool-name">记录要点和改进</span>
                        </div>
                        <div class="tool-content">
                            <div class="step-list">
                                <div class="step-item">
                                    <span class="step-num">1</span>
                                    <div class="step-content">
                                        <h4>使用笔记软件</h4>
                                        <p>推荐：印象笔记、OneNote 或 石墨文档</p>
                                        <div class="tip-box">💡 多设备同步，方便随时随地查看</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">2</span>
                                    <div class="step-content">
                                        <h4>录音备份</h4>
                                        <p>使用手机录音机或专业录音软件</p>
                                        <div class="tip-box">💡 录音可以作为语音输入的备份</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">3</span>
                                    <div class="step-content">
                                        <h4>整理复盘</h4>
                                        <p>整理录音、笔记，找出问题</p>
                                        <div class="tip-box">💡 定期复盘，持续改进</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tool-category">
                    <h3>🌐 在线协作工具</h3>
                    <div class="tool-card">
                        <div class="tool-header">
                            <span class="tool-icon">🔗</span>
                            <span class="tool-name">云端协作与分享</span>
                        </div>
                        <div class="tool-content">
                            <div class="step-list">
                                <div class="step-item">
                                    <span class="step-num">1</span>
                                    <div class="step-content">
                                        <h4>上传到云盘</h4>
                                        <p>百度网盘、阿里云盘、OneDrive等</p>
                                        <div class="tip-box">💡 创建分享链接，方便导师和同学查看</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">2</span>
                                    <div class="step-content">
                                        <h4>使用协作平台</h4>
                                        <p>石墨文档、腾讯文档、飞书文档等</p>
                                        <div class="tip-box">💡 支持多人协作编辑</div>
                                    </div>
                                </div>
                                <div class="step-item">
                                    <span class="step-num">3</span>
                                    <div class="step-content">
                                        <h4>生成分享链接</h4>
                                        <p>生成可访问的分享链接</p>
                                        <div class="tip-box">💡 注意设置权限和有效期</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tools-tips">
                <h3>💡 实用技巧</h3>
                <div class="tips-grid">
                    <div class="tip-card">
                        <span class="tip-icon">🎨</span>
                        <h4>统一风格</h4>
                        <p>所有PPT使用相同的配色和字体</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-icon">📏</span>
                        <h4>对齐原则</h4>
                        <p>所有元素保持对齐，视觉更整洁</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-icon">🎯</span>
                        <h4>重点突出</h4>
                        <p>使用颜色、大小突出重点内容</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-icon">⏱️</span>
                        <h4>时间控制</h4>
                        <p>每个PPT页面讲解时间不超过2分钟</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-icon">👀</span>
                        <h4>眼神交流</h4>
                        <p>与观众保持眼神接触，增强互动</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-icon">🗣️</span>
                        <h4>语速适中</h4>
                        <p>保持稳定的语速，不要过快过慢</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================
    // 关卡内容渲染
    // ========================================
    renderLevelContent(level) {
        switch (level) {
            case 1:
                return this.renderLevel1();
            case 2:
                return this.renderLevel2();
            case 3:
                return this.renderLevel3();
            case 4:
                return this.renderLevel4();
            case 5:
                return this.renderLevel5();
            default:
                return '';
        }
    }

    renderLevel1() {
        return `
            <div class="level-header">
                <h2>关卡1: 方案梳理与整合</h2>
                <p>学习目标: 学会整理和整合设计方案</p>
            </div>
            
            <div class="level-objectives">
                <div class="objective-card">
                    <h4>已完成</h4>
                    <div class="value">${this.state.levelProgress[0] >= 25 ? '✓' : '0'} 项</div>
                </div>
                <div class="objective-card">
                    <h4>当前任务</h4>
                    <div class="value">导入设计数据</div>
                </div>
                <div class="objective-card">
                    <h4>产出</h4>
                    <div class="value">${LEVELS[0].outputs.length} 项</div>
                </div>
            </div>
            
            <div class="level-tasks">
                <div class="task-card">
                    <h4>📥 任务1: 导入前置游戏数据</h4>
                    <p>从游戏2/3/4/8/9/11中导出设计数据并导入本系统。数据包括平面图、体块模型、立面设计、构造节点、碳排放数据和效果图。</p>
                    <div class="task-actions">
                        <button class="btn btn-primary" onclick="app.importGameData()">
                            <span class="icon">📥</span> 导入数据
                        </button>
                    </div>
                    <div class="task-progress">
                        <div class="progress-text">${Object.values(this.state.importedData).filter(v => v).length} / 6 模块已导入</div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${Object.values(this.state.importedData).filter(v => v).length / 6 * 100}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>📋 任务2: 分类整理设计成果</h4>
                    <p>将导入的设计数据按照以下类别进行整理：设计方案类（平面、体块、立面）、技术成果类（构造、碳排）、展示素材类（效果图）。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.organizeData()">
                            <span class="icon">🗂️</span> 自动整理
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>📁 任务3: 生成方案目录结构</h4>
                    <p>基于整理后的设计成果，自动生成汇报的目录大纲。目录应包含设计背景、方案设计、技术分析、环保性能和效果展示等章节。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.generateOutline()">
                            <span class="icon">📄</span> 生成大纲
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>🎯 任务4: 确定汇报逻辑和重点</h4>
                    <p>分析设计亮点，确定汇报的核心卖点和重点展示内容。建议突出创新点、环保性能和实际应用价值。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.switchModule('overview')">
                            <span class="icon">💡</span> 查看数据预览
                        </button>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-success mt-3" onclick="app.completeLevel(1)" ${this.state.levelProgress[0] >= 100 ? '' : 'disabled'}>
                <span class="icon">✓</span> 完成关卡1
            </button>
        `;
    }

    renderLevel2() {
        return `
            <div class="level-header">
                <h2>关卡2: PPT制作入门</h2>
                <p>学习目标: 掌握PPT制作的基本方法</p>
            </div>
            
            <div class="level-objectives">
                <div class="objective-card">
                    <h4>已完成</h4>
                    <div class="value">${this.state.pptData.slides.length} 页</div>
                </div>
                <div class="objective-card">
                    <h4>模板</h4>
                    <div class="value">${PPT_TEMPLATES.find(t => t.id === this.state.pptData.template)?.name || '未选择'}</div>
                </div>
                <div class="objective-card">
                    <h4>目标</h4>
                    <div class="value">10+ 页</div>
                </div>
            </div>
            
            <div class="level-tasks">
                <div class="task-card">
                    <h4>🎨 任务1: 选择PPT模板</h4>
                    <p>从5套专业模板中选择一套适合建筑设计方案汇报的模板。推荐选择"极简现代风"或"学术汇报风"。</p>
                    <div class="task-actions">
                        <button class="btn btn-primary" onclick="app.switchModule('ppt')">
                            <span class="icon">📊</span> 前往选择模板
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>📄 任务2: 创建核心页面</h4>
                    <p>创建10页基础汇报页面：封面、目录、设计说明、平面图、体块图、立面图、构造设计、环保指标、效果图、结尾。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.createBasicSlides()">
                            <span class="icon">✨</span> 一键生成基础页面
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>✏️ 任务3: 填充内容和图片</h4>
                    <p>将设计数据填充到各个页面中，插入效果图和分析图，确保内容完整、准确。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.autoFillContent()">
                            <span class="icon">🤖</span> 自动填充
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>🎭 任务4: 调整版式和配色</h4>
                    <p>优化页面布局，确保美观大方。调整配色方案，保持整体风格统一。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.switchModule('ppt')">
                            <span class="icon">⚙️</span> 编辑页面
                        </button>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-success mt-3" onclick="app.completeLevel(2)" ${this.state.pptData.slides.length >= 10 ? '' : 'disabled'}>
                <span class="icon">✓</span> 完成关卡2
            </button>
        `;
    }

    renderLevel3() {
        return `
            <div class="level-header">
                <h2>关卡3: 汇报脚本与演讲准备</h2>
                <p>学习目标: 学习如何准备汇报脚本</p>
            </div>
            
            <div class="level-objectives">
                <div class="objective-card">
                    <h4>脚本时长</h4>
                    <div class="value">${this.formatTime(this.state.scriptData.totalTime)}</div>
                </div>
                <div class="objective-card">
                    <h4>段落数</h4>
                    <div class="value">${this.state.scriptData.segments.length}</div>
                </div>
                <div class="objective-card">
                    <h4>录音</h4>
                    <div class="value">${this.state.recordings.length} 条</div>
                </div>
            </div>
            
            <div class="level-tasks">
                <div class="task-card">
                    <h4>✨ 任务1: 基于PPT生成汇报脚本</h4>
                    <p>系统会根据PPT内容自动生成汇报讲稿，包括开场白、各章节过渡语和结尾。</p>
                    <div class="task-actions">
                        <button class="btn btn-primary" onclick="app.generateScript()">
                            <span class="icon">✨</span> 智能生成脚本
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>✏️ 任务2: 编辑和优化讲稿</h4>
                    <p>根据个人风格和习惯，调整脚本内容，添加个人特色的表达方式。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.switchModule('script')">
                            <span class="icon">📝</span> 编辑脚本
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>⏱️ 任务3: 计算演讲时间</h4>
                    <p>根据脚本内容估算演讲时间，确保在规定时间内完成（建议10-15分钟）。</p>
                    <div class="task-actions">
                        <span class="text-muted">自动计算: ${this.formatTime(this.state.scriptData.totalTime)}</span>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>🎤 任务4: 练习3次，录音回听</h4>
                    <p>使用录音功能练习汇报，录完后回听发现问题并改进。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.toggleRecordingOverlay()">
                            <span class="icon">🎤</span> 开始录音练习
                        </button>
                        <button class="btn btn-secondary" onclick="app.playAllRecordings()">
                            <span class="icon">▶️</span> 播放录音
                        </button>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-success mt-3" onclick="app.completeLevel(3)" ${this.state.scriptData.segments.length >= 8 && this.state.recordings.length >= 1 ? '' : 'disabled'}>
                <span class="icon">✓</span> 完成关卡3
            </button>
        `;
    }

    renderLevel4() {
        return `
            <div class="level-header">
                <h2>关卡4: 汇报技巧与互动</h2>
                <p>学习目标: 掌握汇报技巧和互动方法</p>
            </div>
            
            <div class="level-tasks">
                <div class="task-card">
                    <h4>🎯 任务1: 学习开场技巧</h4>
                    <p>学习5种有效的开场方式，准备3个不同风格的开场方案。</p>
                    <div class="task-actions">
                        <button class="btn btn-primary" onclick="app.switchModule('tips'); app.switchTip('opening')">
                            <span class="icon">💡</span> 学习开场技巧
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>🎬 任务2: 学习结尾技巧</h4>
                    <p>学习3种经典结尾方式，准备2个不同风格的结尾方案。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.switchModule('tips'); app.switchTip('closing')">
                            <span class="icon">💡</span> 学习结尾技巧
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>❓ 任务3: 预设5个常见问题及答案</h4>
                    <p>从问题库选择或自定义5个可能遇到的问题，准备好标准答案。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.switchModule('qa')">
                            <span class="icon">❓</span> 准备问答
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>🎥 任务4: 模拟汇报1次</h4>
                    <p>使用演示模式进行完整的汇报模拟，体验真实的汇报场景。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.startPresentation()">
                            <span class="icon">▶️</span> 演示模式
                        </button>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-success mt-3" onclick="app.completeLevel(4)" ${this.state.qaData.questions.length >= 5 ? '' : 'disabled'}>
                <span class="icon">✓</span> 完成关卡4
            </button>
        `;
    }

    renderLevel5() {
        return `
            <div class="level-header">
                <h2>关卡5: 综合实战 - 完整汇报</h2>
                <p>学习目标: 完成一次完整的方案汇报</p>
            </div>
            
            <div class="level-tasks">
                <div class="task-card">
                    <h4>📊 任务1: 完善PPT（20页以上）</h4>
                    <p>在基础10页的基础上，增加详细分析页、技术说明页和补充内容页。</p>
                    <div class="task-progress">
                        <div class="progress-text">当前: ${this.state.pptData.slides.length} 页 / 目标: 20 页</div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${Math.min(100, this.state.pptData.slides.length / 20 * 100)}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>📝 任务2: 准备完整汇报脚本（10-15分钟）</h4>
                    <p>完善所有段落的讲稿，确保总时长在10-15分钟范围内。</p>
                    <div class="task-progress">
                        <div class="progress-text">当前: ${this.formatTime(this.state.scriptData.totalTime)} / 目标: 10-15分钟</div>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>❓ 任务3: 准备问答清单（10个问题）</h4>
                    <p>准备10个可能的问题及详细答案，包括设计理念、技术细节、创新点等。</p>
                    <div class="task-progress">
                        <div class="progress-text">当前: ${this.state.qaData.questions.length} 个 / 目标: 10 个</div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${Math.min(100, this.state.qaData.questions.length / 10 * 100)}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>📈 任务4: 完成自我评估</h4>
                    <p>对照评估标准，给自己一个客观的评价，找出优势和不足。</p>
                    <div class="task-actions">
                        <button class="btn btn-secondary" onclick="app.switchModule('eval')">
                            <span class="icon">📈</span> 进行评估
                        </button>
                    </div>
                </div>
                
                <div class="task-card">
                    <h4>📦 任务5: 导出汇报材料包</h4>
                    <p>导出完整的汇报材料包，包含PPT内容、脚本、问答清单和评估表。</p>
                    <div class="task-actions">
                        <button class="btn btn-primary" onclick="app.exportPackage()">
                            <span class="icon">📤</span> 导出材料包
                        </button>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-success mt-3" onclick="app.completeLevel(5)" 
                    ${this.state.pptData.slides.length >= 20 && this.state.scriptData.segments.length >= 10 && this.state.qaData.questions.length >= 10 ? '' : 'disabled'}>
                <span class="icon">🏆</span> 完成全部关卡！
            </button>
        `;
    }

    // ========================================
    // 功能实现
    // ========================================

    // 导入数据
    importGameData() {
        this.showModal('importModal');
    }

    setupFileUpload() {
        const area = document.getElementById('fileUploadArea');
        const input = document.getElementById('gameDataFile');
        
        area.addEventListener('click', () => input.click());
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('drag-over');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('drag-over');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        
        input.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    handleFiles(files) {
        const container = document.getElementById('uploadedFiles');
        container.innerHTML = '';
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const gameKey = this.detectGameKey(file.name, data);
                    if (gameKey) {
                        this.state.importedData[gameKey] = data;
                    }
                    
                    const item = document.createElement('div');
                    item.className = 'uploaded-file';
                    item.innerHTML = `
                        <span class="name"><span class="icon">✓</span> ${file.name}</span>
                        <span class="text-success small">已解析</span>
                    `;
                    container.appendChild(item);
                    
                    this.updateDataPreview();
                    this.showToast('数据导入成功', 'success');
                } catch (err) {
                    const item = document.createElement('div');
                    item.className = 'uploaded-file';
                    item.innerHTML = `
                        <span class="name"><span class="icon">✗</span> ${file.name}</span>
                        <span class="text-danger small">解析失败</span>
                    `;
                    container.appendChild(item);
                }
            };
            reader.readAsText(file);
        });
    }

    detectGameKey(filename, data) {
        const name = filename.toLowerCase();
        if (name.includes('game2') || name.includes('plan') || name.includes('平面')) return 'game2';
        if (name.includes('game3') || name.includes('mass') || name.includes('体块')) return 'game3';
        if (name.includes('game4') || name.includes('facade') || name.includes('立面')) return 'game4';
        if (name.includes('game8') || name.includes('construction') || name.includes('构造')) return 'game8';
        if (name.includes('game9') || name.includes('carbon') || name.includes('碳排')) return 'game9';
        if (name.includes('game11') || name.includes('render') || name.includes('效果')) return 'game11';
        return null;
    }

    confirmImport() {
        this.closeModal('importModal');
        this.updateDataPreview();
        this.showToast(`成功导入 ${Object.keys(this.state.importedData).length} 个模块的数据`, 'success');
    }

    updateDataPreview() {
        const preview = document.getElementById('dataPreview');
        const previewLarge = document.getElementById('dataPreviewLarge');
        
        if (preview) {
            preview.innerHTML = Object.keys(this.state.importedData).length > 0 ?
                Object.entries(this.state.importedData).map(([key, val]) => `
                    <div class="data-item">
                        <span class="icon">📄</span>
                        <span>${this.getGameName(key)}</span>
                    </div>
                `).join('') :
                '<p class="empty-hint">暂无导入数据</p>';
        }
        
        if (previewLarge) {
            previewLarge.innerHTML = this.renderDataPreview();
        }
    }

    // PPT功能
    selectTemplate(templateId) {
        this.state.pptData.template = templateId;
        this.switchModule('ppt');
        this.showToast('模板已选择', 'success');
    }

    selectPalette(paletteId) {
        document.querySelectorAll('.color-palette').forEach(p => p.classList.remove('selected'));
        event.target.closest('.color-palette').classList.add('selected');
    }

    switchPPTTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.includes(tab === 'templates' ? '模板' : tab === 'editor' ? '编辑' : '预览'));
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `ppt-${tab}`);
        });
    }

    initPPTEditor() {
        this.state.currentSlideIndex = 0;
    }

    selectSlide(index) {
        this.state.currentSlideIndex = index;
        document.querySelectorAll('.slide-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        document.querySelector('.ppt-preview-content').innerHTML = this.renderSlidePreview();
        document.getElementById('currentSlideNum').textContent = `${index + 1} / ${this.state.pptData.slides.length}`;
        
        // 填充表单
        const slide = this.state.pptData.slides[index];
        if (slide) {
            document.getElementById('slideTitle').value = slide.title || '';
            document.getElementById('slideType').value = slide.type || 'text';
            document.getElementById('slideContent').value = slide.content || '';
            document.getElementById('slideNotes').value = slide.notes || '';
        }
    }

    addSlide() {
        this.state.pptData.slides.push({
            title: `页面 ${this.state.pptData.slides.length + 1}`,
            type: 'text',
            content: '',
            notes: ''
        });
        document.getElementById('slidesList').innerHTML = this.renderSlidesList();
        this.selectSlide(this.state.pptData.slides.length - 1);
    }

    saveCurrentSlide() {
        const index = this.state.currentSlideIndex;
        if (index >= 0 && this.state.pptData.slides[index]) {
            this.state.pptData.slides[index] = {
                ...this.state.pptData.slides[index],
                title: document.getElementById('slideTitle').value,
                type: document.getElementById('slideType').value,
                content: document.getElementById('slideContent').value,
                notes: document.getElementById('slideNotes').value
            };
            document.getElementById('slidesList').innerHTML = this.renderSlidesList();
            document.querySelector('.ppt-preview-content').innerHTML = this.renderSlidePreview();
            this.showToast('页面已保存', 'success');
            this.saveProgress();
        }
    }

    deleteSlide(index) {
        if (confirm('确定要删除这个页面吗？')) {
            this.state.pptData.slides.splice(index, 1);
            document.getElementById('slidesList').innerHTML = this.renderSlidesList();
        }
    }

    dragSlideStart(e, index) {
        e.dataTransfer.setData('text/plain', index);
    }

    dragSlideOver(e) {
        e.preventDefault();
    }

    drop(e, targetIndex) {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const slide = this.state.pptData.slides.splice(fromIndex, 1)[0];
        this.state.pptData.slides.splice(targetIndex, 0, slide);
        document.getElementById('slidesList').innerHTML = this.renderSlidesList();
    }

    createBasicSlides() {
        const template = PPT_TEMPLATES.find(t => t.id === this.state.pptData.template) || PPT_TEMPLATES[0];
        this.state.pptData.slides = [
            { title: '建筑设计汇报', type: 'cover', content: '基于可持续理念的绿色建筑设计', notes: '自信、大方' },
            { title: '目录', type: 'toc', content: '1. 设计背景\n2. 方案设计\n3. 技术分析\n4. 环保性能\n5. 效果展示', notes: '' },
            { title: '设计背景与理念', type: 'text', content: '本项目位于XX地段，总建筑面积约12000平方米。设计理念为"绿色低碳、以人为本"...', notes: '' },
            { title: '平面设计分析', type: 'image', content: '功能分区合理，流线清晰。南北通透，采光良好。', notes: '指向平面图' },
            { title: '体块与空间', type: 'image', content: '体块关系：虚实结合，高低错落。创造丰富的空间层次。', notes: '' },
            { title: '立面与造型', type: 'image', content: '立面设计简洁现代，材质搭配得当，色彩协调统一。', notes: '' },
            { title: '构造技术', type: 'chart', content: '采用高性能保温系统、断热铝窗、可调节外遮阳等技术措施。', notes: '' },
            { title: '环保性能指标', type: 'chart', content: '碳排放降低40%，能耗降低35%，节水效率提升30%。', notes: '重点强调' },
            { title: '效果图展示', type: 'image', content: '整体鸟瞰效果图', notes: '适当停顿' },
            { title: '总结与展望', type: 'end', content: '感谢聆听，欢迎批评指正！', notes: '从容自信' }
        ];
        document.getElementById('slidesList').innerHTML = this.renderSlidesList();
        this.showToast('已生成10页基础PPT', 'success');
    }

    autoFillContent() {
        const data = this.state.importedData;
        // 简单的自动填充逻辑
        if (data.game2) {
            this.state.pptData.slides[3].content += '\n\n【来自平面布局系统】';
        }
        if (data.game3) {
            this.state.pptData.slides[4].content += '\n\n【来自体块设计系统】';
        }
        if (data.game9) {
            this.state.pptData.slides[7].content += '\n\n【来自碳排放计算系统】';
        }
        this.showToast('内容已自动填充', 'success');
    }

    exportPPTContent() {
        const content = JSON.stringify(this.state.pptData, null, 2);
        this.downloadFile(content, 'ppt-content.json', 'application/json');
        this.showToast('PPT内容清单已导出', 'success');
    }

    exportPPTCopy() {
        const text = this.state.pptData.slides.map((slide, i) => 
            `【第${i+1}页】${slide.title}\n类型: ${slide.type}\n内容: ${slide.content}\n备注: ${slide.notes || ''}`
        ).join('\n\n');
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('文案素材已复制到剪贴板', 'success');
        });
    }

    // 脚本功能
    generateScript() {
        const slides = this.state.pptData.slides;
        if (slides.length === 0) {
            this.showToast('请先创建PPT内容', 'info');
            return;
        }
        
        this.state.scriptData.segments = slides.map((slide, index) => ({
            title: this.getSegmentTitle(slide.type, index),
            content: this.generateSegmentContent(slide),
            duration: this.estimateDuration(slide),
            emotion: this.getSegmentEmotion(slide.type),
            index: index
        }));
        
        this.state.scriptData.totalTime = this.state.scriptData.segments.reduce((sum, seg) => sum + seg.duration, 0);
        
        document.getElementById('scriptList').innerHTML = this.renderScriptList();
        this.showToast('脚本已生成', 'success');
    }

    getSegmentTitle(type, index) {
        const titles = {
            cover: '开场致意',
            toc: '目录介绍',
            text: '内容讲解',
            image: '图片说明',
            chart: '数据分析',
            end: '总结致谢'
        };
        return index === 0 ? '开场白' : titles[type] || `第${index + 1}部分`;
    }

    generateSegmentContent(slide) {
        const templates = {
            cover: '各位老师好，我是XXX，今天汇报的题目是XXX。接下来，我将从设计理念、方案特点、技术创新等方面，向各位详细介绍这个项目。',
            toc: '我的汇报主要分为以下几个部分：首先介绍设计背景和理念，然后展示具体的方案设计，接着分析技术特点，最后进行总结。',
            text: `关于${slide.title}，我想重点强调以下几点：${slide.content.substring(0, 100)}...请看下一页的详细说明。`,
            image: '这幅图展示的是项目的${slide.title}。从图中可以看出，${slide.content.substring(0, 80)}...这样的设计带来了哪些优势呢？',
            chart: '从这组数据可以看出，我们的设计在环保性能方面表现出色。具体来看，${slide.content.substring(0, 100)}...这些数据充分说明了方案的有效性。',
            end: '以上就是我汇报的全部内容。总的来说，这个设计始终坚持可持续发展的理念，力求在功能、美观和环保之间达到最佳平衡。感谢各位老师的聆听，欢迎批评指正！'
        };
        return templates[slide.type] || `接下来介绍${slide.title}：${slide.content.substring(0, 150)}...`;
    }

    estimateDuration(slide) {
        const baseDurations = {
            cover: 30,
            toc: 30,
            text: 90,
            image: 60,
            chart: 90,
            end: 45
        };
        return baseDurations[slide.type] || 60;
    }

    getSegmentEmotion(type) {
        const emotions = {
            cover: 'exciting',
            toc: 'calm',
            text: 'calm',
            image: 'calm',
            chart: 'serious',
            end: 'exciting'
        };
        return emotions[type] || 'calm';
    }

    addScriptSegment() {
        const newSegment = {
            title: `段落 ${this.state.scriptData.segments.length + 1}`,
            content: '',
            duration: 60,
            emotion: 'calm'
        };
        this.state.scriptData.segments.push(newSegment);
        document.getElementById('scriptList').innerHTML = this.renderScriptList();
    }

    selectSegment(index) {
        this.state.currentSegmentIndex = index;
        const seg = this.state.scriptData.segments[index];
        if (seg) {
            document.getElementById('segmentTitle').value = seg.title || '';
            document.getElementById('segmentContent').value = seg.content || '';
        }
        document.getElementById('scriptList').innerHTML = this.renderScriptList();
    }

    saveSegment() {
        const index = this.state.currentSegmentIndex;
        if (this.state.scriptData.segments[index]) {
            this.state.scriptData.segments[index] = {
                ...this.state.scriptData.segments[index],
                title: document.getElementById('segmentTitle').value,
                content: document.getElementById('segmentContent').value
            };
            this.state.scriptData.totalTime = this.state.scriptData.segments.reduce((sum, seg) => sum + seg.duration, 0);
            document.getElementById('scriptList').innerHTML = this.renderScriptList();
            this.showToast('段落已保存', 'success');
        }
    }

    deleteSegment(index) {
        this.state.scriptData.segments.splice(index, 1);
        this.state.scriptData.totalTime = this.state.scriptData.segments.reduce((sum, seg) => sum + seg.duration, 0);
        document.getElementById('scriptList').innerHTML = this.renderScriptList();
    }

    clearSegmentForm() {
        document.getElementById('segmentTitle').value = '';
        document.getElementById('segmentContent').value = '';
    }

    setEmotion(emotion) {
        document.querySelectorAll('.emotion-tag').forEach(tag => {
            tag.classList.toggle('active', tag.dataset.emotion === emotion);
        });
    }

    // 演示模式
    startPresentation() {
        if (this.state.scriptData.segments.length === 0) {
            this.showToast('请先生成脚本', 'info');
            return;
        }
        
        this.state.presentationIndex = 0;
        this.state.presentationPaused = false;
        document.getElementById('presentationOverlay').classList.add('show');
        document.getElementById('targetTime').textContent = this.formatTime(this.state.scriptData.totalTime);
        
        this.updatePresentationDisplay();
        this.startPresentationTimer();
    }

    updatePresentationDisplay() {
        const seg = this.state.scriptData.segments[this.state.presentationIndex];
        if (!seg) return;
        
        const content = seg.content.length > 200 ? 
            seg.content.substring(0, 200) + '...' : seg.content;
        
        document.getElementById('scriptDisplay').innerHTML = `
            <div class="main-text">${content}</div>
            <div class="slide-info">${seg.title} · ${this.formatTime(seg.duration)}</div>
        `;
        
        document.getElementById('presentationNotes').textContent = `情感: ${this.getEmotionName(seg.emotion)}`;
        
        const progress = ((this.state.presentationIndex + 1) / this.state.scriptData.segments.length) * 100;
        document.getElementById('scriptProgress').style.width = `${progress}%`;
    }

    startPresentationTimer() {
        let seconds = 0;
        this.state.timerInterval = setInterval(() => {
            if (!this.state.presentationPaused) {
                seconds++;
                document.getElementById('presentationTime').textContent = this.formatTime(seconds);
            }
        }, 1000);
    }

    nextScript() {
        if (this.state.presentationIndex < this.state.scriptData.segments.length - 1) {
            this.state.presentationIndex++;
            this.updatePresentationDisplay();
        }
    }

    prevScript() {
        if (this.state.presentationIndex > 0) {
            this.state.presentationIndex--;
            this.updatePresentationDisplay();
        }
    }

    togglePause() {
        this.state.presentationPaused = !this.state.presentationPaused;
        document.getElementById('pauseIcon').textContent = this.state.presentationPaused ? '▶️' : '⏸️';
        document.getElementById('pauseText').textContent = this.state.presentationPaused ? '继续' : '暂停';
    }

    exitPresentation() {
        clearInterval(this.state.timerInterval);
        document.getElementById('presentationOverlay').classList.remove('show');
    }

    // 录音功能
    toggleRecordingOverlay() {
        document.getElementById('recordingOverlay').classList.toggle('show');
        this.initRecording();
    }

    async initRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.state.mediaRecorder = new MediaRecorder(stream);
            this.state.audioChunks = [];
            
            this.state.mediaRecorder.ondataavailable = (e) => {
                this.state.audioChunks.push(e.data);
            };
            
            this.state.mediaRecorder.onstop = () => {
                const blob = new Blob(this.state.audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                this.state.recordings.push({
                    id: Date.now(),
                    url: url,
                    duration: this.state.recordingDuration,
                    date: new Date().toLocaleString()
                });
                this.updateRecordingList();
            };
            
            this.drawWaveform();
        } catch (err) {
            this.showToast('无法访问麦克风，请检查权限设置', 'error');
        }
    }

    toggleRecording() {
        if (this.state.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        if (this.state.mediaRecorder) {
            this.state.mediaRecorder.start();
            this.state.isRecording = true;
            this.state.recordingDuration = 0;
            
            document.getElementById('recordIcon').textContent = '⏹️';
            document.getElementById('recordText').textContent = '停止录音';
            document.getElementById('recordBtn').style.background = '#dc2626';
            
            this.state.recordingTimer = setInterval(() => {
                this.state.recordingDuration++;
                document.getElementById('recordingTime').textContent = this.formatTime(this.state.recordingDuration);
            }, 1000);
            
            this.animateWaveform();
        }
    }

    stopRecording() {
        if (this.state.mediaRecorder && this.state.isRecording) {
            this.state.mediaRecorder.stop();
            this.state.isRecording = false;
            
            clearInterval(this.state.recordingTimer);
            
            document.getElementById('recordIcon').textContent = '🎤';
            document.getElementById('recordText').textContent = '开始录音';
            document.getElementById('recordBtn').style.background = '';
            document.getElementById('playBtn').style.display = 'inline-flex';
            document.getElementById('deleteRecBtn').style.display = 'inline-flex';
            
            this.showToast('录音已保存', 'success');
        }
    }

    playRecording() {
        if (this.state.recordings.length > 0) {
            const lastRecording = this.state.recordings[this.state.recordings.length - 1];
            const audio = new Audio(lastRecording.url);
            audio.play();
        }
    }

    deleteRecording() {
        if (this.state.recordings.length > 0) {
            this.state.recordings.pop();
            this.state.recordingDuration = 0;
            document.getElementById('recordingTime').textContent = '00:00';
            document.getElementById('playBtn').style.display = 'none';
            document.getElementById('deleteRecBtn').style.display = 'none';
            this.updateRecordingList();
        }
    }

    updateRecordingList() {
        const list = document.getElementById('recordingList');
        if (!list) return;
        
        list.innerHTML = this.state.recordings.map(rec => `
            <div class="recording-item">
                <div class="info">
                    <span>🎤</span>
                    <span>录音 ${rec.date}</span>
                    <span class="text-muted">${this.formatTime(rec.duration)}</span>
                </div>
                <div class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.playRecordingById(${rec.id})">▶️</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteRecordingById(${rec.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    playRecordingById(id) {
        const rec = this.state.recordings.find(r => r.id === id);
        if (rec) {
            const audio = new Audio(rec.url);
            audio.play();
        }
    }

    deleteRecordingById(id) {
        this.state.recordings = this.state.recordings.filter(r => r.id !== id);
        this.updateRecordingList();
    }

    drawWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    animateWaveform() {
        if (!this.state.isRecording) return;
        
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = 3;
        const gap = 2;
        const bars = Math.floor(canvas.width / (barWidth + gap));
        
        for (let i = 0; i < bars; i++) {
            const height = Math.random() * 60 + 20;
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(i * (barWidth + gap), (canvas.height - height) / 2, barWidth, height);
        }
        
        requestAnimationFrame(() => this.animateWaveform());
    }

    playAllRecordings() {
        if (this.state.recordings.length === 0) {
            this.showToast('暂无录音', 'info');
            return;
        }
        let index = 0;
        const playNext = () => {
            if (index < this.state.recordings.length) {
                const audio = new Audio(this.state.recordings[index].url);
                audio.onended = () => {
                    index++;
                    playNext();
                };
                audio.play();
            }
        };
        playNext();
    }

    // 技巧学习
    switchTip(tipKey) {
        document.querySelectorAll('.tip-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tip === tipKey);
        });
        document.getElementById('tipsContent').innerHTML = this.renderTipContent(tipKey);
    }

    initTipsNavigation() {
        this.switchTip('opening');
    }

    // Q&A功能
    switchQATab(tab) {
        document.querySelectorAll('.qa-list .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.includes(tab === 'library' ? '问题库' : '自定义'));
        });
        document.querySelectorAll('.qa-list .tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `qa-${tab}`);
        });
    }

    isQAExpanded(catId, index) {
        return this.state.qaExpanded === `${catId}-${index}`;
    }

    toggleQA(catId, index) {
        const key = `${catId}-${index}`;
        this.state.qaExpanded = this.state.qaExpanded === key ? null : key;
        this.switchModule('qa');
    }

    initQANavigation() {
        this.state.qaExpanded = null;
    }

    addToMyQA(catId, qIndex) {
        const cat = QA_CATEGORIES.find(c => c.id === catId);
        if (cat && cat.questions[qIndex]) {
            const q = cat.questions[qIndex];
            this.state.qaData.questions.push({ q: q.q, a: q.a });
            this.showToast('已添加到我的问答', 'success');
        }
    }

    addCustomQA() {
        const q = document.getElementById('customQuestion').value;
        const a = document.getElementById('customAnswer').value;
        
        if (!q || !a) {
            this.showToast('请填写问题和答案', 'info');
            return;
        }
        
        this.state.qaData.questions.push({ q, a });
        document.getElementById('customQuestion').value = '';
        document.getElementById('customAnswer').value = '';
        this.switchModule('qa');
        this.showToast('问答已添加', 'success');
    }

    deleteQA(index) {
        this.state.qaData.questions.splice(index, 1);
        this.switchModule('qa');
    }

    generateQA() {
        // 基于导入的数据生成潜在问题
        const data = this.state.importedData;
        let generatedQAs = [];
        
        if (data.game2) {
            generatedQAs.push({
                q: '平面布局如何体现功能分区的合理性？',
                a: '我们的平面布局遵循"动静分离、洁污分区"的原则。将办公区域设置在南侧保证采光，辅助空间集中在北侧，交通流线简洁高效。'
            });
        }
        
        if (data.game3) {
            generatedQAs.push({
                q: '体块设计的创意来源是什么？',
                a: '体块设计灵感来自于对场地环境的回应。我们通过日照分析确定建筑体量的最佳朝向，通过视线分析确定体块的高低错落关系。'
            });
        }
        
        if (data.game4) {
            generatedQAs.push({
                q: '立面材料的选择依据是什么？',
                a: '立面材料的选择综合考虑了耐久性、美观性、环保性和经济性。我们选用了可回收的金属板材和低辐射玻璃，既保证效果又兼顾可持续。'
            });
        }
        
        if (data.game8) {
            generatedQAs.push({
                q: '构造设计如何保证建筑的节能性能？',
                a: '构造设计采用高性能保温系统，热桥处理措施完善，门窗系统选用断热铝型材，综合传热系数达到0.8W/(m²·K)以下。'
            });
        }
        
        if (data.game9) {
            generatedQAs.push({
                q: '项目的碳排放控制目标是多少？如何实现？',
                a: '项目目标是全生命周期碳排放降低40%。通过被动式设计减少用能需求、可再生能源系统替代部分电力、高性能设备和智能控制系统，预计可实现减排目标。'
            });
        }
        
        generatedQAs.forEach(qa => {
            this.state.qaData.questions.push(qa);
        });
        
        this.switchModule('qa');
        this.showToast(`已生成${generatedQAs.length}个问答`, 'success');
    }

    // 评估功能
    initEvaluation() {
        this.updateEvalScore();
    }

    setRating(key, value) {
        this.state.evalData.ratings[key] = value;
        this.switchModule('eval');
        this.updateEvalScore();
    }

    updateEvalComment(value) {
        this.state.evalData.comment = value;
    }

    updateEvalScore() {
        const ratings = Object.values(this.state.evalData.ratings);
        if (ratings.length === 0) {
            document.getElementById('evalScore').textContent = '--';
            return;
        }
        
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length * 20;
        document.getElementById('evalScore').textContent = avg.toFixed(0);
    }

    resetEval() {
        this.state.evalData = { ratings: {}, comment: '' };
        this.switchModule('eval');
    }

    saveEval() {
        this.saveProgress();
        this.showToast('评估已保存', 'success');
    }

    // 关卡完成
    completeLevel(level) {
        this.state.levelProgress[level - 1] = 100;
        const score = this.getLevelScoreSummary().score;
        window.reportScore = score;
        this.renderLevelDots();
        this.showToast(`关卡${level}已完成！`, 'success');
        
        if (level < 5) {
            setTimeout(() => {
                this.switchLevel(level + 1);
            }, 1000);
        } else {
            this.showToast('🎉 恭喜完成所有关卡！', 'success');
        }
    }

    initLevelContent(level) {
        this.state.currentLevel = level;
    }

    // 数据整理
    organizeData() {
        this.showToast('设计数据已按类别整理', 'success');
    }

    generateOutline() {
        this.showToast('方案大纲已生成，可在PPT模块查看', 'success');
    }

    // 导出功能
    exportPackage() {
        const content = {
            exportDate: new Date().toLocaleString(),
            ppt: this.state.pptData,
            script: this.state.scriptData,
            qa: this.state.qaData,
            evaluation: this.state.evalData
        };
        
        document.getElementById('exportContent').innerHTML = `
            <h4>📦 汇报材料包内容清单</h4>
            <div class="package-items">
                <div class="package-item">
                    <span class="icon">📊</span>
                    <span>PPT内容清单</span>
                    <span class="badge ${this.state.pptData.slides.length > 0 ? 'success' : 'pending'}">
                        ${this.state.pptData.slides.length > 0 ? '已包含' : '空'}
                    </span>
                </div>
                <div class="package-item">
                    <span class="icon">📝</span>
                    <span>汇报脚本</span>
                    <span class="badge ${this.state.scriptData.segments.length > 0 ? 'success' : 'pending'}">
                        ${this.state.scriptData.segments.length > 0 ? '已包含' : '空'}
                    </span>
                </div>
                <div class="package-item">
                    <span class="icon">❓</span>
                    <span>问答清单</span>
                    <span class="badge ${this.state.qaData.questions.length > 0 ? 'success' : 'pending'}">
                        ${this.state.qaData.questions.length > 0 ? this.state.qaData.questions.length + '个' : '空'}
                    </span>
                </div>
                <div class="package-item">
                    <span class="icon">📈</span>
                    <span>评估表</span>
                    <span class="badge ${Object.keys(this.state.evalData.ratings).length > 0 ? 'success' : 'pending'}">
                        ${Object.keys(this.state.evalData.ratings).length > 0 ? '已填写' : '空'}
                    </span>
                </div>
            </div>
            
            <div class="export-note mt-3">
                <h4>📝 使用说明</h4>
                <p>材料包为JSON格式，包含所有汇报相关数据。下载后可用于：</p>
                <ul>
                    <li>手动制作PPT时参考内容清单</li>
                    <li>复制文案素材快速填充</li>
                    <li>保存和恢复学习进度</li>
                </ul>
            </div>
        `;
        
        this.showModal('exportModal');
    }

    downloadPackage() {
        const content = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            ppt: this.state.pptData,
            script: this.state.scriptData,
            qa: this.state.qaData,
            evaluation: this.state.evalData,
            importedData: this.state.importedData
        };
        
        this.downloadFile(JSON.stringify(content, null, 2), '汇报材料包.json', 'application/json');
        this.closeModal('exportModal');
        this.showToast('材料包已下载', 'success');
    }

    // 进度保存与加载
    saveProgress() {
        const data = {
            currentLevel: this.state.currentLevel,
            levelProgress: this.state.levelProgress,
            pptData: this.state.pptData,
            scriptData: this.state.scriptData,
            qaData: this.state.qaData,
            evalData: this.state.evalData,
            recordings: this.state.recordings.map(r => ({ id: r.id, duration: r.duration, date: r.date })),
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('presentationSystemProgress', JSON.stringify(data));
        this.showToast('进度已保存', 'success');
    }

    loadProgress() {
        const saved = localStorage.getItem('presentationSystemProgress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.state.currentLevel = data.currentLevel || 1;
                this.state.levelProgress = data.levelProgress || [0,0,0,0,0];
                this.state.pptData = data.pptData || this.state.pptData;
                this.state.scriptData = data.scriptData || this.state.scriptData;
                this.state.qaData = data.qaData || this.state.qaData;
                this.state.evalData = data.evalData || this.state.evalData;
                
                this.renderLevelDots();
                this.switchLevel(this.state.currentLevel);
                this.showToast('进度已加载', 'success');
            } catch (e) {
                this.showToast('加载失败', 'error');
            }
        } else {
            this.showToast('暂无保存的进度', 'info');
        }
    }

    resetProgress() {
        if (confirm('确定要重置所有进度吗？此操作不可撤销。')) {
            localStorage.removeItem('presentationSystemProgress');
            this.state = { ...AppState };
            this.init();
            this.showToast('进度已重置', 'success');
        }
    }

    // 工具函数
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    showModal(id) {
        /**
         * 兼容缺失弹窗节点的旧页面结构，避免欢迎引导等入口直接抛出空引用错误。
         * @type {HTMLElement | null}
         */
        const modal = document.getElementById(id);
        if (!modal) {
            return;
        }
        modal.classList.add('show');
    }

    closeModal(id) {
        /**
         * 关闭弹窗时同样先检查目标节点是否存在，防止历史模板缺少对应弹窗容器。
         * @type {HTMLElement | null}
         */
        const modal = document.getElementById(id);
        if (!modal) {
            return;
        }
        modal.classList.remove('show');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PresentationSystem();
});
