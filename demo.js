(function() {
    'use strict';

    // 1. 核心配置
    const config = {
        ui: {
            colors: {
                primary: '#5d8bf4',
                success: '#36d399',
                error: '#f43f5e',
                warning: '#fbbd23',
                dark: '#1e1b4b',
                lightDark: '#2d3748',
                text: '#f9fafb',
                textLight: '#a3a3a3'
            },
            shadows: {
                btn: '0 2px 6px rgba(0,0,0,0.15)',
                tip: '0 4px 12px rgba(0,0,0,0.1)',
                panel: '0 8px 24px rgba(0,0,0,0.15)'
            },
            zIndex: 9999,
            baseWidth: 300,
            minWidth: 280,
            defaultOpacity: 1,
            minOpacity: 0.3
        },
        position: {
            toggleBtn: { top: 20, right: 15 },
            panel: { top: 70, right: 15 }
        },
        globalDelay: 1000,
        taskDelay: 1200,
        modules: {
            chest: { enabled: true, consumeQty: 0, type: 2001 },
            fishing: { enabled: true, consumeQty: 0, type: 1 },
            recruit: { enabled: true, consumeQty: 0, type: 1 },
            torch: { enabled: true, consumeQty: 0, type: 1008 },
            arena: { enabled: true, count: 3, targetId: 0 },
            upgradeStar: { enabled: true },
            vehicle: { enabled: true }
        },
        activeModule: 'dailyTask',
        isPanelVisible: false
    };

    // 任务控制状态
    const taskControl = {
        isPaused: false,
        isStopped: false,
        isRunning: false,
        currentTasks: []
    };

    // UI元素存储
    let uiElements = {
        resourcePauseBtn: null,
        resourceStopBtn: null,
        arenaStarPauseBtn: null,
        arenaStarStopBtn: null,
        dailyTaskPauseBtn: null,
        dailyTaskStopBtn: null,
        resourceExecBtn: null,
        arenaExecBtn: null,
        starExecBtn: null,
        dailyTaskExecBtn: null,
        opacitySlider: null,
        mainPanel: null,
        toggleDogIcon: null
    };

    // 车辆助手状态
    const vehicleState = {
        fullCarData: [],
        rawResponseData: null,
        currentSeq: 1
    };

    // 2. 任务指令映射表
    const taskCommands = {
        chest: {
            2001: { name: '木质宝箱', cmd: 'item_openbox', params: (q) => ({ itemId: 2001, number: q }) },
            2002: { name: '青铜宝箱', cmd: 'item_openbox', params: (q) => ({ itemId: 2002, number: q }) },
            2003: { name: '黄金宝箱', cmd: 'item_openbox', params: (q) => ({ itemId: 2003, number: q }) },
            2004: { name: '铂金宝箱', cmd: 'item_openbox', params: (q) => ({ itemId: 2004, number: q }) },
            2005: { name: '钻石宝箱', cmd: 'item_openbox', params: (q) => ({ itemId: 2005, number: q }) }
        },
        fishing: {
            1: { name: '普通钓鱼', cmd: 'artifact_lottery', params: (quantity) => ({ lotteryNumber: quantity, newFree: true, type: 1 }) },
            2: { name: '高级钓鱼', cmd: 'artifact_lottery', params: (quantity) => ({ lotteryNumber: quantity, newFree: true, type: 2 }) }
        },
        recruit: { 1: { name: '付费招募', cmd: 'hero_recruit', params: (q) => ({ byClub: false, recruitNumber: q, recruitType: 1 }) } },
        torch: {
            1008: { name: '普通火把', cmd: 'item_consume', params: (q) => ({ itemId: 1008, quantity: q }) },
            1009: { name: '青铜火把', cmd: 'item_consume', params: (q) => ({ itemId: 1009, quantity: q }) },
            1010: { name: '咸神火把', cmd: 'item_consume', params: (q) => ({ itemId: 1010, quantity: q }) }
        }
    };

    // 每日任务配置 - 添加灯神免费扫荡任务和独立的购买宝箱任务
    const dailyTasksConfig = {
        tasks: {
            1: { id: 'shareTorch', name: '领取火把', enabled: false },
            2: { id: 'claimMail', name: '领取邮件', enabled: false },
            3: { id: 'dailyBoss', name: '每日咸王', enabled: false },
            4: { id: 'openChest', name: '开启木箱', enabled: false },
            5: { id: 'recruit', name: '每日招募', enabled: false },
            6: { id: 'goldenTouch', name: '点金', enabled: false },
            7: { id: 'fishing', name: '每日钓鱼', enabled: false },
            8: { id: 'signIn', name: '每日登录', enabled: false },
            9: { id: 'dailyGift', name: '每日特惠', enabled: false },
            10: { id: 'cardReward', name: '每日福利', enabled: false },
            11: { id: 'legionSign', name: '签到', enabled: false },
            12: { id: 'answerQuiz', name: '答题', enabled: false },
            13: { id: 'friendGold', name: '赠领金币', enabled: false },
            14: { id: 'autoBottle', name: '重置盐罐', enabled: false },
            15: { id: 'autoCollect', name: '收罐子', enabled: false },
            16: { id: 'autoHarvest', name: '加钟收菜', enabled: false },
            17: { id: 'claimTaskReward', name: '领任务奖励', enabled: false },
            18: { id: 'genieSweep', name: '每日扫荡', enabled: false }, // 灯神免费扫荡任务
            19: { id: 'buyTreasureBoxes', name: '购买宝箱', enabled: false }, // 新增独立的购买宝箱任务
            20: { id: 'autoTower', name: '爬塔', enabled: false, towerCount: 10 },
            21: { id: 'legionBoss', name: '俱乐部boss', enabled: false, bossCount: 2 },
            22: { id: 'autoPurchase', name: '一键采购', enabled: false } // 调整序号
        }
    };

    // 3. 工具函数
    function showTip(text, type = 'info') {
        document.querySelectorAll('.arena-tip').forEach(t => t.remove());
        const tip = document.createElement('div');
        tip.className = 'arena-tip';
        tip.textContent = text;
        let bg = config.ui.colors.primary;
        if (type === 'success') bg = config.ui.colors.success;
        if (type === 'error') bg = config.ui.colors.error;
        if (type === 'warning') bg = config.ui.colors.warning;
        
        tip.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: ${bg}; color: white; padding: 6px 12px; border-radius: 6px;
            font-size: 12px; z-index: ${config.ui.zIndex + 1}; box-shadow: ${config.ui.shadows.tip};
            white-space: nowrap; opacity: 0; transition: opacity 0.3s ease;
        `;
        document.body.appendChild(tip);
        setTimeout(() => tip.style.opacity = '1', 10);
        setTimeout(() => { tip.style.opacity = '0'; setTimeout(() => tip.remove(), 300); }, 3000);
    }

    function logMessage(content, type = 'info', progress = '') {
        const logContainer = document.getElementById('arenaLogContainer');
        if (!logContainer) return;
        const logItem = document.createElement('div');
        logItem.className = `arena-log-item arena-log-${type}`;
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        logItem.textContent = progress ? `[${time}] [${progress}] ${content}` : `[${time}] ${content}`;
        
        let color = config.ui.colors.text;
        if (type === 'success') color = config.ui.colors.success;
        if (type === 'error') color = config.ui.colors.error;
        if (type === 'warning') color = config.ui.colors.warning;
        if (type === 'summary') color = config.ui.colors.success;
        
        logItem.style.cssText = `
            margin: 2px 0; padding: 2px 4px; border-radius: 4px; color: ${color};
            font-size: 10px; line-height: 1.3; font-family: 'Consolas', monospace;
            word-wrap: break-word; white-space: normal;
        `;
        if (type === 'summary') {
            logItem.style.fontWeight = 'bold';
            logItem.style.marginTop = '6px';
            logItem.style.background = `${config.ui.colors.success}10`;
            logItem.style.borderLeft = `3px solid ${config.ui.colors.success}`;
        }
        logContainer.appendChild(logItem);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function createButton(text, onClick, isPrimary = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 7px 12px; border-radius: 8px; border: none; font-size: 12px;
            font-weight: 500; cursor: pointer; transition: all 0.2s ease;
            font-family: 'Microsoft YaHei', sans-serif; box-shadow: ${config.ui.shadows.btn};
            ${isPrimary ? `background: ${config.ui.colors.primary}; color: white;` : `background: ${config.ui.colors.lightDark}; color: ${config.ui.colors.text};`}
        `;
        btn.addEventListener('mouseover', () => btn.style.transform = 'translateY(-1px)');
        btn.addEventListener('mouseout', () => btn.style.transform = 'translateY(0)');
        btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
        return btn;
    }

    function createInput(placeholder, value = '', isDisabled = false) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.value = value;
        input.disabled = isDisabled;
        input.style.cssText = `
            width: 100%; padding: 6px 8px; border: 1px solid ${config.ui.colors.textLight};
            border-radius: 8px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
            font-size: 10px; box-sizing: border-box; outline: none;
            ${isDisabled ? 'opacity: 0.7; cursor: not-allowed;' : ''}
        `;
        input.addEventListener('focus', () => !isDisabled && (input.style.borderColor = config.ui.colors.primary));
        input.addEventListener('blur', () => !isDisabled && (input.style.borderColor = config.ui.colors.textLight));
        return input;
    }

    function createSelect(options, defaultValue) {
        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%; padding: 6px 8px; border: 1px solid ${config.ui.colors.textLight};
            border-radius: 6px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
            font-size: 10px; outline: none;
        `;
        Object.entries(options).forEach(([key, opt]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = opt.name;
            option.selected = parseInt(key) === defaultValue;
            select.appendChild(option);
        });
        return select;
    }

    function createCheckbox(label, checked = false, onChange = null) {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: center; gap: 3px;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.style.cssText = `
            width: 14px; height: 14px; accent-color: ${config.ui.colors.primary};
            cursor: pointer;
        `;

        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.style.cssText = `
            font-size: 10px; color: ${config.ui.colors.text}; cursor: pointer;
        `;

        container.appendChild(checkbox);
        container.appendChild(labelElement);

        if (onChange) {
            checkbox.addEventListener('change', onChange);
        }

        return { container, checkbox };
    }

    // 延迟函数
    function delay(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    // 面板切换函数
    function togglePanel() {
        config.isPanelVisible = !config.isPanelVisible;
        uiElements.mainPanel.style.display = config.isPanelVisible ? 'block' : 'none';
        
        if (config.isPanelVisible) {
            uiElements.toggleDogIcon.style.transform = 'rotate(180deg)';
            showTip('显示花狗助手面板');
            updateToggleIconOpacity();
        } else {
            uiElements.toggleDogIcon.style.transform = 'rotate(0deg)';
            showTip('隐藏花狗助手面板');
            uiElements.toggleBtn.style.opacity = '1';
        }
    }

    // 更新🐳图标透明度
    function updateToggleIconOpacity() {
        if (config.isPanelVisible && uiElements.opacitySlider) {
            const opacity = parseInt(uiElements.opacitySlider.value) / 100;
            uiElements.toggleBtn.style.opacity = opacity;
        }
    }

    // 整体透明度调节
    function adjustUIOpacity(opacity) {
        if (!uiElements.mainPanel) return;
        const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
        const panel = uiElements.mainPanel;
        
        panel.style.background = `${config.ui.colors.dark.slice(0, 7)}${alphaHex}`;
        panel.style.borderColor = `${config.ui.colors.textLight.slice(0, 7)}${alphaHex}`;
        
        document.querySelectorAll('.module-content > div, .arena-log-container').forEach(el => {
            const bgColor = el.style.background.includes('lightDark') 
                ? config.ui.colors.lightDark 
                : config.ui.colors.dark;
            el.style.background = `${bgColor.slice(0, 7)}${alphaHex}`;
        });
        
        document.querySelector('.module-tabs')?.style.setProperty('background', `${config.ui.colors.lightDark.slice(0, 7)}${alphaHex}`);
        
        if (config.isPanelVisible) {
            uiElements.toggleBtn.style.opacity = opacity;
        }
        
        logMessage(`UI透明度调节至：${Math.round(opacity * 100)}%`, 'info');
    }

    // 暂停/恢复事件
    function handlePause(moduleType) {
        if (!taskControl.isRunning) {
            showTip('无正在执行的任务', 'error');
            return;
        }
        taskControl.isPaused = !taskControl.isPaused;
        const btnText = taskControl.isPaused ? '恢复' : '暂停';
        const tipType = taskControl.isPaused ? 'warning' : 'success';
        const tipMsg = taskControl.isPaused ? '任务已暂停' : '任务已恢复';
        
        if (uiElements.resourcePauseBtn) uiElements.resourcePauseBtn.textContent = btnText;
        if (uiElements.arenaStarPauseBtn) uiElements.arenaStarPauseBtn.textContent = btnText;
        if (uiElements.dailyTaskPauseBtn) uiElements.dailyTaskPauseBtn.textContent = btnText;
        showTip(tipMsg, tipType);
        logMessage(tipMsg, tipType);
    }

    // 停止事件
    async function handleStop() {
        if (!taskControl.isRunning) {
            showTip('无正在执行的任务', 'error');
            return;
        }
        taskControl.isStopped = true;
        taskControl.isPaused = false;
        
        if (uiElements.resourcePauseBtn) {
            uiElements.resourcePauseBtn.disabled = true;
            uiElements.resourcePauseBtn.textContent = '暂停';
        }
        if (uiElements.resourceStopBtn) uiElements.resourceStopBtn.disabled = true;
        if (uiElements.arenaStarPauseBtn) {
            uiElements.arenaStarPauseBtn.disabled = true;
            uiElements.arenaStarPauseBtn.textContent = '暂停';
        }
        if (uiElements.arenaStarStopBtn) uiElements.arenaStarStopBtn.disabled = true;
        if (uiElements.dailyTaskPauseBtn) {
            uiElements.dailyTaskPauseBtn.disabled = true;
            uiElements.dailyTaskPauseBtn.textContent = '暂停';
        }
        if (uiElements.dailyTaskStopBtn) uiElements.dailyTaskStopBtn.disabled = true;
        
        showTip('正在终止所有任务...', 'warning');
        logMessage('任务终止中...', 'warning');

        await Promise.allSettled(taskControl.currentTasks);

        taskControl.isStopped = false;
        taskControl.isRunning = false;
        taskControl.currentTasks = [];
        
        if (uiElements.resourceExecBtn) {
            uiElements.resourceExecBtn.disabled = false;
            uiElements.resourceExecBtn.textContent = '同时开始所有资源任务';
            uiElements.resourceExecBtn.style.opacity = '1';
        }
        if (uiElements.arenaExecBtn) {
            uiElements.arenaExecBtn.disabled = false;
            uiElements.arenaExecBtn.textContent = '开始战斗';
            uiElements.arenaExecBtn.style.opacity = '1';
        }
        if (uiElements.starExecBtn) {
            uiElements.starExecBtn.disabled = false;
            uiElements.starExecBtn.textContent = '开始升星';
            uiElements.starExecBtn.style.opacity = '1';
        }
        if (uiElements.dailyTaskExecBtn) {
            uiElements.dailyTaskExecBtn.disabled = false;
            uiElements.dailyTaskExecBtn.textContent = '执行选中任务';
            uiElements.dailyTaskExecBtn.style.opacity = '1';
        }

        showTip('所有任务已终止', 'error');
        logMessage('所有任务已终止', 'error');
    }

    // 任务状态检查
    async function checkTaskState(taskName) {
        if (taskControl.isStopped) throw new Error(`任务已终止`);
        while (taskControl.isPaused) {
            await new Promise(resolve => setTimeout(resolve, 500));
            logMessage(`${taskName}：等待恢复执行`, 'warning');
        }
    }

    // 4. 模块UI创建
    function createModuleTabs(container) {
        const tabs = document.createElement('div');
        tabs.className = 'module-tabs';
        tabs.style.cssText = `
            display: flex; background: ${config.ui.colors.lightDark}; border-radius: 8px;
            padding: 2px; margin-bottom: 8px; gap: 2px;
        `;
        const modules = [
            { id: 'dailyTask', name: '📅 每日任务' },
            { id: 'resource', name: '📦 资源' },
            { id: 'arenaStar', name: '⚔️ 竞技&升星' },
            { id: 'vehicle', name: '🚗 车辆助手' }
        ];
        modules.forEach(module => {
            const tab = document.createElement('div');
            tab.className = 'module-tab';
            tab.textContent = module.name;
            tab.style.cssText = `
                flex: 1; text-align: center; padding: 5px 2px; border-radius: 6px;
                cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease;
                color: ${module.id === config.activeModule ? 'white' : config.ui.colors.textLight};
                background: ${module.id === config.activeModule ? config.ui.colors.primary : 'transparent'};
            `;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.module-tab').forEach(t => {
                    t.style.background = 'transparent';
                    t.style.color = config.ui.colors.textLight;
                });
                tab.style.background = config.ui.colors.primary;
                tab.style.color = 'white';
                document.querySelectorAll('.module-content').forEach(c => c.style.display = 'none');
                document.getElementById(`module-${module.id}`)?.style.setProperty('display', 'block');
                config.activeModule = module.id;
            });
            tabs.appendChild(tab);
        });
        container.appendChild(tabs);
    }

    // 每日任务模块
    function createDailyTaskModule() {
        const container = document.createElement('div');
        container.id = 'module-dailyTask';
        container.className = 'module-content';
        container.style.display = config.activeModule === 'dailyTask' ? 'block' : 'none';

        // 预设方案按钮
        const presetButtons = document.createElement('div');
        presetButtons.style.cssText = `
            display: flex; gap: 4px; margin-bottom: 6px;
            font-size: 13px; font-weight: bold; color: ${config.ui.colors.primary};
        `;

        // 全部按钮
        const allBtn = createButton('全部', () => {
            Object.values(dailyTasksConfig.tasks).forEach(task => {
                // 排除海神挑战任务
                task.enabled = task.id !== 'poseidonChallenge';
            });
            document.querySelectorAll('#module-dailyTask input[type="checkbox"]').forEach(checkbox => {
                const taskLabel = checkbox.nextElementSibling?.textContent;
                checkbox.checked = taskLabel !== '海神挑战';
            });
            showTip('已选择所有任务（排除海神挑战）', 'success');
        }, false);
        allBtn.style.flex = '1';
        allBtn.style.padding = '4px 6px';
        allBtn.style.fontSize = '10px';
        allBtn.style.color = config.ui.colors.warning;

        // 收菜按钮
        const harvestBtn = createButton('收菜', () => {
            Object.values(dailyTasksConfig.tasks).forEach(task => {
                task.enabled = false;
            });
            // 勾选重置盐罐、加钟收菜、领取任务奖励、一键采购
            dailyTasksConfig.tasks[14].enabled = true; // 重置盐罐
            dailyTasksConfig.tasks[16].enabled = true; // 加钟收菜
            dailyTasksConfig.tasks[17].enabled = true; // 领任务奖励
            dailyTasksConfig.tasks[22].enabled = true; // 一键采购（调整序号）

            document.querySelectorAll('#module-dailyTask input[type="checkbox"]').forEach((checkbox) => {
                const taskLabel = checkbox.nextElementSibling?.textContent;
                checkbox.checked = taskLabel === '重置盐罐' || taskLabel === '加钟收菜' || taskLabel === '领任务奖励' || taskLabel === '一键采购';
            });
            showTip('已选择收菜相关任务', 'success');
        }, false);
        harvestBtn.style.flex = '1';
        harvestBtn.style.padding = '4px 6px';
        harvestBtn.style.fontSize = '10px';
        harvestBtn.style.color = config.ui.colors.warning;

        // 挑战按钮
        const challengeBtn = createButton('挑战', () => {
            Object.values(dailyTasksConfig.tasks).forEach(task => {
                task.enabled = false;
            });
            // 只勾选爬塔
            dailyTasksConfig.tasks[20].enabled = true; // 爬塔（调整序号）

            // 由于任务是分普通和特殊排列的，需要分别处理
            document.querySelectorAll('#module-dailyTask input[type="checkbox"]').forEach((checkbox, index) => {
                const taskLabel = checkbox.nextElementSibling?.textContent;
                checkbox.checked = taskLabel === '爬塔';
            });
            showTip('已选择挑战相关任务', 'success');
        }, false);
        challengeBtn.style.flex = '1';
        challengeBtn.style.padding = '4px 6px';
        challengeBtn.style.fontSize = '10px';
        challengeBtn.style.color = config.ui.colors.warning;

        presetButtons.appendChild(allBtn);
        presetButtons.appendChild(harvestBtn);
        presetButtons.appendChild(challengeBtn);
        container.appendChild(presetButtons);

        const tasksContainer = document.createElement('div');
        tasksContainer.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 4px;
            border-radius: 6px; margin-bottom: 6px; max-height: 200px;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(3, minmax(80px, 1fr));
            gap: 2px;
        `;

        // 先添加普通任务
        const tasks = Object.values(dailyTasksConfig.tasks);
        const regularTasks = tasks.filter(task => task.id !== 'autoTower' && task.id !== 'legionBoss' && task.id !== 'poseidonChallenge');
        const specialTasks = tasks.filter(task => task.id === 'autoTower' || task.id === 'legionBoss');
        
        // 按照文字数量排序任务
        regularTasks.sort((a, b) => {
            // 首先按照文字数量升序排序
            if (a.name.length !== b.name.length) {
                return a.name.length - b.name.length;
            }
            // 文字数量相同时按名称排序
            return a.name.localeCompare(b.name);
        });

        // 添加普通任务
        regularTasks.forEach((task) => {
            const taskItem = document.createElement('div');
            taskItem.style.cssText = `
                background: ${config.ui.colors.dark}30; padding: 1px;
                border-radius: 4px;
                display: flex; align-items: center;
                justify-content: left;
                text-align: left;
                min-height: 15px;
            `;

            const checkboxObj = createCheckbox(task.name, task.enabled, (e) => {
                task.enabled = e.target.checked;
            });

            taskItem.appendChild(checkboxObj.container);
            tasksContainer.appendChild(taskItem);
        });

        // 创建一个新的独立行容器来放置特殊任务
        const specialTasksRow = document.createElement('div');
        specialTasksRow.style.cssText = `
            width: 100%;
            grid-column: 1 / -1; // 跨越所有列
            margin-top: 4px;
        `;
        tasksContainer.appendChild(specialTasksRow);

        // 添加特殊任务（按用户要求分行显示）
        if (specialTasks.length > 0) {
            // 有增减按钮的功能组容器（海神挑战、爬塔、俱乐部boss）
            const countTaskContainer = document.createElement('div');
            countTaskContainer.style.cssText = `
                display: flex; flex-direction: column; gap: 1px;
                width: 100%;
            `;
            specialTasksRow.appendChild(countTaskContainer);
            
            // 当前行容器（每行最多两个功能）
            let currentRow = null;
            let countInRow = 0;
            
            // 创建新行函数
            const createNewRow = () => {
                const row = document.createElement('div');
                row.style.cssText = `
                    background: ${config.ui.colors.dark}30; padding: 1px;
                    border-radius: 4px;
                    display: flex; gap: 8px; align-items: center;
                    justify-content: space-between;
                    min-height: 15px;
                    width: 100%;
                    flex-wrap: nowrap;
                `;
                countTaskContainer.appendChild(row);
                return row;
            };
            
            // 无增减按钮的功能容器已移除，一键采购已移至普通任务中

            specialTasks.forEach((task) => {
                // 主容器，包含复选框和配置项
                const taskContainer = document.createElement('div');
                taskContainer.style.cssText = 'display: flex; align-items: center; gap: 4px; flex-shrink: 0;';

                const checkboxObj = createCheckbox(task.name, task.enabled, (e) => {
                    task.enabled = e.target.checked;
                });

                const configContainer = document.createElement('div');
                configContainer.style.cssText = 'display: flex; align-items: center;';

                let hasCountControls = false;
                
                if (task.id === 'legionBoss') {
                    hasCountControls = true;
                    // 减按钮
                    const minusBtn = document.createElement('button');
                    minusBtn.textContent = '-';
                    minusBtn.style.cssText = `
                        width: 10px; height: 10px; padding: 0; border: 1px solid ${config.ui.colors.textLight};
                        border-radius: 2px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
                        font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    `;
                    minusBtn.addEventListener('click', () => {
                        const currentValue = parseInt(countInput.value);
                        if (currentValue > 1) {
                            countInput.value = currentValue - 1;
                            task.bossCount = currentValue - 1;
                        }
                    });

                    // 次数输入框
                    const countInput = document.createElement('input');
                    countInput.type = 'number';
                    countInput.min = '1';
                    countInput.max = '10';
                    countInput.value = task.bossCount || 2;
                    countInput.style.cssText = `
                        width: 10px; padding: 0; margin: 0 1px; border: 1px solid ${config.ui.colors.textLight};
                        border-radius: 2px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
                        font-size: 8px; text-align: center; height: 10px;
                    `;

                    countInput.addEventListener('change', (e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 10) {
                            task.bossCount = value;
                        } else {
                            e.target.value = task.bossCount || 2;
                        }
                    });

                    // 加按钮
                    const plusBtn = document.createElement('button');
                    plusBtn.textContent = '+';
                    plusBtn.style.cssText = `
                        width: 10px; height: 10px; padding: 0; border: 1px solid ${config.ui.colors.textLight};
                        border-radius: 2px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
                        font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    `;
                    plusBtn.addEventListener('click', () => {
                        const currentValue = parseInt(countInput.value);
                        if (currentValue < 10) {
                            countInput.value = currentValue + 1;
                            task.bossCount = currentValue + 1;
                        }
                    });

                    configContainer.appendChild(minusBtn);
                    configContainer.appendChild(countInput);
                    configContainer.appendChild(plusBtn);
                }

                if (task.id === 'autoTower') {
                    hasCountControls = true;
                    // 减按钮
                    const minusBtn = document.createElement('button');
                    minusBtn.textContent = '-';
                    minusBtn.style.cssText = `
                        width: 10px; height: 10px; padding: 0; border: 1px solid ${config.ui.colors.textLight};
                        border-radius: 2px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
                        font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    `;
                    minusBtn.addEventListener('click', () => {
                        const currentValue = parseInt(countInput.value);
                        if (currentValue > 1) {
                            countInput.value = currentValue - 1;
                            task.towerCount = currentValue - 1;
                        }
                    });

                    // 次数输入框
                    const countInput = document.createElement('input');
                    countInput.type = 'number';
                    countInput.min = '1';
                    countInput.max = '10';
                    countInput.value = task.towerCount || 1;
                    countInput.style.cssText = `
                        width: 10px; padding: 0; margin: 0 1px; border: 1px solid ${config.ui.colors.textLight};
                        border-radius: 2px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
                        font-size: 8px; text-align: center; height: 10px;
                    `;

                    countInput.addEventListener('change', (e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 10) {
                            task.towerCount = value;
                        } else {
                            e.target.value = task.towerCount || 1;
                        }
                    });

                    // 加按钮
                    const plusBtn = document.createElement('button');
                    plusBtn.textContent = '+';
                    plusBtn.style.cssText = `
                        width: 10px; height: 10px; padding: 0; border: 1px solid ${config.ui.colors.textLight};
                        border-radius: 2px; background: ${config.ui.colors.dark}; color: ${config.ui.colors.text};
                        font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    `;
                    plusBtn.addEventListener('click', () => {
                        const currentValue = parseInt(countInput.value);
                        if (currentValue < 10) {
                            countInput.value = currentValue + 1;
                            task.towerCount = currentValue + 1;
                        }
                    });

                    configContainer.appendChild(minusBtn);
                    configContainer.appendChild(countInput);
                    configContainer.appendChild(plusBtn);
                }

                taskContainer.appendChild(checkboxObj.container);
                taskContainer.appendChild(configContainer);
                
                // 只有有增减按钮的任务（海神挑战、爬塔、俱乐部boss）
                if (hasCountControls) {
                    // 每行最多两个
                    if (!currentRow || countInRow >= 2) {
                        currentRow = createNewRow();
                        countInRow = 0;
                    }
                    currentRow.appendChild(taskContainer);
                    countInRow++;
                }
            });

            // 添加有增减按钮的功能组（海神挑战、爬塔、俱乐部boss）
            if (countTaskContainer.children.length > 0) {
                tasksContainer.appendChild(countTaskContainer);
            }
        }

        container.appendChild(tasksContainer);

        const execBtn = createButton('执行选中任务', async (e) => {
            const btn = e.target;

            const selectedTasks = Object.values(dailyTasksConfig.tasks).filter(task => task.enabled);
            if (selectedTasks.length === 0) {
                showTip('请至少勾选一个任务', 'error');
                return;
            }

            if (!window.subRoles) {
                showTip('正在注入每日任务功能...', 'info');
                await injectDailyTaskFunctions();
                showTip('注入完成', 'success');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            taskControl.isPaused = false;
            taskControl.isStopped = false;
            taskControl.isRunning = true;
            taskControl.currentTasks = [];

            if (uiElements.dailyTaskPauseBtn) uiElements.dailyTaskPauseBtn.disabled = false;
            if (uiElements.dailyTaskStopBtn) uiElements.dailyTaskStopBtn.disabled = false;

            btn.disabled = true;
            btn.textContent = '执行中';
            btn.style.opacity = '0.8';
            uiElements.dailyTaskExecBtn = btn;

            const dailyTask = (async () => {
                try {
                    showTip(`开始并行执行${selectedTasks.length}个任务`, 'success');
                    logMessage(`开始并行执行${selectedTasks.length}个每日任务`, 'info');

                    // 创建并行任务数组
                    const parallelTasks = [];
                    const taskPromises = [];

                    // 将每个任务包装成Promise并添加到数组
                    selectedTasks.forEach(task => {
                        const taskPromise = (async () => {
                            await checkTaskState(task.name);
                            logMessage(`执行任务: ${task.name}`, 'info');

                            try {
                                switch (task.id) {
                                    case 'shareTorch':
                                        await executeShareTorchTask();
                                        break;
                                    case 'claimMail':
                                        await executeClaimMailTask();
                                        break;
                                    case 'dailyBoss':
                                        await executeDailyBossTask();
                                        break;
                                    case 'openChest':
                                        await executeOpenChestTask();
                                        break;
                                    case 'recruit':
                                        await executeRecruitTask();
                                        break;
                                    case 'goldenTouch':
                                        await executeGoldenTouchTask();
                                        break;
                                    case 'fishing':
                                        await executeFishingTask();
                                        break;
                                    case 'signIn':
                                        await executeSignInTask();
                                        break;
                                    case 'dailyGift':
                                        await executeDailyGiftTask();
                                        break;
                                    case 'cardReward':
                                        await executeCardRewardTask();
                                        break;
                                    case 'legionSign':
                                        await executeLegionSignTask();
                                        break;
                                    case 'legionBoss':
                                        await executeLegionBossTask(task.bossCount || 2);
                                        break;
                                    case 'answerQuiz':
                                        await executeAnswerQuizTask();
                                        break;
                                    case 'claimTaskReward':
                                        await executeClaimTaskRewardTask();
                                        break;
                                    case 'friendGold':
                                        await executeFriendGoldTask();
                                        break;
                                    case 'autoTower':
                                        await executeAutoTowerTask();
                                        break;
                                    case 'autoBottle':
                                        await executeAutoBottleTask();
                                        break;
                                    case 'autoCollect':
                                        await executeAutoCollectTask();
                                        break;
                                    case 'autoHarvest':
                                        await executeAutoHarvestTask();
                                        break;
                                    case 'genieSweep':  // 灯神免费扫荡
                                        await executeGenieSweepTask();
                                        break;
                                    case 'buyTreasureBoxes':  // 新增独立的购买宝箱任务
                                        await executeBuyTreasureBoxesTask();
                                        break;
                                    case 'autoPurchase':  // 一键采购（已移除购买宝箱功能）
                                        await executeAutoPurchaseTask();
                                        break;
                                }
                                logMessage(`${task.name} 完成`, 'success');
                                showTip(`${task.name} 完成`, 'success');
                            } catch (err) {
                                logMessage(`${task.name} 失败: ${err.message}`, 'error');
                                showTip(`${task.name} 失败`, 'error');
                            }
                        })();
                        
                        parallelTasks.push(taskPromise);
                        taskPromises.push(taskPromise);
                    });

                    // 并行执行所有任务
                    await Promise.allSettled(parallelTasks);
                    
                    // 检查是否有任务失败
                    const failedTasks = taskPromises.filter(p => p.status === 'rejected').length;
                    
                    logMessage('所有选中任务执行完成', 'summary');
                    showTip('所有选中任务执行完成', 'success');
                } catch (err) {
                    logMessage(`任务执行异常: ${err.message}`, 'error');
                    showTip('任务执行异常', 'error');
                } finally {
                    if (!taskControl.isStopped) {
                        btn.disabled = false;
                        btn.textContent = '执行选中任务';
                        btn.style.opacity = '1';
                        taskControl.isRunning = false;

                        if (uiElements.dailyTaskPauseBtn) uiElements.dailyTaskPauseBtn.disabled = true;
                        if (uiElements.dailyTaskStopBtn) uiElements.dailyTaskStopBtn.disabled = true;
                    }

                    taskControl.currentTasks = taskControl.currentTasks.filter(t => t !== dailyTask);
                    if (taskControl.currentTasks.length === 0) {
                        taskControl.isRunning = false;

                        if (uiElements.dailyTaskPauseBtn) uiElements.dailyTaskPauseBtn.disabled = true;
                        if (uiElements.dailyTaskStopBtn) uiElements.dailyTaskStopBtn.disabled = true;
                    }
                }
            })();

            taskControl.currentTasks.push(dailyTask);
        }, true);
        execBtn.style.width = '100%';
        container.appendChild(execBtn);

        const controlBtns = document.createElement('div');
        controlBtns.style.cssText = `
            display: flex; gap: 6px; margin-top: 8px;
        `;
        const pauseBtn = createButton('暂停', () => handlePause('dailyTask'), false);
        pauseBtn.style.flex = '1';
        pauseBtn.disabled = true;
        uiElements.dailyTaskPauseBtn = pauseBtn;
        const stopBtn = createButton('停止', handleStop, false);
        stopBtn.style.flex = '1';
        stopBtn.style.background = config.ui.colors.error;
        stopBtn.disabled = true;
        uiElements.dailyTaskStopBtn = stopBtn;
        controlBtns.appendChild(pauseBtn);
        controlBtns.appendChild(stopBtn);
        container.appendChild(controlBtns);

        const selectAllContainer = document.createElement('div');
        selectAllContainer.style.cssText = `
            display: flex; justify-content: space-between; margin-top: 6px;
        `;
        const selectAllBtn = createButton('全选', () => {
            Object.values(dailyTasksConfig.tasks).forEach(task => {
                task.enabled = true;
            });
            document.querySelectorAll('#module-dailyTask input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            showTip('已全选所有任务', 'success');
        }, false);
        selectAllBtn.style.padding = '3px 8px';
        selectAllBtn.style.fontSize = '10px';

        const deselectAllBtn = createButton('全不选', () => {
            Object.values(dailyTasksConfig.tasks).forEach(task => {
                task.enabled = false;
            });
            document.querySelectorAll('#module-dailyTask input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            showTip('已取消所有任务', 'info');
        }, false);
        deselectAllBtn.style.padding = '3px 8px';
        deselectAllBtn.style.fontSize = '10px';

        selectAllContainer.appendChild(selectAllBtn);
        selectAllContainer.appendChild(deselectAllBtn);
        container.appendChild(selectAllContainer);

        return container;
    }

    // 资源模块
    function createResourceModule() {
        const container = document.createElement('div');
        container.id = 'module-resource';
        container.className = 'module-content';
        container.style.display = config.activeModule === 'resource' ? 'block' : 'none';
        const chestMod = config.modules.chest;
        const fishingMod = config.modules.fishing;
        const recruitMod = config.modules.recruit;
        const torchMod = config.modules.torch;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 13px; font-weight: bold; color: ${config.ui.colors.primary};
            margin-bottom: 6px;
        `;
        title.textContent = '资源批量处理（并行执行·火把支持999个）';
        container.appendChild(title);
        
        const globalDelayCont = document.createElement('div');
        globalDelayCont.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 6px;
            border-radius: 6px; margin-bottom: 8px;
        `;
        const delayTitle = document.createElement('div');
        delayTitle.style.cssText = `
            font-size: 11px; font-weight: 500; color: ${config.ui.colors.warning};
            margin-bottom: 4px;
        `;
        delayTitle.textContent = '全局延迟（ms·任务内部轮次间隔）';
        const delayInput = createInput('延迟', config.globalDelay);
        delayInput.type = 'number';
        delayInput.min = 0;
        delayInput.addEventListener('change', () => {
            config.globalDelay = parseInt(delayInput.value) || 1000;
            delayInput.value = config.globalDelay;
            logMessage(`全局延迟：${config.globalDelay}ms`, 'info');
        });
        globalDelayCont.appendChild(delayTitle);
        globalDelayCont.appendChild(delayInput);
        container.appendChild(globalDelayCont);
        
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: grid; grid-template-columns: 1fr; gap: 6px;
            margin-bottom: 8px;
        `;
        const resourceTotalTitle = document.createElement('div');
        resourceTotalTitle.style.cssText = `
            font-size: 11px; font-weight: 500; color: ${config.ui.colors.warning};
            margin-bottom: 4px; padding-left: 4px;
        `;
        resourceTotalTitle.textContent = '宝箱&招募&钓鱼&火把';
        controls.appendChild(resourceTotalTitle);
        
        const chestCont = createResourceSubModule(
            taskCommands.chest,
            chestMod.type,
            chestMod.consumeQty,
            (type) => chestMod.type = parseInt(type),
            (qty) => {
                chestMod.consumeQty = parseInt(qty) || 0;
                logMessage(`宝箱：${chestMod.consumeQty}→${Math.floor(chestMod.consumeQty/10)}次`, 'info');
            }
        );
        controls.appendChild(chestCont);
        
        const fishingCont = createResourceSubModule(
            taskCommands.fishing,
            fishingMod.type,
            fishingMod.consumeQty,
            (type) => fishingMod.type = parseInt(type),
            (qty) => {
                fishingMod.consumeQty = parseInt(qty) || 0;
                logMessage(`钓鱼：${fishingMod.consumeQty}→${Math.floor(fishingMod.consumeQty/10)}次`, 'info');
            }
        );
        controls.appendChild(fishingCont);
        
        const recruitCont = createResourceSubModule(
            taskCommands.recruit,
            recruitMod.type,
            recruitMod.consumeQty,
            (type) => recruitMod.type = parseInt(type),
            (qty) => {
                recruitMod.consumeQty = parseInt(qty) || 0;
                logMessage(`招募：${recruitMod.consumeQty}→${Math.floor(recruitMod.consumeQty/10)}次`, 'info');
            }
        );
        controls.appendChild(recruitCont);
        
        const torchCont = createResourceSubModule(
            taskCommands.torch,
            torchMod.type,
            torchMod.consumeQty,
            (type) => torchMod.type = parseInt(type),
            (qty) => {
                torchMod.consumeQty = parseInt(qty) || 0;
                logMessage(`火把：${torchMod.consumeQty}个`, 'info');
            }
        );
        controls.appendChild(torchCont);
        
        container.appendChild(controls);
        
        const execAllBtn = createButton('同时开始所有资源任务', async (e) => {
            const btn = e.target;
            taskControl.isPaused = false;
            taskControl.isStopped = false;
            taskControl.currentTasks = [];
            taskControl.isRunning = true;
            
            if (uiElements.resourcePauseBtn) uiElements.resourcePauseBtn.disabled = false;
            if (uiElements.resourceStopBtn) uiElements.resourceStopBtn.disabled = false;

            btn.disabled = true;
            btn.textContent = '并行执行中';
            btn.style.opacity = '0.8';
            uiElements.resourceExecBtn = btn;

            const chestExec = Math.floor(chestMod.consumeQty / 10);
            const fishingExec = Math.floor(fishingMod.consumeQty / 10);
            const recruitExec = Math.floor(recruitMod.consumeQty / 10);
            const torchExec = torchMod.consumeQty > 0 ? 1 : 0;

            if (chestExec === 0 && fishingExec === 0 && recruitExec === 0 && torchExec === 0) {
                showTip('消耗需≥1', 'error');
                btn.disabled = false;
                btn.textContent = '同时开始所有资源任务';
                btn.style.opacity = '1';
                taskControl.isRunning = false;
                return;
            }
            
            const parallelTasks = [];
            if (chestExec > 0) {
                const task = executeGenericTask('chest', '宝箱', chestMod, chestExec);
                parallelTasks.push(task);
                taskControl.currentTasks.push(task);
            }
            if (fishingExec > 0) {
                const task = executeGenericTask('fishing', '钓鱼', fishingMod, fishingExec);
                parallelTasks.push(task);
                taskControl.currentTasks.push(task);
            }
            if (recruitExec > 0) {
                const task = executeGenericTask('recruit', '招募', recruitMod, recruitExec);
                parallelTasks.push(task);
                taskControl.currentTasks.push(task);
            }
            if (torchExec > 0) {
                const task = executeTorchTask('torch', '火把', torchMod, torchExec);
                parallelTasks.push(task);
                taskControl.currentTasks.push(task);
            }
            try {
                showTip('所有资源任务并行启动', 'success');
                logMessage('资源任务并行启动', 'info');
                await Promise.all(parallelTasks);
                taskControl.currentTasks = taskControl.currentTasks.filter(t => !parallelTasks.includes(t));
                if (taskControl.currentTasks.length === 0) {
                    taskControl.isRunning = false;
                    if (uiElements.resourcePauseBtn) uiElements.resourcePauseBtn.disabled = true;
                    if (uiElements.resourceStopBtn) uiElements.resourceStopBtn.disabled = true;
                }
                showTip('所有资源任务并行完成', 'success');
                logMessage('所有资源任务并行完成', 'summary');
            } catch (err) {
                showTip('部分任务失败，查看日志', 'error');
                logMessage(`部分任务异常：${err.message}`, 'error');
            } finally {
                if (!taskControl.isStopped) {
                    btn.disabled = false;
                    btn.textContent = '同时开始所有资源任务';
                    btn.style.opacity = '1';
                    taskControl.isRunning = false;
                    if (uiElements.resourcePauseBtn) uiElements.resourcePauseBtn.disabled = true;
                    if (uiElements.resourceStopBtn) uiElements.resourceStopBtn.disabled = true;
                }
            }
        }, true);
        execAllBtn.style.width = '100%';
        container.appendChild(execAllBtn);
        
        const resourceControlBtns = document.createElement('div');
        resourceControlBtns.style.cssText = `
            display: flex; gap: 6px; margin-top: 8px;
        `;
        const resourcePauseBtn = createButton('暂停', () => handlePause('resource'), false);
        resourcePauseBtn.style.flex = '1';
        resourcePauseBtn.disabled = true;
        uiElements.resourcePauseBtn = resourcePauseBtn;
        const resourceStopBtn = createButton('停止', handleStop, false);
        resourceStopBtn.style.flex = '1';
        resourceStopBtn.style.background = config.ui.colors.error;
        resourceStopBtn.disabled = true;
        uiElements.resourceStopBtn = resourceStopBtn;
        resourceControlBtns.appendChild(resourcePauseBtn);
        resourceControlBtns.appendChild(resourceStopBtn);
        container.appendChild(resourceControlBtns);
        
        return container;
    }

    // 资源子模块
    function createResourceSubModule(options, defaultType, defaultQty, onTypeChange, onQtyChange) {
        const container = document.createElement('div');
        container.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 6px;
            border-radius: 6px;
        `;
        const subControls = document.createElement('div');
        subControls.style.cssText = `
            display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
        `;
        const typeCont = document.createElement('div');
        typeCont.style.cssText = `display: flex; flex-direction: column; gap: 2px;`;
        const typeLabel = document.createElement('label');
        typeLabel.textContent = '类型:';
        typeLabel.style.cssText = `font-size: 10px; color: ${config.ui.colors.textLight};`;
        const typeSelect = createSelect(options, defaultType);
        typeSelect.addEventListener('change', () => onTypeChange(typeSelect.value));
        typeCont.appendChild(typeLabel);
        typeCont.appendChild(typeSelect);
        subControls.appendChild(typeCont);
        
        const qtyCont = document.createElement('div');
        qtyCont.style.cssText = `display: flex; flex-direction: column; gap: 2px;`;
        const qtyLabel = document.createElement('label');
        qtyLabel.textContent = '消耗:';
        qtyLabel.style.cssText = `font-size: 10px; color: ${config.ui.colors.textLight};`;
        const qtyInput = createInput('数量', defaultQty);
        qtyInput.type = 'number';
        qtyInput.min = 0;
        qtyInput.max = 999;
        qtyInput.addEventListener('change', () => {
            const qty = parseInt(qtyInput.value) || 0;
            qtyInput.value = qty;
            onQtyChange(qty);
        });
        qtyCont.appendChild(qtyLabel);
        qtyCont.appendChild(qtyInput);
        subControls.appendChild(qtyCont);
        container.appendChild(subControls);
        return container;
    }

    // 竞技&升星模块
    function createArenaStarModule() {
        const container = document.createElement('div');
        container.id = 'module-arenaStar';
        container.className = 'module-content';
        container.style.display = config.activeModule === 'arenaStar' ? 'block' : 'none';
        const arenaMod = config.modules.arena;
        const starMod = config.modules.upgradeStar;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 13px; font-weight: bold; color: ${config.ui.colors.primary};
            margin-bottom: 6px;
        `;
        title.textContent = '竞技&升星';
        container.appendChild(title);
        
        const taskDelayCont = document.createElement('div');
        taskDelayCont.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 6px;
            border-radius: 6px; margin-bottom: 6px;
        `;
        const taskDelayTitle = document.createElement('div');
        taskDelayTitle.style.cssText = `
            font-size: 11px; font-weight: 500; color: ${config.ui.colors.warning};
            margin-bottom: 4px;
        `;
        taskDelayTitle.textContent = '任务延迟（ms·竞技场&升星共用）';
        const taskDelayInput = createInput('延迟', config.taskDelay);
        taskDelayInput.type = 'number';
        taskDelayInput.min = 0;
        taskDelayInput.addEventListener('change', () => {
            config.taskDelay = parseInt(taskDelayInput.value) || 1200;
            taskDelayInput.value = config.taskDelay;
            logMessage(`任务延迟：${config.taskDelay}ms`, 'info');
        });
        taskDelayCont.appendChild(taskDelayTitle);
        taskDelayCont.appendChild(taskDelayInput);
        container.appendChild(taskDelayCont);
        
        const arenaCont = document.createElement('div');
        arenaCont.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 6px;
            border-radius: 6px; margin-bottom: 6px;
        `;
        const arenaSubTitle = document.createElement('div');
        arenaSubTitle.style.cssText = `
            font-size: 11px; font-weight: 500; color: ${config.ui.colors.warning};
            margin-bottom: 4px;
        `;
        arenaSubTitle.textContent = '竞技场';
        arenaCont.appendChild(arenaSubTitle);
        const arenaSubControls = document.createElement('div');
        arenaSubControls.style.cssText = `
            display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px;
        `;
        const arenaCountCont = document.createElement('div');
        arenaCountCont.style.cssText = `display: flex; flex-direction: column; gap: 2px;`;
        const arenaCountLabel = document.createElement('label');
        arenaCountLabel.textContent = '次数:';
        arenaCountLabel.style.cssText = `font-size: 10px; color: ${config.ui.colors.textLight};`;
        const arenaCountInput = createInput('次数', arenaMod.count);
        arenaCountInput.type = 'number';
        arenaCountInput.min = 1;
        arenaCountInput.max = 99;
        arenaCountInput.addEventListener('change', () => arenaMod.count = parseInt(arenaCountInput.value) || 3);
        arenaCountCont.appendChild(arenaCountLabel);
        arenaCountCont.appendChild(arenaCountInput);
        arenaSubControls.appendChild(arenaCountCont);
        
        const arenaTargetCont = document.createElement('div');
        arenaTargetCont.style.cssText = `display: flex; flex-direction: column; gap: 2px;`;
        const arenaTargetLabel = document.createElement('label');
        arenaTargetLabel.textContent = '目标ID:';
        arenaTargetLabel.style.cssText = `font-size: 10px; color: ${config.ui.colors.textLight};`;
        const arenaTargetInput = createInput('ID', arenaMod.targetId);
        arenaTargetInput.type = 'number';
        arenaTargetInput.addEventListener('change', () => arenaMod.targetId = parseInt(arenaTargetInput.value) || 0);
        arenaTargetCont.appendChild(arenaTargetLabel);
        arenaTargetCont.appendChild(arenaTargetInput);
        arenaSubControls.appendChild(arenaTargetCont);
        arenaCont.appendChild(arenaSubControls);
        
        const arenaExecBtn = createButton('开始战斗');
        arenaExecBtn.style.width = '100%';
        arenaExecBtn.addEventListener('click', (e) => {
            uiElements.arenaExecBtn = e.target;
            executeArenaTask(arenaMod, arenaCountInput, arenaTargetInput, e);
        });
        arenaCont.appendChild(arenaExecBtn);
        container.appendChild(arenaCont);
        
        const starCont = document.createElement('div');
        starCont.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 6px;
            border-radius: 6px;
        `;
        const starSubTitle = document.createElement('div');
        starSubTitle.style.cssText = `
            font-size: 11px; font-weight: 500; color: ${config.ui.colors.warning};
            margin-bottom: 4px;
        `;
        starSubTitle.textContent = '升星';
        starCont.appendChild(starSubTitle);
        
        const starExecBtn = createButton('开始升星');
        starExecBtn.style.width = '100%';
        starExecBtn.addEventListener('click', (e) => {
            uiElements.starExecBtn = e.target;
            executeUpgradeStarTask(starMod, e);
        });
        starCont.appendChild(starExecBtn);
        
        const arenaStarControlBtns = document.createElement('div');
        arenaStarControlBtns.style.cssText = `
            display: flex; gap: 6px; margin-top: 8px;
        `;
        const arenaStarPauseBtn = createButton('暂停', () => handlePause('arenaStar'), false);
        arenaStarPauseBtn.style.flex = '1';
        arenaStarPauseBtn.disabled = true;
        uiElements.arenaStarPauseBtn = arenaStarPauseBtn;
        const arenaStarStopBtn = createButton('停止', handleStop, false);
        arenaStarStopBtn.style.flex = '1';
        arenaStarStopBtn.style.background = config.ui.colors.error;
        arenaStarStopBtn.disabled = true;
        uiElements.arenaStarStopBtn = arenaStarStopBtn;
        arenaStarControlBtns.appendChild(arenaStarPauseBtn);
        arenaStarControlBtns.appendChild(arenaStarStopBtn);
        starCont.appendChild(arenaStarControlBtns);
        
        container.appendChild(starCont);
        return container;
    }

    // 车辆助手模块
    function createVehicleModule() {
        const container = document.createElement('div');
        container.id = 'module-vehicle';
        container.className = 'module-content';
        container.style.display = config.activeModule === 'vehicle' ? 'block' : 'none';

        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 13px; font-weight: bold; color: ${config.ui.colors.primary};
            margin-bottom: 6px;
        `;
        title.textContent = '车辆助手';
        container.appendChild(title);

        // 俱乐部车辆功能子模块
        const clubCarsSection = document.createElement('div');
        clubCarsSection.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 6px;
            border-radius: 6px; margin-bottom: 8px;
        `;
        
        const clubCarsTitle = document.createElement('div');
        clubCarsTitle.style.cssText = `
            font-size: 11px; font-weight: 500; color: ${config.ui.colors.warning};
            margin-bottom: 4px;
        `;
        clubCarsTitle.textContent = '俱乐部车辆功能';
        clubCarsSection.appendChild(clubCarsTitle);

        // 查询按钮
        const queryBtn = createButton('查询俱乐部车辆', async () => {
            await queryClubCars();
        }, true);
        queryBtn.style.width = '100%';
        queryBtn.style.marginBottom = '8px';
        clubCarsSection.appendChild(queryBtn);

        // 车辆ID输入区域
        const carInputsContainer = document.createElement('div');
        carInputsContainer.style.cssText = `
            display: grid; grid-template-columns: 1fr; gap: 4px;
            margin-bottom: 8px;
        `;

        const carInputs = [];
        for (let i = 0; i < 4; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.style.cssText = 'display: flex; align-items: center; gap: 6px;';
            
            const label = document.createElement('span');
            label.textContent = `车辆${i+1}:`;
            label.style.cssText = `font-size: 10px; color: ${config.ui.colors.textLight}; width: 50px;`;
            
            const input = createInput('车辆ID', '');
            input.id = `vehicle-car-id-${i}`;
            
            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            carInputsContainer.appendChild(inputGroup);
            carInputs.push(input);
        }
        clubCarsSection.appendChild(carInputsContainer);

        // 批量操作按钮
        const batchButtons = document.createElement('div');
        batchButtons.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;';
        
        const sendAllBtn = createButton('发送所有车辆', async () => {
            const nonEmptyIds = carInputs
                .map(input => input.value.trim())
                .filter(id => id);
                
            if (nonEmptyIds.length === 0) {
                showTip('没有可发送的车辆ID', 'warning');
                return;
            }
            
            showTip(`准备发送 ${nonEmptyIds.length} 辆车辆`, 'info');
            logMessage(`开始批量发送 ${nonEmptyIds.length} 辆车辆`, 'info');
            
            for (const [index, carId] of nonEmptyIds.entries()) {
                showTip(`正在发送第 ${index+1}/${nonEmptyIds.length} 辆`, 'info', `${index+1}/${nonEmptyIds.length}`);
                await sendCar(carId);
                if (index < nonEmptyIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            showTip(`已完成 ${nonEmptyIds.length} 辆车辆发送`, 'success');
            logMessage(`批量发送完成，共发送 ${nonEmptyIds.length} 辆车辆`, 'success');
        });
        
        const claimAllBtn = createButton('收获所有车辆', async () => {
            const nonEmptyIds = carInputs
                .map(input => input.value.trim())
                .filter(id => id);
                
            if (nonEmptyIds.length === 0) {
                showTip('没有可收获的车辆ID', 'warning');
                return;
            }
            
            showTip(`准备收获 ${nonEmptyIds.length} 辆车辆`, 'info');
            logMessage(`开始批量收获 ${nonEmptyIds.length} 辆车辆`, 'info');
            
            for (const [index, carId] of nonEmptyIds.entries()) {
                showTip(`正在收获第 ${index+1}/${nonEmptyIds.length} 辆`, 'info', `${index+1}/${nonEmptyIds.length}`);
                await claimCar(carId);
                if (index < nonEmptyIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            showTip(`已完成 ${nonEmptyIds.length} 辆车辆收获`, 'success');
            logMessage(`批量收获完成，共收获 ${nonEmptyIds.length} 辆车辆`, 'success');
        });
        
        batchButtons.appendChild(sendAllBtn);
        batchButtons.appendChild(claimAllBtn);
        clubCarsSection.appendChild(batchButtons);

        container.appendChild(clubCarsSection);

        // 车辆信息与奖励子模块 - 调整UI大小与查询俱乐部车辆保持一致
        const carInfoSection = document.createElement('div');
        carInfoSection.style.cssText = `
            background: ${config.ui.colors.lightDark}20; padding: 6px;
            border-radius: 6px; margin-bottom: 8px;
        `;
        
        const carInfoTitle = document.createElement('div');
        carInfoTitle.style.cssText = `
            font-size: 11px; font-weight: 500; color: ${config.ui.colors.warning};
            margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;
        `;
        carInfoTitle.innerHTML = '<span>车辆信息与奖励</span>';
        
        const copyAllBtn = createButton('复制所有ID', () => {
            const allIds = vehicleState.fullCarData.map(car => car.carId).join('\n');
            copyToClipboard(allIds, '已复制所有车辆ID');
        });
        copyAllBtn.style.padding = '3px 8px';
        copyAllBtn.style.fontSize = '10px';
        carInfoTitle.appendChild(copyAllBtn);
        
        carInfoSection.appendChild(carInfoTitle);

        const carDataContainer = document.createElement('div');
        carDataContainer.id = 'vehicle-car-data-container';
        carDataContainer.style.cssText = `
            max-height: 150px; overflow-y: auto; background: ${config.ui.colors.dark};
            border-radius: 4px; padding: 4px; font-size: 10px;
        `;
        carInfoSection.appendChild(carDataContainer);

        container.appendChild(carInfoSection);

        return container;
    }

    // 5. 任务执行逻辑
    async function executeGenericTask(moduleType, moduleName, mod, execCount) {
        const taskCfg = taskCommands[moduleType][mod.type];
        if (!taskCfg) throw new Error(`无效${moduleName}类型`);
        if (!window.ws || !window.ws.sendAsync) throw new Error('无WebSocket');
        const singleQty = 10;
        const totalQty = execCount * singleQty;
        logMessage(`${taskCfg.name}：并行启动（${execCount}次·${totalQty}个）`, 'info');
        
        let success = 0;
        try {
            for (let i = 1; i <= execCount; i++) {
                await checkTaskState(taskCfg.name);
                const progress = `${taskCfg.name} #${i}/${execCount}`;
                try {
                    const params = taskCfg.params(singleQty);
                    const msg = window.g_utils?.bon?.encode 
                        ? { ack: 0, body: window.g_utils.bon.encode(params), cmd: taskCfg.cmd, seq: Date.now(), time: Date.now() }
                        : { ack: 0, cmd: taskCfg.cmd, params: params, seq: Date.now(), time: Date.now() };
                    const res = await window.ws.sendAsync(msg);
                    
                    const isSuccess = (res?.code === 0 || res?.ack === 0 || (!res?.code && !res?.ack)) && !res?.resp?.error;
                    if (isSuccess) {
                        logMessage(`${taskCfg.name}成功`, 'success', progress);
                        success++;
                    } else {
                        throw new Error(`码：${res?.code || res?.ack || '未知'}`);
                    }
                } catch (err) {
                    logMessage(`失败：${err.message}`, 'error', progress);
                    continue;
                }
                if (i < execCount) await new Promise(resolve => setTimeout(resolve, config.globalDelay));
            }
            const summary = `${taskCfg.name}：${success}/${execCount}次（${success*singleQty}个）`;
            logMessage(summary, 'summary');
            showTip(summary, 'success');
            return summary;
        } catch (err) {
            logMessage(`${taskCfg.name}中断：${err.message}`, 'error');
            throw err;
        }
    }

    // 火把执行函数
    async function executeTorchTask(moduleType, moduleName, mod, execCount) {
        const taskCfg = taskCommands[moduleType][mod.type];
        if (!taskCfg) throw new Error(`无效${moduleName}类型`);
        if (!window.ws || !window.ws.sendAsync) throw new Error('无WebSocket');
        
        const torchQty = mod.consumeQty;
        logMessage(`${taskCfg.name}：启动（${torchQty}个）`, 'info');
        
        try {
            await checkTaskState(taskCfg.name);
            
            const params = taskCfg.params(torchQty);
            const msg = window.g_utils?.bon?.encode 
                ? { ack: 0, body: window.g_utils.bon.encode(params), cmd: taskCfg.cmd, seq: Date.now(), time: Date.now() }
                : { ack: 0, cmd: taskCfg.cmd, params: params, seq: Date.now(), time: Date.now() };
            
            const res = await window.ws.sendAsync(msg);
            
            const isSuccess = (res?.code === 0 || res?.ack === 0 || (!res?.code && !res?.ack)) && !res?.resp?.error;
            if (isSuccess) {
                logMessage(`${taskCfg.name}成功使用${torchQty}个`, 'success');
                showTip(`${taskCfg.name}使用成功`, 'success');
                return `${taskCfg.name}：${torchQty}个`;
            } else {
                throw new Error(`码：${res?.code || res?.ack || '未知'}`);
            }
        } catch (err) {
            logMessage(`${taskCfg.name}失败：${err.message}`, 'error');
            throw err;
        }
    }

    async function executeArenaTask(mod, countInput, targetInput, e) {
        const count = parseInt(countInput.value) || 3;
        const targetId = parseInt(targetInput.value) || 0;
        const delay = config.taskDelay;
        if (count < 1 || count > 1000) { showTip('次数1-1000', 'error'); return; }
        if (!window.ws || !window.ws.sendAsync) {
            showTip('无WebSocket', 'error');
            logMessage('无WebSocket', 'error');
            return;
        }
        if (!confirm(`竞技场${count}轮（ID：${targetId}）？`)) return;
        
        taskControl.isPaused = false;
        taskControl.isStopped = false;
        taskControl.isRunning = true;
        taskControl.currentTasks = [];
        
        if (uiElements.arenaStarPauseBtn) uiElements.arenaStarPauseBtn.disabled = false;
        if (uiElements.arenaStarStopBtn) uiElements.arenaStarStopBtn.disabled = false;

        const btn = e.target;
        btn.disabled = true;
        btn.textContent = '执行中';
        btn.style.opacity = '0.8';
        uiElements.arenaExecBtn = btn;

        const arenaTask = (async () => {
            showTip(`竞技场${count}轮`, 'success');
            logMessage(`竞技场：${count}轮，ID${targetId}，延迟${delay}ms`);
            let success = 0;
            try {
                for (let i = 1; i <= count; i++) {
                    await checkTaskState('竞技场');
                    const progress = `#${i}/${count}`;
                    logMessage(`===== ${progress} =====`, 'info');
                    const msg1 = window.g_utils?.bon?.encode 
                        ? { ack: 0, body: window.g_utils.bon.encode({ refresh: false }), cmd: 'arena_getareatarget', seq: Date.now(), time: Date.now() }
                        : { ack: 0, cmd: 'arena_getareatarget', params: { refresh: false }, seq: Date.now(), time: Date.now() };
                    const res1 = await window.ws.sendAsync(msg1);
                    const roleId = res1?._rawData?.roleList?.[0]?.roleId;
                    if (!roleId) throw new Error('无角色ID');
                    logMessage(`获ID：${roleId}`, 'success', progress);
                    
                    const msg2 = window.g_utils?.bon?.encode 
                        ? { ack: 0, body: window.g_utils.bon.encode({ targetId: roleId }), cmd: 'fight_startareaarena', seq: Date.now(), time: Date.now() }
                        : { ack: 0, cmd: 'fight_startareaarena', params: { targetId: roleId }, seq: Date.now(), time: Date.now() };
                    const res2 = await window.ws.sendAsync(msg2);
                    if (res2?.code !== 0) throw new Error(`码：${res2?.code || '未知'}`);
                    logMessage('战斗成功', 'success', progress);
                    
                    const msg3 = window.g_utils?.bon?.encode 
                        ? { ack: 0, body: window.g_utils.bon.encode({ rankType: 0 }), cmd: 'arena_getarearank', seq: Date.now(), time: Date.now() }
                        : { ack: 0, cmd: 'arena_getarearank', params: { rankType: 0 }, seq: Date.now(), time: Date.now() };
                    await window.ws.sendAsync(msg3);
                    logMessage('获排名', 'success', progress);
                    success++;
                    if (i < count) await new Promise(resolve => setTimeout(resolve, delay));
                }
                const summary = `竞技场：${success}/${count}轮`;
                logMessage(summary, 'summary');
                showTip(summary, 'success');
            } catch (err) {
                logMessage(`失败：${err.message}`, 'error');
                showTip(`失败：${err.message}`, 'error');
            } finally {
                if (!taskControl.isStopped) {
                    btn.disabled = false;
                    btn.textContent = '开始战斗';
                    btn.style.opacity = '1';
                    taskControl.isRunning = false;
                    if (uiElements.arenaStarPauseBtn) uiElements.arenaStarPauseBtn.disabled = true;
                    if (uiElements.arenaStarStopBtn) uiElements.arenaStarStopBtn.disabled = true;
                }
                taskControl.currentTasks = taskControl.currentTasks.filter(t => t !== arenaTask);
                if (taskControl.currentTasks.length === 0) {
                    taskControl.isRunning = false;
                    if (uiElements.arenaStarPauseBtn) uiElements.arenaStarPauseBtn.disabled = true;
                    if (uiElements.arenaStarStopBtn) uiElements.arenaStarStopBtn.disabled = true;
                }
            }
        })();
        taskControl.currentTasks.push(arenaTask);
    }

    async function executeUpgradeStarTask(mod, e) {
        const delay = config.taskDelay;
        const heroIds = [
            ...Array.from({ length: 20 }, (_, i) => 101 + i),
            ...Array.from({ length: 28 }, (_, i) => 201 + i),
            ...Array.from({ length: 14 }, (_, i) => 301 + i)
        ];
        if (!window.ws || !window.ws.sendAsync) {
            showTip('无WebSocket', 'error');
            logMessage('无WebSocket', 'error');
            return;
        }
        if (!confirm('升星所有英雄（每步10次）？')) return;
        
        taskControl.isPaused = false;
        taskControl.isStopped = false;
        taskControl.isRunning = true;
        taskControl.currentTasks = [];
        
        if (uiElements.arenaStarPauseBtn) uiElements.arenaStarPauseBtn.disabled = false;
        if (uiElements.arenaStarStopBtn) uiElements.arenaStarStopBtn.disabled = false;

        const btn = e.target;
        btn.disabled = true;
        btn.textContent = '执行中';
        btn.style.opacity = '0.8';
        uiElements.starExecBtn = btn;

        const starTask = (async () => {
            showTip('开始升星', 'success');
            logMessage('升星启动');
            try {
                for (const heroId of heroIds) {
                    await checkTaskState('升星');
                    let skip = false;
                    for (let i = 1; i <= 10; i++) {
                        await checkTaskState(`升星(英雄${heroId})`);
                        try {
                            const msg = window.g_utils?.bon?.encode 
                                ? { ack: 0, body: window.g_utils.bon.encode({ heroId }), cmd: 'hero_heroupgradestar', seq: Date.now(), time: Date.now() }
                                : { ack: 0, cmd: 'hero_heroupgradestar', params: { heroId }, seq: Date.now(), time: Date.now() };
                            const res = await window.ws.sendAsync(msg);
                            if (res?.code !== 0) throw new Error('失败');
                            logMessage(`英雄${heroId} #${i}`, 'success');
                        } catch (err) {
                            logMessage(`英雄${heroId} #${i}失败`, 'error');
                            skip = true;
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    if (skip) continue;
                }
                logMessage('英雄升星完', 'success');
                showTip('英雄升星完', 'success');
                
                for (const heroId of heroIds) {
                    await checkTaskState('图鉴升星');
                    let skip = false;
                    for (let i = 1; i <= 10; i++) {
                        await checkTaskState(`图鉴升星(英雄${heroId})`);
                        try {
                            const msg = window.g_utils?.bon?.encode 
                                ? { ack: 0, body: window.g_utils.bon.encode({ heroId }), cmd: 'book_upgrade', seq: Date.now(), time: Date.now() }
                                : { ack: 0, cmd: 'book_upgrade', params: { heroId }, seq: Date.now(), time: Date.now() };
                            const res = await window.ws.sendAsync(msg);
                            if (res?.code !== 0) throw new Error('失败');
                            logMessage(`图鉴${heroId} #${i}`, 'success');
                        } catch (err) {
                            logMessage(`图鉴${heroId} #${i}失败`, 'error');
                            skip = true;
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    if (skip) continue;
                }
                logMessage('图鉴升星完', 'success');
                showTip('图鉴升星完', 'success');
                
                for (let i = 1; i <= 10; i++) {
                    await checkTaskState('领升星奖励');
                    try {
                        const msg = window.g_utils?.bon?.encode 
                            ? { ack: 0, body: window.g_utils.bon.encode({}), cmd: 'book_claimpointreward', seq: Date.now(), time: Date.now() }
                            : { ack: 0, cmd: 'book_claimpointreward', params: {}, seq: Date.now(), time: Date.now() };
                        const res = await window.ws.sendAsync(msg);
                        if (res?.code !== 0) throw new Error('失败');
                        logMessage(`领奖#${i}`, 'success');
                    } catch (err) {
                        logMessage(`领奖#${i}失败`, 'error');
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                showTip('升星完', 'success');
                logMessage('升星完', 'summary');
            } catch (err) {
                logMessage(`升星失败：${err.message}`, 'error');
                showTip(`失败：${err.message}`, 'error');
            } finally {
                if (!taskControl.isStopped) {
                    btn.disabled = false;
                    btn.textContent = '开始升星';
                    btn.style.opacity = '1';
                    taskControl.isRunning = false;
                    if (uiElements.arenaStarPauseBtn) uiElements.arenaStarPauseBtn.disabled = true;
                    if (uiElements.arenaStarStopBtn) uiElements.arenaStarStopBtn.disabled = true;
                }
                taskControl.currentTasks = taskControl.currentTasks.filter(t => t !== starTask);
                if (taskControl.currentTasks.length === 0) {
                    taskControl.isRunning = false;
                    if (uiElements.arenaStarPauseBtn) uiElements.arenaStarPauseBtn.disabled = true;
                    if (uiElements.arenaStarStopBtn) uiElements.arenaStarStopBtn.disabled = true;
                }
            }
        })();
        taskControl.currentTasks.push(starTask);
    }

    // 车辆助手功能函数
    function checkWsConnection() {
        if (!window.ws || typeof window.ws.sendAsync !== 'function') {
            showTip('错误：未找到可用的WebSocket连接', 'error');
            return false;
        }
        return true;
    }

    async function sendCommand(cmd, params = {}) {
        if (!checkWsConnection()) return null;
        
        try {
            const seq = vehicleState.currentSeq++;
            const timestamp = Date.now();
            
            const message = { 
                ack: 0,
                cmd, 
                params,
                seq,
                time: timestamp
            };
            
            logMessage(`发送命令[${seq}]: ${cmd}`, 'info');
            const response = await window.ws.sendAsync(message);
            vehicleState.rawResponseData = response;
            
            if (response.code === 0) {
                logMessage(`命令成功[${seq}]: ${cmd}`, 'success');
            } else {
                logMessage(`命令失败[${seq}, 错误码: ${response.code}]: ${cmd}`, 'error');
            }
            return response;
        } catch (error) {
            logMessage(`命令出错: ${cmd} - ${error.message}`, 'error');
            return null;
        }
    }

    function copyToClipboard(text, successTip) {
        navigator.clipboard.writeText(text).then(() => {
            showTip(successTip || '复制成功', 'success');
        }).catch(err => {
            showTip('复制失败，请手动复制', 'error');
            logMessage(`复制失败: ${err.message}`, 'error');
        });
    }

    function parseRewards(rewards) {
        if (!rewards || !Array.isArray(rewards)) {
            return [];
        }
        
        const rewardMap = {
            goldBrick1: { name: '金砖', count: 0 },
            goldBrick2: { name: '金砖', count: 0 },
            recruitOrder: { name: '招募令', count: 0 },
            refreshTicket: { name: '刷新票', count: 0 },
            coloredJade: { name: '彩玉', count: 0 },
            whiteJade: { name: '白玉', count: 0 }
        };
        
        rewards.forEach(reward => {
            if (reward.itemId === 0) {
                if (reward.type === 2) {
                    rewardMap.goldBrick1.count += reward.value || 0;
                } else if (reward.type === 0) {
                    rewardMap.goldBrick2.count += reward.value || 0;
                }
            }
            else if (reward.itemId === 1001 && reward.type === 3) {
                rewardMap.recruitOrder.count += reward.value || 0;
            }
            else if (reward.itemId === 35002 && reward.type === 3) {
                rewardMap.refreshTicket.count += reward.value || 0;
            }
            else if (reward.itemId === 1023 && reward.type === 3) {
                rewardMap.coloredJade.count += reward.value || 0;
            }
            else if (reward.itemId === 1022 && reward.type === 3) {
                rewardMap.whiteJade.count += reward.value || 0;
            }
        });
        
        const totalGoldBricks = rewardMap.goldBrick1.count + rewardMap.goldBrick2.count;
        
        const result = [];
        if (totalGoldBricks > 0) {
            result.push(`${rewardMap.goldBrick1.name}:${totalGoldBricks}`);
        }
        if (rewardMap.recruitOrder.count > 0) {
            result.push(`${rewardMap.recruitOrder.name}:${rewardMap.recruitOrder.count}`);
        }
        if (rewardMap.refreshTicket.count > 0) {
            result.push(`${rewardMap.refreshTicket.name}:${rewardMap.refreshTicket.count}`);
        }
        if (rewardMap.coloredJade.count > 0) {
            result.push(`${rewardMap.coloredJade.name}:${rewardMap.coloredJade.count}`);
        }
        if (rewardMap.whiteJade.count > 0) {
            result.push(`${rewardMap.whiteJade.name}:${rewardMap.whiteJade.count}`);
        }
        
        return result;
    }

    function getCarQualityText(qualityValue) {
        const qualityMap = {
            1: '绿色(普通)',
            2: '蓝色(精致)',
            3: '紫色(卓越)',
            4: '橙色(传说)',
            5: '红色(神话)',
            6: '金色(传说)'
        };
        return qualityMap[qualityValue] || '未知品质';
    }

    function renderCarDataTable() {
        const tableContainer = document.getElementById('vehicle-car-data-container');
        if (!tableContainer) return;
        
        tableContainer.innerHTML = '';
        
        if (vehicleState.fullCarData.length === 0) {
            tableContainer.innerHTML = '<div style="text-align:center; padding:10px; color:#94a3b8; font-size:10px;">暂无车辆数据，请先查询</div>';
            return;
        }
        
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%; border-collapse: collapse; font-size: 9px;
            color: ${config.ui.colors.text};
        `;
        
        // 表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        ['序号', '车辆ID', '品质', '奖励', '操作'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.cssText = `
                padding: 3px 4px; text-align: left; border-bottom: 1px solid ${config.ui.colors.textLight};
                background: ${config.ui.colors.lightDark};
            `;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 表体
        const tbody = document.createElement('tbody');
        vehicleState.fullCarData.forEach((car, index) => {
            const row = document.createElement('tr');
            row.style.borderBottom = `1px solid ${config.ui.colors.textLight}30`;
            
            // 序号
            const td1 = document.createElement('td');
            td1.textContent = index + 1;
            td1.style.padding = '3px 4px';
            row.appendChild(td1);
            
            // 车辆ID
            const td2 = document.createElement('td');
            td2.textContent = car.carId;
            td2.style.padding = '3px 4px';
            row.appendChild(td2);
            
            // 品质
            const td3 = document.createElement('td');
            td3.textContent = getCarQualityText(car.quality);
            td3.style.padding = '3px 4px';
            row.appendChild(td3);
            
            // 奖励
            const td4 = document.createElement('td');
            const rewardsText = car.rewards && car.rewards.length > 0 
                ? car.rewards.join('，') 
                : '无奖励';
            td4.textContent = rewardsText;
            td4.style.padding = '3px 4px';
            td4.title = rewardsText;
            row.appendChild(td4);
            
            // 操作按钮
            const td5 = document.createElement('td');
            td5.style.padding = '3px 4px';
            td5.style.whiteSpace = 'nowrap';
            
            // 刷新按钮
            const refreshBtn = document.createElement('button');
            refreshBtn.textContent = '刷新';
            refreshBtn.style.cssText = `
                padding: 2px 4px; margin-right: 2px; font-size: 8px;
                background: ${config.ui.colors.warning}; color: white; border: none;
                border-radius: 3px; cursor: pointer;
            `;
            refreshBtn.onclick = () => refreshCar(car.carId);
            
            // 收获按钮
            const claimBtn = document.createElement('button');
            claimBtn.textContent = '收获';
            claimBtn.style.cssText = `
                padding: 2px 4px; margin-right: 2px; font-size: 8px;
                background: ${config.ui.colors.success}; color: white; border: none;
                border-radius: 3px; cursor: pointer;
            `;
            claimBtn.onclick = () => claimCar(car.carId);
            
            // 复制按钮
            const copyBtn = document.createElement('button');
            copyBtn.textContent = '复制';
            copyBtn.style.cssText = `
                padding: 2px 4px; font-size: 8px;
                background: ${config.ui.colors.primary}; color: white; border: none;
                border-radius: 3px; cursor: pointer;
            `;
            copyBtn.onclick = () => copyToClipboard(car.carId, `已复制车辆ID: ${car.carId}`);
            
            td5.appendChild(refreshBtn);
            td5.appendChild(claimBtn);
            td5.appendChild(copyBtn);
            row.appendChild(td5);
            
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        tableContainer.appendChild(table);
    }

    // 刷新单个车辆函数
    async function refreshCar(carId) {
        if (!checkWsConnection()) return;

        try {
            logMessage(`开始刷新车辆，ID: ${carId}`, 'info');
            showTip(`正在刷新车辆: ${carId}`, 'info');
            
            const response = await sendCommand('car_refresh', {
                carId: carId
            });
            
            if (response?.code === 0) {
                logMessage(`车辆刷新成功，ID: ${carId}`, 'success');
                showTip(`车辆 ${carId} 刷新成功`, 'success');
                await queryClubCars();
            } else {
                logMessage(`车辆刷新失败，ID: ${carId}, 错误码: ${response?.code}`, 'error');
                showTip(`车辆 ${carId} 刷新失败`, 'error');
            }
        } catch (error) {
            logMessage(`刷新车辆出错: ${error.message}`, 'error');
            showTip(`刷新车辆 ${carId} 过程出错`, 'error');
        }
    }

    async function queryClubCars() {
        if (!checkWsConnection()) return;

        try {
            logMessage('开始查询俱乐部车辆信息...', 'info');
            showTip('正在查询俱乐部车辆', 'info');
            
            const response = await sendCommand('car_getrolecar');
            
            if (response?.code === 0) {
                vehicleState.fullCarData = [];
                let carDataMap = null;

                if (response._rawData) {
                    if (response._rawData.body?.roleCar?.carDataMap) {
                        carDataMap = response._rawData.body.roleCar.carDataMap;
                    } else if (response._rawData.roleCar?.carDataMap) {
                        carDataMap = response._rawData.roleCar.carDataMap;
                    } else if (response._rawData.carDataMap) {
                        carDataMap = response._rawData.carDataMap;
                    }
                } else if (response.data?.body?.roleCar?.carDataMap) {
                    carDataMap = response.data.body.roleCar.carDataMap;
                }

                if (carDataMap && Object.keys(carDataMap).length > 0) {
                    // 将车辆数据转换为数组并按照固定规则排序
                    const carArray = [];
                    for (const [carId, carInfo] of Object.entries(carDataMap)) {
                        const rewards = parseRewards(carInfo.rewards);
                        
                        carArray.push({
                            carId: carId,
                            quality: carInfo.color || '未知',
                            rewards: rewards,
                            rawInfo: carInfo
                        });
                    }

                    // 按照固定顺序排序：品质降序，然后ID升序
                    carArray.sort((a, b) => {
                        // 首先按品质降序排列
                        if (a.quality !== b.quality) {
                            return b.quality - a.quality;
                        }
                        // 品质相同则按ID升序排列
                        return parseInt(a.carId) - parseInt(b.carId);
                    });

                    // 只取前4辆车
                    vehicleState.fullCarData = carArray.slice(0, 4);

                    logMessage(`查询到 ${carArray.length} 辆俱乐部车辆，显示前4辆`, 'success');
                    logMessage('固定顺序车辆：' + vehicleState.fullCarData.map(car => `${car.carId}(${getCarQualityText(car.quality)})`).join(', '), 'info');

                    // 更新输入框，保持固定位置
                    const carInputs = [];
                    for (let i = 0; i < 4; i++) {
                        const input = document.getElementById(`vehicle-car-id-${i}`);
                        if (input) carInputs.push(input);
                    }
                    
                    // 按照固定顺序填充输入框
                    vehicleState.fullCarData.forEach((car, index) => {
                        if (carInputs[index]) {
                            carInputs[index].value = car.carId;
                        }
                    });
                    
                    // 如果车辆不足4辆，清空多余的输入框
                    for (let i = vehicleState.fullCarData.length; i < carInputs.length; i++) {
                        if (carInputs[i]) carInputs[i].value = '';
                    }

                    renderCarDataTable();
                    showTip(`成功查询到 ${carArray.length} 辆车辆，固定显示前4辆`, 'success');
                } else {
                    logMessage('未查询到俱乐部车辆数据', 'warning');
                    showTip('未查询到车辆数据', 'warning');
                    
                    // 清空所有输入框
                    const carInputs = [];
                    for (let i = 0; i < 4; i++) {
                        const input = document.getElementById(`vehicle-car-id-${i}`);
                        if (input) {
                            carInputs.push(input);
                            input.value = '';
                        }
                    }
                    
                    renderCarDataTable();
                }
            } else {
                logMessage(`查询失败，错误码: ${response?.code}`, 'error');
                showTip('车辆查询失败', 'error');
            }
        } catch (error) {
            logMessage(`查询出错: ${error.message}`, 'error');
            showTip('查询过程出错', 'error');
        }
    }
    async function sendCar(carId) {
        if (!checkWsConnection()) return;

        try {
            logMessage(`开始发送车辆，ID: ${carId}`, 'info');
            showTip(`正在发送车辆: ${carId}`, 'info');
            
            const response = await sendCommand('car_send', {
                carId: carId,
                helperId: 0,
                text: ""
            });
            
            if (response?.code === 0) {
                logMessage(`车辆发送成功，ID: ${carId}`, 'success');
                showTip(`车辆 ${carId} 发送成功`, 'success');
            } else {
                logMessage(`车辆发送失败，错误码: ${response?.code}`, 'error');
                showTip(`车辆 ${carId} 发送失败`, 'error');
            }
        } catch (error) {
            logMessage(`发送车辆出错: ${error.message}`, 'error');
            showTip(`发送车辆 ${carId} 过程出错`, 'error');
        }
    }

    async function claimCar(carId) {
        if (!checkWsConnection()) return;

        try {
            logMessage(`开始收获车辆，ID: ${carId}`, 'info');
            showTip(`正在收获车辆: ${carId}`, 'info');
            
            const response = await sendCommand('car_claim', {
                carId: carId
            });
            
            if (response?.code === 0) {
                logMessage(`车辆收获成功，ID: ${carId}`, 'success');
                showTip(`车辆 ${carId} 收获成功`, 'success');
                await queryClubCars();
            } else {
                logMessage(`车辆收获失败，ID: ${carId}, 错误码: ${response?.code}`, 'error');
                showTip(`车辆 ${carId} 收获失败`, 'error');
            }
        } catch (error) {
            logMessage(`收获车辆出错: ${error.message}`, 'error');
            showTip(`收获车辆 ${carId} 过程出错`, 'error');
        }
    }

    // 每日任务执行函数
    async function injectDailyTaskFunctions() {
        return new Promise((resolve, reject) => {
            try {
                var SubRole = window.__require('SubRole').SubRole
                var oldSetupNetWorkEnv = SubRole.prototype.setupNetWorkEnv
                SubRole.prototype.setupNetWorkEnv = function (...args) {
                    window.subRoles.add(this)
                    return oldSetupNetWorkEnv.call(this, ...args)
                }
                var oldClean = SubRole.prototype.clean
                SubRole.prototype.clean = function (...args) {
                    window.subRoles.delete(this)
                    return oldClean.call(this, ...args)
                }
                window.subRoles = new Set()
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    // 每日任务具体实现函数
    async function executeDailyTaskWrapper(taskName, taskFn) {
        const forEachIso = async function (opName, callback) {
            try {
                var dataIndex = window.__require('data-index')
                var ServerData = window.__require('ServerData')
                await callback(dataIndex, ServerData.ROLE, true, '主号')
                logMessage(`主号执行[${opName}]完成!`)
            } catch (err) {
                logMessage(`主号执行[${opName}]出错, ${err}`, 'error')
                throw err;
            }
            var index = 0
            for (const subRole of window.subRoles) {
                index++
                try {
                    await callback(subRole.iso, subRole.role, false, `多开${index}号`)
                    logMessage(`多开${index}号执行[${opName}]完成!`)
                } catch (err) {
                    logMessage(`多开${index}号执行出错, ${err}`, 'error')
                }
            }
        }

        const delay = function (timeout) {
            return new Promise(function (resolve) {
                setTimeout(resolve, 0)
            })
        }

        await forEachIso(taskName, taskFn);
        await delay(1);
    }

    // 新增灯神免费扫荡任务函数
    async function executeGenieSweepTask() {
        await executeDailyTaskWrapper('灯神免费扫荡', async function (iso, role, main, account) {
            // 灯神免费扫荡
            const kingdoms = ['魏国', '蜀国', '吴国', '群雄'];
            logMessage(`${account} 开始执行灯神免费扫荡`, 'info');
            
            for (let gid = 1; gid <= 4; gid++) {
                try {
                    if (iso && iso.lService) {
                        await iso.GenieService.sweep({ genieId: gid });
                    } else {
                        const msg = window.g_utils?.bon?.encode
                        ? {
                            ack: 0,
                            body: window.g_utils.bon.encode({ genieId: gid }),
                            cmd: 'genie_sweep',
                            seq: Date.now(),
                            time: Date.now(),
                        }
                        : {
                            ack: 0,
                            cmd: 'genie_sweep',
                            params: { genieId: gid },
                            seq: Date.now(),
                            time: Date.now(),
                        };
                        await window.ws.sendAsync(msg);
                    }
                    logMessage(`${account} ${kingdoms[gid-1]}灯神免费扫荡成功`, 'success');
                } catch (error) {
                    logMessage(`${account} ${kingdoms[gid-1]}灯神免费扫荡失败: ${error.message}`, 'error');
                }
                await delay(0.3);
            }

            // 灯神免费扫荡卷
            logMessage(`${account} 开始领取免费扫荡卷`, 'info');
            for (let i = 0; i < 3; i++) {
                try {
                    if (iso && iso.GenieService) {
                        await iso.GenieService.buySweep({});
                    } else {
                        const msg = window.g_utils?.bon?.encode
                        ? {
                            ack: 0,
                            body: window.g_utils.bon.encode({}),
                            cmd: 'genie_buysweep',
                            seq: Date.now(),
                            time: Date.now(),
                        }
                        : {
                            ack: 0,
                            cmd: 'genie_buysweep',
                            params: {},
                            seq: Date.now(),
                            time: Date.now(),
                        };
                        await window.ws.sendAsync(msg);
                    }
                    logMessage(`${account} 领取免费扫荡卷 ${i + 1}/3 成功`, 'success');
                } catch (error) {
                    logMessage(`${account} 领取免费扫荡卷 ${i + 1}/3 失败: ${error.message}`, 'error');
                }
                await delay(0.3);
            }
            
            logMessage(`${account} 灯神免费扫荡任务完成`, 'summary');
        });
    }

    // 新增独立的购买宝箱任务函数
    async function executeBuyTreasureBoxesTask() {
        await executeDailyTaskWrapper('购买三种宝箱', async function (iso, role, main, account) {
            logMessage(`${account} 开始执行购买三种宝箱`, 'info');
            
            // 购买宝箱的通用函数
            const buyTreasureBox = async (goodsId, boxName) => {
                try {
                    logMessage(`${account} 开始购买${boxName}`, 'info');
                    if (iso && iso.StoreService) {
                        await iso.StoreService.buy({ goodsId });
                    } else {
                        const boxMsg = window.g_utils?.bon?.encode
                        ? {
                            ack: 106,
                            body: window.g_utils.bon.encode({ goodsId }),
                            cmd: 'store_buy',
                            seq: Date.now(),
                            time: Date.now(),
                        }
                        : {
                            ack: 106,
                            body: { goodsId },
                            cmd: 'store_buy',
                            seq: Date.now(),
                            time: Date.now(),
                        };
                        await window.ws.sendAsync(boxMsg);
                    }
                    logMessage(`${account} ${boxName}购买成功`, 'success');
                    showTip(`${boxName}购买成功`, 'success');
                } catch (error) {
                    logMessage(`${account} ${boxName}购买失败: ${error.message}`, 'error');
                    showTip(`${boxName}购买失败`, 'error');
                }
            };

            // 依次购买三种宝箱
            await buyTreasureBox(1, '青铜宝箱');  // 青铜宝箱
            await delay(0.5);  // 增加短暂延迟，避免请求过于密集
            await buyTreasureBox(2, '黄金宝箱');  // 黄金宝箱
            await delay(0.5);  // 增加短暂延迟，避免请求过于密集
            await buyTreasureBox(3, '铂金宝箱');  // 铂金宝箱
            
            logMessage(`${account} 三种宝箱购买任务完成`, 'summary');
        });
    }

    // 一键采购任务函数（已移除购买宝箱的代码）
    async function executeAutoPurchaseTask() {
        await executeDailyTaskWrapper('一键采购', async function (iso, role, main, account) {
            logMessage(`${account} 开始执行一键采购`, 'info');
            
            try {
                if (iso && iso.StoreService) {
                    await iso.StoreService.purchase({});
                } else {
                    const purchaseMsg = window.g_utils?.bon?.encode
                    ? {
                        ack: 0,
                        body: window.g_utils.bon.encode({}),
                        cmd: 'store_purchase',
                        seq: Date.now(),
                        time: Date.now(),
                    }
                    : {
                        ack: 0,
                        body: {},
                        cmd: 'store_purchase',
                        seq: Date.now(),
                        time: Date.now(),
                    };
                    await window.ws.sendAsync(purchaseMsg);
                }
                logMessage(`${account} 一键采购成功`, 'success');
                showTip(`一键采购成功`, 'success');
            } catch (error) {
                logMessage(`${account} 一键采购失败: ${error.message}`, 'error');
                showTip(`一键采购失败`, 'error');
            }
            
            logMessage(`${account} 一键采购任务完成`, 'summary');
        });
    }

    // 新增海神挑战任务函数
    async function executePoseidonChallengeTask(count) {
        await executeDailyTaskWrapper('海神挑战', async function (iso, role, main, account) {
            logMessage(`${account} 开始执行海神挑战 ${count} 次`, 'info');
            
            for (let i = 1; i <= count; i++) {
                try {
                    if (iso && iso.PoseidonService) {
                        await iso.PoseidonService.challenge({});
                    } else {
                        const msg = window.g_utils?.bon?.encode
                        ? {
                            ack: 0,
                            body: window.g_utils.bon.encode({}),
                            cmd: 'poseidon_challenge',
                            seq: Date.now(),
                            time: Date.now(),
                        }
                        : {
                            ack: 0,
                            body: {},
                            cmd: 'poseidon_challenge',
                            seq: Date.now(),
                            time: Date.now(),
                        };
                        await window.ws.sendAsync(msg);
                    }
                    logMessage(`${account} 海神挑战 ${i}/${count} 成功`, 'success');
                    showTip(`海神挑战 ${i}/${count} 成功`, 'success');
                } catch (error) {
                    logMessage(`${account} 海神挑战 ${i}/${count} 失败: ${error.message}`, 'error');
                    showTip(`海神挑战 ${i}/${count} 失败`, 'error');
                }
                await delay(0.3);
            }
            
            logMessage(`${account} 海神挑战任务完成`, 'summary');
        });
    }

    async function executeShareTorchTask() {
        await executeDailyTaskWrapper('分享领取木材火把', async function (iso) {
            await iso.SystemService.myShareCallback({
                isSkipShareCard: false,
                type: 1
            })
        });
    }

    async function executeClaimMailTask() {
        await executeDailyTaskWrapper('领取邮件奖励', async function (iso) {
            await iso.MailService.claimAllAttachment({
                category: 0
            })
        });
    }

    async function executeDailyBossTask() {
        const getFormatDate = function (ts) {
            const date = new Date(ts)
            date.setHours(date.getHours() + 8)
            return date
        }

        await executeDailyTaskWrapper('挑战每日咸王boss', async function (iso) {
            const weekDay = getFormatDate(Date.now()).getUTCDay()
            const bossId = [9904, 9905, 9901, 9902, 9903, 9904, 9905][weekDay]
            await iso.FightService.startBoss({
                bossId: bossId
            })
        });
    }

    async function executeOpenChestTask() {
        await executeDailyTaskWrapper('开启10个木质宝箱', async function (iso) {
            await iso.ItemService.openBox({ itemId: 2001, number: 10 })
        });
    }

    async function executeRecruitTask() {
        await executeDailyTaskWrapper('进行两次招募', async function (iso) {
            await iso.HeroService.recruit({
                byClub: false,
                recruitNumber: 1,
                recruitType: 3
            })
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iso.HeroService.recruit({
                byClub: false,
                recruitNumber: 1,
                recruitType: 1
            })
        });
    }

    async function executeGoldenTouchTask() {
        await executeDailyTaskWrapper('点金三次', async function (iso) {
            await iso.SystemService.buyGold({ buyNum: 1 })
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iso.SystemService.buyGold({ buyNum: 1 })
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iso.SystemService.buyGold({ buyNum: 1 })
        });
    }

    async function executeFishingTask() {
        await executeDailyTaskWrapper('普通钓鱼三次', async function (iso) {
            await iso.ArtifactService.lottery({
                lotteryNumber: 1,
                newFree: true,
                type: 1
            })
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iso.ArtifactService.lottery({
                lotteryNumber: 1,
                newFree: true,
                type: 1
            })
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iso.ArtifactService.lottery({
                lotteryNumber: 1,
                newFree: true,
                type: 1
            })
        });
    }

    async function executeSignInTask() {
        await executeDailyTaskWrapper('领取每日登录奖励', async function (iso) {
            await iso.SystemService.signInReward({})
        });
    }

    async function executeDailyGiftTask() {
        await executeDailyTaskWrapper('领取每日特惠礼包', async function (iso) {
            await iso.DiscountService.claimReward({ discountId: 1 })
        });
    }

    async function executeCardRewardTask() {
        await executeDailyTaskWrapper('领取[福利卡]每日奖励', async function (iso) {
            await iso.CardService.claimReward({ cardId: 1 })
        });
    }

    async function executeLegionSignTask() {
        await executeDailyTaskWrapper('俱乐部签到', async function (iso) {
            await iso.LegionService.signIn({})
        });
    }

    async function executeLegionBossTask(count = 2) {
        await executeDailyTaskWrapper(`攻打${count}次boss`, async function (iso) {
            for (let i = 0; i < count; i++) {
                await iso.FightService.startLegionBoss({})
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        });
    }

    async function executeAnswerQuizTask() {
        const tiku = {
            '《三国演义》中，「大意失街亭」的是马谩？': 1,
            '《三国演义》中，刘备三顾茅庐请诸葛亮出山？': 1,
            '《三国演义》中，提出「隆中对」的是诸葛亮？': 1,
            '《三国演义》中，夏侯杰在当阳桥被张飞吓死？': 1,
            '《三国演义》中，张飞在当阳桥厉吼吓退曹军？': 1,
            '《三国演义》中，唯一正式上过战场的女子是祝融夫人？': 1,
            '《三国志》中，华雄被孙坚枭首？': 1,
            '「闭月」是貂蝉的代称？': 1,
            '「常胜将军」指代赵云？': 1,
            '「赤壁之战」中是黄盖建策火攻？': 1,
            '「郭嘉不死卧龙不出」出自三国典故？': 1,
            '「三姓家奴」是指飞将吕布？': 1,
            '「士别三日」形容吕蒙笃志力学？': 1,
            '「吴下阿蒙」即指吕蒙？': 1,
            '「小菜一碟」指的是张飞吃豆芽？': 1,
            '「与曹操交手而不死，能败诸葛亮而自活」是指司马懿？': 1,
            '蔡文姬擅长音律？': 1,
            '曹仁被称为「天人将军」？': 1,
            '大乔为孙策之妻？': 1,
            '典故「胆大如斗」与姜维有关？': 1,
            '典韦力大过人，被称为「古之恶来」？': 1,
            '典韦善用的武器包括「大双戟」？': 1,
            '貂蝉的「美人计」用于离间董卓和吕布？': 1,
            '东汉末年国色美女小乔为周瑜之妻？': 1,
            '董卓曾收吕布为义子？': 1,
            '甘宁被称为江表之虎臣？': 1,
            '公孙瓒别名「白马将军」？': 1,
            '公孙瓒因数次「大破黄巾」而威名大震？': 1,
            '郭嘉被史籍称为「才策谋略，世之奇士」？': 1,
            '合肥之战中，张辽以少胜多，威震江东？': 1,
            '华佗被称为「外科鼻祖」？': 1,
            '华佗因遭曹操怀疑，下狱被铂问致死？': 1,
            '华佗与董奉、张仲景并称为「建安三神医」？': 1,
            '贾诩曾任魏国最高军事长官「太尉」？': 1,
            '贾诩为曹操帐下的主要谋士之一？': 1,
            '贾诩献离间计成功瓦解马超、韩遂？': 1,
            '民间，张飞被尊为「屠宰业祖师」？': 1,
            '民间游戏「华容道」是以三国为背景的游戏？': 1,
            '明教以张角为教祖？': 1,
            '三国时期曹操一生未称帝？': 1,
            '司马懿为曹操谋臣？': 1,
            '孙策曾「一统江东」？': 1,
            '太史慈曾为救孔融单骑突围向刘备求援？': 1,
            '太史慈弦不虚发，被称为「神射手」？': 1,
            '威振天下的董卓被吕布诛杀？': 1,
            '徐晃曾「击破关羽，解樊城之围」？': 1,
            '荀或被称为「王佐之才」？': 1,
            '颜良被关羽斩杀？': 1,
            '颜良被孔融评价「勇冠三军」？': 1,
            '袁绍战胜公孙瓒，统一河北？': 1,
            '张飞与关羽被并称为「万人敌」？': 1,
            '张角为黄巾起义首领之一？': 1,
            '著名的「官渡之战」由袁绍发起？': 1,
            '甄宓为魏文帝曹丕妻子？': 1,
            '周瑜逝世后，鲁肃代周瑜职务？': 1,
            '《三国演义》中，「过五关斩六将」的武将是关羽？': 1,
            '《三国演义》中，「火烧藤甲兵」的是诸葛亮？': 1,
            '《三国演义》中，「三英战吕布」发生在虎牢关？': 1,
            '《三国演义》中，「桃园三结义」中的桃园是张飞的住所？': 1,
            '《三国演义》中，「万事俱备，只欠东风」说的是赤壁之战？': 1,
            '《三国演义》中，被称为「诸葛村夫」的是诸葛亮？': 1,
            '《三国演义》中，曹操赤壁兵败后是曹仁率军接应的？': 1,
            '《三国演义》中，称号「卧龙」的是诸葛亮？': 1,
            '《三国演义》中，持方天画戟的武将是吕布？': 1,
            '《三国演义》中，持青龙偃月刀的武将是关羽？': 1,
            '《三国演义》中，发明「木牛流马」的是诸葛亮？': 1,
            '《三国演义》中，要为曹操做开颅手术的是华佗？': 1,
            '《三国演义》中，甄姬曾为袁绍之子袁熙的夫人？': 1,
            '「铜雀春深锁二乔」指的是火乔和小乔吗？': 1,
            '「文姬归汉」指的是蔡文姬从匈奴回到中原吗？': 1,
            '蔡文姬是被曹操赎回中原的吗？': 1,
            '黄月英是诸葛亮的妻子？': 1,
            '庞统是刘备的谋士吗？': 1,
            '三国时期，董卓曾想和孙坚结成亲家？': 1,
            '三国时期，公孙瓒和刘备是师兄弟关系？': 1,
            '三国时期，十八路诸侯讨董后，孙坚率军攻入洛阳？': 1,
            '三国时期，孙策建立了吴国？': 1,
            '三国时期，孙坚中箭而亡？': 1,
            '《出师表》是诸葛亮写给刘禅的吗？': 1,
            '《三国演义》中，「五虎上将」里没有魏延？': 1,
            '《三国演义》中，关羽，字「云长」？': 1,
            '《三国演义》中，关羽为了离开曹操的麾下，达成了「过五关，斩六将」的壮举。': 1,
            '《三国演义》中，郭嘉遗计定辽东。': 1,
            '《三国演义》中，黄忠在定军山击杀了曹魏将领夏侯渊。': 1,
            '《三国演义》中，死于「落凤坡」的名将是庞统？': 1,
            '《三国演义》中，宣称自己会「梦中杀人」的是曹操？': 1,
            '《三国演义》中，张飞的专属武器名为「丈八蛇矛」？': 1,
            '《三国演义》中，赵云曾孤胆救黄忠。': 1,
            '《三国演义》中，诸葛亮，字「孔明」？': 1,
            '《三国演义》中，诸葛亮发明了「诸葛连弩」？': 1,
            '「扶不起的阿斗」指的是刘禅？': 1,
            '「黄巾起义」被看做三国时代的开端吗？': 1,
            '「孔明灯」在古代曾用于传递军情？': 1,
            '「乐不思蜀」指的是刘禅？': 1,
            '「衣带诏」事发后曹操派军讨伐刘备？': 1,
            '曹操被评价为「治世之能臣，乱世之奸雄」。': 1,
            '典故妄自菲薄出自诸葛亮的《前出师表》？': 1,
            '汉献帝自愿禅让帝位给丞相曹丕？': 2,
            '华佗使用「麻沸散」是世界医学史上应用全身麻醉进行手术治疗的最早记载？': 1,
            '刘备曾自称「汉中王」？': 1,
            '刘备称帝后不久就亲自率军伐吴？': 1,
            '刘备少年时以织席贩履为生？': 1,
            '挟天子以令诸侯的是曹操？': 1,
            '荀或与同为曹操麾下的荀攸是叔侄关系。': 1,
            '袁术曾经称帝但最后被刘备、朱灵军截道，呕血而死？': 1,
            '在魏蜀吴三国中，吴国是最晚建立的吗？': 1,
            '诸葛亮共北伐五次，第五次时病逝于五丈原？': 1,
            '《咸鱼之王》里咸将蔡文姬只能通过开宝箱获取？': 1,
            '《咸鱼之王》里「咸神火把」的持续时间为30分钟？': 1,
            '《咸鱼之王》里「木质宝箱」每开一个可以获取1宝箱积分？': 1,
            '《咸鱼之王》里每位玩家每日可以进行三次「免费点金」？': 1,
            '《咸鱼之王》里鱼缸位于玩家的「客厅」界面内？': 1,
            '《咸鱼之王》里咸将的专属鱼都有「龙鱼」前缀。': 1,
            '《咸鱼之王》里「青铜宝箱」每次开启可以获取到10宝箱积分？': 1,
            '《咸鱼之王》里咸将分为四个阵营？': 1,
            '《咸鱼之王》里咸将貂蝉是「群雄」阵营的。': 1,
            '《咸鱼之王》里咸将貂蝉的主动技能可以减少敌人怒气值。': 1,
            '《咸鱼之王》里「灯神挑战」每天可以免费获取3个「扫荡魔毯」。': 1,
            '《咸鱼之王》里同种类盐罐同时只能占据一个。': 1,
            '《咸鱼之王》中升级俱乐部「高级科技」时需要先点满对应职业的「基础科技」。': 1,
            '《咸鱼之王》里开启「木质宝箱」有概率获取金砖。': 2,
            '《咸鱼之王》里鱼灵「惊涛」无法将受到的持续伤害效果分5回合扣除。': 1,
            '《咸鱼之王》里开启「钻石宝箱」时，不会获得宝箱积分。': 1,
            '《咸鱼之王》「捕获」玩法中，每进行十次高级捕获必出稀有鱼灵。': 1,
            '《咸鱼之王》「盐场争霸」中，可以通过消耗20金砖来加速行军。': 1,
            '《咸鱼之王》里咸将星级在达到21星时，即可获得「机甲皮肤」。': 1,
            '《咸鱼之王》里宝箱积分达1000分时，可一键领取累计积分奖励宝箱。': 1,
            '《咸鱼之王》里俱乐部团长连续7天未登录，团长职位将自动转让其他成员。': 1,
            '《咸鱼之王》里「玩具」每周有一次免费无损转换的机会。': 1,
            '《咸鱼之王》「灯神挑战」内，每个阵营中有15层可挑战的关卡。': 1,
            '《咸鱼之王》「咸神竞技场」中，每日可以免费进行3次挑战。': 1,
            '《咸鱼之王》重复攻打击杀过的「俱乐部BOSS」，无法再次获得排名奖励。': 1,
            '「孔融让梨」的故事讲的是孔融小小年纪便有谦让的美德？': 1,
            '成语「初出茅庐」出自《三国演义》？': 1,
            '「三家归晋」结束了汉末三国时期以来的割据混战的局面？': 1,
            '《三国演义》中，「虎女焉能配犬子」一句中，虎女指的是关羽之女。': 1,
            '「莫作孔明择妇，正得阿承丑女」说的是诸葛亮的择偶标准。': 1,
            '「大丈夫何患无妻」一典故出自《三国演义》中的赵云之口？': 1,
            '《咸鱼之王》中，招募界面的NPC名字是「猫婆婆」？': 1,
            '《咸鱼之王》中，「每日任务」重置时间为每日0点？': 1,
            '《咸鱼之王》中，每位玩家每日有一次免费刷新「黑市」的机会？': 1,
            '《咸鱼之王》中，每消耗20个「普通鱼竿」可以免费获取1个「黄金鱼竿」？': 1,
            '《咸鱼之王》中，副本「每日咸王考验」累计伤害奖励上限为5亿？': 1,
            '《咸鱼之王》中，道具「珍珠」可以在「神秘商店」使用？': 1,
            '《咸鱼之王》中，鱼灵「黄金锦鲤」可在「神秘商店」中消耗珍珠兑换？': 1,
            '《咸鱼之王》中，玩家每次占领「盐罐」会消耗10点「能量」': 1,
            '《咸鱼之王》中，一个「俱乐部」最多容纳30位成员？': 1,
            '《咸鱼之王》中，1个「俱乐部」最多有2位副团长？': 1,
            '《咸鱼之王》中，玩家可在「图鉴」内可查看满级咸将信息？': 1,
            '《咸鱼之王》中，「月度活动」每月刷新1次？': 1,
            '《咸鱼之王》中，「每日任务」中日活跃积分达到100的奖励为招募令？': 1,
            '《咸鱼之王》中，月度「捕获达标」活动达成相应目标后可以获得珍珠。': 1,
            '《咸鱼之王》中，咸将的四个阵营分别为魏、蜀、吴、群雄。': 1,
            '《咸鱼之王》中，除了咸将外，其余的怪物都没有职业。': 1,
            '《咸鱼之王》中，「灯神挑战」不同的阵营挑战内，只能上阵对应阵营的咸将。': 1,
            '《咸鱼之王》中，精铁可以直接用金砖购买。': 1,
            '《咸鱼之王》中，进阶石可以直接使用金砖购买。': 1,
            '《咸鱼之王》中，「招募」可以有概率获得红色武将。': 1,
            '《咸鱼之王》中，每日可以免费招募一次。': 1,
            '《咸鱼之王》中，「每日咸王考验」可以挑战多次。': 1,
            '《三国演义》中，「怒打督邮」的是张飞。': 1,
            '祝融夫人是《三国演义》虚构人物。': 1,
            '《三国演义》中，「拔矢啖睛」的是夏侯惇。': 1,
            '《三国演义》中，「曹操献刀」本是要刺杀董卓。': 1,
            '《三国演义》中，许攸被许褚所杀。': 1,
            '《咸鱼之王》中，捕获一次最多可以使用10个鱼竿。': 1,
            '《咸鱼之王》中，「咸鱼大冲关」每周任务是周一0点重置。': 1,
            '《咸鱼之王》中，挂机奖励加钟，最多可以有4名好友助力。': 1,
            '《咸鱼之王》中，「俱乐部」每日签到可以获得「军团币」？': 1,
            '《咸鱼之王》中，「黑市」每日0点自动刷新商品？': 1,
            '《咸鱼之王》中，可以使用「珍珠」兑换「万能红将碎片」？': 1,
            '《咸鱼之王》中，「咸神门票」可以通过「金砖」进行购买？': 1,
            '《咸鱼之王》中，「灯神挑战」内分为四个阵营？': 1,
            '《咸鱼之王》中，玩家的「勋章墙」内最多展示4个「徽章」？': 1,
            '《咸鱼之王》中，「主公」达到4001级开启「玩具」玩法？': 1,
            '《咸鱼之王》中，「玩具」需要花费「扳手」进行激活？': 1,
            '《咸鱼之王》中，「咸王梦境」每成功通过十层可以遇到一次梦境商人？': 1,
            '《咸鱼之王》中，挑战「咸将塔」需要花费「小鱼干」？': 1,
            '《咸鱼之王》中，「小鱼干」可以通过「金砖」进行购买？': 1,
            '《咸鱼之王》中，「招募」无法获得咸将吕玲绮。': 1,
            '《咸鱼之王》中，进阶石可以通过参与「咸将塔」玩法获取。': 1,
            '《咸鱼之王》中，「扳手」在通关主线7001关后可以通过挂机奖励获得。': 1,
            '《咸鱼之王》中，「军团币」可以用于升级「俱乐部科技」？': 1,
            '《咸鱼之王》中，装备最多可以开到5个淬炼孔位？': 1,
            '《咸鱼之王》中，「青铜火把」会为主线战斗中上阵的咸将增加5%攻击？': 1,
            '《咸鱼之王》中，「木材火把」会使主线战斗以1.5倍速进行？': 1,
            '《咸鱼之王》中，道具「金砖」可以用于在「黑市」中购买物品？': 1,
            '《咸鱼之王》中，装备中的铠甲会为咸将提供血量加成？': 1,
            '《咸鱼之王》中，红色咸将的觉醒技能需要咸将达到一定星级才能解锁。': 1,
            '《咸鱼之王》中，布阵时，前排可上阵2名咸将，后排可上阵3名咸将。': 1,
            '《咸鱼之王》竞技场中，未对防守阵容进行设置时，将默认使用主线阵容。': 1,
            '《咸鱼之王》中，「邮件」最长保存30天。': 1,
            '《咸鱼之王》中，「淬炼」可能出现的属性共21种。': 1,
            '《咸鱼之王》中，「俱乐部BOSS」被击败后会按照玩家造成的总伤害排名发放排名奖励。': 1,
            '鲁肃，字「子敬」。': 1,
            '蔡文姬，本名蔡琰？': 1,
            '「池中之物」一词出自《三国志》中周瑜之口？': 1,
            '《咸鱼之王》中，装备中的头冠会为咸将提供防御加成？': 1,
            '《咸鱼之王》中，「咸神火把」会为主线战斗中上阵的咸将增加15%攻击？': 1,
            '《咸鱼之王》中，「咸神火把」与「青铜火把」均会使主线战斗以2倍速进行？': 1,
            '《咸鱼之王》中，「扳手」可以在「黑市」中花费「金砖」获取？': 1,
            '《咸鱼之王》中，在「盐锭商店」中可以花费「盐锭」兑换到「皮肤币」？': 1,
            '《咸鱼之王》中，月赛助威截止后，未使用的「拍手器」会被回收？': 1,
            '《咸鱼之王》中，「咸鱼大冲关」单局累计答对10题可获取10个「招募令」？': 1,
            '《咸鱼之王》中，通行证「竞技经验」不需要邮件领取，直接发放给玩家？': 1,
            '《咸鱼之王》中，「俱乐部排位赛」的段位一共有7种？': 1,
            '《咸鱼之王》中，月度活动「捕获达标」达标奖励包含道具「金砖」？': 1,
            '《咸鱼之王》中，俱乐部的「团长」和「副团长」可以选择「排位赛」出战成员？': 1,
            '《咸鱼之王》中，玩家每日可在「灯神挑战」中挑战10次？': 1,
            '《咸鱼之王》中，咸将「曹仁」的职业是「肉盾」？': 1,
            '《咸鱼之王》中，咸将「蔡文姬」属于魏国阵营？': 1,
            '《咸鱼之王》中，可以通过「万能红将碎片」开出「贾诩碎片」？': 1,
            '《咸鱼之王》中，「咸王梦境」玩法在通关1000关后开放？': 1,
            '《咸鱼之王》中，「灯神挑战」中，每阵营前五层的首通奖励均为精铁和进阶石？': 1,
            '《咸鱼之王》中，「咸鱼大冲关」内累计答对30道题目可获得「金鱼公主」皮肤？': 1,
            '《咸鱼之王》中，「咸鱼大冲关」内完成20次大冲关任务可获得「马头咸鱼」皮肤？': 1,
            '《咸鱼之王》中，「金币礼包」可以通过「捕获」玩法获取？': 1,
            '《咸鱼之王》中，可以通过「图鉴」查看咸将满级后的技能效果？': 1,
            '《咸鱼之王》中，攻打「每日咸王考验」内的「癫癫蛙」BOSS可获得招募令。': 1,
            '《三国演义》中，「大丈夫生于乱世，当带三尺剑立不世之功」，是太史慈所说。': 1,
            '《咸鱼之王》中，「咸将塔」每通关第10层，会给10个「小鱼干」。': 1,
            '《咸鱼之王》中，「每日咸王考验」有10层伤害达标奖励。': 1,
            '《咸鱼之王》中，「巅峰竞技场」前100名，可登上「巅峰王者榜」。': 1,
            '《咸鱼之王》中，激活「终身卡」，可以使挂机时间增加2小时。': 1,
            '《咸鱼之王》中，激活「月卡」，可以使挂机时间增加2小时。': 1,
            '《咸鱼之王》中，「咸神竞技场」内共分为六个段位。': 1,
            '《咸鱼之王》中，「灯神挑战」每日0点刷新挑战次数。': 1,
            '《咸鱼之王》中，若「签到」当日登录未领取，后续登录时可以一并领取。': 1,
            '《咸鱼之王》中，激活「终身卡」，挂机金币收益增加10%。': 1,
            '《咸鱼之王》中，激活「周卡」，挂机金币收益增加10%。': 1,
            '《咸鱼之王》中，「签到」领取30次奖励内容后，奖励内容会进行刷新。': 1,
            '《咸鱼之王》中，咸将装备的等级无法超「主公阿咸」的等级。': 1,
            '《咸鱼之王》中，开启「金币礼包」获取的金币与挂机奖励有关。': 1,
            '《咸鱼之王》中，挑战「咸将塔」消耗的小鱼干在通过当前塔后会获得10个。': 1,
            '《咸鱼之王》中，「梦魇水晶」的属性需要佩戴咸将达到701级才会生效。': 1,
            '《咸鱼之王》中，咸将达到700级并进阶后可以激活自身全部基础技能。': 1
        };

        await executeDailyTaskWrapper('答题领奖', async function (iso) {
            const data = await iso.StudyService.startGame({})
            const gameData = data.getData()
            const questionList = gameData.questionList
            for (let idx = 0; idx < questionList.length; idx++) {
                const question = questionList[idx]
                let answer = tiku[question.question]
                if (!answer) {
                    answer = 2 // 不在题库中的问题默认选2
                }
                await iso.StudyService.answer({
                    id: gameData.role.study.id,
                    option: [answer],
                    questionId: [question.id]
                })
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            for (let rewardId = 1; rewardId <= 10; rewardId++) {
                await iso.StudyService.claimReward({
                    rewardId: rewardId
                })
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        });
    }

    async function executeClaimTaskRewardTask() {
        await executeDailyTaskWrapper('领任务奖励', async function (iso) {
            for (const taskId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
                await iso.TaskService.claimDailyPoint({ taskId: taskId })
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            await iso.TaskService.claimDailyReward({ rewardId: 0 })
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iso.TaskService.claimWeekReward({ rewardId: 0 })
        });
    }

    async function executeFriendGoldTask() {
        await executeDailyTaskWrapper('领取和赠送好友金币', async function (iso) {
            await iso.FriendService.batch({ friendId: 0 })
        });
    }

    async function executeAutoTowerTask() {
        await executeDailyTaskWrapper('自动爬塔', async function (iso, role, main, account) {
            if (!main) {
                return
            }
            if (role.levelId <= 50) {
                return
            }
            await iso.TowerService.getInfo({})
            for (let counter = 0; counter <= 30; counter++) {
                if (role.tower.energy <= 0) {
                    break
                }
                if (role.tower.id % 10 == 0) {
                    const rewardId = role.tower.id / 10
                    if (!role.tower.reward[rewardId]) {
                        logMessage(`${account}领取咸将塔第${rewardId}-10层通关奖励`)
                        await iso.TowerService.claimReward({ rewardId: rewardId })
                    }
                }
                if (role.tower.id >= 4500) {
                    return
                }
                const towerIdx = Math.floor(role.tower.id / 10) + 1
                const layerIdx = (role.tower.id + 1) % 10 || 10
                logMessage(
                    `${account}挑战咸将塔第${towerIdx}-${layerIdx}层, 体力: ${
                        role.tower.energy
                    } => ${role.tower.energy - 1}`
                )
                await iso.FightService.startTower({})
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        });
    }

    async function executeAutoBottleTask() {
        await executeDailyTaskWrapper('自动续罐子', async function (iso) {
            await iso.BottleHelperService.stop({ bottleType: -1 })
            await iso.BottleHelperService.start({ bottleType: -1 })
        });
    }

    async function executeAutoCollectTask() {
        await executeDailyTaskWrapper('自动收罐子', async function (iso) {
            await iso.BottleHelperService.claim({})
        });
    }

    async function executeAutoHarvestTask(count = 5) {
        await executeDailyTaskWrapper('自动收菜加钟', async function (iso) {
            await iso.SystemService.claimHangUpReward({})
            for (let i = 0; i < count; i++) {
                await iso.SystemService.myShareCallback({
                    isSkipShareCard: true,
                    type: 2
                })
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        });
    }

    // 6. 构建UI
    function buildUI() {
        document.getElementById('arenaToggleBtn')?.remove();
        document.getElementById('arenaMainPanel')?.remove();
        
        // 切换按钮
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'arenaToggleBtn';
        const toggleDogIcon = document.createElement('span');
        toggleDogIcon.textContent = '🐶';
        toggleDogIcon.style.cssText = `
            font-size: 24px; transition: transform 0.3s ease;
            display: inline-block; cursor: pointer;
        `;
        uiElements.toggleDogIcon = toggleDogIcon;
        toggleBtn.appendChild(toggleDogIcon);
        
        toggleBtn.style.cssText = `
            position: fixed; top: ${config.position.toggleBtn.top}px; right: ${config.position.toggleBtn.right}px;
            background: transparent; border: none; box-shadow: none;
            padding: 6px; border-radius: 8px; z-index: ${config.ui.zIndex};
            display: flex; align-items: center; justify-content: center; min-width: 40px;
            color: ${config.ui.colors.text}; cursor: pointer;
        `;
        
        // 主面板
        const mainPanel = document.createElement('div');
        mainPanel.id = 'arenaMainPanel';
        uiElements.mainPanel = mainPanel;
        mainPanel.style.cssText = `
            position: fixed; top: ${config.position.panel.top}px; right: ${config.position.panel.right}px;
            width: ${config.ui.baseWidth}px; min-width: ${config.ui.minWidth}px; 
            background: ${config.ui.colors.dark}; border: 1px solid ${config.ui.colors.textLight};
            border-radius: 12px; padding: 8px; z-index: ${config.ui.zIndex - 1};
            box-shadow: ${config.ui.shadows.panel}; display: ${config.isPanelVisible ? 'block' : 'none'};
            max-height: 420px; overflow-y: auto;
            transition: background 0.2s ease, border-color 0.2s ease;
        `;
        
        // 标题栏
        const panelHeader = document.createElement('div');
        panelHeader.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            margin: 0 0 6px 0;
        `;
        const panelTitle = document.createElement('h3');
        panelTitle.style.cssText = `
            margin: 0; color: ${config.ui.colors.primary}; font-size: 14px;
            font-family: 'Microsoft YaHei', sans-serif; display: flex; align-items: center; gap: 6px;
        `;
        const titleDogIcon = document.createElement('span');
        titleDogIcon.textContent = '🐶';
        titleDogIcon.style.cssText = `font-size: 14px;`;
        panelTitle.appendChild(titleDogIcon);
        panelTitle.appendChild(document.createTextNode('花狗助手'));
        
        // 透明度调节
        const opacityControl = document.createElement('div');
        opacityControl.style.cssText = `
            display: flex; align-items: center; gap: 6px; flex: 1; margin-left: 10px;
        `;
        const opacityLabel = document.createElement('span');
        opacityLabel.textContent = '透明度';
        opacityLabel.style.cssText = `
            font-size: 9px; color: ${config.ui.colors.textLight}; white-space: nowrap;
        `;
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = config.ui.minOpacity * 100;
        opacitySlider.max = 100;
        opacitySlider.value = config.ui.defaultOpacity * 100;
        opacitySlider.style.cssText = `
            flex: 1; height: 6px; appearance: none;
            background: ${config.ui.colors.textLight}; border-radius: 3px; outline: none;
        `;
        opacitySlider.style.setProperty('-webkit-appearance', 'none');
        opacitySlider.style.setProperty('::-webkit-slider-thumb', `
            -webkit-appearance: none; width: 12px; height: 12px;
            border-radius: 50%; background: ${config.ui.colors.primary}; cursor: pointer;
        `);
        uiElements.opacitySlider = opacitySlider;
        opacitySlider.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value) / 100;
            adjustUIOpacity(opacity);
        });
        opacityControl.appendChild(opacityLabel);
        opacityControl.appendChild(opacitySlider);
        panelHeader.appendChild(panelTitle);
        panelHeader.appendChild(opacityControl);
        mainPanel.appendChild(panelHeader);
        
        // 模块选项卡+内容
        createModuleTabs(mainPanel);
        const contentArea = document.createElement('div');
        contentArea.appendChild(createDailyTaskModule());
        contentArea.appendChild(createResourceModule());
        contentArea.appendChild(createArenaStarModule());
        contentArea.appendChild(createVehicleModule());
        mainPanel.appendChild(contentArea);
        
        // 日志区域
        const logContainer = document.createElement('div');
        logContainer.style.cssText = `margin-top: 6px; display: flex; flex-direction: column; gap: 4px;`;
        const logHeader = document.createElement('div');
        logHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center;`;
        const logTitle = document.createElement('div');
        logTitle.textContent = '日志';
        logTitle.style.cssText = `font-size: 10px; color: ${config.ui.colors.warning}; font-weight: 500;`;
        const clearLogBtn = createButton('清');
        clearLogBtn.style.padding = '2px 5px';
        clearLogBtn.style.fontSize = '9px';
        clearLogBtn.addEventListener('click', () => {
            document.getElementById('arenaLogContainer').innerHTML = '';
            logMessage('日志清');
        });
        logHeader.appendChild(logTitle);
        logHeader.appendChild(clearLogBtn);
        const logContent = document.createElement('div');
        logContent.id = 'arenaLogContainer';
        logContent.style.cssText = `
            height: 80px; overflow-y: auto; background: ${config.ui.colors.lightDark}30;
            border-radius: 6px; padding: 4px; font-size: 9px; word-wrap: break-word; white-space: normal;
        `;
        logContainer.appendChild(logHeader);
        logContainer.appendChild(logContent);
        mainPanel.appendChild(logContainer);
        
        // 点击事件
        toggleBtn.addEventListener('click', (e) => {
            togglePanel();
        });
        
        // 初始化透明度
        adjustUIOpacity(config.ui.defaultOpacity);
        
        // 添加到页面
        document.body.appendChild(toggleBtn);
        document.body.appendChild(mainPanel);
        
        // 初始化日志
        setTimeout(() => {
            logMessage('🐶<花狗助手就绪（四大模块：每日任务+资源并行+竞技升星+车辆助手+灯神扫荡）');
            showTip('花狗助手就绪', 'success');
        }, 300);
    }

    // 7. 初始化
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', buildUI);
        } else {
            buildUI();
        }
    }
    init();
})();
