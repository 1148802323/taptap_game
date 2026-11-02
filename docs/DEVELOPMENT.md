# 开发与验证

## 本地环境

- Cocos Creator 3.8.8
- Node.js 与 npm
- `npm ci` 安装锁定的 TypeScript 开发依赖

先用 Creator 打开工程，使其生成 `temp/tsconfig.cocos.json`。随后运行：

```sh
npm run typecheck
npm run test:smoke
```

`typecheck` 使用 `--skipLibCheck`，因为 Creator 自带引擎声明包含与本项目无关的外部类型缺口；项目脚本仍接受完整类型检查。`test:smoke` 不依赖渲染器，验证核心战斗推进和卡牌选择。

## 编辑器验收

1. 打开 `assets/game.scene` 并预览，确认战场、城堡、四尖塔及状态栏都可见。
2. 分别部署弓箭手、魔法师、近卫兵；确认四个位置可独立改配，战斗中不能改配。
3. 观察近卫兵从塔内出发、分散索敌、受伤和血条；选“群殴”后观察集火。
4. 打完一波，检查只出现有效卡牌，选择后进入下一波并能看到效果。
5. 用多种配置完成或失败一局，确认第 20 波 Boss 与两类结算、重新开始。
6. 缩放预览窗口，确认页面仍能完整显示。

## 资源与提交

`library/`、`temp/`、`build/`、`profiles/`、`node_modules/` 和 `.creator/` 是本地生成目录，不提交。保留所有已提交的 `.meta` 文件；`game.scene.meta` 和 `TapGameDemo.ts.meta` 尤其用于维持现有场景与入口脚本绑定。

改动战斗规则时，先更新测试和玩法文档，再进行编辑器预览；仅靠脚本测试不能验证按钮命中区和视觉层级。
