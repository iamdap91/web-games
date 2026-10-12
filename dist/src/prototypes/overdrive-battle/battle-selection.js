import { battleSkills, skillTargets, isElementSkill, } from './battle-skills.js';
import { clampSkillArea, } from './world.js';
import { overdriveRules } from './overdrive.js';
import { rageRules } from './rage.js';
export const commandOrder = [
    'attack',
    'skill',
    'guard',
    'ultimate',
    'overdrive',
];
function initialSelection(state) {
    return {
        selectedCommand: state.kickGuidance ? 'skill' : 'attack',
        pendingCommand: null,
        skillsOpen: false,
        selectedSkill: state.availableSkills[0] ?? 'kick',
        areaCenter: null,
        allyTargetId: null,
    };
}
export function commandAvailable(command, state) {
    if (state.phase !== 'command')
        return false;
    if (state.activeActorId !== 0 &&
        (command === 'ultimate' || command === 'overdrive'))
        return false;
    if (command === 'overdrive' && state.player.health <= 0)
        return false;
    if (command === 'skill')
        return state.availableSkills.length > 0;
    if ((command === 'ultimate' && !state.advanced) ||
        (command === 'overdrive' && !state.overdriveUnlocked))
        return false;
    if (command === 'ultimate')
        return state.rage >= rageRules.capacity;
    if (command === 'overdrive')
        return (state.drunken.turns === 0 &&
            state.overdrive.gauge >= overdriveRules.capacity);
    return true;
}
/** 명령·기술·대상·범위 선택의 전환을 소유하고 화면 입력은 받지 않는다. */
export class BattleSelection {
    world;
    state;
    constructor(world) {
        this.world = world;
        this.state = initialSelection(world.snapshot);
    }
    cycleCommand(direction) {
        const state = this.world.snapshot;
        const choices = commandOrder.filter((command) => commandAvailable(command, state));
        const index = choices.indexOf(this.state.selectedCommand);
        this.state.selectedCommand =
            choices[(index + direction + choices.length) % choices.length] ??
                'attack';
    }
    chooseCommand(command) {
        if (!commandAvailable(command, this.world.snapshot))
            return false;
        this.state.selectedCommand = command;
        this.state.pendingCommand = null;
        this.state.areaCenter = null;
        this.state.allyTargetId = null;
        this.state.skillsOpen = command === 'skill';
        if (command === 'skill') {
            this.openSkills();
            const skills = this.world.snapshot.availableSkills;
            if (skills.length === 1)
                this.chooseSkill(skills[0]);
            return true;
        }
        if (command === 'attack' || command === 'ultimate')
            return this.beginTargetSelection(command);
        return this.executeCommand(command);
    }
    /** → 탐색은 기술이 하나여도 확정·실행으로 진행하지 않는다. */
    openSkills() {
        const state = this.world.snapshot;
        if (!commandAvailable('skill', state) || this.state.pendingCommand !== null)
            return false;
        this.state.selectedCommand = 'skill';
        this.state.skillsOpen = true;
        this.state.areaCenter = null;
        if (!state.availableSkills.includes(this.state.selectedSkill))
            this.state.selectedSkill = state.availableSkills[0];
        return true;
    }
    chooseSkill(id) {
        if (!this.world.snapshot.availableSkills.includes(id))
            return false;
        if (!this.state.skillsOpen || this.state.pendingCommand !== null)
            return false;
        this.state.selectedSkill = id;
        const state = this.world.snapshot;
        if (state.phase !== 'command' || state.energy < battleSkills[id].cost)
            return false;
        if (id === 'drink')
            return this.executeCommand('skill');
        if (id === 'ward') {
            this.state.pendingCommand = 'skill';
            const allies = this.livingAllies();
            this.state.allyTargetId = allies[0]?.id ?? null;
            return allies.length === 1 ? this.confirmTarget(allies[0].id) : true;
        }
        this.state.pendingCommand = 'skill';
        if (battleSkills[id].target === 'area') {
            const living = state.enemies.filter((enemy) => enemy.health > 0);
            this.state.areaCenter =
                living.length > 0
                    ? clampSkillArea({
                        x: living.reduce((sum, enemy) => sum + enemy.x, 0) / living.length,
                        z: living.reduce((sum, enemy) => sum + enemy.z, 0) / living.length,
                    })
                    : null;
            return true;
        }
        return this.beginTargetSelection('skill');
    }
    beginTargetSelection(command) {
        this.state.pendingCommand = command;
        const living = this.world.snapshot.enemies.filter((enemy) => enemy.health > 0);
        // 단일 대상 행동만 생존자 한 명을 자동 확정한다. 범위 위치는 직접 고른다.
        return living.length === 1 ? this.confirmTarget(living[0].id) : true;
    }
    get selectingAlly() {
        return (this.state.pendingCommand === 'skill' &&
            this.state.selectedSkill === 'ward');
    }
    livingAllies() {
        const state = this.world.snapshot;
        return [state.player, ...(state.companion ? [state.companion] : [])].filter((ally) => ally.health > 0);
    }
    selectAlly(id) {
        if (this.selectingAlly &&
            this.livingAllies().some((ally) => ally.id === id))
            this.state.allyTargetId = id;
    }
    cycleTarget(direction) {
        if (!this.selectingAlly) {
            this.world.cycleTarget(direction);
            return;
        }
        const allies = this.livingAllies();
        const index = allies.findIndex((ally) => ally.id === this.state.allyTargetId);
        const next = allies[(index + direction + allies.length) % allies.length];
        if (next)
            this.selectAlly(next.id);
    }
    get selectingArea() {
        return (this.state.pendingCommand === 'skill' &&
            battleSkills[this.state.selectedSkill].target === 'area');
    }
    affectedTargets(state) {
        if (state.phase !== 'command' ||
            this.state.pendingCommand !== 'skill' ||
            this.state.selectedSkill === 'drink' ||
            this.state.selectedSkill === 'ward')
            return [];
        if (isElementSkill(this.state.selectedSkill))
            return this.preview?.targetIds ?? [];
        return skillTargets(this.state.selectedSkill, state.targetId, state.enemies, this.state.areaCenter ?? undefined).map((target) => target.id);
    }
    confirmTarget(id) {
        if (this.state.pendingCommand === null)
            return false;
        if (this.selectingAlly) {
            if (id !== undefined)
                this.selectAlly(id);
            if (id !== undefined && this.state.allyTargetId !== id)
                return false;
        }
        else if (id !== undefined && !this.selectingArea)
            this.world.selectTarget(id);
        return this.executeCommand(this.state.pendingCommand);
    }
    cancelSelection() {
        if (this.state.pendingCommand === null)
            this.state.skillsOpen = false;
        else
            this.state.skillsOpen = this.state.pendingCommand === 'skill';
        this.state.pendingCommand = null;
        this.state.areaCenter = null;
        this.state.allyTargetId = null;
    }
    executeCommand(command) {
        if (!this.world.command(command, {
            skill: command === 'skill' ? this.state.selectedSkill : undefined,
            areaCenter: this.state.areaCenter ?? undefined,
            allyTargetId: this.state.allyTargetId ?? undefined,
        }))
            return false;
        this.state.skillsOpen = false;
        this.state.pendingCommand = null;
        this.state.areaCenter = null;
        this.state.allyTargetId = null;
        return true;
    }
    focusCommand(command) {
        if (this.state.pendingCommand !== null ||
            !commandAvailable(command, this.world.snapshot))
            return;
        this.state.selectedCommand = command;
        if (command !== 'skill')
            this.state.skillsOpen = false;
    }
    focusSkill(id) {
        if (!this.world.snapshot.availableSkills.includes(id))
            return;
        if (this.state.skillsOpen && this.state.pendingCommand === null)
            this.state.selectedSkill = id;
    }
    cycleSkill(direction) {
        const skillOrder = this.world.snapshot.availableSkills;
        if (skillOrder.length === 0)
            return;
        const index = skillOrder.indexOf(this.state.selectedSkill);
        this.state.selectedSkill =
            skillOrder[(index + direction + skillOrder.length) % skillOrder.length];
    }
    aimAt(point) {
        this.state.areaCenter = clampSkillArea(point);
    }
    changePhase(phase) {
        this.state.skillsOpen = false;
        this.state.areaCenter = null;
        this.state.pendingCommand = null;
        if (phase === 'command') {
            this.state.selectedCommand = 'attack';
            this.syncAvailability(this.world.snapshot);
        }
    }
    syncAvailability(state) {
        if (this.state.pendingCommand !== null &&
            !commandAvailable(this.state.pendingCommand, state))
            this.state.pendingCommand = null;
        if (!state.availableSkills.includes(this.state.selectedSkill))
            this.state.selectedSkill = state.availableSkills[0] ?? 'kick';
        if (!commandAvailable(this.state.selectedCommand, state))
            this.state.selectedCommand = 'attack';
    }
    reset() {
        this.state = initialSelection(this.world.snapshot);
    }
    get preview() {
        const command = this.state.pendingCommand ?? this.state.selectedCommand;
        if (command !== 'attack' && command !== 'skill')
            return null;
        return this.world.previewInteractions({
            command,
            skill: this.state.selectedSkill,
            areaCenter: this.state.areaCenter ?? undefined,
        });
    }
    get snapshot() {
        return {
            ...this.state,
            areaCenter: this.state.areaCenter ? { ...this.state.areaCenter } : null,
        };
    }
}
