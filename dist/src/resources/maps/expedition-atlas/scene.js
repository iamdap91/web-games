import { WalkMapScene } from '../../../rendering/walk-map-scene.js';
import { AtlasScenery } from './scenery.js';
export class AtlasScene extends WalkMapScene {
    map;
    constructor(canvas, map) {
        const scenery = new AtlasScenery(map);
        super(canvas, map, {
            root: scenery.root,
            load: () => scenery.sprites.load(),
            update: (state, delta, camera, options) => scenery.update(state, delta, camera, options),
            dispose: () => scenery.dispose(),
        });
        this.map = map;
    }
    render(state, delta, options) {
        const point = this.map.points.find((p) => p.id === state.action?.point);
        super.render(state, delta, {
            ...options,
            motion: state.action
                ? point?.kind === 'cache'
                    ? 'crouch'
                    : 'gather-down'
                : undefined,
        });
    }
}
