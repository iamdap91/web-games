import * as THREE from 'three';
import { ForestLandscape } from '../forest-interactions/forest-landscape.js';
import { boulderRules } from '../forest-interactions/rolling-boulder.js';
import { forestClearingLayout, forestHollow, forestVine, } from './forest-clearing-layout.js';
import { resourceLayers } from '../../rendering/surface-types.js';
/** 원래 장막·고목 그림을 공터 크기와 현재 채집 시간에 연결한다. */
export class ForestGimmickScene {
    group = new THREE.Group();
    landscape;
    rock;
    focusRing;
    dots = [];
    rings = new Map();
    dust = [];
    ringGeometry = new THREE.RingGeometry(0.88, 1, 24);
    dotGeometry = new THREE.RingGeometry(0.08, 0.12, 8);
    dustGeometry = new THREE.DodecahedronGeometry(0.12, 0);
    previewMaterial = new THREE.MeshBasicMaterial({
        color: 0xe5c783,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    dustMaterial = new THREE.MeshBasicMaterial({
        color: 0xccbea4,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
    });
    constructor(resources, state) {
        this.landscape = new ForestLandscape(resources, {
            surroundings: false,
            origin: forestClearingLayout.origin,
            eastExit: forestClearingLayout.eastExit,
        });
        this.rock = resources.createRock({
            radius: boulderRules.radius,
            color: 0x8b927b,
        });
        this.group.add(this.landscape.group, this.rock);
        this.focusRing = this.ring(this.ringGeometry);
        for (let i = 0; i < 16; i++)
            this.dots.push(this.ring(this.dotGeometry));
        for (const item of state.obstacles) {
            if (item.id < 200)
                continue;
            const ring = this.ring(this.ringGeometry);
            ring.position.set(item.x, 0.044, item.z);
            ring.scale.setScalar(item.kind === 'brush' ? 0.6 : 0.77);
            this.rings.set(item.id, ring);
        }
        for (let i = 0; i < 10; i++) {
            const dust = new THREE.Mesh(this.dustGeometry, this.dustMaterial);
            dust.layers.set(resourceLayers.effects);
            this.dust.push(dust);
            this.group.add(dust);
        }
    }
    ring(geometry) {
        const ring = new THREE.Mesh(geometry, this.previewMaterial);
        ring.layers.set(resourceLayers.effects);
        ring.rotation.x = -Math.PI / 2;
        this.group.add(ring);
        return ring;
    }
    face(camera) {
        this.landscape.face(camera);
    }
    async load() {
        await this.landscape.load();
    }
    update(state, reducedMotion) {
        const forest = state.forest;
        this.landscape.update(forest, reducedMotion);
        this.rock.position.set(forest.rock.x, boulderRules.radius * 0.75, forest.rock.z);
        this.rock.rotation.set(forest.rock.direction === 'south' ? forest.rock.rotation : 0, 0.7, forest.rock.direction === 'east' ? -forest.rock.rotation : 0);
        this.focusRing.visible =
            forest.target === 'vine' || forest.target === 'hollow';
        if (forest.target === 'vine') {
            this.focusRing.position.set(forestVine.x, 0.045, forestVine.z + 0.15);
            this.focusRing.scale.set(1.1, 0.4, 1);
        }
        if (forest.target === 'hollow') {
            this.focusRing.position.set(forestHollow.x, 0.045, forestHollow.z);
            this.focusRing.scale.setScalar(forestHollow.radius + 0.18);
        }
        const direction = forest.pushDirection;
        this.dots.forEach((dot, i) => {
            dot.visible = direction !== null && forest.action === null;
            if (!direction)
                return;
            const { start, ends } = forestClearingLayout.route;
            const end = ends[direction], t = (i + 1) / 17;
            dot.position.set(start.x + (end.x - start.x) * t, 0.045, start.z + (end.z - start.z) * t);
        });
        for (const [id, ring] of this.rings)
            ring.visible = forest.previewTargets.includes(id) && !forest.action;
        this.dust.forEach((mote, i) => {
            mote.visible = !reducedMotion && forest.rock.phase === 'rolling';
            const trail = (i / 10 + forest.elapsed * 1.8) % 1;
            const along = trail * 1.2, side = Math.sin(i * 2.1) * 0.24;
            mote.position.set(forest.rock.x + (forest.rock.direction === 'east' ? -along : side), 0.15 + trail * 0.18, forest.rock.z + (forest.rock.direction === 'south' ? -along : side));
            mote.scale.setScalar(0.5 + trail);
        });
    }
    marker(state) {
        const target = state.forest.target;
        return target === 'boulder'
            ? { ...state.forest.rock, y: 2.6 }
            : target === 'vine'
                ? { ...forestVine, y: 3.8 }
                : target === 'hollow'
                    ? { ...forestHollow, y: 3.6 }
                    : null;
    }
    dispose() {
        this.landscape.dispose();
        this.group.removeFromParent();
        this.ringGeometry.dispose();
        this.dotGeometry.dispose();
        this.dustGeometry.dispose();
        this.previewMaterial.dispose();
        this.dustMaterial.dispose();
    }
}
