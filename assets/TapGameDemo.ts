import { _decorator } from 'cc';
import { MainGameplayPage } from './scripts/gameplay/MainGameplayPage';

const { ccclass } = _decorator;

// Keep this scene-bound class and its asset UUID stable while gameplay lives in modules.
@ccclass('TapGameDemo')
export class TapGameDemo extends MainGameplayPage {}
