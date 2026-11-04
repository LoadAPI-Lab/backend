export interface AuthenticatedUser {
    readonly id: string;
    readonly sessionId: string;
}

declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthenticatedUser;
    }
}
