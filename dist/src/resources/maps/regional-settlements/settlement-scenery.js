import * as THREE from 'three';
import { TrailSprite } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import { residents } from '../../props/village-pack/pack.js';
import { NaturalScenery } from '../regional-trails/natural-scenery.js';
function roof(kit, building, snow) {
    const vertices = [], uv = [];
    const width = building.width + 0.85, depth = building.depth + 0.95;
    const rise = building.roof === 'slate' ? 1.7 : building.roof === 'tile' ? 1.15 : 1.3;
    for (let z = 0; z < 8; z++)
        for (let x = 0; x < 16; x++) {
            const corner = (ix, iz) => {
                const u = ix / 16, v = iz / 8, t = Math.abs(u * 2 - 1);
                vertices.push((u - 0.5) * width, building.height +
                    0.16 +
                    rise * (1 - t) +
                    Math.pow(t, 5) * 0.24 +
                    Math.cos(v * Math.PI * 2) * 0.025, (v - 0.5) * depth);
                uv.push(u * 2, v * 2);
            };
            corner(x, z);
            corner(x + 1, z);
            corner(x, z + 1);
            corner(x + 1, z);
            corner(x + 1, z + 1);
            corner(x, z + 1);
        }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    const kinds = {
        thatch: 'rope',
        slate: 'basalt',
        tile: 'cloth',
        bamboo: 'bamboo',
    };
    const mesh = new THREE.Mesh(geometry, kit.material(snow ? 'snow' : kinds[building.roof]));
    mesh.position.set(building.x, snow ? 0.1 : 0, building.z);
    mesh.material.side = THREE.DoubleSide;
    mesh.castShadow = mesh.receiveShadow = true;
    kit.root.add(mesh);
    const gable = new THREE.Shape();
    gable.moveTo(-building.width / 2, 0);
    gable.lineTo(0, rise);
    gable.lineTo(building.width / 2, 0);
    gable.closePath();
    const gableGeometry = new THREE.ExtrudeGeometry(gable, {
        depth: building.depth,
        bevelEnabled: false,
    });
    gableGeometry.translate(0, 0, -building.depth / 2);
    const gableMesh = new THREE.Mesh(gableGeometry, kit.material(building.wall));
    gableMesh.position.set(building.x, building.height + 0.17, building.z);
    gableMesh.castShadow = gableMesh.receiveShadow = true;
    kit.root.add(gableMesh);
    for (const side of [-1, 1])
        kit.box({
            x: building.x + (side * width) / 2,
            y: building.height + 0.28,
            z: building.z,
        }, { x: 0.13, y: 0.15, z: depth }, 'bark');
    // 지붕 마루를 한 줄로 묶어 반복되는 강한 줄무늬를 피한다.
    kit.box({ x: building.x, y: building.height + rise + 0.2, z: building.z }, { x: 0.18, y: 0.16, z: depth + 0.2 }, snow ? 'snow' : kinds[building.roof]);
}
/** 지역마다 같은 크기의 문·창·처마를 사용해 인물과 건축의 비율을 맞춘다. */
export function buildSettlementBuildings(kit, village) {
    const natural = new NaturalScenery(kit);
    for (const b of village.buildings) {
        const previous = new Set(kit.root.children);
        const front = b.z + b.depth / 2;
        kit.box({ x: b.x, y: 0.12, z: b.z }, { x: b.width + 0.25, y: 0.24, z: b.depth + 0.25 }, village.region === 'armadillo' ? 'basalt' : 'stone');
        kit.box({ x: b.x, y: b.height / 2 + 0.17, z: b.z }, { x: b.width, y: b.height, z: b.depth }, b.wall);
        for (const dx of [-b.width / 2 + 0.12, b.width / 2 - 0.12])
            kit.box({ x: b.x + dx, y: b.height / 2 + 0.17, z: front + 0.035 }, { x: 0.18, y: b.height, z: 0.16 }, 'bark');
        kit.box({ x: b.x, y: 1.05, z: front + 0.06 }, { x: 1.02, y: 1.85, z: 0.13 }, 'bark');
        for (let i = 0; i < 4; i++)
            kit.box({ x: b.x - 0.37 + i * 0.25, y: 1.05, z: front + 0.14 }, { x: 0.035, y: 1.8, z: 0.035 }, 'wood');
        for (const dx of [-b.width * 0.32, b.width * 0.32]) {
            const frame = kit.box({ x: b.x + dx, y: 1.35, z: front + 0.1 }, { x: 0.7, y: 0.73, z: 0.1 }, 'cloth');
            const material = new THREE.MeshStandardMaterial({
                color: 0xcbbc8c,
                emissive: 0xc89d57,
                emissiveIntensity: 0.24,
                roughness: 1,
            });
            frame.material = material;
            kit.box({ x: b.x + dx, y: 1.35, z: front + 0.16 }, { x: 0.045, y: 0.78, z: 0.05 }, 'bark');
            kit.box({ x: b.x + dx, y: 1.35, z: front + 0.16 }, { x: 0.75, y: 0.045, z: 0.05 }, 'bark');
        }
        kit.box({ x: b.x, y: 0.13, z: front + 0.4 }, { x: 1.5, y: 0.15, z: 0.7 }, 'stone');
        roof(kit, b, village.region === 'bear');
        if (b.id === 'inn' || b.id === 'smithy' || b.id === 'mill') {
            kit.box({ x: b.x - b.width * 0.25, y: b.height + 0.8, z: b.z - 0.7 }, { x: 0.55, y: 1.7, z: 0.6 }, village.region === 'armadillo' ? 'basalt' : 'stone');
        }
        // 낮은 정원석으로 건물과 마당 사이의 윤곽을 부드럽게 잇는다.
        natural.rock({ x: b.x + b.width / 2 + 0.3, z: front - 0.25 }, { x: 0.5, y: 0.25, z: 0.4 }, {
            snow: village.region === 'bear',
            moss: village.region === 'boar' || village.region === 'mantis',
            kind: village.region === 'armadillo' ? 'basalt' : 'stone',
        });
        const group = new THREE.Group();
        group.name = `village-building-${b.id}`;
        for (const child of [...kit.root.children])
            if (!previous.has(child))
                group.add(child);
        kit.root.add(group);
    }
}
/** 승인된 생활 소품과 주민 그림의 로딩·카메라 방향·GPU 수명을 소유한다. */
export class SettlementDressing {
    root = new THREE.Group();
    props = new MapSpriteResources();
    textures = new SpriteTextures();
    people = [];
    buildings = [];
    ray = new THREE.Ray();
    direction = new THREE.Vector3();
    actorCenter = new THREE.Vector3();
    hit = new THREE.Vector3();
    constructor(village, kit) {
        kit.root.updateMatrixWorld(true);
        for (const group of kit.root.children.filter((node) => node.name.startsWith('village-building-'))) {
            const meshes = [];
            group.traverse((node) => {
                if (!(node instanceof THREE.Mesh))
                    return;
                const fade = (source) => {
                    const material = source.clone();
                    material.transparent = true;
                    material.opacity = 0.22;
                    material.depthWrite = false;
                    return material;
                };
                meshes.push({
                    mesh: node,
                    original: node.material,
                    faded: Array.isArray(node.material)
                        ? node.material.map(fade)
                        : fade(node.material),
                });
            });
            this.buildings.push({
                bounds: new THREE.Box3().setFromObject(group),
                meshes,
            });
        }
        this.root.add(this.props.root);
        for (const prop of village.props)
            this.props.add(prop.key, { ...prop, y: prop.y ?? 0.07 });
        const frames = new Map(residents().map((entry) => [entry.key, entry.frame]));
        for (const resident of village.residents) {
            const frame = frames.get(resident.key);
            if (!frame)
                throw new Error(`마을 주민 그림이 없습니다: ${resident.key}`);
            const sprite = new TrailSprite(new Map([['stand', { frames: [frame] }]]), this.textures, frame.height / resident.height, 0.24, 'frame-pivot');
            sprite.mesh.material.toneMapped = false;
            sprite.mesh.material.fog = false;
            this.people.push({ ...resident, sprite });
            this.root.add(sprite.mesh, sprite.shadow);
        }
    }
    async load() {
        await Promise.all([
            this.props.load(),
            this.textures.load(new Set(this.people.flatMap(({ sprite }) => [...sprite.motions.values()].flatMap((m) => m.frames.map((f) => f.localPath)))), '마을 주민을 불러오지 못했어요.'),
        ]);
    }
    face(camera) {
        this.props.face(camera);
        const direction = camera.getWorldDirection(this.direction);
        const scale = 1 / Math.max(0.1, Math.hypot(direction.x, direction.z));
        for (const person of this.people)
            person.sprite.mesh.scale.y = scale;
    }
    update(_seconds, snapshot, view) {
        this.actorCenter.set(snapshot.x, 1, snapshot.z);
        this.ray.origin.copy(this.actorCenter).addScaledVector(this.direction, -80);
        this.ray.direction.copy(this.direction);
        for (const building of this.buildings) {
            const hit = this.ray.intersectBox(building.bounds, this.hit);
            const obscured = view === 'game' &&
                hit !== null &&
                this.ray.origin.distanceTo(hit) < 79.9;
            for (const { mesh, original, faded } of building.meshes) {
                mesh.material = obscured ? faded : original;
                mesh.castShadow = !obscured;
            }
        }
        for (const person of this.people)
            person.sprite.update(person, 'stand', 0);
    }
    dispose() {
        for (const building of this.buildings)
            for (const { mesh, original, faded } of building.meshes) {
                mesh.material = original;
                for (const material of Array.isArray(faded) ? faded : [faded])
                    material.dispose();
            }
        this.props.dispose();
        this.people.forEach(({ sprite }) => sprite.dispose());
        this.textures.dispose();
        this.root.clear();
    }
}
