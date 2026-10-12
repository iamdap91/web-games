import { fragmentPose } from './rock-fragments.js';
import * as THREE from 'three';
import { setResourceOutline, } from '../../resources/environment/environment-resources.js';
import { faceDepth, rockHalf } from './rock-shape.js';
import { rockRules, } from './world.js';
/** 바위 한 개의 균열·타격 반응·파괴 조각과 복제 GPU 자원을 소유한다. */
export class RockView {
    group = new THREE.Group();
    body = new THREE.Group();
    halves = [];
    crack = new THREE.Group();
    geometries = [];
    materials = [];
    rockMaterial;
    baseColor;
    weakArc;
    hitAge = Infinity;
    constructor(resources, placement = rockRules, appearance = {}) {
        const source = resources.material('stone', 0x9ca39a);
        this.rockMaterial = this.ownMaterial(source.clone());
        this.rockMaterial.onBeforeCompile = source.onBeforeCompile;
        this.rockMaterial.customProgramCacheKey = source.customProgramCacheKey;
        this.baseColor = appearance.color ?? source.color.getHex();
        this.rockMaterial.color.setHex(this.baseColor);
        this.weakArc = new THREE.Mesh(this.ownGeometry(new THREE.RingGeometry(rockRules.radius + 0.1, rockRules.radius + 0.17, 32, 0, rockRules.weakHalfAngle * 2)), this.ownMaterial(new THREE.MeshBasicMaterial({
            color: 0xeedbb5,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        })));
        for (const sign of [-1, 1]) {
            const half = new THREE.Mesh(this.ownGeometry(rockHalf(sign)), this.rockMaterial);
            half.castShadow = half.receiveShadow = true;
            this.halves.push(half);
            this.body.add(half);
        }
        this.group.position.set(placement.center.x, 0.03, placement.center.z);
        this.group.add(this.body);
        if (placement.weakNormal)
            this.createWeakFace(placement.weakNormal, appearance.crackColor);
        setResourceOutline(this.body, 'rock');
    }
    createWeakFace(normal, edgeColor = 0xb1b4a4) {
        const ink = this.ownMaterial(new THREE.MeshBasicMaterial({ color: 0x46514b }));
        const edge = this.ownMaterial(new THREE.MeshBasicMaterial({ color: edgeColor }));
        const points = [
            [0.06, 0.23],
            [-0.08, 0.64],
            [0.13, 1.05],
            [-0.1, 1.5],
            [0.1, 1.93],
            [-0.03, 2.35],
        ];
        for (let index = 1; index < points.length; index++) {
            const a = new THREE.Vector3(points[index - 1][0], points[index - 1][1], faceDepth(points[index - 1][1]) + 0.03);
            const b = new THREE.Vector3(points[index][0], points[index][1], faceDepth(points[index][1]) + 0.03);
            for (const [radius, material, offset] of [
                [0.048, ink, 0],
                [0.012, edge, 0.055],
            ]) {
                const mesh = new THREE.Mesh(this.ownGeometry(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 5)), material);
                mesh.position.copy(a).add(b).multiplyScalar(0.5);
                mesh.position.x += offset;
                mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
                this.crack.add(mesh);
            }
        }
        this.body.rotation.y = Math.atan2(normal.x, normal.z);
        this.body.add(this.crack);
        this.weakArc.rotation.x = -Math.PI / 2;
        this.weakArc.rotation.z =
            Math.atan2(-normal.z, normal.x) - rockRules.weakHalfAngle;
        this.weakArc.position.y = -0.005;
        this.group.add(this.weakArc);
    }
    hit() {
        this.hitAge = 0;
    }
    reset() {
        this.hitAge = Infinity;
    }
    update(state, dt, reducedMotion) {
        this.hitAge += dt;
        this.crack.visible = !state.broken;
        this.weakArc.visible = !state.broken;
        for (const [index, half] of this.halves.entries()) {
            const pose = fragmentPose({
                sign: index === 0 ? -1 : 1,
                elapsed: state.breakElapsed,
                motion: reducedMotion ? 'reduced' : 'full',
            });
            half.position.set(pose.x, pose.y, 0);
            half.rotation.z = pose.tilt;
        }
        this.rockMaterial.color.setHex(this.hitAge < 0.065 ? 0xe7e4ca : this.baseColor);
    }
    ownGeometry(geometry) {
        this.geometries.push(geometry);
        return geometry;
    }
    ownMaterial(material) {
        this.materials.push(material);
        return material;
    }
    dispose() {
        this.group.removeFromParent();
        this.geometries.forEach((geometry) => geometry.dispose());
        this.materials.forEach((material) => material.dispose());
    }
}
