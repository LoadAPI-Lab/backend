import type { Session } from '../session';

export abstract class SessionsRepository {
    abstract create(session: Session): Promise<void>;
    abstract findById(id: string): Promise<Session | null>;
    abstract updateIfRefreshJti(session: Session, expectedJti: string): Promise<boolean>;
    abstract revoke(id: string, at: Date): Promise<void>;
}
