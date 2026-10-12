import { WalkMapScene, } from '../../../rendering/walk-map-scene.js';
import { RegionalScenery } from './scenery.js';
export class RegionalVillageScene extends WalkMapScene {
    constructor(canvas, map) {
        super(canvas, map, new RegionalScenery(map));
    }
}
