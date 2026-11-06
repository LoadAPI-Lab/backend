import type { ParsedApiSpec } from '../api-spec-document';

export abstract class SpecParser {
    abstract parse(content: string): Promise<ParsedApiSpec>;
}
