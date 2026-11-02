import { Color, Graphics, Label, Node, UITransform, Vec3 } from 'cc';
import { Troop, Upgrade } from './config/GameplayTypes';
import { COL, NAMES } from './config/GameplayConfig';
import { cardName, drawCardChoices } from './cards/CardCatalog';
import { drawBattle } from './view/BattlePainter';
import { BattleController } from './systems/BattleController';

export class MainGameplayPage extends BattleController {
    private ui!:Node; private g!:Graphics; private hud!:Label; private detail!:Label;
    private hint!:Label; private message!:Label; private action!:Label;
    private slotLabels:Label[]=[]; private cards:Node[]=[];
    onLoad() {
        for(const child of [...this.node.children]) if(child.name!=='Camera') child.active=false;
        this.ui=new Node('DefenseDemoUI'); this.node.addChild(this.ui);
        this.ui.addComponent(UITransform).setContentSize(1280,720);
        this.g=this.ui.addComponent(Graphics);
        this.label(this.ui,'领主城堡 · 守城演示',-418,316,400,44,30,COL.gold);
        this.hud=this.label(this.ui,'',182,316,730,42,21);
        this.detail=this.label(this.ui,'',-160,268,830,36,19,COL.muted);
        this.label(this.ui,'敌种：人 · 哥布林 · 兽人 · 精灵 · 魔物 · 龙',-160,229,790,30,16,COL.muted);
        this.label(this.ui,'尖塔部署',468,275,280,42,27,COL.gold);
        this.label(this.ui,'点击尖塔，再选择兵种',468,239,280,38,17,COL.muted);
        [-390,-210,-30,150].forEach((x,i)=>{
            const b=this.button(this.ui,'Slot'+i,x,-211,150,72,COL.panel,'',()=>{
                this.selected=i; this.refresh();
            });
            this.slotLabels.push(b.label);
        });
        (['archer','mage','guard'] as Troop[]).forEach((t,i)=>{
            this.button(this.ui,t,468,175-i*65,252,54,COL[t],NAMES[t],()=>{
                if(this.phase==='battle'||this.phase==='win'||this.phase==='lose') return;
                this.slots[this.selected]=t; this.refresh();
                this.soldiers=this.soldiers.filter(s=>this.slots[s.slot]==='guard');
            });
        });
        this.button(this.ui,'Clear',468,-32,252,43,COL.line,'清空当前尖塔',()=>{
            if(this.phase==='battle'||this.phase==='win'||this.phase==='lose') return;
            this.slots[this.selected]=null; this.refresh();
            this.soldiers=this.soldiers.filter(s=>this.slots[s.slot]==='guard');
        });
        this.label(this.ui,'宠物（预留）',468,-91,270,34,21,COL.muted);
        this.label(this.ui,'猫 · 暴击    狗 · 攻速    猪 · 血量\n当前不生效',468,-137,270,61,17,COL.muted);
        this.hint=this.label(this.ui,'',468,-217,278,47,17,COL.muted);
        this.action=this.button(this.ui,'Action',468,-287,252,64,COL.gold,'',()=>this.onAction()).label;
        this.message=this.label(this.ui,'',-160,34,800,80,30,COL.gold);
        this.refresh();
    }

    update(dt:number) {
        const size=this.node.getComponent(UITransform)?.contentSize;
        if(size) { const s=Math.min(size.width/1280,size.height/720); this.ui.setScale(new Vec3(s,s,1)); }
        if(this.phase==='battle') this.tick(Math.min(dt,.05));
        for(const shot of this.shots) shot.time-=dt;
        this.shots=this.shots.filter(s=>s.time>0);
        this.draw();
        this.hud.string=`第 ${this.wave} / 20 波     城堡 ${Math.ceil(this.hp)} / ${this.maxHp}     击杀 ${this.kills}`;
        this.detail.string=this.phase==='battle' ? `敌人 ${this.enemies.length+this.total-this.spawned} · 已生成 ${this.spawned}/${this.total}${this.enemies.some(e=>e.boss)?' · 最终 BOSS 来袭！':''}` :
            this.phase==='ready' ? '配置四座尖塔，然后开始守城' : this.phase==='upgrade' ? '选择一项升级，进入下一波' :
            this.phase==='win' ? '20 波全部击退' : '城堡已被攻破';
    }

    private label(parent:Node,value:string,x:number,y:number,w:number,h:number,size:number,color=COL.text):Label {
        const n=new Node('Text'); parent.addChild(n); n.setPosition(x,y);
        n.addComponent(UITransform).setContentSize(w,h);
        const l=n.addComponent(Label); l.string=value; l.fontSize=size; l.lineHeight=size+6;
        l.color=color; l.horizontalAlign=Label.HorizontalAlign.CENTER;
        l.verticalAlign=Label.VerticalAlign.CENTER; l.overflow=Label.Overflow.SHRINK;
        return l;
    }
    private button(parent:Node,name:string,x:number,y:number,w:number,h:number,color:Color,value:string,click:()=>void) {
        const n=new Node(name); parent.addChild(n); n.setPosition(x,y);
        n.addComponent(UITransform).setContentSize(w,h);
        const g=n.addComponent(Graphics); g.fillColor=color; g.roundRect(-w/2,-h/2,w,h,11); g.fill();
        const label=this.label(n,value,0,0,w-14,h-7,20);
        n.on(Node.EventType.TOUCH_END,click,this);
        return {node:n,label};
    }
    protected refresh() {
        this.slotLabels.forEach((l,i)=>{
            l.string=`${i+1}号尖塔\n${this.slots[i] ? NAMES[this.slots[i]!] : '空位'}`;
            l.color=i===this.selected ? COL.gold : COL.text;
        });
        this.action.string=this.phase==='ready' ? '开始第 1 波' : this.phase==='battle' ? '战斗进行中' :
            this.phase==='upgrade' ? '选择上方升级' : '重新开始';
        this.hint.string=this.phase==='ready' ? `已部署 ${this.slots.filter(Boolean).length}/4 个尖塔` :
            this.phase==='battle' ? (this.lastUpgrade ? `最近升级：${this.lastUpgrade}` : '尖塔自动攻击来袭敌人') :
            this.phase==='upgrade' ? (this.slots.indexOf('mage')>=0 ? `法术槽：${this.mageEquipped.map(k=>this.cardName(k)).join(' / ')||'空'}` : '同类尖塔越多，专属升级收益越高') : '';
        this.message.string=this.phase==='win' ? '守城成功！' : this.phase==='lose' ? '守城失败' : '';
        for(const card of this.cards) card.destroy(); this.cards=[];
        if(this.phase==='upgrade') this.showCards();
    }
    private onAction() {
        if(this.phase==='ready') {
            if(this.slots.some(Boolean)) this.startWave(); else this.hint.string='至少部署一个尖塔';
        } else if(this.phase==='win'||this.phase==='lose') this.reset();
    }
    private showCards() {
        this.pickUpgrades().forEach((u,i)=>{
            const replaces=u.key.startsWith('mage')&&this.mageEquipped.length===2&&
                this.mageEquipped.indexOf(u.key)<0 ? `\n替换：${this.cardName(this.mageEquipped[1])}` : '';
            const card=this.button(this.ui,'Upgrade'+i,[-420,-160,100][i],38,230,145,COL.panel,
                `${u.name}\n${u.info}${replaces}`,()=>{
                    if(u.key.startsWith('mage')) this.equipMage(u.key);
                    else {u.run();this.levels[u.key]=(this.levels[u.key]||0)+1;}
                    this.lastUpgrade=u.name; this.startWave();
                });
            card.label.fontSize=19; this.cards.push(card.node);
        });
    }
    private equipMage(key:string) {
        if(this.mageEquipped.indexOf(key)<0) {
            if(this.mageEquipped.length<2) this.mageEquipped.push(key);
            else {
                const old=this.mageEquipped[1];
                this.levels[old]=0; delete this.abilityTimers[old];
                this.mageEquipped[1]=key;
            }
        }
        this.levels[key]=(this.levels[key]||0)+1;
    }
    private cardName(key:string):string { return cardName(key); }
    private pickUpgrades():Upgrade[] {
        return drawCardChoices(this.slots,this.mageEquipped).map(card=>({
            ...card,
            run:()=>{
                switch(card.key) {
                    case 'castleHp': this.maxHp+=60;this.hp=Math.min(this.maxHp,this.hp+60);break;
                    case 'castleArmor': this.armor+=3;break;
                    case 'turretDamage': this.damage+=8;break;
                    case 'turretSpeed': this.speed++;break;
                }
            },
        }));
    }
    private draw() {
        drawBattle(this.g,{
            slots:this.slots,selected:this.selected,enemies:this.enemies,soldiers:this.soldiers,
            effects:this.effects,shots:this.shots,phase:this.phase,levels:this.levels,
            hp:this.hp,maxHp:this.maxHp,
        });
    }
}
