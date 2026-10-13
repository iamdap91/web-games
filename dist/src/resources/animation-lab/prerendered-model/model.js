import * as THREE from 'three';
import { calculatePose } from './motion.js';
/** 원본 모델과 관절의 소유자. 모든 메시 자원은 종료 시 한 번에 정리한다. */
export class WoodenModel {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1.75, 1.75, 1.95, -1.55, 0.1, 30);
    heading = new THREE.Group();
    body = new THREE.Group();
    head = new THREE.Group();
    leftArm = new THREE.Group();
    rightArm = new THREE.Group();
    rightElbow = new THREE.Group();
    leftLeg = new THREE.Group();
    rightLeg = new THREE.Group();
    geometries = [];
    materials = [];
    constructor() {
        this.camera.position.set(4, 3, 7);
        this.camera.lookAt(0, 1.3, 0);
        this.scene.add(new THREE.HemisphereLight(0xfaf3d6, 0x3d464d, 2.6));
        const light = new THREE.DirectionalLight(0xfff4dd, 3.3);
        light.position.set(-4, 7, 6);
        this.scene.add(light);
        this.scene.add(this.heading);
        this.heading.add(this.body);
        this.body.position.y = 1.3;
        const wood = this.material(0xc98948);
        const darkWood = this.material(0x88562f);
        const paleWood = this.material(0xf2ce8b);
        const joint = this.material(0x3d4d4b);
        const teal = this.material(0x3f9c8e);
        const face = this.material(0x263c3b);
        const eye = this.material(0xffdf89);
        this.box(this.body, [0.74, 0.85, 0.48], [0, 0.2, 0], wood);
        this.box(this.body, [0.8, 0.11, 0.54], [0, -0.13, 0], darkWood);
        this.box(this.body, [0.49, 0.36, 0.035], [0, 0.28, 0.255], teal);
        this.box(this.body, [0.17, 0.18, 0.055], [0, 0.29, 0.28], paleWood);
        this.body.add(this.head);
        this.head.position.y = 1;
        this.box(this.head, [0.64, 0.55, 0.57], [0, 0, 0], wood);
        this.box(this.head, [0.51, 0.25, 0.04], [0, 0.01, 0.3], face);
        this.box(this.head, [0.095, 0.11, 0.04], [-0.13, 0.025, 0.325], eye);
        this.box(this.head, [0.095, 0.11, 0.04], [0.13, 0.025, 0.325], eye);
        this.box(this.head, [0.12, 0.08, 0.63], [0, 0.3, 0], paleWood);
        this.box(this.head, [0.7, 0.1, 0.63], [0, -0.27, 0], darkWood);
        this.body.add(this.leftArm, this.rightArm);
        this.leftArm.position.set(-0.55, 0.48, 0);
        this.rightArm.position.set(0.55, 0.48, 0);
        for (const arm of [this.leftArm, this.rightArm]) {
            this.sphere(arm, 0.16, [0, 0, 0], joint);
            this.box(arm, [0.24, 0.47, 0.25], [0, -0.26, 0], wood);
            const elbow = arm === this.rightArm ? this.rightElbow : new THREE.Group();
            arm.add(elbow);
            elbow.position.y = -0.5;
            this.sphere(elbow, 0.12, [0, 0, 0], joint);
            this.box(elbow, [0.22, 0.35, 0.24], [0, -0.2, 0], paleWood);
            this.box(elbow, [0.32, 0.28, 0.32], [0, -0.46, 0.025], darkWood);
        }
        this.body.add(this.leftLeg, this.rightLeg);
        this.leftLeg.position.set(-0.23, -0.27, 0);
        this.rightLeg.position.set(0.23, -0.27, 0);
        for (const leg of [this.leftLeg, this.rightLeg]) {
            this.sphere(leg, 0.14, [0, 0, 0], joint);
            this.box(leg, [0.28, 0.63, 0.28], [0, -0.35, 0], wood);
            this.box(leg, [0.32, 0.14, 0.32], [0, -0.61, 0], teal);
            this.box(leg, [0.34, 0.22, 0.51], [0, -0.86, 0.08], darkWood);
        }
    }
    pose(motion, phase, direction) {
        const pose = calculatePose(motion, phase);
        this.heading.rotation.y = (direction * Math.PI) / 2;
        this.body.position.y = 1.3 + pose.height;
        this.body.rotation.set(pose.lean, pose.twist, 0);
        this.head.rotation.y = pose.head;
        this.leftArm.rotation.x = pose.leftArm;
        this.rightArm.rotation.x = pose.rightArm;
        this.rightElbow.rotation.x = -pose.elbow;
        this.leftLeg.rotation.x = pose.leftLeg;
        this.rightLeg.rotation.x = pose.rightLeg;
    }
    dispose() {
        this.geometries.forEach((geometry) => geometry.dispose());
        this.materials.forEach((material) => material.dispose());
        this.scene.clear();
    }
    material(color) {
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 1,
            metalness: 0,
            flatShading: true,
        });
        this.materials.push(material);
        return material;
    }
    box(parent, size, position, material) {
        const geometry = new THREE.BoxGeometry(...size);
        this.geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        parent.add(mesh);
    }
    sphere(parent, radius, position, material) {
        const geometry = new THREE.SphereGeometry(radius, 8, 6);
        this.geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        parent.add(mesh);
    }
}
