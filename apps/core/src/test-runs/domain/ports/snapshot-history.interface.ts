export abstract class SnapshotHistory {
    abstract read(testId: string): Promise<unknown[]>;
}
