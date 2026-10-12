import * as THREE from 'three';
import { setResourceOutline, } from '../../resources/environment/environment-resources.js';
import { outlineGroups, resourceLayers, } from '../../rendering/surface-types.js';
import { treeRules, } from './giant-tree.js';
const treeLayer = outlineGroups.find(({ id }) => id === 'tree').layer;
/** 거목의 패인 밑동·흔들림·시야 가림과 자체 GPU 자원을 소유한다. */
export class GiantTreeView {
    group = new THREE.Group();
    tree;
    stump;
    meshes = [];
    materials = [];
    geometries = [];
    raycaster = new THREE.Raycaster();
    actorBounds = new THREE.Box3();
    viewDirection = new THREE.Vector3();
    probe = new THREE.Vector3();
    rayOrigin = new THREE.Vector3();
    axis = new THREE.Vector3();
    hitAge = Infinity;
    heading = { x: 0, z: -1 };
    visibility = 1;
    constructor(resources, placement = treeRules) {
        this.group.position.set(placement.center.x, 0.025, placement.center.z);
        this.tree = resources.createTree(treeRules.scale);
        const trunk = this.tree.children[0];
        if (!(trunk instanceof THREE.Mesh))
            throw new Error('거목의 줄기가 없습니다.');
        const trunkGeometry = new THREE.CylinderGeometry(treeRules.radius / treeRules.scale, treeRules.radius / treeRules.scale, treeRules.trunkHeight / treeRules.scale, 8);
        this.geometries.push(trunkGeometry);
        trunk.geometry = trunkGeometry;
        trunk.scale.set(1, 1, 1);
        trunk.position.y = treeRules.trunkHeight / treeRules.scale / 2;
        for (const crown of this.tree.children.slice(1))
            crown.position.y += treeRules.crownLift / treeRules.scale;
        const bark = resources.material('wood', 0x765638);
        const stumpGeometry = new THREE.CylinderGeometry(treeRules.radius, treeRules.radius * 1.1, 0.22, 7);
        this.geometries.push(stumpGeometry);
        this.stump = new THREE.Mesh(stumpGeometry, bark);
        this.stump.position.y = 0.11;
        this.stump.castShadow = this.stump.receiveShadow = true;
        setResourceOutline(this.stump, 'tree');
        this.group.add(this.stump, this.tree);
        // 실제 충돌 반경에 맞춘 줄기의 앞면에 어둡게 패인 속과 찢긴 나뭇결을 붙인다.
        const weakFace = new THREE.Group();
        if (placement.weakNormal) {
            const shape = new THREE.Shape();
            shape.moveTo(-0.29, 0.13);
            for (const [x, y] of [
                [-0.43, 0.55],
                [-0.17, 1.28],
                [0.22, 1.12],
                [0.42, 0.6],
                [0.29, 0.16],
            ])
                shape.lineTo(x, y);
            shape.closePath();
            const geometry = new THREE.ShapeGeometry(shape);
            this.geometries.push(geometry);
            const hollow = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
                color: 0x494039,
                side: THREE.DoubleSide,
            }));
            hollow.position.z = treeRules.radius + 0.015;
            weakFace.add(hollow);
            for (const [x, y, angle] of [
                [-0.34, 0.76, -0.2],
                [0.31, 0.62, 0.23],
            ]) {
                const grainGeometry = new THREE.BoxGeometry(0.09, 0.42, 0.035);
                this.geometries.push(grainGeometry);
                const grain = new THREE.Mesh(grainGeometry, new THREE.MeshLambertMaterial({ color: 0xbba47a }));
                grain.position.set(x, y, treeRules.radius + 0.025);
                grain.rotation.z = angle;
                weakFace.add(grain);
            }
            weakFace.rotation.y = Math.atan2(placement.weakNormal.x, placement.weakNormal.z);
            // 본체 배율과 독립된 약점 표시로 판정 반경과 표시 면을 맞춘다.
            weakFace.scale.setScalar(1 / treeRules.scale);
            setResourceOutline(weakFace, 'tree');
            this.tree.add(weakFace);
        }
        this.tree.traverse((object) => {
            if (!(object instanceof THREE.Mesh) ||
                !(object.material instanceof THREE.MeshLambertMaterial))
                return;
            const source = object.material;
            const ownSource = weakFace.children.includes(object);
            const material = source.clone();
            material.onBeforeCompile = source.onBeforeCompile;
            material.customProgramCacheKey = source.customProgramCacheKey;
            material.transparent = true;
            // 공유 재질은 유지하고 쇠약한 거목의 복제 재질에만 마른 잎과 회색 껍질을 적용한다.
            if (placement.weakNormal && !ownSource) {
                if (object === trunk || object.parent === trunk)
                    material.color.setHex(0x777064);
                else {
                    const tier = this.tree.children.indexOf(object) - 1;
                    material.color.setHex([0x80775a, 0x958568, 0xada080][tier] ?? 0x958568);
                }
            }
            object.material = material;
            if (ownSource)
                source.dispose();
            this.materials.push(material);
            this.meshes.push(object);
        });
    }
    hit(heading) {
        this.hitAge = 0;
        this.heading = { ...heading };
    }
    reset() {
        this.hitAge = Infinity;
        this.visibility = 1;
        this.tree.quaternion.identity();
        this.tree.visible = true;
        this.stump.visible = false;
        this.applyOpacity(1);
    }
    update(state, dt, camera, actor, reducedMotion) {
        this.hitAge += dt;
        const falling = state.phase !== 'standing';
        const progress = Math.min(1, state.fallElapsed / treeRules.fallDuration);
        const angle = falling
            ? (Math.pow(progress, 1.7) * Math.PI) / 2
            : !reducedMotion && this.hitAge < 0.65
                ? Math.sin(this.hitAge * 19) * Math.exp(-this.hitAge * 5) * 0.055
                : 0;
        const heading = falling ? state.heading : this.heading;
        this.axis.set(heading.z, 0, -heading.x).normalize();
        this.tree.quaternion.setFromAxisAngle(this.axis, angle);
        this.stump.visible = falling;
        this.tree.visible =
            state.fallElapsed < treeRules.fallDuration + treeRules.fadeDuration;
        if (!this.tree.visible)
            return;
        this.group.updateWorldMatrix(true, true);
        const visibility = this.coversActor(camera, actor) ? 0.28 : 1;
        this.visibility +=
            (visibility - this.visibility) * (1 - Math.exp(-dt * 14));
        const fade = falling
            ? Math.max(0, 1 -
                Math.max(0, state.fallElapsed - treeRules.fallDuration) /
                    treeRules.fadeDuration)
            : 1;
        this.applyOpacity(this.visibility * fade);
    }
    coversActor(camera, actor) {
        this.actorBounds.setFromObject(actor);
        camera.getWorldDirection(this.viewDirection);
        for (const fraction of [0.35, 0.75]) {
            this.actorBounds.getCenter(this.probe);
            this.probe.y = THREE.MathUtils.lerp(this.actorBounds.min.y, this.actorBounds.max.y, fraction);
            this.rayOrigin.copy(this.probe).addScaledVector(this.viewDirection, -20);
            this.raycaster.set(this.rayOrigin, this.viewDirection);
            this.raycaster.far = 20;
            if (this.raycaster.intersectObjects(this.meshes, false).length > 0)
                return true;
        }
        return false;
    }
    applyOpacity(opacity) {
        const value = opacity > 0.999 ? 1 : opacity;
        for (const mesh of this.meshes) {
            mesh.material.opacity = value;
            mesh.material.depthWrite = value === 1;
            mesh.layers.set(resourceLayers.environment);
            mesh.layers.enable(value < 1 ? resourceLayers.effects : treeLayer);
        }
    }
    dispose() {
        this.group.removeFromParent();
        this.materials.forEach((material) => material.dispose());
        this.geometries.forEach((geometry) => geometry.dispose());
    }
}
