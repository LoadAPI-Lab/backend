import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

const currentUserResponseSchema = z.object({
    id: z.uuid().describe('User id'),
    email: z.email().describe('Email address'),
    name: z.string().describe('Display name'),
    avatarUrl: z.string().optional().describe('Avatar URL, absent when the user has none'),
    createdAt: z.iso.datetime().describe('Registration time, ISO 8601'),
});

export class CurrentUserResponseDto extends createZodDto(currentUserResponseSchema) {}

export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
