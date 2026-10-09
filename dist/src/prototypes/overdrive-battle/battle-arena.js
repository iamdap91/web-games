import * as THREE from 'three';
import { EnvironmentResources, setResourceOutline, } from '../../rendering/environment-resources.js';
import { villageColors } from '../../rendering/pixel-material.js';
import { treeShape } from '../../rendering/tree-shape.js';
import { battleRules } from './world.js';
/** 경기장 배치를 유지하면서 공용 리소스의 외형과 재질을 적용하고 정리한다. */
export class BattleArena {
    root = new THREE.Group();
    resources = new EnvironmentResources();
    cube = new THREE.BoxGeometry(1, 1, 1);
    constructor() {
        this.buildGround();
        this.buildGate();
        this.buildSurroundings();
    }
    box(x, y, z, width, height, depth, color, appearance = { surface: 'stone', outline: 'rock' }) {
        const mesh = new THREE.Mesh(this.cube, this.resources.material(appearance.surface, color));
        mesh.position.set(x, y, z);
        mesh.scale.set(width, height, depth);
        mesh.receiveShadow = true;
        mesh.castShadow = height > 0.2;
        setResourceOutline(mesh, appearance.outline);
        this.root.add(mesh);
        return mesh;
    }
    buildGround() {
        this.box(0, -0.4, 0, 36, 0.5, 32, villageColors.grass, {
            surface: 'grass',
            outline: 'ground',
        });
        this.box(0, -0.13, 0, battleRules.width + 0.8, 0.25, battleRules.depth + 0.8, villageColors.earth, { surface: 'earth', outline: 'ground' });
        this.box(0, -0.008, 0, battleRules.width, 0.05, battleRules.depth, villageColors.path, { surface: 'path', outline: 'ground' });
        for (let i = -6; i <= 6; i++)
            for (const side of [-1, 1])
                this.box(i, 0.035, side * 4.05, 0.95, 0.12, 0.28, villageColors.stone);
        for (let i = -3; i <= 3; i++)
            for (const side of [-1, 1])
                this.box(side * 6.6, 0.035, i, 0.25, 0.13, 0.95, villageColors.stone);
        for (let i = 0; i < 9; i++) {
            const angle = (i / 9) * Math.PI * 2;
            const stone = this.box(Math.cos(angle) * 2.4, 0.024, Math.sin(angle) * 2.4, 0.8, 0.018, 0.13, 0x9b8a65, { surface: 'path', outline: 'ground' });
            stone.rotation.y = -angle + Math.PI / 2;
        }
    }
    buildGate() {
        const wood = { surface: 'wood', outline: 'fence' };
        for (const x of [-5, 5]) {
            this.box(x, 0.3, -5.1, 1.25, 0.6, 1.2, 0x8a8b70);
            this.box(x, 1.7, -5.1, 0.5, 2.4, 0.5, villageColors.stone);
            this.box(x, 2.9, -5.1, 1.25, 0.25, 1.2, 0x64756a);
            this.box(x, 2.5, -5.1, 0.8, 0.55, 0.8, 0xffc878);
            const light = new THREE.PointLight(0xffb45e, 8, 5);
            light.position.set(x, 2.4, -4.8);
            light.layers.enableAll();
            this.root.add(light);
        }
        this.box(0, 0.16, -5.5, 6.8, 0.3, 1.4, 0x8a8b70);
        for (const x of [-2.9, 2.9]) {
            this.box(x, 1.9, -6, 0.42, 3.5, 0.42, villageColors.wood, wood);
            this.box(x, 0.4, -6, 0.9, 0.8, 0.9, villageColors.stone);
        }
        this.box(0, 3.5, -6, 7.8, 0.4, 0.7, villageColors.wood, wood);
        this.box(0, 3.88, -6, 8.8, 0.4, 1.2, 0x64756a);
        this.box(0, 3.14, -6, 1.5, 0.75, 0.16, 0xab8358, wood);
    }
    buildSurroundings() {
        const crownTop = treeShape.crowns.at(-1).y + treeShape.crownHeight / 2;
        for (let i = 0; i < 30; i++) {
            const x = i < 16 ? (i - 7.5) * 1.7 : (i % 2 ? -1 : 1) * (9 + (i % 3));
            const z = i < 16 ? -8.5 - (i % 3) * 1.6 : (i - 22) * 1.6;
            const height = 3 + (i % 4) * 0.65;
            const tree = this.resources.createTree(1);
            // 새 수관 모양도 기존 나무의 높이와 폭에 맞춰 전투 시야를 유지한다.
            const width = 1.6 / treeShape.crowns[0].radius;
            tree.scale.set(width, (height + 1.8) / crownTop, width);
            tree.position.set(x, 0, z);
            this.root.add(tree);
        }
        for (let i = 0; i < 28; i++) {
            const side = i % 2 ? 1 : -1;
            const x = side * (7.2 + (i % 4) * 0.5);
            const z = -4 + (i / 28) * 10;
            const radius = 0.25 + (i % 3) * 0.13;
            const rock = this.resources.createRock({
                radius,
                rotation: 0,
                color: 0x8a8b70,
            });
            rock.position.set(x, 0.08, z);
            rock.scale.set(radius, radius * 0.6, radius);
            this.root.add(rock);
        }
    }
    dispose() {
        this.root.removeFromParent();
        this.root.clear();
        this.cube.dispose();
        this.resources.dispose();
    }
}
