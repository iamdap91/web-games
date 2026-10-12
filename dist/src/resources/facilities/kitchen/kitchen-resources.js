import { groundGeometry } from '../../../rendering/ground-geometry.js';
import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import * as THREE from 'three';
import { createPixelMaterial, villageColors, } from '../../../rendering/pixel-material.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
import { kitchenBenches, kitchenLayout, kitchenPosts, kitchenStages, } from './kitchen-layout.js';
const colors = {
    timber: 0x755338,
    board: 0xb78c59,
    worn: 0x82725d,
    stone: 0x9b9780,
    mortar: 0xc1b497,
    soot: 0x343831,
    iron: 0x414b44,
    clay: 0x9d6546,
    cloth: 0xc7b17c,
};
/** 식사터 외형과 불·김의 시간을 소유한다. 시설 효과나 비용은 다루지 않는다. */
export class KitchenResources {
    root = new THREE.Group();
    sprites = new MapSpriteResources();
    cube = new THREE.BoxGeometry(1, 1, 1);
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
    sphere = new THREE.SphereGeometry(1, 8, 6);
    ring = new THREE.TorusGeometry(1, 0.1, 4, 12);
    materials = new Map();
    variants = new Map();
    effects = new THREE.Group();
    flames = [];
    steam = [];
    glow = new THREE.PointLight(0xffa044, 1.5, 3, 2);
    stage = 'weathered';
    elapsed = 0;
    hearthWarmth = 0;
    ignitionRemaining = 0;
    embers = new THREE.Group();
    emberMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcb60,
        transparent: true,
        opacity: 0,
        depthWrite: false,
    });
    hearthHalo = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
        color: 0xffb64a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
    }));
    constructor() {
        this.root.add(this.sprites.root);
        for (const stage of kitchenStages) {
            const group = new THREE.Group();
            group.name = `kitchen-${stage}`;
            this.buildGround(group, stage);
            const structure = new THREE.Group();
            structure.name = `${group.name}-structure`;
            group.add(structure);
            this.buildStove(structure, stage);
            this.buildCanopy(structure, stage);
            this.buildTable(structure, stage);
            this.buildSupplies(group, stage);
            this.variants.set(stage, { root: group, structure });
            this.root.add(group);
        }
        this.buildEffects();
        this.root.add(this.effects);
        this.setStage('weathered');
    }
    material(color) {
        let material = this.materials.get(color);
        if (!material) {
            material = createPixelMaterial(color, {
                strength: { value: 0.42 },
                pattern: 'broad',
            });
            this.materials.set(color, material);
        }
        return material;
    }
    shape(group, geometry, position, size, color) {
        const mesh = new THREE.Mesh(geometry, this.material(color));
        mesh.position.set(...position);
        mesh.scale.set(...size);
        mesh.castShadow = size[1] > 0.08;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    }
    box(group, position, size, color) {
        return this.shape(group, this.cube, position, size, color);
    }
    buildGround(group, stage) {
        const { yard } = kitchenLayout;
        const abandoned = stage === 'weathered';
        const apron = new THREE.Mesh(groundGeometry([
            { x: yard.x - yard.width / 2, z: yard.z - yard.depth / 2 + 0.45 },
            {
                x: yard.x - yard.width / 2 + 0.55,
                z: yard.z - yard.depth / 2 - 0.12,
            },
            { x: yard.x + yard.width / 2 - 0.4, z: yard.z - yard.depth / 2 },
            { x: yard.x + yard.width / 2 + 0.12, z: yard.z - yard.depth / 3 },
            { x: yard.x + yard.width / 2, z: yard.z + yard.depth / 2 - 0.25 },
            { x: yard.x + yard.width / 3, z: yard.z + yard.depth / 2 + 0.12 },
            { x: yard.x - yard.width / 3, z: yard.z + yard.depth / 2 },
            { x: yard.x - yard.width / 2 - 0.12, z: yard.z + yard.depth / 3 },
        ]), this.material(villageColors.earth));
        apron.position.y = 0.019;
        apron.receiveShadow = true;
        group.add(apron);
        // 세 단계 모두 입구를 열어두고 바닥의 정돈 정도로 복구를 보여준다.
        this.box(group, [6.3, 0.019, 3.7], [2.9, 0.025, 1.3], villageColors.path);
        if (stage === 'restored') {
            for (let i = 0; i < 8; i++) {
                this.box(group, [yard.x - 2.7 + i * 0.77, 0.04, 5.77], [0.62, 0.08, 0.3], colors.stone);
                this.box(group, [yard.x + 3.04, 0.04, -1.45 + i * 0.95], [0.3, 0.08, 0.62], colors.stone);
            }
            for (let i = 0; i < 5; i++)
                this.box(group, [5.2 + i * 0.48, 0.035, 3.7], [0.35, 0.055, 0.76], colors.mortar);
        }
        for (let i = 0; i < (abandoned ? 18 : 4); i++) {
            const x = 6.5 + ((i * 1.31) % 5.6);
            const z = i % 2 ? 5.3 : -1.85;
            const grass = this.box(group, [x, 0.14, z], [0.07, 0.27, 0.09], 0x748351);
            grass.rotation.z = ((i % 3) - 1) * 0.3;
        }
    }
    buildStove(group, stage) {
        const { stove } = kitchenLayout;
        const broken = stage === 'weathered';
        const stone = stage === 'restored' ? colors.mortar : colors.stone;
        const sideOffset = 0.69, wallWidth = 0.51;
        this.box(group, [stove.x, 0.06, stove.z], [stove.width, 0.12, stove.depth], colors.soot);
        // 불을 때는 입구를 실제로 비워서 불꽃이 벽에 붙은 그림처럼 보이지 않게 한다.
        for (let row = 0; row < 3; row++) {
            for (const side of [-1, 1]) {
                const block = this.box(group, [stove.x + side * sideOffset, 0.23 + row * 0.22, stove.z], [wallWidth, 0.2, stove.depth], stone);
                if (broken && side === 1) {
                    block.position.y -= row * 0.13;
                    block.rotation.z = row * -0.17;
                    block.position.z += row * 0.035;
                }
            }
            this.box(group, [stove.x, 0.23 + row * 0.22, stove.z - 0.53], [sideOffset * 2 - wallWidth, 0.2, 0.34], stone);
        }
        this.box(group, [stove.x, stove.height, stove.z], [stove.width + 0.08, 0.16, stove.depth + 0.08], stone);
        const pot = new THREE.Group();
        pot.position.set(stove.x, stove.height + 0.24, stove.z);
        if (broken)
            pot.rotation.z = 0.23;
        this.shape(pot, this.sphere, [0, 0.08, 0], [0.61, 0.36, 0.55], colors.iron);
        this.shape(pot, this.cylinder, [0, 0.26, 0], [0.49, 0.06, 0.46], colors.soot);
        const rim = this.shape(pot, this.ring, [0, 0.28, 0], [0.5, 0.46, 0.5], colors.iron);
        rim.rotation.x = Math.PI / 2;
        for (const side of [-1, 1]) {
            const handle = this.shape(pot, this.ring, [side * 0.61, 0.16, 0], [0.15, 0.12, 0.15], colors.iron);
            handle.rotation.y = Math.PI / 2;
        }
        group.add(pot);
        if (broken) {
            for (let i = 0; i < 4; i++) {
                const rubble = this.box(group, [stove.x + 0.45 + i * 0.19, 0.13, stove.z + 0.42], [0.28, 0.23, 0.32], stone);
                rubble.rotation.y = i * 0.8;
            }
        }
        else {
            this.box(group, [stove.x, 0.14, stove.z + 0.3], [0.62, 0.12, 0.65], colors.timber);
            this.box(group, [stove.x + 0.16, 0.24, stove.z + 0.26], [0.15, 0.1, 0.62], colors.board);
        }
    }
    buildCanopy(group, stage) {
        const broken = stage === 'weathered';
        const finished = stage === 'restored';
        const { canopy } = kitchenLayout;
        for (const [index, post] of kitchenPosts.entries()) {
            const height = broken
                ? index === 0
                    ? 1.8
                    : 0.6 + index * 0.18
                : canopy.height;
            this.box(group, [post.x, 0.06, post.z], [0.4, 0.12, 0.4], colors.stone);
            this.box(group, [post.x, height / 2, post.z], [post.width, height, post.depth], finished ? colors.timber : colors.worn);
            if (broken)
                continue;
            const brace = this.box(group, [post.x + (post.x < canopy.x ? 0.22 : -0.22), height - 0.5, post.z], [0.12, 0.66, 0.12], colors.board);
            brace.rotation.z = post.x < canopy.x ? -0.58 : 0.58;
        }
        if (broken) {
            for (let i = 0; i < 5; i++) {
                const plank = this.box(group, [9.7 + i * 0.32, 0.1 + (i % 2) * 0.06, -1.27], [0.24, 0.1, 1.45], colors.worn);
                plank.rotation.y = 0.3 + i * 0.22;
            }
            return;
        }
        const supportOffset = 1.75, beamWidth = 0.17;
        for (const dx of [-supportOffset, supportOffset])
            this.box(group, [canopy.x + dx, canopy.height - 0.09, canopy.z], [beamWidth, 0.19, canopy.depth], colors.timber);
        for (const z of [-1.95, 0.65])
            this.box(group, [canopy.x, canopy.height - 0.09, z], [supportOffset * 2 - beamWidth, 0.19, beamWidth], colors.timber);
        for (let i = 0; i < 12; i++) {
            if (!finished && i > 6)
                continue;
            const plank = this.box(group, [canopy.x - 1.79 + i * 0.325, canopy.height + 0.06, canopy.z], [0.31, 0.09, canopy.depth], finished ? colors.board : colors.worn);
            plank.rotation.x = 0.1;
        }
        if (finished) {
            for (const z of [-2.2, 0.9])
                this.box(group, [canopy.x, canopy.height + (z < 0 ? 0.2 : -0.09), z], [canopy.width + 0.13, 0.15, 0.15], colors.timber);
            // 짧은 천 장식으로 부엌을 구분하고 솥을 가리는 큰 벽은 두지 않는다.
            for (let i = 0; i < 5; i++)
                this.box(group, [canopy.x - 1.02 + i * 0.5, 2.37, 0.94], [0.44, 0.31, 0.03], i % 2 ? 0xbfa973 : colors.cloth);
        }
    }
    buildTable(group, stage) {
        const { table } = kitchenLayout;
        const broken = stage === 'weathered';
        const finished = stage === 'restored';
        const timber = finished ? colors.board : colors.worn;
        for (const dx of [-1.17, 1.17])
            for (const dz of [-0.31, 0.31])
                this.box(group, [table.x + dx, table.height / 2, table.z + dz], [0.15, table.height, 0.15], colors.timber);
        for (let i = 0; i < 4; i++) {
            if (broken && i === 1)
                continue;
            const board = this.box(group, [table.x, table.height, table.z - 0.375 + i * 0.25], [table.width, 0.12, 0.235], timber);
            if (broken)
                board.rotation.z = (i - 2) * 0.045;
        }
        for (const bench of kitchenBenches) {
            for (const dx of [-1.16, 1.16])
                this.box(group, [bench.x + dx, bench.height / 2, bench.z], [0.18, bench.height, 0.28], colors.timber);
            const seat = this.box(group, [bench.x, bench.height, bench.z], [bench.width, 0.13, bench.depth], timber);
            if (broken) {
                seat.rotation.z = 0.1;
                seat.position.y -= 0.15;
            }
        }
        if (broken)
            return;
        if (finished)
            this.box(group, [table.x, table.height + 0.07, table.z], [0.8, 0.015, table.depth + 0.03], colors.cloth);
        for (let i = 0; i < (finished ? 4 : 1); i++) {
            const x = table.x + (i % 2 ? 0.93 : -0.93);
            const z = table.z + (i < 2 ? 0.23 : -0.23);
            this.shape(group, this.sphere, [x, table.height + 0.15, z], [0.17, 0.09, 0.17], 0xd5c7a0);
            this.sprites.add('bowl', {
                x,
                z,
                y: table.height + 0.23,
                width: 0.28,
                depth: 0.26,
                kind: 'ground',
                parent: group,
            });
            this.box(group, [x + 0.26, table.height + 0.079, z], [0.026, 0.02, 0.32], colors.timber);
        }
    }
    buildSupplies(group, stage) {
        const { waterJar } = kitchenLayout;
        this.shape(group, this.sphere, [waterJar.x, 0.44, waterJar.z], [0.36, 0.45, 0.36], colors.clay);
        this.shape(group, this.cylinder, [waterJar.x, 0.84, waterJar.z], [0.25, 0.08, 0.25], colors.soot);
        if (stage !== 'weathered') {
            this.sprites.add('jar-lid', {
                x: waterJar.x,
                z: waterJar.z,
                y: 0.905,
                width: 0.52,
                depth: 0.5,
                kind: 'ground',
                parent: group,
            });
            // 바구니는 기존 물항아리의 발밑 범위 안에 두고 낮은 몸체와 앞면을 조합한다.
            this.shape(group, this.cylinder, [waterJar.x - 0.12, 0.14, waterJar.z + 0.16], [0.2, 0.18, 0.19], colors.cloth);
            this.sprites.add('basket', {
                x: waterJar.x - 0.12,
                z: waterJar.z + 0.34,
                y: 0.05,
                width: 0.46,
                parent: group,
            });
            const { stove } = kitchenLayout;
            for (let i = 0; i < 4; i++) {
                const log = this.shape(group, this.cylinder, [stove.x + 0.35 + i * 0.15, 0.11, stove.z - 0.36], [0.07, 0.6, 0.07], colors.timber);
                log.rotation.x = Math.PI / 2;
            }
        }
    }
    buildEffects() {
        const { stove } = kitchenLayout;
        const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xf39e3e });
        const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffdc76 });
        for (let i = 0; i < 5; i++) {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), i % 2 ? coreMaterial : fireMaterial);
            flame.position.set(stove.x - 0.24 + i * 0.12, 0.35, stove.z + 0.53);
            this.flames.push(flame);
            this.effects.add(flame);
        }
        this.glow.position.set(stove.x, 0.4, stove.z + 0.9);
        this.effects.add(this.glow);
        this.hearthHalo.rotation.x = -Math.PI / 2;
        this.hearthHalo.position.set(stove.x, 0.027, stove.z + 0.95);
        this.hearthHalo.scale.set(1.1, 0.65, 1);
        this.effects.add(this.hearthHalo);
        for (let i = 0; i < 12; i++) {
            const ember = new THREE.Mesh(this.cube, this.emberMaterial);
            ember.layers.set(resourceLayers.effects);
            this.embers.add(ember);
        }
        this.effects.add(this.embers);
        for (let i = 0; i < 6; i++) {
            const puff = new THREE.Mesh(this.sphere, new THREE.MeshBasicMaterial({
                color: 0xe8e6d3,
                transparent: true,
                opacity: 0,
                depthWrite: false,
            }));
            // 김은 깊이 재기록에서 제외하고 아타호를 그린 뒤 투명하게 합성한다.
            puff.layers.set(resourceLayers.effects);
            this.steam.push(puff);
            this.effects.add(puff);
        }
    }
    setStage(stage) {
        this.stage = stage;
        for (const [name, { root }] of this.variants)
            root.visible = name === stage;
        this.effects.visible = stage !== 'weathered';
        this.update(0);
    }
    get interactionStructure() {
        for (const { root, structure } of this.variants.values())
            if (root.visible)
                return structure;
        return undefined;
    }
    setHearthWarmth(warmth) {
        const next = Math.max(0, Math.min(1, warmth));
        // 서서히 식는 동안에는 재점화하지 않고, 투입으로 온기가 증가한 순간에만 불씨를 낸다.
        if (next > this.hearthWarmth + 0.01)
            this.ignitionRemaining = 0.95;
        this.hearthWarmth = next;
    }
    update(dt) {
        if (this.stage === 'weathered')
            return;
        const delta = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
        this.elapsed += delta;
        this.ignitionRemaining = Math.max(0, this.ignitionRemaining - delta);
        const ignition = this.ignitionRemaining / 0.95;
        const flare = Math.sin(ignition * Math.PI);
        this.embers.visible = ignition > 0;
        this.emberMaterial.opacity = ignition * 0.95;
        const flight = 1 - ignition;
        for (const [i, ember] of this.embers.children.entries()) {
            const angle = i * 2.4;
            const spread = flight * (0.22 + (i % 4) * 0.11);
            ember.position.set(kitchenLayout.stove.x + Math.cos(angle) * spread, 0.38 + flight * (1.15 + (i % 3) * 0.22) - flight * flight * 0.42, kitchenLayout.stove.z + 0.72 + Math.sin(angle) * spread);
            ember.scale.setScalar(0.035 + (i % 3) * 0.012);
        }
        this.hearthHalo.material.opacity = this.hearthWarmth * 0.21 + flare * 0.14;
        const { stove } = kitchenLayout;
        for (const [i, flame] of this.flames.entries()) {
            const height = (0.25 + Math.sin(this.elapsed * 8 + i * 1.7) * 0.065) *
                (1 + this.hearthWarmth * 1.5 + flare * 1.2);
            flame.scale.set((0.07 + (i % 2) * 0.02) * (1 + this.hearthWarmth * 0.7 + flare * 0.4), height, 0.065 * (1 + this.hearthWarmth * 0.4));
            flame.position.y = 0.22 + height / 2;
            flame.rotation.z = Math.sin(this.elapsed * 5 + i) * 0.14;
        }
        this.glow.intensity =
            (1.1 + Math.sin(this.elapsed * 7) * 0.16) *
                (1 + this.hearthWarmth * 2 + flare);
        this.glow.distance = 3 + this.hearthWarmth * 1.8;
        for (const [i, puff] of this.steam.entries()) {
            const phase = (this.elapsed * (0.34 + this.hearthWarmth * 0.16) +
                i / this.steam.length) %
                1;
            const size = (0.055 + phase * 0.15) * (1 + this.hearthWarmth * 0.85);
            puff.position.set(stove.x + Math.sin(phase * 5 + i) * phase * 0.16, 1.38 + phase * 1.2, stove.z + 0.1 + phase * 0.12);
            puff.scale.set(size, size * 1.25, size);
            puff.material.opacity =
                Math.sin(phase * Math.PI) * (0.29 + this.hearthWarmth * 0.3);
        }
    }
    get diagnostics() {
        return {
            stage: this.stage,
            active: this.effects.visible,
            hearthWarmth: this.hearthWarmth,
            ignitionRemaining: this.ignitionRemaining,
            embersVisible: this.embers.visible,
            flameHeight: Math.max(...this.flames.map((flame) => flame.scale.y)),
            glowIntensity: this.glow.intensity,
            steamOpacity: Math.max(...this.steam.map((puff) => puff.material.opacity)),
            time: this.elapsed,
        };
    }
    async load() {
        await this.sprites.load();
    }
    face(camera) {
        this.sprites.face(camera);
    }
    dispose() {
        this.sprites.dispose();
        const geometries = new Set();
        const materials = new Set();
        this.root.traverse((object) => {
            if (!(object instanceof THREE.Mesh))
                return;
            geometries.add(object.geometry);
            if (Array.isArray(object.material))
                object.material.forEach((material) => materials.add(material));
            else
                materials.add(object.material);
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
    }
}
