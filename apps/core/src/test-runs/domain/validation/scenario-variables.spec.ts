import { missingVariablesByStep, type ScenarioStepLike } from './scenario-variables';

describe('missingVariablesByStep', () => {
    it('returns no missing variables for a step that uses none', () => {
        const steps: ScenarioStepLike[] = [{ target: { url: 'https://api.example.com/users' } }];

        expect(missingVariablesByStep(steps)).toEqual([[]]);
    });

    it('finds a variable used in the url that no step extracts', () => {
        const steps: ScenarioStepLike[] = [
            { target: { url: 'https://api.example.com/tasks/{{taskId}}' } },
        ];

        expect(missingVariablesByStep(steps)).toEqual([['taskId']]);
    });

    it('does not count a variable extracted by an earlier step as missing', () => {
        const steps: ScenarioStepLike[] = [
            { target: { url: 'https://api.example.com/login' }, extract: [{ name: 'token' }] },
            {
                target: {
                    url: 'https://api.example.com/me',
                    headers: { Authorization: 'Bearer {{token}}' },
                },
            },
        ];

        expect(missingVariablesByStep(steps)).toEqual([[], []]);
    });

    it('does not let a step satisfy its own variable with its own extract rule', () => {
        const steps: ScenarioStepLike[] = [
            {
                target: { url: 'https://api.example.com/tasks/{{taskId}}' },
                extract: [{ name: 'taskId' }],
            },
        ];

        expect(missingVariablesByStep(steps)).toEqual([['taskId']]);
    });

    it('finds a variable used in a header value', () => {
        const steps: ScenarioStepLike[] = [
            {
                target: {
                    url: 'https://api.example.com/me',
                    headers: { Authorization: 'Bearer {{token}}' },
                },
            },
        ];

        expect(missingVariablesByStep(steps)).toEqual([['token']]);
    });

    it('finds a variable used in the body', () => {
        const steps: ScenarioStepLike[] = [
            { target: { url: 'https://api.example.com/tasks', body: '{"title":"{{title}}"}' } },
        ];

        expect(missingVariablesByStep(steps)).toEqual([['title']]);
    });

    it('ignores generator placeholders', () => {
        const steps: ScenarioStepLike[] = [
            {
                target: {
                    url: 'https://api.example.com/tasks/{{$uuid}}',
                    body: '{"email":"{{$randomEmail}}"}',
                },
            },
        ];

        expect(missingVariablesByStep(steps)).toEqual([[]]);
    });

    it('deduplicates repeated variable usages', () => {
        const steps: ScenarioStepLike[] = [
            { target: { url: 'https://api.example.com/tasks/{{taskId}}/items/{{taskId}}' } },
        ];

        expect(missingVariablesByStep(steps)).toEqual([['taskId']]);
    });
});
