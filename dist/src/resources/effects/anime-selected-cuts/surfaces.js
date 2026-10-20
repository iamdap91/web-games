import { GameStages } from '../../cutscenes/game-stage.js';
/** 보조 판은 화면이 소유하고 종료 시 모두 해제한다. */
export class CutSurfaces {
    stage = new GameStages();
    canvases = new Map();
    prepare() {
        return this.stage.load();
    }
    get(key, width = 1280, height = 720) {
        let canvas = this.canvases.get(key);
        if (!canvas) {
            canvas = document.createElement('canvas');
            this.canvases.set(key, canvas);
        }
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('연출 보조 판을 만들 수 없습니다.');
        context.resetTransform();
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.filter = 'none';
        context.clearRect(0, 0, width, height);
        return context;
    }
    dispose() {
        this.stage.dispose();
        for (const canvas of this.canvases.values())
            canvas.width = canvas.height = 1;
        this.canvases.clear();
    }
}
