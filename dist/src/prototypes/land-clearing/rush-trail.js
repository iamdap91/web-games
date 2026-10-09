import * as THREE from 'three';
import { resourceLayers } from '../../rendering/surface-types.js';
/** 지나간 위치의 포즈를 잠시 남기며 텍스처는 배우와 공유한다. */
export class RushTrail {
    group = new THREE.Group();
    echoes = Array.from({ length: 5 }, () => {
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({
            color: 0xffd28a,
            transparent: true,
            opacity: 0,
            alphaTest: 0.05,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
        mesh.layers.set(resourceLayers.character);
        mesh.visible = false;
        this.group.add(mesh);
        return { mesh, age: 1 };
    });
    sinceLast = 0;
    next = 0;
    update(actor, moving, dt) {
        for (const echo of this.echoes) {
            echo.age += dt;
            echo.mesh.visible = echo.age < 0.22;
            echo.mesh.material.opacity = Math.max(0, 1 - echo.age / 0.22) * 0.18;
        }
        if (!moving) {
            this.sinceLast = 0.07;
            return;
        }
        if (dt <= 0)
            return;
        this.sinceLast += dt;
        if (this.sinceLast < 0.07)
            return;
        this.sinceLast %= 0.07;
        const echo = this.echoes[this.next];
        this.next = (this.next + 1) % this.echoes.length;
        echo.mesh.geometry.dispose();
        echo.mesh.geometry = actor.geometry.clone();
        echo.mesh.material.map = actor.material.map;
        echo.mesh.material.needsUpdate = true;
        echo.mesh.position.copy(actor.position);
        echo.mesh.quaternion.copy(actor.quaternion);
        echo.mesh.scale.copy(actor.scale);
        echo.age = 0;
        echo.mesh.visible = true;
        echo.mesh.material.opacity = 0.18;
    }
    reset() {
        for (const echo of this.echoes) {
            echo.age = 1;
            echo.mesh.visible = false;
        }
        this.sinceLast = 0;
        this.next = 0;
    }
    dispose() {
        for (const { mesh } of this.echoes) {
            mesh.geometry.dispose();
            mesh.material.dispose();
        }
        this.group.clear();
        this.group.removeFromParent();
    }
}
