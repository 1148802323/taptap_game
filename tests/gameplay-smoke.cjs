const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const project = path.resolve(__dirname, '..');
const loaded = new Map();
class Color { constructor(r, g, b, a = 255) { Object.assign(this, { r, g, b, a }); } }
const cc = { _decorator: { ccclass: () => target => target }, Color, Component: class {} };

function load(relativePath) {
    const file = path.resolve(project, 'assets', relativePath);
    if (loaded.has(file)) return loaded.get(file).exports;
    const module = { exports: {} };
    loaded.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
    }).outputText;
    const localRequire = request => request === 'cc' ? cc : load(path.relative(path.join(project, 'assets'), path.resolve(path.dirname(file), request + '.ts')));
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
}

const { MainGameplayPage } = load('scripts/gameplay/MainGameplayPage.ts');
const { drawCardChoices } = load('scripts/gameplay/cards/CardCatalog.ts');
function game(slots) {
    const instance = new MainGameplayPage();
    instance.refresh = () => {};
    instance.slots = slots;
    return instance;
}
function enemy(x, y, hp = 1000) {
    return { x, y, hp, max: hp, speed: 0, damage: 0, color: new Color(0, 0, 0), slow: 0,
        boss: false, attacksSoldiers: true, attackTimer: 0 };
}

const guard = game(['guard', null, null, null]);
guard.startWave();
assert.equal(guard.soldiers.length, 3);
assert.ok(guard.soldiers.every(soldier => soldier.y === -285));
guard.enemies = [enemy(-440, -90), enemy(-390, -90), enemy(-340, -90)];
guard.tickSoldiers(.05);
assert.equal(new Set(guard.soldiers.map(soldier => soldier.target)).size, 3);
guard.levels.guardGang = 1;
guard.tickSoldiers(.05);
assert.equal(new Set(guard.soldiers.map(soldier => soldier.target)).size, 1);

const archer = game(['archer', null, null, null]);
const target = enemy(-390, -100);
archer.enemies = [target];
archer.fireArcher(0, target);
assert.equal(target.hp, 990);
assert.ok(drawCardChoices(archer.slots, []).every(card => ['archer', 'castle', 'turret'].includes(card.troop)));

const mage = game(['mage', null, null, null]);
mage.equipMage('mageLightningBolt');
mage.equipMage('mageFireball');
mage.equipMage('mageIceFreeze');
assert.deepEqual([...mage.mageEquipped], ['mageLightningBolt', 'mageIceFreeze']);
assert.equal(mage.levels.mageFireball, 0);

function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
}
const originalRandom = Math.random;
Math.random = seededRandom(42);
try {
    for (const slots of [
        ['archer', 'archer', 'archer', 'archer'],
        ['archer', 'mage', 'guard', 'archer'],
    ]) {
        const run = game(slots);
        for (let wave = 1; wave <= 20; wave++) {
            run.startWave();
            let steps = 0;
            while (run.phase === 'battle' && steps++ < 4000) run.tick(.05);
            assert.ok(steps < 4000, `wave ${wave} stalled`);
            assert.notEqual(run.phase, 'lose', `wave ${wave} lost`);
            if (wave < 20) {
                assert.equal(run.phase, 'upgrade');
                const choices = run.pickUpgrades();
                assert.equal(choices.length, 3);
                const priorities = ['archerSwift', 'archerComrades', 'archerBirdgun', 'turretDamage',
                    'mageLightningBolt', 'mageFireMeteor', 'guardPopulation', 'castleHp', 'castleArmor'];
                const chosen = priorities.map(key => choices.find(card => card.key === key)).find(Boolean) || choices[0];
                if (chosen.key.startsWith('mage')) run.equipMage(chosen.key);
                else { chosen.run(); run.levels[chosen.key] = (run.levels[chosen.key] || 0) + 1; }
            }
        }
        assert.equal(run.phase, 'win');
    }
} finally { Math.random = originalRandom; }

console.log('Gameplay smoke checks passed.');
