import { pgEnum } from 'drizzle-orm/pg-core';

import { TEST_RUN_STATUSES, TEST_TYPES } from '../../../domain/constants';

export const testRunStatusEnum = pgEnum('test_run_status', TEST_RUN_STATUSES);
export const testTypeEnum = pgEnum('test_type', TEST_TYPES);
