# 城堡守卫：主玩法页面基础

基于 **Cocos Creator 3.8.8** 的塔防肉鸽玩法原型。`assets/game.scene` 是当前主玩法场景：四座尖塔配置兵种，守住 20 波来袭敌人，在每波结束后从有效卡池中选择一项升级，击败最终 Boss 后结算。

## 运行

1. 使用 Cocos Creator 3.8.8 打开本目录。
2. 在资源管理器打开 `assets/game.scene`，点击预览。
3. 点击尖塔位置并选择弓箭手、魔法师或近卫兵，再点击“开始第 1 波”。

页面目前使用代码绘制的占位图形。宠物与掉落物保留策划接口，尚未接入正式系统。

## 项目结构

```text
assets/
  game.scene                         主玩法场景
  TapGameDemo.ts                     场景绑定入口，保留原脚本 UUID
  scripts/gameplay/
    MainGameplayPage.ts              页面交互、HUD、卡牌选择
    config/GameplayTypes.ts          战斗与页面类型
    config/GameplayConfig.ts         场地、兵种与怪物基础配置
    cards/CardCatalog.ts             卡牌元数据、候选池和抽取
    systems/BattleController.ts      波次、索敌、攻击、状态与结算
    view/BattlePainter.ts            战场和单位的占位绘制
docs/
  ARCHITECTURE.md                    模块边界和扩展方法
  GAMEPLAY.md                        当前已实现的规则与策划约定
  DEVELOPMENT.md                     开发、验证和提交说明
tests/gameplay-smoke.cjs             关键战斗流程测试
```

## 验证

首次运行先执行 `npm ci`。Cocos Creator 打开工程后会生成 `temp/tsconfig.cocos.json`，然后执行：

```sh
npm run typecheck
npm run test:smoke
```

测试覆盖士兵分散索敌、群殴集火、基础箭矢伤害、魔法师两槽替换及 20 波流程。画面和手感还需按 [开发检查清单](docs/DEVELOPMENT.md) 在编辑器中预览确认。

## 文档

- [架构与扩展](docs/ARCHITECTURE.md)
- [玩法规则](docs/GAMEPLAY.md)
- [开发与验证](docs/DEVELOPMENT.md)
