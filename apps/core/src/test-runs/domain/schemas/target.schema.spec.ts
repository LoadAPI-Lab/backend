import { targetSchema } from './target.schema';

describe('targetSchema', () => {
    const acceptedCases: { name: string; target: unknown }[] = [
        { name: 'simple get', target: { method: 'GET', url: 'https://api.example.com/users' } },
        {
            name: 'port and query',
            target: { method: 'POST', url: 'http://localhost:8080/users?page=2' },
        },
        {
            name: 'scenario variable in path',
            target: { method: 'GET', url: 'https://api.example.com/tasks/{{taskId}}' },
        },
        {
            name: 'generator in path',
            target: { method: 'DELETE', url: 'https://api.example.com/tasks/{{$uuid}}' },
        },
        {
            name: 'headers and body',
            target: {
                method: 'POST',
                url: 'https://api.example.com/users',
                headers: { 'Content-Type': 'application/json' },
                body: '{"email":"a@example.com"}',
            },
        },
        {
            name: 'double-brace variable is not a path parameter',
            target: { method: 'GET', url: 'https://api.example.com/users/{{id}}' },
        },
    ];

    const rejectedCases: { name: string; target: unknown }[] = [
        { name: 'empty method', target: { method: '', url: 'https://api.example.com' } },
        { name: 'lowercase method', target: { method: 'get', url: 'https://api.example.com' } },
        { name: 'unknown method', target: { method: 'FETCH', url: 'https://api.example.com' } },
        { name: 'empty url', target: { method: 'GET', url: '' } },
        { name: 'relative url', target: { method: 'GET', url: '/users' } },
        {
            name: 'unsupported scheme',
            target: { method: 'GET', url: 'ftp://api.example.com/file' },
        },
        { name: 'missing host', target: { method: 'GET', url: 'https:///' } },
        {
            name: 'colon path parameter',
            target: { method: 'GET', url: 'https://api.example.com/users/:id' },
        },
        {
            name: 'brace path parameter',
            target: { method: 'GET', url: 'https://api.example.com/users/{id}/posts' },
        },
    ];

    for (const { name, target } of acceptedCases) {
        it(`accepts: ${name}`, () => {
            expect(targetSchema.safeParse(target).success).toBe(true);
        });
    }

    for (const { name, target } of rejectedCases) {
        it(`rejects: ${name}`, () => {
            expect(targetSchema.safeParse(target).success).toBe(false);
        });
    }

    it('reports the unresolved path parameter in the error message', () => {
        const result = targetSchema.safeParse({
            method: 'GET',
            url: 'https://api.example.com/users/:id',
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe(
            'url "https://api.example.com/users/:id" has unresolved path parameter ":id"',
        );
    });
});
