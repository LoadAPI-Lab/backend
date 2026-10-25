import { jwtSecretValidation } from '@libs/config/helpers/jwt-secren-validation';
import { z } from 'zod/v4';

const duration = z.string().regex(/^[0-9]+[smhdw]$/, {
    message: 'Use a number with a suffix s, m, h, d or w, for example 15m or 30d',
});

const jwtSecret = (name: string) =>
    z.string({ error: `${name} is required` }).refine(jwtSecretValidation, {
        message: `${name} must be at least 32 characters or 5 words joined by dashes`,
    });

export const ConfigSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    API_PUBLIC_URL: z.url().optional(),
    FRONTEND_URL: z.url(),
    CORS_ALLOWED_ORIGINS: z
        .string()
        .transform((value) =>
            value
                .split(',')
                .map((origin) => origin.trim())
                .filter(Boolean),
        )
        .pipe(z.array(z.url()).min(1)),

    COOKIE_SECRET: z.string().min(32),
    COOKIE_DOMAIN: z.string().optional(),

    DATABASE_URL: z.url().default('postgres://loadapi:loadapi@localhost:5432/loadapi'),
    REDIS_URL: z.url().default('redis://localhost:6379/0'),
    RABBITMQ_URL: z.url().default('amqp://loadapi:loadapi@localhost:5672/'),

    JWT_ISSUER: z.string().min(1),
    JWT_AUDIENCE: z.string().min(1),
    JWT_ACCESS_SECRET: jwtSecret('JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: jwtSecret('JWT_REFRESH_SECRET'),
    JWT_ACCESS_EXPIRES_IN: duration.default('15m'),
    JWT_REFRESH_EXPIRES_IN: duration.default('30d'),

    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

    THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
});

export type Config = z.infer<typeof ConfigSchema>;
