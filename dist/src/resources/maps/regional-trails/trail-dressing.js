import * as THREE from 'three';
import { MapSpriteResources, } from '../../props/map-sprite-resources.js';
const regionDetails = {
    boar: ['fern', 'grass', 'moss', 'root-grass', 'mushrooms', 'dry-leaves'],
    bear: ['dry-leaves'],
    armadillo: ['ash', 'basalt-shards', 'ash'],
    mantis: ['grass', 'fern', 'moss', 'root-grass', 'dry-leaves', 'mushrooms'],
};
function seededRandom(key) {
    let seed = [...key].reduce((value, letter) => value * 31 + letter.charCodeAt(0), 17) >>> 0;
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}
/** 길가 소품과 장식 박자만 맡고 보행·입력 및 kit의 모형 수명은 변경하지 않는다. */
export class TrailDressing {
    root = new THREE.Group();
    ground;
    sprites = new MapSpriteResources();
    foliage = [];
    wheels = [];
    motes = [];
    moteGeometry = new THREE.BufferGeometry();
    moteMaterial = new THREE.PointsMaterial({
        size: 1.7,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
    });
    motePoints = new THREE.Points(this.moteGeometry, this.moteMaterial);
    motePositions;
    lastFrame = -1;
    disposed = false;
    constructor({ kit, ground, }) {
        this.ground = ground;
        this.root.name = 'trail-dressing';
        this.root.visible = false;
        this.root.add(this.sprites.root, this.motePoints);
        const random = seededRandom(`${ground.region}:${ground.variant}:dressing`);
        const areas = ground.variant === 'seamless' ? [ground.bounds] : ground.definition.areas;
        const bounds = {
            minX: Math.min(...areas.map((area) => area.minX)) - 2.8,
            maxX: Math.max(...areas.map((area) => area.maxX)) + 2.8,
            minZ: Math.min(...areas.map((area) => area.minZ)) - 2.8,
            maxZ: Math.max(...areas.map((area) => area.maxZ)) + 2.8,
        };
        this.placeDetails(bounds, random);
        for (const parent of [kit.root, kit.foreground]) {
            parent.traverse((object) => {
                const collection = object.name === 'trail-foliage'
                    ? this.foliage
                    : object.name === 'trail-waterwheel'
                        ? this.wheels
                        : null;
                if (collection)
                    collection.push({
                        object,
                        rotation: object.rotation.clone(),
                        phase: random() * Math.PI * 2,
                    });
            });
        }
        const count = ground.region === 'bear' ? 18 : ground.region === 'mantis' ? 8 : 10;
        for (let index = 0; index < count; index++) {
            const point = this.sample(bounds, random);
            this.motes.push({
                ...point,
                height: ground.heightAt(point),
                phase: random(),
            });
        }
        this.motePositions = new Float32Array(count * 3);
        this.moteGeometry.setAttribute('position', new THREE.BufferAttribute(this.motePositions, 3).setUsage(THREE.DynamicDrawUsage));
        this.moteMaterial.color.setHex(ground.region === 'bear'
            ? 0xe6f2f4
            : ground.region === 'armadillo'
                ? 0xb4a18b
                : 0xd5ddba);
        this.moteMaterial.opacity = ground.region === 'bear' ? 0.42 : 0.26;
        // 작은 입자는 넓게 흩어져 있으므로 갱신 전 원점 경계로 잘리지 않게 한다.
        this.motePoints.frustumCulled = false;
        this.update(0);
    }
    async load() {
        await this.sprites.load();
        if (!this.disposed)
            this.root.visible = true;
    }
    face(camera) {
        if (!this.disposed)
            this.sprites.face(camera);
    }
    update(seconds) {
        if (this.disposed)
            return;
        const frame = Math.floor(Math.max(0, seconds) * 12);
        if (frame === this.lastFrame)
            return;
        this.lastFrame = frame;
        const time = frame / 12;
        this.foliage.forEach(({ object, rotation, phase }) => {
            object.rotation.copy(rotation);
            object.rotation.x += Math.sin(time * 1.1 + phase) * 0.022;
            object.rotation.z += Math.sin(time * 1.4 + phase + 0.8) * 0.025;
        });
        this.wheels.forEach(({ object, rotation }) => {
            object.rotation.copy(rotation);
            object.rotation.z -= time * 0.42;
        });
        const snow = this.ground.region === 'bear';
        const ash = this.ground.region === 'armadillo';
        this.motes.forEach((mote, index) => {
            const phase = (time * (snow ? 0.11 : ash ? 0.08 : 0.045) + mote.phase) % 1;
            this.motePositions[index * 3] =
                mote.x + Math.sin(time * 0.5 + mote.phase * 9) * (snow ? 0.25 : 0.15);
            this.motePositions[index * 3 + 1] =
                mote.height +
                    0.4 +
                    (snow ? 1 - phase : phase) * (snow ? 3.2 : ash ? 2.6 : 1.8);
            this.motePositions[index * 3 + 2] =
                mote.z + Math.cos(time * 0.35 + mote.phase * 7) * 0.12;
        });
        this.moteGeometry.getAttribute('position').needsUpdate = true;
    }
    sample(bounds, random) {
        return {
            x: bounds.minX + (bounds.maxX - bounds.minX) * random(),
            z: bounds.minZ + (bounds.maxZ - bounds.minZ) * random(),
        };
    }
    canDress(point) {
        const distance = this.ground.distance(point);
        return (distance >= 0.6 &&
            distance <= 3 &&
            this.ground.waterDistance(point) > 0.35 &&
            this.ground.definition.landmarks.every((landmark) => Math.hypot(point.x - landmark.position.x, point.z - landmark.position.z) > 2.1));
    }
    placeDetails(bounds, random) {
        const region = this.ground.region;
        const details = regionDetails[region];
        const target = this.ground.variant === 'seamless'
            ? 24
            : region === 'bear'
                ? 4
                : region === 'armadillo'
                    ? 6
                    : 8;
        const centers = [];
        for (let attempt = 0; attempt < 320 && centers.length < target; attempt++) {
            const center = this.sample(bounds, random);
            if (!this.canDress(center) ||
                centers.some((point) => Math.hypot(point.x - center.x, point.z - center.z) < 3.2))
                continue;
            centers.push(center);
            const count = region === 'bear' ? 2 : 3;
            for (let index = 0; index < count; index++) {
                const angle = random() * Math.PI * 2;
                const radius = index === 0 ? 0 : 0.35 + random() * 0.5;
                const point = {
                    x: center.x + Math.cos(angle) * radius,
                    z: center.z + Math.sin(angle) * radius,
                };
                if (!this.canDress(point))
                    continue;
                const key = details[Math.floor(random() * details.length)];
                const flat = ['moss', 'dry-leaves', 'ash', 'basalt-shards'].includes(key);
                const width = key === 'fern'
                    ? 0.65 + random() * 0.22
                    : key === 'root-grass'
                        ? 0.5 + random() * 0.22
                        : 0.32 + random() * 0.3;
                const mesh = this.sprites.add(key, {
                    ...point,
                    y: this.ground.heightAt(point) + (flat ? 0.015 : 0.025),
                    width,
                    kind: flat ? 'ground' : 'upright',
                });
                if (flat)
                    mesh.rotation.z = random() * Math.PI * 2;
            }
        }
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const pose of [...this.foliage, ...this.wheels])
            pose.object.rotation.copy(pose.rotation);
        this.foliage.length = 0;
        this.wheels.length = 0;
        this.sprites.dispose();
        this.moteGeometry.dispose();
        this.moteMaterial.dispose();
        this.root.removeFromParent();
        this.root.clear();
    }
}
