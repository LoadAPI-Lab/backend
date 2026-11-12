import type { ScenarioConfig } from '@shared/scenario';

export interface NewScenarioInput {
    readonly userId: string;
    readonly name: string;
    readonly config: ScenarioConfig;
    readonly now?: Date;
}

interface ScenarioState {
    readonly id: string;
    readonly userId: string;
    readonly name: string;
    readonly config: ScenarioConfig;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface ScenarioSummary {
    readonly id: string;
    readonly name: string;
    readonly stepsCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export class Scenario {
    private constructor(private readonly state: ScenarioState) {}

    static create(input: NewScenarioInput): Scenario {
        const now = input.now ?? new Date();
        return new Scenario({
            id: crypto.randomUUID(),
            userId: input.userId,
            name: input.name,
            config: input.config,
            createdAt: now,
            updatedAt: now,
        });
    }

    static restore(state: ScenarioState): Scenario {
        return new Scenario({ ...state });
    }

    get id(): string {
        return this.state.id;
    }

    get userId(): string {
        return this.state.userId;
    }

    get name(): string {
        return this.state.name;
    }

    get config(): ScenarioConfig {
        return this.state.config;
    }

    get stepsCount(): number {
        return this.state.config.steps.length;
    }

    get createdAt(): Date {
        return this.state.createdAt;
    }

    get updatedAt(): Date {
        return this.state.updatedAt;
    }
}
