import * as THREE from 'three';
import { outlineGroups, resourceLayers, } from '../../rendering/surface-types.js';
import { obstacleTypes } from './world.js';
import { treeFallAngle, treeFallContactTime, treeFallDuration, } from './tree-fall.js';
export { treeFallDuration } from './tree-fall.js';
const treeLayer = outlineGroups.find(({ id }) => id === 'tree').layer;
/** 큰 나무 한 그루의 흔들림·쓰러짐·시야 가림과 독립 재질을 소유한다. */
export class HarvestTree {
    group;
    meshes = [];
    materials = [];
    raycaster = new THREE.Raycaster();
    actorBounds = new THREE.Box3();
    direction = new THREE.Vector3();
    probe = new THREE.Vector3();
    rayOrigin = new THREE.Vector3();
    axis = new THREE.Vector3(1, 0, 0);
    aim = new THREE.Vector2(0, 1);
    hitAge = Infinity;
    removed = false;
    visibility = 1;
    opacity = 1;
    angle = 0;
    constructor(resources) {
        this.group = resources.createTree(obstacleTypes.tree.scale);
        this.group.traverse((object) => {
            if (!(object instanceof THREE.Mesh) ||
                !(object.material instanceof THREE.MeshLambertMaterial))
                return;
            const source = object.material;
            const material = source.clone();
            // clone은 재질 셰이더 훅을 복사하지 않으므로 공용 무늬를 명시적으로 보존한다.
            material.onBeforeCompile = source.onBeforeCompile;
            material.customProgramCacheKey = source.customProgramCacheKey;
            material.transparent = true;
            object.material = material;
            this.materials.push(material);
            this.meshes.push(object);
        });
    }
    strike({ direction, removed, }) {
        this.aim.set(direction.x, direction.z).normalize();
        this.hitAge = 0;
        this.removed = removed;
    }
    restoreFallen() {
        this.removed = true;
        this.hitAge = treeFallDuration;
        this.group.visible = false;
    }
    get fallen() {
        return this.removed && this.hitAge >= treeFallDuration;
    }
    update(dt, { camera, actor, }) {
        this.hitAge += dt;
        this.angle = this.removed
            ? treeFallAngle(this.hitAge)
            : this.hitAge < 0.65
                ? Math.sin(this.hitAge * 19) * Math.exp(-this.hitAge * 5) * 0.075
                : 0;
        this.axis.set(this.aim.y, 0, -this.aim.x);
        this.group.quaternion.setFromAxisAngle(this.axis, this.angle);
        this.group.visible = !this.fallen;
        if (this.fallen)
            return;
        this.group.updateWorldMatrix(true, true);
        const visibility = this.coversActor(camera, actor) ? 0.28 : 1;
        this.visibility +=
            (visibility - this.visibility) * (1 - Math.exp(-dt * 14));
        const fallOpacity = this.removed
            ? Math.min(1, (treeFallDuration - this.hitAge) /
                (treeFallDuration - treeFallContactTime))
            : 1;
        this.applyOpacity(this.visibility * fallOpacity);
    }
    coversActor(camera, actor) {
        this.actorBounds.setFromObject(actor);
        camera.getWorldDirection(this.direction);
        for (const fraction of [0.35, 0.75]) {
            this.actorBounds.getCenter(this.probe);
            this.probe.y = THREE.MathUtils.lerp(this.actorBounds.min.y, this.actorBounds.max.y, fraction);
            this.rayOrigin.copy(this.probe).addScaledVector(this.direction, -20);
            this.raycaster.set(this.rayOrigin, this.direction);
            this.raycaster.far = 20;
            if (this.raycaster.intersectObjects(this.meshes, false).length > 0)
                return true;
        }
        return false;
    }
    applyOpacity(value) {
        this.opacity = value > 0.999 ? 1 : value;
        const translucent = this.opacity < 1;
        for (const mesh of this.meshes) {
            mesh.material.opacity = this.opacity;
            mesh.material.depthWrite = !translucent;
            // 반투명 나무는 지형과 아타호를 그린 뒤 깊이 판정으로 겹친다.
            // 그림자용 환경 레이어는 유지하고 종류별 불투명 합성에서는 제외한다.
            mesh.layers.set(resourceLayers.environment);
            mesh.layers.enable(translucent ? resourceLayers.effects : treeLayer);
        }
    }
    reset() {
        this.hitAge = Infinity;
        this.removed = false;
        this.visibility = 1;
        this.angle = 0;
        this.group.visible = true;
        this.group.quaternion.identity();
        this.applyOpacity(1);
    }
    get diagnostics() {
        return {
            falling: this.removed && !this.fallen,
            fallen: this.fallen,
            angle: this.angle,
            opacity: this.opacity,
        };
    }
    dispose() {
        this.group.removeFromParent();
        this.materials.forEach((material) => material.dispose());
    }
}
