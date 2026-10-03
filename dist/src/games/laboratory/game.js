import { DoorIntruder, intruderScare, } from './door-intruder.js';
import { LoadingWheel, loading } from './loading-wheel.js';
import { ScreenSelection, selectionTiming, } from './screen-selection.js';
import { EscapingExit } from './escaping-exit.js';
import { chooseScenario, } from './anomalies.js';
import { AnomalyMotion } from './anomaly-motion.js';
import { MotionRewind } from './rewind.js';
import { RoomCutter, cutting } from './room-cutter.js';
import { roomTurn } from './event-rules.js';
import { FrameChase } from './frame-chase.js';
import { PipeCascade } from './pipe-cascade.js';
import { world, playerBounds } from './layout.js';
import { Player } from './player.js';
export { isSelection, } from './anomalies.js';
export { world } from './layout.js';
export { Player, movement, } from './player.js';
// 잔상까지 빛에 가려진 뒤 종료되도록 불투명 구간 안에 여유를 둔다.
export const exitLight = { start: 300, opaque: 2200, finish: 2340 };
export const passage = { fadeOut: 0.22, fadeIn: 0.32, glitch: 1.1 };
export class LaboratoryGame {
    random;
    player = new Player();
    anomaly = new AnomalyMotion();
    chase = new FrameChase();
    cutter = new RoomCutter();
    rewind = new MotionRewind();
    exit = new EscapingExit();
    rightExit = new EscapingExit(1);
    screenSelection = new ScreenSelection();
    wheel = new LoadingWheel();
    intruder = new DoorIntruder();
    landingElapsed = null;
    squashElapsed = null;
    scenario = 'normal';
    selection = 'random';
    phase = 'playing';
    progress = 0;
    pipes = new PipeCascade();
    transition = null;
    failureElapsed = null;
    previousRoom = 0;
    encountered = new Set();
    assignedAnomalies = new Set();
    constructor(random = Math.random) {
        this.random = random;
    }
    reset(selection = 'random') {
        this.selection = selection;
        this.encountered.clear();
        this.progress = this.previousRoom = 0;
        this.transition = null;
        this.failureElapsed = null;
        this.phase = 'playing';
        this.loadRoom();
    }
    previewExit() {
        this.resetRoomState();
        this.failureElapsed = null;
        this.progress = 7;
        this.scenario = 'normal';
        // 실제 플레이와 같은 7 → 8 전환 경로로 종료 장면을 확인한다.
        this.leave('right');
    }
    face(direction) {
        if (this.acceptsInput)
            this.player.face(this.worldDirection(direction));
    }
    jump(direction) {
        if (this.acceptsInput)
            this.player.jump(this.worldDirection(direction));
    }
    get acceptsInput() {
        return (this.phase === 'playing' &&
            !this.rewind.snapshot.rewinding &&
            this.wheel.snapshot.phase !== 'caught');
    }
    get mirrored() {
        return (this.scenario === 'mirrored-lab' &&
            roomTurn(this.anomaly.snapshot.mirrorElapsed) >= 0.5);
    }
    worldDirection(direction) {
        if (!this.mirrored || direction === 0)
            return direction;
        return direction === 1 ? -1 : 1;
    }
    update(seconds, direction) {
        if (this.failureElapsed !== null) {
            this.failureElapsed += seconds;
            if (this.failureElapsed >= passage.glitch)
                this.failureElapsed = null;
        }
        if (this.phase !== 'playing') {
            this.updatePhase(seconds);
            return;
        }
        if (this.wheel.snapshot.phase === 'caught') {
            this.wheel.update(seconds, this.player.snapshot);
            if ((this.wheel.snapshot.caughtElapsed ?? 0) >= loading.disappear)
                this.startTransition({ nextRoom: 0, failed: true, ending: false });
            return;
        }
        if (this.rewind.snapshot.rewinding) {
            this.player.rewindTo(this.rewind.playBackward(seconds));
            return;
        }
        const previousPlayer = this.player.snapshot;
        const wasMirrored = this.mirrored;
        this.player.update(seconds, this.worldDirection(direction), this.scenario === 'escaping-exit'
            ? Number.NEGATIVE_INFINITY
            : playerBounds.minimum, this.scenario === 'escaping-exit'
            ? Number.POSITIVE_INFINITY
            : playerBounds.maximum);
        const { x } = this.player.snapshot;
        if (this.progress === 8) {
            if (x >= exitLight.finish)
                this.leave('right');
            return;
        }
        const revealed = this.anomaly.update(seconds, this.scenario, this.player.snapshot, previousPlayer);
        if (this.scenario === 'mirrored-lab' &&
            roomTurn(this.anomaly.snapshot.activeElapsed) >= 0.5)
            this.player.invertGravity();
        if (!wasMirrored && this.mirrored)
            this.player.reflectMotion();
        if (this.scenario === 'lowering-ceiling' &&
            this.anomaly.resolveCeilingContact(this.player)) {
            this.encountered.add('lowering-ceiling');
            this.squashElapsed = 0;
            this.phase = 'squashed';
            return;
        }
        if (revealed &&
            this.scenario !== 'normal' &&
            this.scenario !== 'falling-pipe' &&
            this.scenario !== 'escaping-exit')
            this.encountered.add(this.scenario);
        this.updateScenario(seconds, previousPlayer);
        if (!this.acceptsInput)
            return;
        this.updateExits();
    }
    updateScenario(seconds, previousPlayer) {
        if (this.scenario === 'frame-escape' &&
            this.anomaly.snapshot.activeElapsed !== null) {
            this.chase.update(seconds, this.player.snapshot, this.anomaly.snapshot.activeElapsed);
            if (this.chase.snapshot.phase === 'falling') {
                this.phase = 'falling';
                return;
            }
        }
        if (this.scenario === 'falling-pipe') {
            const result = this.pipes.update(seconds, this.player.snapshot, previousPlayer);
            if (result === 'hit') {
                this.startTransition({
                    nextRoom: 0,
                    failed: true,
                    ending: false,
                    hit: true,
                });
                return;
            }
            if (result === 'triggered')
                this.encountered.add('falling-pipe');
        }
        if (this.scenario === 'room-invasion') {
            this.intruder.update(seconds, this.player.snapshot, previousPlayer);
            if (this.intruder.snapshot.caughtElapsed !== null) {
                this.phase = 'snatched';
                return;
            }
        }
        if (this.scenario === 'room-guillotine') {
            this.cutter.update(seconds, this.player.snapshot);
            if (this.cutter.snapshot.caughtElapsed !== null) {
                this.phase = 'severed';
                return;
            }
            if (this.cutter.snapshot.elapsed !== null &&
                this.player.snapshot.x <= cutting.exit) {
                this.leave('left');
                return;
            }
        }
        if (this.scenario === 'escaping-exit') {
            this.rightExit.update(seconds, this.player.snapshot, previousPlayer);
            if (this.rightExit.snapshot.revealed) {
                this.encountered.add('escaping-exit');
                // 오른쪽 문이 이상을 드러낸 뒤에만 귀로의 문을 깨운다.
                this.exit.update(seconds, this.player.snapshot, previousPlayer);
            }
            if (this.exit.snapshot.phase === 'caught') {
                this.leave('left');
                return;
            }
            if (this.rightExit.snapshot.phase === 'caught') {
                this.leave('right');
                return;
            }
        }
        if (this.scenario === 'select-delete') {
            this.screenSelection.update(seconds, this.player.snapshot);
            if (this.screenSelection.snapshot.caughtElapsed !== null) {
                this.phase = 'erased';
                return;
            }
        }
        if (this.scenario === 'loading-wheel') {
            this.wheel.update(seconds, this.player.snapshot);
            const wheel = this.wheel.snapshot;
            if (wheel.phase === 'caught')
                return;
            if (wheel.phase === 'pulling') {
                this.player.pullToward(wheel.x, loading.force * wheel.strength * seconds);
            }
        }
        if (this.scenario === 'time-rewind') {
            this.rewind.record(seconds, this.player.captureMotion());
            if (this.rewind.snapshot.rewinding)
                return;
        }
    }
    updateExits() {
        const { x } = this.player.snapshot;
        const atBackstageDoor = this.scenario === 'folding-stage' &&
            this.anomaly.snapshot.backstageReturning &&
            x <= 250;
        if (atBackstageDoor ||
            (x <= 55 &&
                !(this.scenario === 'escaping-exit' && this.rightExit.snapshot.revealed)))
            this.leave('left');
        else if (x >= world.width - 55 &&
            this.scenario !== 'escaping-exit' &&
            !(this.scenario === 'frame-escape' &&
                this.anomaly.snapshot.activeElapsed !== null))
            this.leave('right');
    }
    updatePhase(seconds) {
        if (this.phase === 'erased') {
            this.screenSelection.update(seconds, this.player.snapshot);
            if ((this.screenSelection.snapshot.caughtElapsed ?? 0) >=
                selectionTiming.erased)
                this.startTransition({ nextRoom: 0, failed: true, ending: false });
            return;
        }
        if (this.phase === 'severed') {
            this.cutter.update(seconds, this.player.snapshot);
            if ((this.cutter.snapshot.caughtElapsed ?? 0) >= 1.1)
                this.startTransition({ nextRoom: 0, failed: true, ending: false });
            return;
        }
        if (this.phase === 'snatched') {
            this.intruder.update(seconds, this.player.snapshot);
            if ((this.intruder.snapshot.caughtElapsed ?? 0) >= intruderScare.finish)
                this.startTransition({ nextRoom: 0, failed: true, ending: false });
            return;
        }
        if (this.phase === 'squashed') {
            this.squashElapsed = (this.squashElapsed ?? 0) + seconds;
            this.anomaly.update(seconds, this.scenario, this.player.snapshot, this.player.snapshot);
            if (this.squashElapsed >= 1.05)
                this.startTransition({ nextRoom: 0, failed: true, ending: false });
            return;
        }
        if (this.phase === 'falling') {
            if (this.chase.fall(seconds)) {
                this.previousRoom = this.progress;
                this.progress = 0;
                this.loadRoom();
                this.failureElapsed = 0;
                this.player.dropIn();
                this.landingElapsed = 0;
                this.phase = 'landing';
            }
            return;
        }
        if (this.phase === 'landing') {
            this.landingElapsed = (this.landingElapsed ?? 0) + seconds;
            this.player.update(seconds, 0);
            if (this.player.snapshot.grounded) {
                this.phase = 'playing';
                this.landingElapsed = null;
                this.squashElapsed = null;
            }
            return;
        }
        if (this.phase === 'transition') {
            this.updateTransition(seconds);
            return;
        }
    }
    resetRoomState() {
        this.player = new Player();
        this.anomaly = new AnomalyMotion();
        this.chase = new FrameChase();
        this.cutter = new RoomCutter();
        this.rewind = new MotionRewind();
        this.exit = new EscapingExit();
        this.rightExit = new EscapingExit(1);
        this.screenSelection = new ScreenSelection();
        this.wheel = new LoadingWheel();
        this.intruder = new DoorIntruder();
        this.landingElapsed = null;
        this.squashElapsed = null;
        this.pipes = new PipeCascade();
    }
    loadRoom() {
        this.resetRoomState();
        // 새 연속 진행에서는 다시 추첨할 수 있지만 엔딩의 관찰 기록은 유지한다.
        if (this.progress === 0)
            this.assignedAnomalies.clear();
        if (this.progress === 8 ||
            (this.selection === 'random' && this.progress === 0)) {
            // 0번 방이 반복 가능한 기준 풍경이 되어 별도의 튜토리얼 팝업을 대신한다.
            this.scenario = 'normal';
        }
        else if (this.selection !== 'random')
            this.scenario = this.selection;
        else {
            this.scenario = chooseScenario(this.random(), this.assignedAnomalies);
            if (this.scenario !== 'normal')
                this.assignedAnomalies.add(this.scenario);
        }
    }
    leave(exit) {
        const ending = this.progress === 8;
        const correct = ending || (this.scenario === 'normal') === (exit === 'right');
        this.startTransition({
            nextRoom: ending ? 8 : correct ? this.progress + 1 : 0,
            failed: !correct,
            ending,
        });
    }
    startTransition({ nextRoom, failed, ending, hit = false, }) {
        this.previousRoom = this.progress;
        this.transition = {
            elapsed: 0,
            swapped: false,
            nextRoom,
            failed,
            ending,
            hit,
        };
        this.phase = 'transition';
    }
    updateTransition(seconds) {
        const transition = this.transition;
        if (!transition)
            return;
        transition.elapsed += seconds;
        if (!transition.swapped && transition.elapsed >= passage.fadeOut) {
            if (transition.ending) {
                this.transition = null;
                this.phase = 'complete';
                return;
            }
            this.progress = transition.nextRoom;
            this.loadRoom();
            transition.swapped = true;
            if (transition.failed)
                this.failureElapsed = 0;
        }
        // 실패 숫자를 읽기 전에 달려 지나치지 않도록 입장 연출 동안만 입력을 잠근다.
        const duration = passage.fadeOut + (transition.failed ? passage.glitch : passage.fadeIn);
        if (transition.elapsed < duration)
            return;
        this.transition = null;
        this.phase = 'playing';
    }
    get snapshot() {
        return {
            player: this.player.snapshot,
            mirrored: this.mirrored,
            squashElapsed: this.squashElapsed,
            anomaly: this.anomaly.snapshot,
            chase: this.chase.snapshot,
            cut: this.cutter.snapshot,
            rewind: this.rewind.snapshot,
            exit: this.exit.snapshot,
            rightExit: this.rightExit.snapshot,
            selection: this.screenSelection.snapshot,
            wheel: this.wheel.snapshot,
            intruder: this.intruder.snapshot,
            landingElapsed: this.landingElapsed,
            scenario: this.scenario,
            phase: this.phase,
            progress: this.progress,
            pipeElapsed: this.pipes.activeElapsed,
            transitionElapsed: this.transition?.elapsed ?? null,
            failureElapsed: this.failureElapsed,
            hitElapsed: this.transition?.hit && !this.transition.swapped
                ? this.transition.elapsed
                : null,
            previousRoom: this.previousRoom,
            encountered: [...this.encountered],
        };
    }
}
