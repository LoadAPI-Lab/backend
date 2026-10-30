import { MAX_SCENARIO_STEPS } from '../constants';
import { scenarioConfigSchema } from './scenario-config.schema';

const login = {
    target: { method: 'POST', url: 'https://api.example.com/login' },
    extract: [{ name: 'token', path: 'accessToken' }],
};
const createTask = {
    target: {
        method: 'POST',
        url: 'https://api.example.com/tasks',
        headers: { Authorization: 'Bearer {{token}}' },
        body: '{"title":"task-{{$uuid}}"}',
    },
    extract: [{ name: 'taskId', path: 'data.id' }],
};
const getTask = {
    target: { method: 'GET', url: 'https://api.example.com/tasks/{{taskId}}' },
};

describe('scenarioConfigSchema', () => {
    const acceptedCases: { name: string; steps: unknown[] }[] = [
        { name: 'valid chain', steps: [login, createTask, getTask] },
        { name: 'single step without variables', steps: [login] },
        { name: 'variable in a header value', steps: [login, createTask] },
        {
            name: 'exactly the step limit',
            steps: Array.from({ length: MAX_SCENARIO_STEPS }, () => ({
                target: { method: 'GET', url: 'https://api.example.com/health' },
            })),
        },
    ];

    const rejectedCases: { name: string; steps: unknown[] }[] = [
        { name: 'no steps', steps: [] },
        { name: 'variable used before it is extracted', steps: [getTask, createTask] },
        { name: 'variable never extracted', steps: [createTask] },
        {
            name: 'step uses its own extracted variable',
            steps: [
                {
                    target: { method: 'GET', url: 'https://api.example.com/tasks/{{taskId}}' },
                    extract: [{ name: 'taskId', path: 'id' }],
                },
            ],
        },
        {
            name: 'extract rule without path',
            steps: [
                {
                    target: { method: 'GET', url: 'https://api.example.com/me' },
                    extract: [{ name: 'userId', path: '' }],
                },
            ],
        },
        {
            name: 'extract name with a dash',
            steps: [
                {
                    target: { method: 'GET', url: 'https://api.example.com/me' },
                    extract: [{ name: 'user-id', path: 'id' }],
                },
            ],
        },
        {
            name: 'invalid target in step',
            steps: [login, { target: { method: 'GET', url: 'https://api.example.com/users/:id' } }],
        },
        {
            name: 'too many steps',
            steps: Array.from({ length: MAX_SCENARIO_STEPS + 1 }, () => ({
                target: { method: 'GET', url: 'https://api.example.com/health' },
            })),
        },
    ];

    for (const { name, steps } of acceptedCases) {
        it(`accepts: ${name}`, () => {
            expect(scenarioConfigSchema.safeParse({ steps }).success).toBe(true);
        });
    }

    for (const { name, steps } of rejectedCases) {
        it(`rejects: ${name}`, () => {
            expect(scenarioConfigSchema.safeParse({ steps }).success).toBe(false);
        });
    }

    it('reports the step number and the missing variables in the error message', () => {
        const result = scenarioConfigSchema.safeParse({ steps: [getTask, createTask] });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe(
            'step 1 uses variables that no earlier step extracts: taskId',
        );
    });
});
