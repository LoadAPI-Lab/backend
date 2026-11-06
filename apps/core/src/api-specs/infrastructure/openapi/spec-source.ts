import { type Document, isMap, isScalar, LineCounter, parseDocument } from 'yaml';

import { asNode, type DocumentNode } from './document-values';
import { CONTENT_FIELD, invalidSpec, invalidSpecDetail, invalidSyntax } from './spec-errors';

const ROOT_NOT_OBJECT_MESSAGE = 'The document root must be an object';
const NOT_A_TREE_MESSAGE = 'The document contains recursive aliases or values that are not JSON';

export type ResponseOrder = (path: string, method: string) => string[] | undefined;

export interface SpecSource {
    readonly root: DocumentNode;
    readonly responseOrder: ResponseOrder;
}

const toPlainTree = (document: Document): unknown => {
    try {
        return JSON.parse(JSON.stringify(document.toJS()) ?? 'null');
    } catch {
        throw invalidSyntax(NOT_A_TREE_MESSAGE);
    }
};

const keyText = (key: unknown): string => String(isScalar(key) ? key.value : key);

const responseOrderOf =
    (document: Document): ResponseOrder =>
    (path, method) => {
        const node = document.getIn(['paths', path, method, 'responses'], true);
        return isMap(node) ? node.items.map((pair) => keyText(pair.key)) : undefined;
    };

export const readSpecSource = (content: string): SpecSource => {
    const lineCounter = new LineCounter();
    const document = parseDocument(content, { lineCounter, prettyErrors: false });

    const [error] = document.errors;
    if (error) {
        const [start] = error.pos;
        throw invalidSyntax(error.message, lineCounter.linePos(start));
    }

    const root = asNode(toPlainTree(document));
    if (!root) {
        throw invalidSpec([invalidSpecDetail(CONTENT_FIELD, ROOT_NOT_OBJECT_MESSAGE)]);
    }

    return { root, responseOrder: responseOrderOf(document) };
};
