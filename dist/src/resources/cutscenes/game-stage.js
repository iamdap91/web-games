import * as THREE from 'three';
import { BattleArena } from '../../prototypes/overdrive-battle/battle-arena.js';
import { EnvironmentResources } from '../environment/environment-resources.js';
import { DojoResources } from '../facilities/dojo/dojo-resources.js';
import { MapSpriteResources } from '../props/map-sprite-resources.js';
import { mapStyles, recolorMapMaterial, } from '../../rendering/map-art-direction.js';
/** 계단 모델과 배우가 같은 동선을 사용한다. */
export function stairAngle(progress) {
    return progress * Math.PI * 4.8 - 0.6;
}
export function stairPoint(progress) {
    const angle = stairAngle(progress);
    return {
        x: Math.sin(angle) * 5.5,
        y: progress * 15,
        z: Math.cos(angle) * 5.5,
    };
}
/** 인게임과 같은 모델·재질을 독립 화면의 자원으로 소유하며 진행 규칙은 갖지 않는다. */
export class GameStages {
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power',
    });
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1280 / 720, 0.25, 240);
    sky = new THREE.HemisphereLight();
    sun = new THREE.DirectionalLight();
    stages = new Map();
    smear = { value: new THREE.Vector3() };
    smearMaterials = new Map();
    forward = new THREE.Vector3();
    corner = new THREE.Vector3();
    focus = new THREE.Vector3();
    loadPromise;
    disposed = false;
    constructor() {
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(640, 360, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearAlpha(0);
        this.camera.layers.enableAll();
        this.sun.position.set(-12, 24, 14);
        this.scene.add(this.sky, this.sun);
        this.stages.set('arena', this.arena());
        this.stages.set('run', this.running());
        this.stages.set('cliff', this.cliff());
        this.stages.set('stairs', this.stairs());
        for (const stage of this.stages.values()) {
            stage.root.visible = false;
            this.scene.add(stage.root);
        }
    }
    load() {
        this.loadPromise ??= Promise.all([
            ...Array.from(this.stages.values(), (stage) => stage.load()),
        ]).then(() => undefined);
        return this.loadPromise;
    }
    background(context, kind, camera, time, options = {}) {
        this.draw(context, kind, camera, time, options, 'background');
    }
    foreground(context, kind, camera, time, options = {}) {
        this.draw(context, kind, camera, time, options, 'foreground');
    }
    draw(context, kind, pose, _time, options, pass) {
        if (this.disposed)
            return;
        const stage = this.stages.get(kind);
        for (const candidate of this.stages.values())
            candidate.root.visible = candidate === stage;
        this.setCamera(pose, options.principalY ?? 360, options.viewOffsetX ?? 0);
        stage.face(this.camera);
        this.sky.color.setHex(stage.style.sky);
        this.sky.groundColor.setHex(stage.style.shade);
        this.sky.intensity = stage.style.skyStrength;
        this.sun.color.setHex(stage.style.sunlight);
        this.sun.intensity = stage.style.sunStrength;
        this.scene.fog = new THREE.Fog(stage.style.background, 38, 140);
        const background = pass === 'background';
        this.renderer.setClearColor(stage.style.background, background ? 1 : 0);
        this.smear.value.set(background ? (options.smear?.x ?? 0) : 0, background ? (options.smear?.y ?? 0) : 0, background ? (options.smear?.z ?? 0) : 0);
        const foreground = new Set();
        if (options.focus) {
            this.focus.set(options.focus.x, options.focus.y, options.focus.z);
            this.camera.getWorldDirection(this.forward);
            for (const prop of stage.props)
                if (this.inForeground(prop, this.focus))
                    foreground.add(prop.object);
        }
        // 지면과 건물은 배경에 남기고 온전히 카메라 앞에 있는 소품만 분리한다.
        for (const prop of stage.props)
            prop.object.visible = background !== foreground.has(prop.object);
        if (!background) {
            stage.root.traverse((object) => {
                if (object instanceof THREE.Mesh &&
                    !this.belongsToSelected(object, foreground))
                    object.visible = false;
            });
        }
        this.renderer.render(this.scene, this.camera);
        context.save();
        context.imageSmoothingEnabled = false;
        context.drawImage(this.renderer.domElement, 0, 0, 1280, 720);
        context.restore();
        stage.root.traverse((object) => {
            if (object instanceof THREE.Mesh)
                object.visible = true;
        });
        for (const prop of stage.props)
            prop.object.visible = true;
    }
    belongsToSelected(object, selected) {
        let candidate = object;
        while (candidate) {
            if (selected.has(candidate))
                return true;
            candidate = candidate.parent;
        }
        return false;
    }
    setCamera(pose, principalY, offsetX) {
        this.camera.fov =
            (2 * Math.atan(360 / (pose.focal ?? 880)) * 180) / Math.PI;
        this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
        this.camera.rotateZ(pose.roll ?? 0);
        this.camera.setViewOffset(1280, 720, offsetX, 360 - principalY, 1280, 720);
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
    }
    inForeground(prop, focus) {
        const size = prop.bounds.getSize(new THREE.Vector3());
        if (size.y < 0.6 || size.x > 5 || size.z > 5)
            return false;
        const focusDepth = this.corner
            .copy(focus)
            .sub(this.camera.position)
            .dot(this.forward);
        let nearestFocus = Infinity;
        let furthestDepth = -Infinity;
        for (const x of [prop.bounds.min.x, prop.bounds.max.x])
            for (const y of [prop.bounds.min.y, prop.bounds.max.y])
                for (const z of [prop.bounds.min.z, prop.bounds.max.z]) {
                    this.corner.set(x, y, z);
                    nearestFocus = Math.min(nearestFocus, this.corner.distanceTo(focus));
                    furthestDepth = Math.max(furthestDepth, this.corner.sub(this.camera.position).dot(this.forward));
                }
        return nearestFocus > 3.5 && furthestDepth < focusDepth - 1.5;
    }
    collectProps(stage, root) {
        root.updateMatrixWorld(true);
        for (const object of root.children) {
            // 공유 스프라이트 컨테이너는 이미지마다 독립된 소품으로 분류한다.
            if (object instanceof THREE.Group &&
                object.children.length &&
                object.children.every((child) => child instanceof THREE.Mesh &&
                    child.geometry instanceof THREE.PlaneGeometry)) {
                this.collectProps(stage, object);
                continue;
            }
            if (object.userData.cutsceneGround === true)
                continue;
            const bounds = new THREE.Box3().setFromObject(object);
            if (bounds.isEmpty() || bounds.max.y - bounds.min.y < 0.15)
                continue;
            stage.props.push({ object, bounds });
            this.stretchMaterials(object);
        }
    }
    stretchMaterials(root) {
        root.traverse((object) => {
            if (!(object instanceof THREE.Mesh) ||
                object.geometry instanceof THREE.PlaneGeometry)
                return;
            const prepare = (original) => {
                let material = this.smearMaterials.get(original);
                if (material)
                    return material;
                material = original.clone();
                const originalCompile = original.onBeforeCompile;
                material.onBeforeCompile = (shader, renderer) => {
                    originalCompile.call(original, shader, renderer);
                    shader.uniforms.cutsceneSmear = this.smear;
                    shader.vertexShader = shader.vertexShader
                        .replace('#include <common>', '#include <common>\nuniform vec3 cutsceneSmear;')
                        .replace('#include <project_vertex>', `
              vec4 cutsceneWorld = modelMatrix * vec4(transformed, 1.0);
              vec3 cutsceneDirection = cutsceneSmear / max(length(cutsceneSmear), 0.00001);
              vec3 cutsceneScale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
              float cutsceneExtent = max(0.3, dot(abs(cutsceneDirection), cutsceneScale));
              float cutsceneEdge = clamp(0.5 + dot(mat3(modelMatrix) * transformed, cutsceneDirection) / (2.0 * cutsceneExtent), 0.0, 1.0);
              cutsceneWorld.xyz += cutsceneSmear * cutsceneEdge;
              vec4 mvPosition = viewMatrix * cutsceneWorld;
              gl_Position = projectionMatrix * mvPosition;
            `);
                };
                material.customProgramCacheKey = () => `${original.customProgramCacheKey()}-cutscene-smear`;
                this.smearMaterials.set(original, material);
                return material;
            };
            object.material = Array.isArray(object.material)
                ? object.material.map(prepare)
                : prepare(object.material);
        });
    }
    arena() {
        const arena = new BattleArena(mapStyles.battle);
        const stage = {
            root: new THREE.Group(),
            style: mapStyles.battle,
            props: [],
            load: () => arena.load(),
            face: (camera) => arena.face(camera),
            dispose: () => arena.dispose(),
        };
        stage.root.add(arena.root);
        this.collectProps(stage, arena.root);
        return stage;
    }
    construction(style) {
        const resources = new EnvironmentResources({
            recolor: (kind, color) => recolorMapMaterial(style, kind, color),
        });
        const sprites = new MapSpriteResources();
        const geometries = [];
        const root = new THREE.Group();
        root.add(sprites.root);
        return {
            root,
            style,
            resources,
            sprites,
            geometries,
            props: [],
            load: () => sprites.load(),
            face: (camera) => sprites.face(camera),
            dispose: () => {
                sprites.dispose();
                resources.dispose();
                geometries.forEach((geometry) => geometry.dispose());
            },
        };
    }
    ground(stage, width, depth, x = 0, z = 0) {
        const geometry = new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2);
        stage.geometries.push(geometry);
        const ground = new THREE.Mesh(geometry, stage.resources.material('grass', 0x98a775));
        ground.userData.cutsceneGround = true;
        ground.position.set(x, -0.04, z);
        stage.root.add(ground);
    }
    stone(stage, position, size) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        stage.geometries.push(geometry);
        const stone = new THREE.Mesh(geometry, stage.resources.material('stone', 0xaaa389));
        stone.userData.cutsceneGround = true;
        stone.position.set(position.x, position.y, position.z);
        stage.root.add(stone);
    }
    tree(stage, x, z, size) {
        const tree = stage.resources.createTree(size);
        tree.position.set(x, 0, z);
        tree.rotation.y = x * 0.31 + z * 0.17;
        stage.root.add(tree);
    }
    rock(stage, position, radius, height = 1) {
        const rock = stage.resources.createRock({
            radius,
            rotation: position.x + position.y,
        });
        rock.scale.y *= height;
        rock.position.x = position.x;
        rock.position.y = rock.position.y * height + position.y;
        rock.position.z = position.z;
        stage.root.add(rock);
    }
    running() {
        const stage = this.construction(mapStyles.deepForest);
        this.ground(stage, 100, 150, 0, 35);
        const pathGeometry = new THREE.PlaneGeometry(6.5, 130).rotateX(-Math.PI / 2);
        stage.geometries.push(pathGeometry);
        const path = new THREE.Mesh(pathGeometry, stage.resources.material('path', 0xc7b48c));
        path.userData.cutsceneGround = true;
        path.position.set(0, -0.025, 33);
        stage.root.add(path);
        for (let index = 0; index < 26; index++) {
            const z = -14 + index * 4.2;
            for (const side of [-1, 1]) {
                const x = side * (7.8 + (index % 3) * 1.1);
                this.tree(stage, x, z, 1.45 + (index % 4) * 0.18);
                if (index % 3 === 0)
                    this.rock(stage, { x: side * 5, y: 0, z: z + 1.3 }, 0.7);
                stage.sprites.add(index % 2 ? 'fern' : 'grass', {
                    x: side * 4,
                    z,
                    width: 0.8,
                });
                if (index % 3 === 1)
                    stage.sprites.add('dry-leaves', {
                        x: side * 3.5,
                        z: z + 1.5,
                        width: 1.1,
                        depth: 0.7,
                        kind: 'ground',
                    });
            }
        }
        const dojo = new DojoResources({ includeYard: false });
        dojo.setStage('restored');
        dojo.root.position.set(10, 0, 49);
        dojo.root.rotation.y = -Math.PI / 2;
        stage.root.add(dojo.root);
        this.collectProps(stage, stage.root);
        // 건물 전체가 주연을 가리지 않도록 공유 건물은 배경에만 둔다.
        const dojoIndex = stage.props.findIndex((prop) => prop.object === dojo.root);
        if (dojoIndex >= 0)
            stage.props.splice(dojoIndex, 1);
        const dispose = stage.dispose;
        return {
            ...stage,
            dispose: () => {
                dojo.dispose();
                dispose();
            },
        };
    }
    cliff() {
        const stage = this.construction(mapStyles.ridge);
        this.ground(stage, 90, 90);
        this.stone(stage, { x: 0, y: -0.18, z: 0 }, { x: 13, y: 0.3, z: 13 });
        for (let layer = 0; layer < 9; layer++)
            for (let index = 0; index < 16; index++) {
                const angle = (index / 16) * Math.PI * 2 + (layer % 2) * 0.07;
                const radius = 11.8 + (index % 3) * 0.8;
                this.rock(stage, {
                    x: Math.sin(angle) * radius,
                    y: layer * 8.3 - 0.5,
                    z: Math.cos(angle) * radius,
                }, 3.5 + (index % 3) * 0.35, 2.3);
            }
        for (const side of [-1, 1]) {
            this.tree(stage, side * 9, 7, 1.8);
            this.tree(stage, side * 12, -7, 2.1);
            stage.sprites.add('vine', { x: side * 9.5, y: 1, z: -5, width: 1.6 });
            stage.sprites.add('moss', {
                x: side * 5,
                z: 1,
                width: 1.6,
                depth: 0.9,
                kind: 'ground',
            });
            stage.sprites.add('basalt-shards', { x: side * 6, z: 3, width: 0.85 });
        }
        this.collectProps(stage, stage.root);
        return stage;
    }
    stairs() {
        const stage = this.construction(mapStyles.ridge);
        this.ground(stage, 90, 90);
        for (let index = 0; index < 60; index++) {
            const a = stairPoint(index / 60);
            const b = stairPoint((index + 1) / 60);
            const angle = stairAngle(index / 60);
            const dx = Math.sin(angle) * 1.35;
            const dz = Math.cos(angle) * 1.35;
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([
                a.x - dx,
                a.y,
                a.z - dz,
                a.x + dx,
                a.y,
                a.z + dz,
                b.x + dx,
                a.y,
                b.z + dz,
                a.x - dx,
                a.y,
                a.z - dz,
                b.x + dx,
                a.y,
                b.z + dz,
                b.x - dx,
                a.y,
                b.z - dz,
                b.x - dx,
                a.y,
                b.z - dz,
                b.x + dx,
                b.y,
                b.z + dz,
                b.x + dx,
                a.y,
                b.z + dz,
                b.x - dx,
                a.y,
                b.z - dz,
                b.x - dx,
                b.y,
                b.z - dz,
                b.x + dx,
                b.y,
                b.z + dz,
            ], 3));
            geometry.computeVertexNormals();
            stage.geometries.push(geometry);
            const material = stage.resources.material('stone', index % 2 ? 0xaaa389 : 0xb1af8b);
            material.side = THREE.DoubleSide;
            const step = new THREE.Mesh(geometry, material);
            step.userData.cutsceneGround = true;
            stage.root.add(step);
        }
        const top = stairPoint(1);
        this.stone(stage, { x: top.x, y: 14.7, z: top.z }, { x: 8.5, y: 0.6, z: 8.5 });
        for (let index = 0; index < 16; index++) {
            const angle = (index / 16) * Math.PI * 2;
            const radius = 12.5 + (index % 3);
            this.rock(stage, { x: Math.sin(angle) * radius, y: 0, z: Math.cos(angle) * radius }, 2.2 + (index % 3) * 0.3, 2.2);
            if (index % 3 === 0)
                this.tree(stage, Math.sin(angle) * 16, Math.cos(angle) * 16, 1.9);
            stage.sprites.add(index % 2 ? 'fern' : 'grass', {
                x: Math.sin(angle) * 9,
                z: Math.cos(angle) * 9,
                width: 0.9,
            });
        }
        stage.sprites.add('stone-plaque', {
            x: top.x + 3.5,
            y: 15,
            z: top.z + 3.4,
            width: 0.6,
        });
        this.collectProps(stage, stage.root);
        return stage;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const stage of this.stages.values())
            stage.dispose();
        this.stages.clear();
        this.smearMaterials.forEach((material) => material.dispose());
        this.smearMaterials.clear();
        this.scene.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
