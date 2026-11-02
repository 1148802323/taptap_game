import { Troop } from '../config/GameplayTypes';

export type CardSpec = { troop:Troop|'castle'|'turret'; key:string; name:string; info:string };

export const CARD_CATALOG:CardSpec[] = [
    {troop:'castle',key:'castleHp',name:'城堡加固',info:'生命上限 +60\n恢复 60'},
    {troop:'castle',key:'castleArmor',name:'城墙护甲',info:'每次承伤 -3'},
    {troop:'turret',key:'turretDamage',name:'通用尖塔 · 火力',info:'全部攻击伤害 +8'},
    {troop:'turret',key:'turretSpeed',name:'通用尖塔 · 急速',info:'全部攻速 +13%'},
    {troop:'archer',key:'archerPierce',name:'游侠',info:'箭矢穿透 +1'},
    {troop:'archer',key:'archerPoison',name:'淬毒',info:'直伤 50%，毒层 +10%'},
    {troop:'archer',key:'archerRain',name:'箭雨',info:'范围攻击，半径 +10'},
    {troop:'archer',key:'archerCrit',name:'会心',info:'暴击 +10%，暴伤 +20%'},
    {troop:'archer',key:'archerHunter',name:'猎人',info:'击杀后留下捕兽夹'},
    {troop:'archer',key:'archerBirdgun',name:'鸟枪',info:'箭矢伤害 +50%'},
    {troop:'archer',key:'archerComrades',name:'袍泽',info:'弹道 +1，塔上增一人'},
    {troop:'archer',key:'archerSwift',name:'迅捷',info:'攻速 +100%'},
    {troop:'mage',key:'mageLightningBolt',name:'落雷',info:'每 0.2 秒雷击，数量 +1'},
    {troop:'mage',key:'mageLightningMark',name:'印记',info:'雷击连锁，印记 +1'},
    {troop:'mage',key:'mageLightningBall',name:'球状闪电',info:'每 5 秒生成，数量 +1'},
    {troop:'mage',key:'mageLightningNature',name:'自然雷霆',info:'每 5 秒雷击高血量敌人'},
    {troop:'mage',key:'mageFireIgnite',name:'引燃',info:'燃烧持续时间 +1 秒'},
    {troop:'mage',key:'mageFireball',name:'豪火球',info:'范围和伤害 +30%'},
    {troop:'mage',key:'mageFireMeteor',name:'陨星',info:'巨额伤害与火坑，数量 +1'},
    {troop:'mage',key:'mageFireExplode',name:'引爆',info:'5 秒燃烧引爆并传播'},
    {troop:'mage',key:'mageIceFreeze',name:'冰封',info:'每 5 次攻击冻结，时间 +0.5 秒'},
    {troop:'mage',key:'mageIceShatter',name:'碎冰',info:'冻结击杀溅射，范围 +30%'},
    {troop:'mage',key:'mageIceStatue',name:'冰雕',info:'减速叠满后化为冰雕'},
    {troop:'mage',key:'mageIceSnowman',name:'堆个雪人',info:'每 5 秒生成，数量 +1'},
    {troop:'mage',key:'mageLightHeal',name:'圣光',info:'每 5 秒治疗士兵和城墙'},
    {troop:'mage',key:'mageLightBeam',name:'光线',info:'持续发射穿透光线'},
    {troop:'mage',key:'mageLightRefraction',name:'折射',info:'光线额外折射 +1 次'},
    {troop:'mage',key:'mageLightBlessing',name:'神圣庇佑',info:'每 30 秒免疫一次致命伤'},
    {troop:'guard',key:'guardGrain',name:'精粮',info:'士兵持续回血 +50%'},
    {troop:'guard',key:'guardFrenzy',name:'狂化',info:'攻速与伤害 +20%'},
    {troop:'guard',key:'guardPolicy',name:'政策优待',info:'生成速度 +30%'},
    {troop:'guard',key:'guardPopulation',name:'人口红利',info:'每塔可生成士兵 +1'},
    {troop:'guard',key:'guardArmor',name:'甲胄',info:'士兵减伤 30%，再 +3%'},
    {troop:'guard',key:'guardOrc',name:'兽人',info:'全屏出击，击杀回血'},
    {troop:'guard',key:'guardTurtle',name:'缩头乌龟',info:'守城反伤，士兵无敌'},
    {troop:'guard',key:'guardGang',name:'群殴',info:'全队集火，同伴增伤'},
];

export function cardName(key:string):string { return CARD_CATALOG.find(card=>card.key===key)?.name||key; }

export function drawCardChoices(slots:(Troop|null)[],mageEquipped:string[]):CardSpec[] {
    const available=CARD_CATALOG.filter(card=>{
        if(card.troop==='castle'||card.troop==='turret') return true;
        if(slots.indexOf(card.troop)<0) return false;
        if(card.key!=='mageLightRefraction') return true;
        return mageEquipped.indexOf('mageLightBeam')>=0&&
            (mageEquipped.length<2||mageEquipped[0]==='mageLightBeam'||mageEquipped.indexOf('mageLightRefraction')>=0);
    }).map(card=>({card,weight:card.troop==='castle'||card.troop==='turret'?1:
        1+slots.filter(slot=>slot===card.troop).length}));
    const choices:CardSpec[]=[];
    while(choices.length<3&&available.length) {
        let roll=Math.random()*available.reduce((total,item)=>total+item.weight,0);
        let index=available.findIndex(item=>(roll-=item.weight)<=0);
        if(index<0) index=available.length-1;
        choices.push(available.splice(index,1)[0].card);
    }
    return choices;
}
