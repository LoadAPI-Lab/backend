import { Injectable } from '@nestjs/common';
import { type ErrorObject, validate } from '@scalar/openapi-parser';
import type { ErrorDetail } from '@shared/error';

import type { ParsedApiSpec } from '../../domain/api-spec-document';
import { MAX_SPEC_SIZE_BYTES } from '../../domain/constants';
import { ApiSpecErrorCodes, apiSpecException } from '../../domain/errors';
import { SpecParser } from '../../domain/ports';
import { asNode, asString, type DocumentNode } from './document-values';
import { findExternalReferences } from './external-references';
import { toDotPath } from './json-pointer';
import { normalizeEndpoints } from './normalize-endpoints';
import { normalizeServers } from './normalize-servers';
import { CONTENT_FIELD, invalidSpec, invalidSpecDetail } from './spec-errors';
import { readSpecSource } from './spec-source';

const SUPPORTED_VERSION_PATTERN = /^3\.[01]\.\d+$/;
const VALIDATION_FAILED_MESSAGE = 'The document could not be validated';

const isSupportedVersion = (root: DocumentNode): boolean => {
    const version = root['openapi'];
    return (
        !Object.hasOwn(root, 'swagger') &&
        typeof version === 'string' &&
        SUPPORTED_VERSION_PATTERN.test(version)
    );
};

const toValidationDetails = (errors: ErrorObject[]): ErrorDetail[] => {
    const details = errors.map((error) => invalidSpecDetail(toDotPath(error.path), error.message));
    const unique = new Map(details.map((detail) => [`${detail.field}\n${detail.message}`, detail]));
    return [...unique.values()];
};

const resolveDocument = async (root: DocumentNode): Promise<DocumentNode> => {
    const result = await validate(root).catch(() => {
        throw invalidSpec([invalidSpecDetail(CONTENT_FIELD, VALIDATION_FAILED_MESSAGE)]);
    });
    if (!result.valid) {
        throw invalidSpec(toValidationDetails(result.errors));
    }
    const resolved = asNode(result.schema);
    if (!resolved) {
        throw invalidSpec([invalidSpecDetail(CONTENT_FIELD, VALIDATION_FAILED_MESSAGE)]);
    }
    return resolved;
};

@Injectable()
export class SpecParserImpl implements SpecParser {
    async parse(content: string): Promise<ParsedApiSpec> {
        if (Buffer.byteLength(content, 'utf8') > MAX_SPEC_SIZE_BYTES) {
            throw apiSpecException(ApiSpecErrorCodes.TOO_LARGE);
        }

        const { root, responseOrder } = readSpecSource(content);

        if (!isSupportedVersion(root)) {
            throw apiSpecException(ApiSpecErrorCodes.UNSUPPORTED_VERSION);
        }

        const externalReferences = findExternalReferences(root);
        if (externalReferences.length) {
            throw invalidSpec(externalReferences);
        }

        const document = await resolveDocument(root);
        const info = asNode(document['info']) ?? {};
        const description = asString(info['description']);

        return {
            title: asString(info['title']) ?? '',
            version: asString(info['version']) ?? '',
            ...(description !== undefined && { description }),
            servers: normalizeServers(document['servers']),
            endpoints: normalizeEndpoints(document, responseOrder),
        };
    }
}
