export const TemplateGenerator = {
    UUID: 'uuid',
    RANDOM_INT: 'randomInt',
    RANDOM_EMAIL: 'randomEmail',
    TIMESTAMP: 'timestamp',
} as const;
export type TemplateGenerator = (typeof TemplateGenerator)[keyof typeof TemplateGenerator];
