import * as THREE from 'three';
import { PixelResident } from './pixel-resident.js';
import { livingDioramaWorktable } from './layout.js';
/** 시설 사용으로 시작한 짧은 작업과 바람·창빛을 동적 깊이 층에 그린다. */
export class CourtyardLife {
    root = new THREE.Group();
    materials = [];
    artisan;
    trainee;
    merchant;
    laundry = [];
    windows = new THREE.Group();
    dojoWindows = new THREE.Group();
    unfolded;
    elapsed = 0;
    constructor() {
        this.artisan = new PixelResident('artisan', {
            x: livingDioramaWorktable.x + 0.1,
            y: 0.1,
            z: livingDioramaWorktable.z + 0.75,
        });
        this.trainee = new PixelResident('trainee', {
            x: -1.25,
            y: 1.7,
            z: -4.92,
        });
        this.merchant = new PixelResident('merchant', { x: 3.15, y: 0.1, z: 5.85 });
        this.root.add(this.windows, this.artisan.body, this.trainee.body, this.merchant.body);
        this.windows.add(this.dojoWindows);
        const warm = this.material(0xffca8a, true);
        for (const x of [-8.96, -7.04])
            this.box(this.windows, [0.62, 0.82, 0.015], [x, 1.724, 4.005], warm);
        for (const x of [-4.54, -1.06])
            this.box(this.dojoWindows, [0.62, 0.82, 0.015], [x, 3.904, -5.495], warm);
        const wood = this.material(0x70503d);
        for (const x of [0.1, 3.8])
            this.box(this.root, [0.075, 2.1, 0.075], [x, 1.15, 8.7], wood);
        this.box(this.root, [3.75, 0.025, 0.025], [1.95, 2.15, 8.7], wood);
        for (let i = 0; i < 4; i++) {
            const pivot = new THREE.Group();
            pivot.position.set(0.55 + i * 0.8, 2.14, 8.7);
            const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, i % 2 ? 0.76 : 0.94, 2, 3), this.material(i % 2 ? 0xb99180 : 0xbdd1b2));
            towel.geometry.translate(0, -0.45, 0);
            pivot.add(towel);
            this.laundry.push(pivot);
            this.root.add(pivot);
        }
        this.unfolded = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.9, 8, 4), this.material(0xc6b695));
        this.unfolded.rotation.x = -Math.PI / 2;
        this.unfolded.position.set(2.4, 1.27, 6.45);
        this.root.add(this.unfolded);
    }
    material(color, unlit = false) {
        const m = unlit
            ? new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
            : new THREE.MeshStandardMaterial({
                color,
                roughness: 0.96,
                side: THREE.DoubleSide,
            });
        this.materials.push(m);
        return m;
    }
    box(parent, size, at, material) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...at);
        parent.add(mesh);
        return mesh;
    }
    update(state, delta) {
        this.elapsed += delta;
        this.artisan.update({ working: state.fire > 0, elapsed: this.elapsed });
        this.trainee.update({
            working: state.training > 0,
            elapsed: this.elapsed,
            visible: state.restored,
        });
        this.merchant.update({ working: state.cloth > 0, elapsed: this.elapsed });
        this.unfolded.visible = state.cloth > 0;
        this.unfolded.scale.x =
            state.cloth > 0 ? 0.85 + Math.sin(this.elapsed * 4) * 0.12 : 1;
        this.windows.visible = state.period === 'evening';
        this.dojoWindows.visible = state.restored;
        // 작은 흔들림으로 빨래의 위쪽을 고정하고 통행로와 시야를 확보한다.
        this.laundry.forEach((pivot, i) => {
            pivot.rotation.x = Math.sin(this.elapsed * 1.5 + i * 0.7) * 0.12;
        });
    }
    get diagnostics() {
        return Object.freeze({
            elapsed: this.elapsed,
            artisanFrame: this.artisan.frame,
            trainingFrame: this.trainee.frame,
            traineeVisible: this.trainee.body.visible,
            clothVisible: this.unfolded.visible,
            laundryAngle: this.laundry[0]?.rotation.x ?? 0,
            windowsVisible: this.windows.visible,
            dojoWindowsVisible: this.windows.visible && this.dojoWindows.visible,
        });
    }
    dispose() {
        this.root.traverse((o) => {
            if (o instanceof THREE.Mesh)
                o.geometry.dispose();
        });
        this.artisan.dispose();
        this.trainee.dispose();
        this.merchant.dispose();
        this.materials.forEach((m) => m.dispose());
        this.root.clear();
    }
}
