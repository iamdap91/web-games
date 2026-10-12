import { resourceUrl } from '../catalog/resource-url.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { villageColors } from '../../rendering/pixel-material.js';
import { EnvironmentResources, setResourceOutline, } from '../environment/environment-resources.js';
import { outlineGroups, resourceLayers, } from '../../rendering/surface-types.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { ResourceOutlinePass } from '../../rendering/resource-outline-pass.js';
const referencePixelsPerUnit = 32;
/** 종류별 질감 값과 GPU 리소스를 소유하는 정적 미리보기. */
export class MaterialScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, 0.1, 60);
    renderer;
    composer;
    outlinePass;
    outputPass = new OutputPass();
    resources = new EnvironmentResources();
    cube = new THREE.BoxGeometry(1, 1, 1);
    referenceMaterial = new THREE.MeshBasicMaterial({
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });
    reference = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.referenceMaterial);
    referenceShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({
        color: 0x344435,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
    }));
    disposed = false;
    width = 0;
    height = 0;
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.scene.background = new THREE.Color(0xb8c9aa);
        this.composer = new EffectComposer(this.renderer);
        this.outlinePass = new ResourceOutlinePass(this.scene, this.camera, this.scene.background);
        this.composer.addPass(this.outlinePass);
        this.composer.addPass(this.outputPass);
        this.composer.addPass(this.outlinePass.smoothingPass);
        const ambient = new THREE.HemisphereLight(0xfff2d7, 0x617554, 2);
        ambient.layers.enableAll();
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffe5b4, 2.1);
        sun.position.set(-9, 19, 8);
        sun.layers.enableAll();
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        Object.assign(sun.shadow.camera, {
            left: -9,
            right: 9,
            top: 9,
            bottom: -9,
            near: 1,
            far: 45,
        });
        sun.shadow.normalBias = 0.035;
        this.scene.add(sun);
        this.camera.position.set(7, 10, 13);
        this.camera.lookAt(0, 0.7, 0);
        this.buildSamples();
        this.reference.layers.set(resourceLayers.character);
        this.reference.position.set(0.05, 0.095, 1.1);
        this.reference.quaternion.copy(this.camera.quaternion);
        this.reference.visible = false;
        this.referenceShadow.rotation.x = -Math.PI / 2;
        this.referenceShadow.scale.y = 0.62;
        this.referenceShadow.position.set(0.05, 0.085, 1.1);
        this.referenceShadow.visible = false;
        this.referenceShadow.layers.enable(outlineGroups.find(({ id }) => id === 'ground').layer);
        this.scene.add(this.reference, this.referenceShadow);
    }
    async loadReference() {
        const frame = manifest.assets.find(({ id }) => id === 'ai/tiger-hero')
            ?.animations.stand?.frames[0];
        if (!frame)
            throw new Error('비교할 아타호 대기 모션을 찾을 수 없어요.');
        let texture;
        try {
            texture = await new THREE.TextureLoader().loadAsync(resourceUrl(frame.localPath).href);
        }
        catch {
            throw new Error('아타호 이미지를 불러오지 못했어요. 로컬 리소스를 확인해 주세요.');
        }
        if (this.disposed) {
            texture.dispose();
            return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        this.referenceMaterial.map = texture;
        this.referenceMaterial.needsUpdate = true;
        this.reference.geometry.dispose();
        this.reference.geometry = new THREE.PlaneGeometry(frame.width / referencePixelsPerUnit, frame.height / referencePixelsPerUnit);
        this.reference.geometry.translate((frame.width / 2 - frame.pivot.x) / referencePixelsPerUnit, (frame.height / 2 - frame.pivot.y) / referencePixelsPerUnit, 0);
        this.reference.visible = true;
        this.referenceShadow.visible = true;
    }
    setStrength(kind, percent) {
        this.resources.setStrength(kind, percent);
    }
    setOutlinePixelSize(kind, pixelSize) {
        this.outlinePass.setPixelSize(kind, pixelSize);
    }
    mesh(kind, outline, color, geometry, position, scale) {
        const mesh = new THREE.Mesh(geometry, this.resources.material(kind, color));
        setResourceOutline(mesh, outline);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }
    buildSamples() {
        this.mesh('earth', 'ground', villageColors.earth, this.cube, [0, -0.55, 0], [9, 1, 6.5]);
        this.mesh('grass', 'ground', villageColors.grass, this.cube, [0, 0, 0], [9, 0.1, 6.5]);
        this.mesh('path', 'ground', villageColors.path, this.cube, [0.1, 0.06, 1.3], [1.65, 0.035, 3.9]);
        for (const [x, z, size] of [
            [-2.6, -1.25, 1],
            [1.65, -1.65, 0.8],
        ]) {
            const tree = this.resources.createTree(size);
            tree.position.set(x, 0, z);
            this.scene.add(tree);
        }
        for (const [x, z, radius, color, rotation] of [
            [2.75, 1.35, 1.05, villageColors.stone, 0.7],
            [1.75, 1.9, 0.55, 0xb1af8b, 0],
            [3.55, 0.3, 0.4, 0x8a8b70, 0],
        ]) {
            const rock = this.resources.createRock({ radius, color, rotation });
            rock.position.x = x;
            rock.position.z = z;
            rock.position.y += 0.05;
            this.scene.add(rock);
        }
        const brush = this.resources.createBrush();
        brush.position.set(-1.55, 0.05, 0.25);
        this.scene.add(brush);
        for (const z of [-2, -0.5, 1, 2.5])
            this.mesh('wood', 'fence', 0xab8358, this.cube, [-3.8, 0.55, z], [0.2, 1.1, 0.2]);
        for (const y of [0.38, 0.82])
            this.mesh('wood', 'fence', villageColors.wood, this.cube, [-3.8, y, 0.25], [0.16, 0.13, 4.8]);
        this.mesh('wood', 'box', 0xab8358, this.cube, [-2.35, 0.32, 1.65], [0.9, 0.64, 0.8]);
    }
    render() {
        if (this.disposed)
            return;
        const { width, height } = this.canvas.getBoundingClientRect();
        if (width <= 0 || height <= 0)
            return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (width !== this.width ||
            height !== this.height ||
            dpr !== this.renderer.getPixelRatio()) {
            this.width = width;
            this.height = height;
            this.renderer.setPixelRatio(dpr);
            this.renderer.setSize(width, height, false);
            this.outlinePass.setPixelRatio(dpr);
            this.composer.setPixelRatio(dpr);
            this.composer.setSize(width, height);
            const aspect = width / height;
            const halfHeight = Math.max(4.5, 6 / aspect);
            Object.assign(this.camera, {
                left: -halfHeight * aspect,
                right: halfHeight * aspect,
                top: halfHeight,
                bottom: -halfHeight,
            });
            this.camera.updateProjectionMatrix();
        }
        this.camera.layers.set(resourceLayers.environment);
        this.composer.render();
        const background = this.scene.background;
        this.renderer.setRenderTarget(null);
        this.renderer.autoClear = false;
        this.scene.background = null;
        this.camera.layers.set(resourceLayers.character);
        this.renderer.render(this.scene, this.camera);
        this.camera.layers.set(resourceLayers.environment);
        this.scene.background = background;
        this.renderer.autoClear = true;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.reference.geometry.dispose();
        this.referenceMaterial.map?.dispose();
        this.referenceMaterial.dispose();
        this.referenceShadow.geometry.dispose();
        this.referenceShadow.material.dispose();
        this.cube.dispose();
        this.resources.dispose();
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight)
                object.shadow.dispose();
        });
        this.outlinePass.dispose();
        this.outputPass.dispose();
        this.composer.dispose();
        this.renderer.dispose();
    }
}
