下面这段你直接**整段复制到 Cursor**（作为一个任务/Prompt）即可：

---

**Cursor 指令（复制即可）：**

你现在作为我的代码助手，在微信小游戏项目里实现一个 PVE 版本“狙击 + 躲藏”小游戏（原生 Canvas + TypeScript，沿用现有 SceneManager/GameBridge 架构，不引入任何新框架）。目标是先把单人对战 AI 的闭环做出来，后续可无缝替换为 PVP 回合制同步。

### 约束

* 不改现有架构：SceneManager / GameBridge 保持
* 不引入任何 UI/前端框架
* 逻辑与渲染分离（gameplay vs render）
* 所有坐标统一用 world/canvas 坐标（先不做复杂相机）

### 核心玩法（必须实现）

1. 墙体遮挡：墙为一个固定矩形区域（wallRect），所有射击都落在墙面坐标上
2. 准星瞄准：玩家可按下拖动准星（支持 pointer down/move/up），准星限制在 wallRect 内
3. 每回合 3 发：shotsLeft=3，点击“开火”或在 wallRect 点击即开火（你选一种并实现）
4. 命中判定：AI 躲藏方拥有两个 hitbox（head circle + body circle）

   * 命中 head => 立即胜利（本回合结束）
   * 命中 body => 本回合胜利（结束）
   * miss => 扣一发，3 发全 miss => 本回合失败
5. 弹孔持久化：每次开火无论是否命中都在墙上留下 bullet hole（圆形），holes[] 会跨回合累积
6. AI 逻辑（先做简单但可调）：AI 每回合随机/采样生成一个 pose（head/body）位置，并尽量避开已存在弹孔密集区域（避免 head/body 落在洞附近）

### 你需要交付的内容（必须）

A. 新增/修改的文件清单（路径 + 作用）
B. Scene 级状态机设计（Phase：RoundIntro / PlayerAiming / ShotResolve / RoundEnd）
C. 关键模块划分（建议你就按以下拆）：

* gameplay/RoundState：回合状态（phase、shotsLeft、result、roundIndex）
* gameplay/WallMask：holes 管理 + openness 查询（用于 AI 避洞）
* gameplay/Hitboxes：Pose(head/body circles) + hitTest
* gameplay/AimController：准星拖动逻辑
* gameplay/PveAI：选位策略（采样 N 次，选 openness 最低的候选）
* render/SniperRenderer：画墙、洞、准星、可选的调试显示（画 head/body 轮廓，支持开关）
* scenes/SniperPveScene：整合状态机、输入、发射、结算、进入下一回合

D. 具体实现要求

1. 弹孔：Hole={x,y,r}；maxHoles=200~300；超过就 shift
2. opennessForCircle(cx,cy,r)：用边界采样 12~16 点估算圆周“被洞覆盖”的比例，返回 0..1
3. AI 选位：在 wallRect 内随机采样 tries=40 次候选 headCenter；bodyCenter=head+(0,bodyOffsetY)；

   * head/body 必须完整落在 wallRect 内
   * 评分 = openness(head)*w1 + openness(body)*w2 + 与最近洞的惩罚（越近越差）
   * 选评分最小的 pose
4. 发射处理：

   * fire(x,y): holes.addHole({x,y,r:holeR})
   * hit = hitTestPose(pose,x,y)
   * 根据 hit 更新 result 和 phase、shotsLeft
5. 结算：RoundEnd 停留 0.8~1.2s 显示结果，然后 nextRound() 重置 shotsLeft=3、result=none、AI.pickPose()，进入 PlayerAiming
6. 输入：pointer down/move/up 控制准星；pointer tap 或按钮触发 fire（你决定一种最简方案）

E. 最小可玩 MVP 标准

* 打开这个 Scene 能玩：拖准星，点射，3 发内命中头/身有不同结果，墙上洞会一直留下，AI 每回合换位置且会越来越难

### 现在开始执行

1. 先扫描我的项目结构，找到 SceneManager/GameBridge 的用法和现有 Scene 示例
2. 给出最终文件清单与结构
3. 直接写代码实现（确保可编译运行）
4. 提供一个 debug 开关：显示 AI 的 head/body hitbox 轮廓（用于调参）
5. 所有可调参数集中在一个 config 对象里（holeR、headR、bodyR、tries、bodyOffsetY、phaseDelay 等）

完成后告诉我：入口 Scene 怎么切换进去、以及我应该在哪些参数上先调手感。
