const SECONDS_PER_UNIT: ReadonlyMap<string, number> = new Map([
    ['s', 1],
    ['m', 60],
    ['h', 3600],
    ['d', 86_400],
    ['w', 604_800],
]);

export const DURATION_PATTERN = /^(?<amount>[0-9]+)(?<unit>[smhdw])$/;

export function durationToSeconds(value: string): number {
    const { amount, unit } = DURATION_PATTERN.exec(value)?.groups ?? {};
    const secondsPerUnit = SECONDS_PER_UNIT.get(unit ?? '');
    if (amount === undefined || secondsPerUnit === undefined) {
        throw new Error('Invalid duration, expected a number with a suffix s, m, h, d or w');
    }

    return Number(amount) * secondsPerUnit;
}
