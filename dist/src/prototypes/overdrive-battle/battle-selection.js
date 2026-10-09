import { battleSkills, skillTargets } from './battle-skills.js';
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
function initialSelection(skills) {
    return {
        selectedCommand: 'attack',
        pendingCommand: null,
        skillsOpen: false,
        selectedSkill: skills[0] ?? 'kick',
        areaCenter: null,
    };
}
export function commandAvailable(command, state) {
    if (state.phase !== 'command')
        return false;
    if (command === 'skill')
        return state.availableSkills.length > 0;
    if (!state.advanced && (command === 'ultimate' || command === 'overdrive'))
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
        this.state = initialSelection(world.snapshot.availableSkills);
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
        this.state.skillsOpen = command === 'skill';
        if (command === 'skill')
            return true;
        if (command === 'attack' || command === 'ultimate') {
            this.state.pendingCommand = command;
            return true;
        }
        return this.executeCommand(command);
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
        }
        return true;
    }
    get selectingArea() {
        return (this.state.pendingCommand === 'skill' &&
            battleSkills[this.state.selectedSkill].target === 'area');
    }
    affectedTargets(state) {
        if (state.phase !== 'command' ||
            this.state.pendingCommand !== 'skill' ||
            this.state.selectedSkill === 'drink')
            return [];
        return skillTargets(this.state.selectedSkill, state.targetId, state.enemies, this.state.areaCenter ?? undefined).map((target) => target.id);
    }
    confirmTarget(id) {
        if (this.state.pendingCommand === null)
            return false;
        if (id !== undefined && !this.selectingArea)
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
    }
    executeCommand(command) {
        if (!this.world.command(command, {
            skill: this.state.selectedSkill,
            areaCenter: this.state.areaCenter ?? undefined,
        }))
            return false;
        this.state.skillsOpen = false;
        this.state.pendingCommand = null;
        this.state.areaCenter = null;
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
        if (phase === 'command')
            this.state.selectedCommand = 'attack';
    }
    syncAvailability(state) {
        if (this.state.pendingCommand !== null &&
            !commandAvailable(this.state.pendingCommand, state))
            this.state.pendingCommand = null;
        if (!commandAvailable(this.state.selectedCommand, state))
            this.state.selectedCommand = 'attack';
    }
    reset() {
        this.state = initialSelection(this.world.snapshot.availableSkills);
    }
    get snapshot() {
        return {
            ...this.state,
            areaCenter: this.state.areaCenter ? { ...this.state.areaCenter } : null,
        };
    }
}
