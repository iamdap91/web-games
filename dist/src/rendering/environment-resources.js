import * as THREE from 'three';
import { treeShape } from './tree-shape.js';
import { createPixelMaterial, villageColors } from './pixel-material.js';
import { outlineGroups, surfaces, } from './surface-types.js';
export function setResourceOutline(object, kind) {
    const layer = outlineGroups.find(({ id }) => id === kind).layer;
    object.traverse((child) => child.layers.enable(layer));
}
/** 뷰어와 개간이 함께 쓰는 모양·재질과 그 GPU 자원을 소유한다. */
export class EnvironmentResources {
    appearance;
    cube = new THREE.BoxGeometry(1, 1, 1);
    stone = new THREE.DodecahedronGeometry(1, 0);
    crown = new THREE.ConeGeometry(1, treeShape.crownHeight, 7);
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
        for (let i = 0; i < 3; i++) {
            const branch = new THREE.Mesh(this.cube, this.material('wood', villageColors.wood));
            branch.position.set((i - 1) * 0.14, 0.38, 0);
            // 교차하는 가지의 앞뒷면이 같은 평면에서 경쟁하지 않게 두께를 달리한다.
            branch.scale.set(0.08, 0.76, 0.075 + i * 0.01);
            branch.rotation.z = (i - 1) * -0.3;
            const leaves = new THREE.Mesh(this.stone, this.material('leaves', [0x607955, 0x738953, 0x88975f][i]));
            leaves.position.set((i - 1) * 0.18, 0.67 + (i % 2) * 0.2, (i - 1) * 0.06);
            leaves.scale.set(0.35, 0.33, 0.34);
            branch.castShadow = true;
            branch.receiveShadow = true;
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            group.add(branch, leaves);
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
        const trunk = new THREE.Mesh(this.cube, this.material('wood', villageColors.wood));
        trunk.position.y = treeShape.trunkHeight / 2;
        trunk.scale.set(treeShape.trunkWidth, treeShape.trunkHeight, treeShape.trunkWidth);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        for (const [tier, crown] of treeShape.crowns.entries()) {
            const leaves = new THREE.Mesh(this.crown, this.material('leaves', [0x607955, 0x738953, 0x88975f][tier]));
            leaves.position.y = crown.y;
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
            geometry === this.crown);
    }
    ownsMaterial(material) {
        return [...this.materials.values()].some((entry) => entry === material);
    }
    dispose() {
        this.cube.dispose();
        this.stone.dispose();
        this.crown.dispose();
        this.materials.forEach((material) => material.dispose());
    }
}
