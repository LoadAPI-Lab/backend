import { randomUUID } from 'node:crypto';

import { TemplateGenerator } from '../constants';
import { resolveTemplate } from './template-resolver';

vi.mock('node:crypto', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:crypto')>();
    return { ...actual, randomUUID: vi.fn(actual.randomUUID) };
});

const placeholderOf = (generator: TemplateGenerator): string => `{{$${generator}}}`;

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const GENERATOR_FORMATS: readonly [TemplateGenerator, RegExp][] = [
    [TemplateGenerator.UUID, UUID_V4_RE],
    [TemplateGenerator.RANDOM_INT, /^(?:0|[1-9][0-9]{0,5})$/],
    [TemplateGenerator.RANDOM_EMAIL, /^user_[0-9a-z]{1,13}@example\.com$/],
    [TemplateGenerator.TIMESTAMP, /^[0-9]{10}$/],
];

describe('resolveTemplate', () => {
    it.each(GENERATOR_FORMATS)(
        'resolves the %s generator in the worker format',
        (generator, format) => {
            expect(resolveTemplate(placeholderOf(generator))).toMatch(format);
        },
    );

    it('gives every occurrence of a generator its own value', () => {
        const uuid = placeholderOf(TemplateGenerator.UUID);

        const [first, second] = resolveTemplate(`${uuid}/${uuid}`).split('/');

        expect(first).toMatch(UUID_V4_RE);
        expect(second).toMatch(UUID_V4_RE);
        expect(first).not.toBe(second);
    });

    it.each(['{{$unknown}}', '/tasks/{{taskId}}'])('leaves %s unchanged', (text) => {
        expect(resolveTemplate(text)).toBe(text);
    });

    it('does not resolve a substituted value that looks like a placeholder', () => {
        const uuid = placeholderOf(TemplateGenerator.UUID);
        vi.mocked(randomUUID).mockReturnValueOnce(uuid as ReturnType<typeof randomUUID>);

        expect(resolveTemplate(uuid)).toBe(uuid);
    });
});
