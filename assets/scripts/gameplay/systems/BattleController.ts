import { Component } from 'cc';
import { Enemy, GroundEffect, PetBonuses, Phase, Shot, Soldier, Troop } from '../config/GameplayTypes';
import { COL, KINDS, SLOT_X, SOLDIER_ATTACK_RANGE, SOLDIER_FIELD_TOP, SOLDIER_SPAWN_Y } from '../config/GameplayConfig';

export abstract class BattleController extends Component {
    protected phase:Phase='ready'; protected wave=0; protected hp=300; protected maxHp=300;
    protected slots:(Troop|null)[]=['archer',null,null,null]; protected selected=0;
    protected enemies:Enemy[]=[]; protected spawned=0; protected total=0; protected spawnTimer=0;
    protected cooldown=[0,0,0,0]; protected levels:Record<string,number>={};
    protected kills=0; protected armor=0; protected damage=0; protected speed=0;
    protected lastUpgrade='';
    protected soldiers:Soldier[]=[];
    protected effects:GroundEffect[]=[];
    protected mageEquipped:string[]=[];
    protected abilityTimers:Record<string,number>={};
    protected archerHits=0;
    protected mageHits=0;
    protected blessingCooldown=0;
    protected recruitTimers=[0,0,0,0];
    protected shots:Shot[]=[];

    protected abstract refresh():void;

    protected reset() {
        this.phase='ready'; this.wave=0; this.maxHp=300+this.getPetBonuses().castleHp; this.hp=this.maxHp;
        this.slots=['archer',null,null,null]; this.selected=0; this.enemies=[]; this.soldiers=[]; this.shots=[]; this.effects=[];
        this.levels={}; this.mageEquipped=[]; this.abilityTimers={}; this.archerHits=0; this.mageHits=0;
        this.blessingCooldown=0; this.recruitTimers=[0,0,0,0]; this.kills=0; this.armor=0; this.damage=0; this.speed=0; this.lastUpgrade=''; this.refresh();
    }
    protected startWave() {
        this.phase='battle'; this.wave++; this.enemies=[]; this.spawned=0;
        this.total=5+Math.ceil(this.wave*.8)+(this.wave===20?1:0);
        this.spawnTimer=.2; this.cooldown=[0,0,0,0]; this.recruitTimers=[0,0,0,0]; this.effects=[]; this.refresh();
        this.syncSoldiers();
    }
    protected syncSoldiers() {
        // 存活者保留位置和当前血量；阵亡空缺在下一波从塔内补齐。
        this.soldiers=this.soldiers.filter(s=>this.slots[s.slot]==='guard');
        this.slots.forEach((troop,i)=>{
            if(troop!=='guard') return;
            const count=3+(this.levels.guardPopulation||0);
            for(let j=0;j<count;j++) {
                const homeX=SLOT_X[i]+(j-(count-1)/2)*22;
                const existing=this.soldiers.find(s=>s.slot===i&&s.rank===j);
                const maxHp=120;
                if(existing) {
                    existing.homeX=homeX;
                    existing.hp+=maxHp-existing.maxHp;
                    existing.maxHp=maxHp;
                    continue;
                }
                this.soldiers.push({x:homeX,y:SOLDIER_SPAWN_Y,homeX,homeY:-91-(j%2)*18,
                    slot:i,rank:j,hp:maxHp,maxHp,attackTimer:0});
            }
        });
    }
    protected tick(dt:number) {
        this.spawnTimer-=dt;
        if(this.spawned<this.total && this.spawnTimer<=0) {
            this.spawn(this.wave===20&&this.spawned===this.total-1);
            this.spawned++; this.spawnTimer=.62;
        }
        this.blessingCooldown=Math.max(0,this.blessingCooldown-dt);
        this.tickStatuses(dt);
        this.tickEffects(dt);
        this.tickAbilities(dt);
        this.tickRecruits(dt);
        for(const e of [...this.enemies]) {
            if(this.enemies.indexOf(e)<0) continue;
            e.attackTimer=Math.max(0,e.attackTimer-dt);
            const stunned=(e.stun||0)>0||(e.freeze||0)>0;
            const defender=e.attacksSoldiers&&!this.levels.guardTurtle ? this.soldiers.filter(s=>Math.hypot(s.x-e.x,s.y-e.y)<28)
                .sort((a,b)=>a.hp-b.hp)[0] : undefined;
            if(defender&&!stunned) {
                if(e.attackTimer===0) {
                    const armorLevel=this.levels.guardArmor||0;
                    const reduction=armorLevel?Math.min(.9,.3+(armorLevel-1)*.03):0;
                    defender.hp-=Math.max(1,e.damage*.6*(1-reduction));
                    e.attackTimer=.85;
                    if(defender.hp<=0) this.soldiers.splice(this.soldiers.indexOf(defender),1);
                }
            } else if(!defender&&!stunned) e.y-=e.speed*(e.slow>0?.55:1)*(1-Math.min(.95,e.iceSlow||0))*dt;
            e.slow=Math.max(0,e.slow-dt);
            if(e.y<=-174) {
                if(this.levels.guardTurtle) {
                    e.y=-174; e.wallTimer=(e.wallTimer||0)-dt;
                    if(e.wallTimer<=0&&!stunned) {
                        e.wallTimer=1;
                        const dealt=this.damageCastle(e.damage);
                        this.hit(e,dealt*(.5+(this.levels.guardTurtle-1)*.1),'reflect');
                    }
                } else {
                    this.damageCastle(e.damage);
                    this.enemies.splice(this.enemies.indexOf(e),1);
                }
                if(this.hp<=0) { this.phase='lose'; this.refresh(); return; }
            }
        }
        this.tickSoldiers(dt);
        this.slots.forEach((t,i)=>{
            if(!t||t==='guard') return;
            this.cooldown[i]-=dt; if(this.cooldown[i]>0) return;
            const x=[-390,-210,-30,150][i], range=t==='mage'?340:480;
            const nearby=this.enemies.filter(e=>Math.hypot(e.x-x,e.y+211)<=range);
            const target=(t==='mage'&&this.activeMage('mageLightBeam') ?
                nearby.sort((a,b)=>Math.hypot(a.x-x,a.y+211)-Math.hypot(b.x-x,b.y+211)) :
                nearby.sort((a,b)=>a.y-b.y))[0];
            if(!target) return;
            if(t==='archer') this.fireArcher(i,target);
            else this.fireMage(i,target);
            const rate=t==='archer'?.72:(this.activeMage('mageBeam')?.12:1.05);
            const swift=t==='archer'?Math.pow(2,this.levels.archerSwift||0):1;
            this.cooldown[i]=Math.max(.05,rate/(swift*(1+this.speed*.13+this.getPetBonuses().attackSpeed)));
        });
        if(this.spawned===this.total&&this.enemies.length===0) {
            this.phase=this.wave===20?'win':'upgrade'; this.refresh();
        }
    }
    protected tickSoldiers(dt:number) {
        const assigned=new Set<Enemy>();
        const groupTarget=this.levels.guardGang ? [...this.enemies].sort((a,b)=>a.y-b.y)[0] : undefined;
        const turtle=!!this.levels.guardTurtle;
        const orc=!!this.levels.guardOrc&&!turtle;
        for(const soldier of this.soldiers) {
            soldier.attackTimer=Math.max(0,soldier.attackTimer-dt);
            if(this.levels.guardGrain) soldier.hp=Math.min(soldier.maxHp,soldier.hp+
                soldier.maxHp*.02*(1+this.levels.guardGrain*.5)*dt);
            let target:Enemy|undefined;
            if(!turtle) {
                if(groupTarget) target=groupTarget;
                else {
                    if(soldier.target&&this.enemies.indexOf(soldier.target)>=0&&!assigned.has(soldier.target)) target=soldier.target;
                    else target=[...this.enemies].filter(e=>!assigned.has(e)).sort((a,b)=>
                        Math.hypot(a.x-soldier.x,a.y-soldier.y)-Math.hypot(b.x-soldier.x,b.y-soldier.y))[0];
                    if(target) assigned.add(target);
                }
            }
            soldier.target=target;
            const goalX=target?Math.max(-560,Math.min(240,target.x)):soldier.homeX;
            const goalY=turtle?SOLDIER_SPAWN_Y:target?
                Math.max(-174,orc?target.y:Math.min(SOLDIER_FIELD_TOP,target.y)):soldier.homeY;
            const distance=Math.hypot(goalX-soldier.x,goalY-soldier.y);
            if(target&&Math.hypot(target.x-soldier.x,target.y-soldier.y)<=SOLDIER_ATTACK_RANGE) {
                if(soldier.attackTimer===0) {
                    const frenzy=this.levels.guardFrenzy||0;
                    const companions=this.soldiers.filter(s=>s.slot===soldier.slot).length-1;
                    let hit=(23+this.damage)*(1+frenzy*.2)*(1+(this.levels.guardGang||0)*companions*.1);
                    if(Math.random()<this.getPetBonuses().critChance) hit*=1.5;
                    this.hit(target,hit,'melee',soldier);
                    this.shots.push({x1:soldier.x,y1:soldier.y,x2:target.x,y2:target.y,color:COL.guard,time:.22});
                    soldier.attackTimer=Math.max(.2,.65/(1+frenzy*.2+this.speed*.13+this.getPetBonuses().attackSpeed));
                }
            } else if(distance>2) {
                const step=Math.min(distance,125*dt);
                soldier.x+=(goalX-soldier.x)/distance*step;
                soldier.y=orc?Math.min(220,soldier.y+(goalY-soldier.y)/distance*step):
                    Math.min(SOLDIER_FIELD_TOP,soldier.y+(goalY-soldier.y)/distance*step);
            }
        }
    }
    protected activeMage(key:string):number { return this.slots.indexOf('mage')>=0&&this.mageEquipped.indexOf(key)>=0 ? (this.levels[key]||0) : 0; }
    protected fireArcher(slot:number,first:Enemy) {
        const lv=(key:string)=>this.levels[key]||0;
        const count=1+lv('archerComrades');
        const targets=[first,...this.enemies.filter(e=>e!==first).sort((a,b)=>a.y-b.y)];
        for(let arrow=0;arrow<count;arrow++) {
            const target=targets[arrow%targets.length];
            if(!target||this.enemies.indexOf(target)<0) continue;
            let original=(10+this.damage)*(1+lv('archerBirdgun')*.5);
            if(Math.random()<Math.min(.95,this.getPetBonuses().critChance+lv('archerCrit')*.1))
                original*=1.5+lv('archerCrit')*.2;
            const damage=original*(lv('archerPoison')?.5:1);
            const radius=lv('archerRain')?40+lv('archerRain')*10:0;
            const victims=radius?this.enemies.filter(e=>Math.hypot(e.x-target.x,e.y-target.y)<=radius):[target];
            for(const victim of [...victims]) {
                if(lv('archerPoison')) { victim.poison=(victim.poison||0)+original*(.1*lv('archerPoison')); victim.poisonTime=3; }
                this.hit(victim,damage,'arrow');
            }
            if(lv('archerPierce')) {
                const behind=this.enemies.filter(e=>e!==target&&Math.abs(e.x-target.x)<38&&e.y>target.y)
                    .sort((a,b)=>a.y-b.y).slice(0,lv('archerPierce'));
                for(const victim of behind) this.hit(victim,damage*.8,'arrow');
            }
            this.shots.push({x1:SLOT_X[slot]+(arrow-(count-1)/2)*9,y1:-185,
                x2:target.x,y2:target.y,color:COL.archer,time:.18,radius});
        }
    }
    protected fireMage(slot:number,target:Enemy) {
        const beam=this.activeMage('mageLightBeam');
        let damage=beam?4+beam*3:24+this.damage;
        const fireball=this.activeMage('mageFireball');
        if(fireball) damage*=Math.pow(1.3,fireball);
        const radius=fireball?45*Math.pow(1.3,fireball):0;
        const victims=radius?this.enemies.filter(e=>Math.hypot(e.x-target.x,e.y-target.y)<=radius):[target];
        if(beam) {
            const width=8+beam*5;
            for(const e of this.enemies) if(e!==target&&Math.abs(e.x-target.x)<=width) victims.push(e);
        }
        for(const e of [...new Set(victims)]) {
            const iceActive=this.activeMage('mageIceFreeze')||this.activeMage('mageIceShatter')||
                this.activeMage('mageIceStatue')||this.activeMage('mageIceSnowman');
            this.hit(e,damage*(iceActive&&e.iceAmp?2:1),'magic');
            if(this.activeMage('mageLightningBolt')||this.activeMage('mageLightningMark')||
                this.activeMage('mageLightningBall')||this.activeMage('mageLightningNature')) this.applyLightning(e,damage*.25,.1);
            if(this.activeMage('mageFireIgnite')||fireball||this.activeMage('mageFireMeteor')||this.activeMage('mageFireExplode'))
                this.applyBurn(e,5+this.damage*.15);
            if(this.activeMage('mageIceFreeze')||this.activeMage('mageIceShatter')||
                this.activeMage('mageIceStatue')||this.activeMage('mageIceSnowman')) this.applyIce(e);
        }
        if(this.activeMage('mageLightningMark')) {
            for(const e of this.enemies.filter(e=>!e.marked).slice(0,this.activeMage('mageLightningMark'))) e.marked=true;
        }
        const freeze=this.activeMage('mageIceFreeze');
        if(freeze&&++this.mageHits%5===0) target.freeze=Math.max(target.freeze||0,(.5+(freeze-1)*.5)*(target.iceAmp?2:1));
        this.shots.push({x1:SLOT_X[slot],y1:-185,x2:target.x,y2:target.y,color:COL.mage,time:beam ? .12 : .2,radius});
        if(beam&&this.activeMage('mageLightRefraction')) {
            const extras=this.enemies.filter(e=>e!==target).sort((a,b)=>a.y-b.y)
                .slice(0,this.activeMage('mageLightRefraction'));
            let from=target;
            for(const e of extras) {
                this.hit(e,damage*.7,'magic');
                const wallX=e.x>from.x?260:-580;
                this.shots.push({x1:from.x,y1:from.y,x2:wallX,y2:from.y,color:COL.mage,time:.12});
                this.shots.push({x1:wallX,y1:from.y,x2:e.x,y2:e.y,color:COL.mage,time:.12});
                from=e;
            }
        }
    }
    protected applyLightning(e:Enemy,damage:number,stun:number) {
        if(this.enemies.indexOf(e)<0) return;
        const chained=!!e.marked;
        e.stun=Math.max(e.stun||0,stun);
        this.hit(e,damage,'lightning');
        if(chained) {
            e.marked=false;
            const next=this.enemies.filter(v=>v!==e).sort((a,b)=>
                Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
            if(next&&Math.hypot(next.x-e.x,next.y-e.y)<110) {
                next.stun=Math.max(next.stun||0,stun);
                this.hit(next,damage*.7,'lightning');
            }
        }
    }
    protected applyBurn(e:Enemy,dps:number) {
        if(this.enemies.indexOf(e)<0) return;
        e.burn=(e.burn||0)+1+this.activeMage('mageFireIgnite');
        e.burnDamage=Math.max(e.burnDamage||0,dps);
        e.burnTick=.5;
        if(this.activeMage('mageFireExplode')&&e.burn>=5) {
            const damage=e.burn*(e.burnDamage||0)*2;
            e.burn=0;
            this.hit(e,damage,'fire');
            const count=this.activeMage('mageFireExplode');
            for(const next of this.enemies.filter(v=>v!==e).sort((a,b)=>
                Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).slice(0,count)) {
                next.burn=(next.burn||0)+1; next.burnDamage=dps; next.burnTick=.5;
            }
        }
    }
    protected applyIce(e:Enemy) {
        if(this.enemies.indexOf(e)<0) return;
        const statue=this.activeMage('mageIceStatue');
        if(statue&&!e.statue) {
            e.iceSlow=(e.iceSlow||0)+.1*statue*(e.iceAmp?2:1);
            if(e.iceSlow>=1) {
                e.statue=true; e.freeze=99999; e.max*=(1+.1*Math.max(0,statue-1))*(e.iceAmp?2:1); e.hp=e.max;
            }
        } else e.iceSlow=Math.min(.8,(e.iceSlow||0)+.1*(e.iceAmp?2:1));
    }
    protected tickStatuses(dt:number) {
        for(const e of [...this.enemies]) {
            e.stun=Math.max(0,(e.stun||0)-dt);
            if(!e.statue) e.freeze=Math.max(0,(e.freeze||0)-dt);
            e.iceAmp=Math.max(0,(e.iceAmp||0)-dt);
            if((e.poisonTime||0)>0) {
                e.poisonTime=Math.max(0,(e.poisonTime||0)-dt);
                this.hit(e,(e.poison||0)*dt,'poison');
                if(e.poisonTime===0) e.poison=0;
            }
            if((e.burn||0)>0) {
                e.burn=Math.max(0,(e.burn||0)-dt); e.burnTick=(e.burnTick||0)-dt;
                if(e.burnTick<=0) {e.burnTick=.5;this.hit(e,e.burnDamage||0,'fire');}
            }
        }
    }
    protected tickEffects(dt:number) {
        for(const effect of [...this.effects]) {
            effect.time-=dt;
            if(effect.kind==='ball') effect.y+=28*dt;
            if(effect.kind==='snowman') {
                const nearest=[...this.enemies].sort((a,b)=>
                    Math.hypot(a.x-effect.x,a.y-effect.y)-Math.hypot(b.x-effect.x,b.y-effect.y))[0];
                if(nearest) {
                    const d=Math.hypot(nearest.x-effect.x,nearest.y-effect.y);
                    if(d<21) {nearest.iceAmp=5;effect.time=0;}
                    else {effect.x+=(nearest.x-effect.x)/d*65*dt;effect.y+=(nearest.y-effect.y)/d*65*dt;}
                }
            } else if(effect.kind==='trap') {
                const caught=this.enemies.find(e=>Math.hypot(e.x-effect.x,e.y-effect.y)<effect.radius);
                if(caught) {caught.stun=Math.max(caught.stun||0,effect.power);effect.time=0;}
            } else if(effect.kind==='pit'||effect.kind==='ball') {
                effect.tick-=dt;
                if(effect.tick<=0) {
                    effect.tick=.5;
                    for(const e of [...this.enemies]) if(Math.hypot(e.x-effect.x,e.y-effect.y)<effect.radius)
                        this.hit(e,effect.power,effect.kind==='pit'?'fire':'lightning');
                }
            }
        }
        this.effects=this.effects.filter(e=>e.time>0&&e.y<240);
    }
    protected abilityReady(key:string,seconds:number,dt:number):boolean {
        if(!this.activeMage(key)) return false;
        this.abilityTimers[key]=(this.abilityTimers[key]===undefined?seconds:this.abilityTimers[key])-dt;
        if(this.abilityTimers[key]>0) return false;
        this.abilityTimers[key]=seconds;
        return true;
    }
    protected tickAbilities(dt:number) {
        if(this.abilityReady('mageLightningBolt',.2,dt)) {
            const targets=[...this.enemies].sort((a,b)=>a.y-b.y).slice(0,this.activeMage('mageLightningBolt'));
            for(const target of targets) {
                for(const e of [...this.enemies]) if(Math.hypot(e.x-target.x,e.y-target.y)<33)
                    this.applyLightning(e,12+this.damage*.4,.2);
            }
        }
        if(this.abilityReady('mageLightningBall',5,dt)) {
            const mageSlots=this.slots.map((t,i)=>t==='mage'?i:-1).filter(i=>i>=0);
            for(let n=0;n<this.activeMage('mageLightningBall');n++)
                this.effects.push({kind:'ball',x:SLOT_X[mageSlots[n%mageSlots.length]],y:-170,radius:35,time:10,tick:.5,power:9+this.damage*.3});
        }
        if(this.abilityReady('mageLightningNature',5,dt)) {
            for(const e of [...this.enemies].sort((a,b)=>b.hp-a.hp).slice(0,this.activeMage('mageLightningNature')))
                this.applyLightning(e,18+this.damage*.5,.5);
        }
        if(this.abilityReady('mageFireMeteor',5,dt)) {
            for(const target of [...this.enemies].sort((a,b)=>b.hp-a.hp).slice(0,this.activeMage('mageFireMeteor'))) {
                for(const e of [...this.enemies]) if(Math.hypot(e.x-target.x,e.y-target.y)<55)
                    this.hit(e,100+this.damage,'fire');
                this.effects.push({kind:'pit',x:target.x,y:target.y,radius:48,time:4,tick:.5,power:10});
            }
        }
        if(this.abilityReady('mageIceSnowman',5,dt)) {
            const mageSlots=this.slots.map((t,i)=>t==='mage'?i:-1).filter(i=>i>=0);
            for(let n=0;n<this.activeMage('mageIceSnowman');n++)
                this.effects.push({kind:'snowman',x:SLOT_X[mageSlots[n%mageSlots.length]],y:-170,radius:15,time:12,tick:0,power:0});
        }
        if(this.abilityReady('mageLightHeal',5,dt)) {
            const level=this.activeMage('mageLightHeal');
            this.hp=Math.min(this.maxHp,this.hp+30*level);
            for(const s of this.soldiers) s.hp=Math.min(s.maxHp,s.hp+10*level);
        }
    }
    protected tickRecruits(dt:number) {
        this.slots.forEach((troop,slot)=>{
            if(troop!=='guard') return;
            const desired=3+(this.levels.guardPopulation||0);
            const present=this.soldiers.filter(s=>s.slot===slot);
            const interval=Math.max(.8,6/(1+(this.levels.guardPolicy||0)*.3));
            if(present.length>=desired) {this.recruitTimers[slot]=interval;return;}
            this.recruitTimers[slot]-=dt;
            if(this.recruitTimers[slot]>0) return;
            const rank=Array.from({length:desired},(_,i)=>i).find(i=>!present.some(s=>s.rank===i));
            if(rank===undefined) return;
            const homeX=SLOT_X[slot]+(rank-(desired-1)/2)*22;
            this.soldiers.push({x:homeX,y:SOLDIER_SPAWN_Y,homeX,homeY:-91-(rank%2)*18,
                slot,rank,hp:120,maxHp:120,attackTimer:0});
            this.recruitTimers[slot]=interval;
        });
    }
    protected damageCastle(raw:number):number {
        const dealt=Math.max(1,raw-this.armor);
        if(this.activeMage('mageLightBlessing')&&this.blessingCooldown===0&&this.hp<=dealt) {
            this.hp=1; this.blessingCooldown=Math.max(1,31-this.activeMage('mageLightBlessing'));
        } else this.hp=Math.max(0,this.hp-dealt);
        return dealt;
    }
    protected spawn(boss:boolean) {
        const index=boss?5:Math.floor(Math.random()*Math.min(6,1+Math.ceil(this.wave/4)));
        const k=KINDS[index], hp=boss?1330:(31+this.wave*5)*k.hp;
        this.enemies.push({x:-495+Math.random()*660,y:219,hp,max:hp,
            speed:boss?28:(42+this.wave*1.4)*k.speed,damage:boss?70:13+this.wave*1.8,
            color:boss?COL.red:k.color,slow:0,boss,attacksSoldiers:!boss,attackTimer:0});
    }
    protected hit(e:Enemy,dmg:number,kind='generic',soldier?:Soldier) {
        if(this.enemies.indexOf(e)<0) return;
        const frozen=(e.freeze||0)>0;
        e.hp-=dmg;
        if(e.hp<=0) {
            this.enemies.splice(this.enemies.indexOf(e),1); this.kills++;
            const hunt=this.levels.archerHunter||0;
            if(hunt) this.effects.push({kind:'trap',x:e.x,y:e.y,radius:24,time:12,tick:0,power:1+(hunt-1)*.5});
            const shatter=this.activeMage('mageIceShatter');
            if(frozen&&shatter) {
                const radius=45*Math.pow(1.3,shatter-1)*(e.iceAmp?2:1);
                for(const next of [...this.enemies]) if(Math.hypot(next.x-e.x,next.y-e.y)<radius) {
                    next.slow=Math.max(next.slow,2);
                    this.hit(next,15*shatter,'ice');
                }
            }
            if(kind==='melee'&&soldier&&this.levels.guardOrc) soldier.hp=Math.min(soldier.maxHp,
                soldier.hp+e.max*(.1*this.levels.guardOrc));
        }
    }
    // 未来宠物系统在这里提供加成；当前占位值不会改变战斗。
    protected getPetBonuses():PetBonuses { return {critChance:0,attackSpeed:0,castleHp:0}; }
}
