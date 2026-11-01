export abstract class TestRunStopper {
    abstract requestStop(testId: string): Promise<void>;
}
