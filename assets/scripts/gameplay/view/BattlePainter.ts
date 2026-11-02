import { Color, Graphics } from 'cc';
import { Enemy, GroundEffect, Phase, Shot, Soldier, Troop } from '../config/GameplayTypes';
import { COL, SLOT_X, SOLDIER_FIELD_TOP, SOLDIER_SPAWN_Y } from '../config/GameplayConfig';

export type BattleVisualState = {
    slots:(Troop|null)[]; selected:number; enemies:Enemy[]; soldiers:Soldier[];
    effects:GroundEffect[]; shots:Shot[]; phase:Phase; levels:Record<string,number>;
    hp:number; maxHp:number;
};

export function drawBattle(g:Graphics,state:BattleVisualState):void {
    const rect=(x:number,y:number,w:number,h:number,color:Color)=>{g.fillColor=color;g.rect(x,y,w,h);g.fill();};
    const soldier=(x:number,y:number,hpRatio:number)=>{
        rect(x-7,y-11,14,19,COL.guard);
        g.fillColor=COL.gold;g.circle(x,y+12,8);g.fill();
        rect(x-10,y+17,20,4,COL.line);
        rect(x-15,y-5,7,14,COL.line);
        g.strokeColor=COL.gold;g.lineWidth=2;g.moveTo(x+10,y-4);g.lineTo(x+17,y+8);g.stroke();
        rect(x-13,y+24,26,4,COL.red);
        rect(x-13,y+24,26*Math.max(0,hpRatio),4,COL.green);
    };
    g.clear();
    rect(-640,-360,1280,720,COL.bg);
    rect(-580,-257,840,500,COL.field);
    rect(-580,-257,840,250,new Color(30,48,61));
    rect(290,-352,345,614,COL.panel);
    g.strokeColor=COL.line;g.lineWidth=2;
    for(let y=-120;y<=180;y+=60){g.moveTo(-580,y);g.lineTo(260,y);g.stroke();}
    g.strokeColor=COL.guard;g.lineWidth=2;g.moveTo(-580,SOLDIER_FIELD_TOP);g.lineTo(260,SOLDIER_FIELD_TOP);g.stroke();
    rect(-555,-350,795,92,new Color(72,84,103));
    rect(-540,-281,760,30,new Color(112,124,143));
    SLOT_X.forEach((x,i)=>{
        const c=state.slots[i]?COL[state.slots[i]!]:COL.line;
        g.fillColor=c;g.moveTo(x-37,-270);g.lineTo(x,-300);g.lineTo(x+37,-270);g.close();g.fill();
        rect(x-27,-307,54,39,c);
        if(state.slots[i]==='archer') {
            const count=Math.min(7,1+(state.levels.archerComrades||0));
            for(let n=0;n<count;n++) {
                const px=x+(n-(count-1)/2)*11;
                g.fillColor=COL.archer;g.circle(px,-262,4);g.fill();
                rect(px-3,-273,6,8,COL.archer);
            }
        }
        if(i===state.selected){g.strokeColor=COL.gold;g.lineWidth=3;g.roundRect(x-77,-253,154,80,11);g.stroke();}
    });
    for(const effect of state.effects) {
        if(effect.kind==='trap') {
            g.strokeColor=COL.gold;g.lineWidth=2;g.moveTo(effect.x-12,effect.y-5);g.lineTo(effect.x,effect.y+7);
            g.lineTo(effect.x+12,effect.y-5);g.stroke();
        } else {
            g.fillColor=effect.kind==='pit'?new Color(140,65,43,140):
                effect.kind==='ball'?new Color(130,155,246,180):new Color(226,238,246,180);
            g.circle(effect.x,effect.y,effect.kind==='pit'?effect.radius:effect.kind==='ball'?15:13);g.fill();
        }
    }
    for(const e of state.enemies) {
        g.fillColor=e.color;g.circle(e.x,e.y,e.boss?27:15);g.fill();
        const w=e.boss?68:38, y=e.y+(e.boss?32:20);
        rect(e.x-w/2,y,w,5,COL.red);rect(e.x-w/2,y,w*Math.max(0,e.hp/e.max),5,COL.green);
        if((e.poisonTime||0)>0){g.strokeColor=COL.green;g.lineWidth=2;g.circle(e.x,e.y,e.boss?30:18);g.stroke();}
        if((e.burn||0)>0){g.fillColor=COL.red;g.circle(e.x+8,e.y+13,4);g.fill();}
        if((e.freeze||0)>0){g.strokeColor=COL.mage;g.lineWidth=2;g.circle(e.x,e.y,e.boss?33:21);g.stroke();}
    }
    for(const s of state.soldiers) soldier(s.x,s.y,s.hp/s.maxHp);
    if(state.phase==='ready'||state.phase==='upgrade') state.slots.forEach((t,i)=>{
        if(t==='guard'&&!state.soldiers.some(s=>s.slot===i))
            for(let j=0;j<3;j++) soldier(SLOT_X[i]+(j-1)*22,SOLDIER_SPAWN_Y-(j%2)*16,1);
    });
    for(const s of state.shots) {
        if(s.color===COL.guard){g.fillColor=COL.guard;g.circle(s.x2,s.y2,9);g.fill();}
        else {g.strokeColor=s.color;g.lineWidth=3;g.moveTo(s.x1,s.y1);g.lineTo(s.x2,s.y2);g.stroke();}
        if(s.radius){g.strokeColor=s.color;g.lineWidth=2;g.circle(s.x2,s.y2,s.radius);g.stroke();}
    }
    rect(-554,-342,790*state.hp/state.maxHp,8,state.hp/state.maxHp>.3?COL.green:COL.red);
}
