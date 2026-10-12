import * as THREE from 'three';
import { treeShape } from './tree-shape.js';
import { createPixelMaterial, villageColors, } from '../../rendering/pixel-material.js';
import { outlineGroups, surfaces, } from '../../rendering/surface-types.js';
export function setResourceOutline(object, kind) {
    const layer = outlineGroups.find(({ id }) => id === kind).layer;
    object.traverse((child) => child.layers.enable(layer));
}
/** 뷰어와 개간이 함께 쓰는 모양·재질과 그 GPU 자원을 소유한다. */
export class EnvironmentResources {
    appearance;
    cube = new THREE.BoxGeometry(1, 1, 1);
    stone = new THREE.DodecahedronGeometry(1, 0);
    trunk = new THREE.CylinderGeometry(treeShape.trunkWidth * 0.36, treeShape.trunkWidth / 2, treeShape.trunkHeight, 7);
    crown = new THREE.LatheGeometry(treeShape.crownProfile.map(({ radius, y }) => new THREE.Vector2(radius, y)), 8).toNonIndexed();
    strengths = new Map(surfaces.map(({ id, recommendedStrength }) => [
        id,
        { value: recommendedStrength / 100 },
    ]));
    materials = new Map();
    constructor(appearance = {}) {
        this.appearance = appearance;
    }
    material(kind, color) {
        const key = `${kind}-${color}`;
        let material = this.materials.get(key);
        if (!material) {
            material = createPixelMaterial(color, {
                strength: this.strengths.get(kind),
                pattern: 'broad',
            });
            // 무늬는 원색으로 생성한 뒤 장면의 팔레트를 적용해 색 변경으로 질감이 사라지지 않게 한다.
            if (this.appearance.recolor)
                material.color.setHex(this.appearance.recolor(kind, color));
            material.flatShading = true;
            this.materials.set(key, material);
        }
        return material;
    }
    setStrength(kind, percent) {
        if (Number.isFinite(percent))
            this.strengths.get(kind).value =
                Math.max(0, Math.min(100, percent)) / 100;
    }
    createBrush() {
        const group = new THREE.Group();
        // 넓고 낮은 잎 덩어리를 겹쳐 구슬 세 개처럼 떠 보이던 잡목을 바닥에 붙인다.
        for (const [i, [x, y, z, width, height, depth]] of [
            [-0.21, 0.31, 0.02, 0.36, 0.31, 0.31],
            [0.14, 0.43, -0.05, 0.38, 0.4, 0.32],
            [0.24, 0.24, 0.19, 0.28, 0.24, 0.25],
        ].entries()) {
            const leaves = new THREE.Mesh(this.stone, this.material('leaves', [0x607955, 0x738953, 0x88975f][i]));
            leaves.position.set(x, y, z);
            leaves.scale.set(width, height, depth);
            leaves.rotation.y = i * 1.1;
            leaves.castShadow = leaves.receiveShadow = true;
            group.add(leaves);
        }
        for (const x of [-0.18, 0.12]) {
            const branch = new THREE.Mesh(this.cube, this.material('wood', villageColors.wood));
            branch.position.set(x, 0.19, 0.09);
            branch.scale.set(0.055, 0.38, 0.055);
            branch.rotation.z = -x * 0.8;
            branch.castShadow = branch.receiveShadow = true;
            group.add(branch);
        }
        setResourceOutline(group, 'brush');
        return group;
    }
    createRock({ radius, rotation = 0.7, color = villageColors.stone, }) {
        const rock = new THREE.Mesh(this.stone, this.material('stone', color));
        // 뷰어의 큰 바위 비율을 유지하되 게임의 충돌 반경 안에 들어가게 한다.
        rock.scale.set(radius, radius * (0.78 / 1.05), radius * (0.9 / 1.05));
        this.stone.computeBoundingBox();
        rock.position.y = -this.stone.boundingBox.min.y * rock.scale.y;
        rock.rotation.y = rotation;
        rock.castShadow = true;
        rock.receiveShadow = true;
        setResourceOutline(rock, 'rock');
        return rock;
    }
    createTree(size) {
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(this.trunk, this.material('wood', villageColors.wood));
        trunk.position.y = treeShape.trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        for (const side of [-1, 1]) {
            const branch = new THREE.Mesh(this.cube, this.material('wood', villageColors.wood));
            branch.position.set(side * 0.16, 0.36, side * 0.04);
            branch.scale.set(0.1, 0.65, 0.1);
            branch.rotation.z = side * -0.48;
            branch.castShadow = branch.receiveShadow = true;
            trunk.add(branch);
        }
        for (const [tier, crown] of treeShape.crowns.entries()) {
            const leaves = new THREE.Mesh(this.crown, this.material('leaves', [0x607955, 0x738953, 0x88975f][tier]));
            leaves.position.y = crown.y;
            leaves.rotation.y = tier * 0.39;
            leaves.scale.set(crown.radius, 1, crown.radius);
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            group.add(leaves);
        }
        group.scale.setScalar(size);
        setResourceOutline(group, 'tree');
        return group;
    }
    ownsGeometry(geometry) {
        return (geometry === this.cube ||
            geometry === this.stone ||
            geometry === this.crown ||
            geometry === this.trunk);
    }
    ownsMaterial(material) {
        return [...this.materials.values()].some((entry) => entry === material);
    }
    dispose() {
        this.cube.dispose();
        this.stone.dispose();
        this.crown.dispose();
        this.trunk.dispose();
        this.materials.forEach((material) => material.dispose());
    }
}
