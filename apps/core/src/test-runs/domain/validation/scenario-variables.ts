export interface VariableSource {
    url: string;
    headers?: Record<string, string>;
    body?: string;
}

export interface ScenarioStepLike {
    target: VariableSource;
    extract?: { name: string }[];
}

const VARIABLE_RE = /\{\{(?<name>\w+)\}\}/g;

function variableNamesIn(text: string): string[] {
    return Array.from(text.matchAll(VARIABLE_RE), (match) => match.groups?.['name'] ?? '');
}

function variablesUsedByTarget(target: VariableSource): string[] {
    const texts = [target.url, target.body ?? '', ...Object.values(target.headers ?? {})];
    const names: string[] = [];

    for (const text of texts) {
        for (const name of variableNamesIn(text)) {
            if (!names.includes(name)) {
                names.push(name);
            }
        }
    }

    return names;
}

export function missingVariablesByStep(steps: ScenarioStepLike[]): string[][] {
    const extracted = new Set<string>();

    return steps.map((step) => {
        const missing = variablesUsedByTarget(step.target).filter((name) => !extracted.has(name));

        for (const rule of step.extract ?? []) {
            extracted.add(rule.name);
        }

        return missing;
    });
}
