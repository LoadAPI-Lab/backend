export const TEST_JOBS_QUEUE = 'test_jobs';
export const TEST_RESULTS_QUEUE = 'test_results';

export const QUEUE_OPTIONS = {
    durable: true,
    autoDelete: false,
    exclusive: false,
} as const;
