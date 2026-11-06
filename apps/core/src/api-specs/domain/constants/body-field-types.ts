export const BodyFieldType = {
    STRING: 'string',
    INTEGER: 'integer',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
} as const;
export type BodyFieldType = (typeof BodyFieldType)[keyof typeof BodyFieldType];

export const BODY_FIELD_TYPES = [
    BodyFieldType.STRING,
    BodyFieldType.INTEGER,
    BodyFieldType.NUMBER,
    BodyFieldType.BOOLEAN,
] as const;
