import * as THREE from 'three';
import { RegionalScenery } from '../../maps/regional-villages/scenery.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { TrailSprite } from '../../../games/tiger-rpg/trail-sprite.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
import { professionProps, residents, stateProps, propPlacements, residentPlacements, } from './pack.js';
export class PackScenery {
    root = new THREE.Group();
    village;
    textures = new SpriteTextures();
    geometry = new THREE.PlaneGeometry(1, 1);
    entries = new Map();
    props = [];
    people = [];
    direction = new THREE.Vector3();
    constructor(map) {
        this.village = new RegionalScenery(map);
        this.root.add(this.village.root);
        for (const entry of [...residents(), ...professionProps(), ...stateProps()])
            this.entries.set(entry.key, entry);
        for (const placement of propPlacements(map.id)) {
            const mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide }));
            mesh.layers.set(resourceLayers.effects);
            this.root.add(mesh);
            this.props.push({ mesh, placement });
        }
        for (const point of residentPlacements(map.id)) {
            const entry = this.entries.get(point.key);
            const sprite = new TrailSprite(new Map([['stand', { frames: [entry.frame] }]]), this.textures, 64, 0.26, 'frame-pivot');
            this.people.push({ ...point, sprite });
            this.root.add(sprite.mesh, sprite.shadow);
        }
    }
    async load() {
        await Promise.all([
            this.village.load(),
            this.textures.load([...this.entries.values()].map((entry) => entry.frame.localPath), '신규 마을 리소스를 불러오지 못했어요.'),
        ]);
    }
    update(state, delta, camera, options) {
        const dirty = this.village.update(state, delta, camera);
        camera.getWorldDirection(this.direction);
        const angle = Math.atan2(-this.direction.x, -this.direction.z), screenUp = Math.max(0.1, Math.hypot(this.direction.x, this.direction.z));
        for (const { mesh, placement } of this.props) {
            const key = options.mode === 'after' && placement.after
                ? placement.after
                : placement.key;
            const frame = this.entries.get(key).frame, unit = 1 / placement.pixelsPerUnit;
            mesh.material.map = this.textures.get(frame.localPath) ?? null;
            mesh.scale.set(frame.width * unit, (frame.height * unit) / screenUp, 1);
            mesh.rotation.y = angle;
            mesh.position.set(placement.x + (frame.width / 2 - frame.pivot.x) * unit, placement.y + mesh.scale.y / 2, placement.z);
        }
        for (const person of this.people)
            person.sprite.update(person, 'stand', delta);
        return dirty;
    }
    dispose() {
        this.village.dispose();
        for (const { sprite } of this.people)
            sprite.dispose();
        for (const { mesh } of this.props)
            mesh.material.dispose();
        this.geometry.dispose();
        this.textures.dispose();
        this.root.clear();
    }
}
