import { Color } from 'cc';
import { Troop } from './GameplayTypes';

export const COL = {
    bg:new Color(12,20,34), field:new Color(22,35,51), panel:new Color(37,52,70),
    line:new Color(85,108,130), text:new Color(234,240,244), muted:new Color(159,177,191),
    gold:new Color(245,200,108), red:new Color(232,102,98), green:new Color(107,216,161),
    archer:new Color(128,209,154), mage:new Color(148,176,248), guard:new Color(245,187,113),
};
export const NAMES:Record<Troop,string> = { archer:'弓箭手', mage:'魔法师', guard:'近卫兵' };
export const SLOT_X=[-390,-210,-30,150];
export const SOLDIER_FIELD_TOP=-7;
export const SOLDIER_SPAWN_Y=-285;
export const SOLDIER_ATTACK_RANGE=34;
export const KINDS = [
    { color:new Color(210,183,157), hp:1, speed:1 },
    { color:new Color(135,197,114), hp:.8, speed:1.3 },
    { color:new Color(180,134,106), hp:1.7, speed:.8 },
    { color:new Color(154,220,198), hp:.85, speed:1.4 },
    { color:new Color(180,125,206), hp:1.4, speed:1.05 },
    { color:new Color(229,137,107), hp:2.5, speed:.7 },
];
