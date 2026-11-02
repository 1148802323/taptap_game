# 主玩法页面架构

## 入口与场景

`assets/game.scene` 的 Canvas 只保留 Camera 与原有脚本组件。`assets/TapGameDemo.ts` 保留场景绑定的类名和资源 UUID，继承 `MainGameplayPage`。不要直接删除或改名这个入口；如果重建场景绑定，需要同步检查 UUID。

运行时由 `MainGameplayPage` 创建占位 UI。它处理尖塔选择、按钮、HUD 与升级卡牌，战斗规则位于 `BattleController`。未来改成美术资源或 Prefab 时，可替换页面与 `BattlePainter`，战斗状态和卡牌定义无需一起迁移。

## 模块职责

| 模块 | 职责 | 修改场景 |
| --- | --- | --- |
| `config/GameplayTypes.ts` | 敌人、士兵、升级和特效的数据结构 | 新增状态字段 |
| `config/GameplayConfig.ts` | 战场尺寸、位置、颜色、基础敌种 | 调整固定规则与占位数值 |
| `cards/CardCatalog.ts` | 卡牌名称、说明、兵种限制、三选一抽取 | 新增或调整候选卡 |
| `systems/BattleController.ts` | 波次推进、目标分配、伤害、持续效果、胜负 | 实现卡牌效果或怪物行为 |
| `view/BattlePainter.ts` | 绘制城堡、单位、范围和状态 | 更换视觉表现 |
| `MainGameplayPage.ts` | 页面生命周期、交互、卡牌应用和 HUD | 调整主页面布局 |

## 一帧的流程

`MainGameplayPage.update()` 调用战斗更新，再交给 `BattlePainter` 绘制。战斗更新依次处理刷怪、持续状态、场地效果、魔法技能、士兵补充、怪物行动、士兵行动、尖塔攻击，最后判断波次是否结束。结束后展示从当前部署兵种、城堡和通用尖塔组成的有效卡池中抽出的三张卡。

## 增加卡牌

1. 在 `CardCatalog.ts` 加卡牌元数据和兵种归属。
2. 在 `BattleController.ts` 读取该卡牌等级并实现效果。城堡或通用尖塔的即时效果可在 `MainGameplayPage.pickUpgrades()` 中处理。
3. 如果需要新状态，先扩展 `GameplayTypes.ts`；如果需要新特效，再扩展 `BattlePainter.ts`。
4. 更新 `GAMEPLAY.md` 与 `tests/gameplay-smoke.cjs`，运行类型检查及流程测试。

`CardCatalog.ts` 只决定卡牌能否出现和如何抽取；实际战斗效果由系统处理，避免在卡牌说明中埋规则。
