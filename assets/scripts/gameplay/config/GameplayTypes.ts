import { Color } from 'cc';

export type Troop = 'archer' | 'mage' | 'guard';
export type Phase = 'ready' | 'battle' | 'upgrade' | 'win' | 'lose';
export type Enemy = { x:number; y:number; hp:number; max:number; speed:number; damage:number; color:Color; slow:number; boss:boolean; attacksSoldiers:boolean; attackTimer:number;
    stun?:number; freeze?:number; poison?:number; poisonTime?:number; burn?:number; burnTick?:number; burnDamage?:number;
    iceSlow?:number; iceAmp?:number; marked?:boolean; statue?:boolean; wallTimer?:number };
export type Soldier = { x:number; y:number; homeX:number; homeY:number; slot:number; rank:number; hp:number; maxHp:number; attackTimer:number; target?:Enemy };
export type GroundEffect = { x:number; y:number; radius:number; time:number; tick:number; kind:'trap'|'pit'|'ball'|'snowman'; power:number };
export type Upgrade = { name:string; info:string; key:string; run:()=>void };
export type PetBonuses = { critChance:number; attackSpeed:number; castleHp:number };
export type Shot = {x1:number;y1:number;x2:number;y2:number;color:Color;time:number;radius?:number};
