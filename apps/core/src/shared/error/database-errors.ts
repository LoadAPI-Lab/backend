export const DATABASE_ERRORS: Record<string, { code: number; msg: string }> = {
    '23505': { code: 409, msg: 'A record with this value already exists (duplicate).' },
    '23503': { code: 409, msg: 'Foreign key violation: the referenced record was not found.' },
    '22P02': { code: 400, msg: 'Invalid data format (e.g. a malformed UUID).' },
    '23514': { code: 400, msg: 'A check constraint was violated.' },
    '23502': { code: 400, msg: 'A required field is missing.' },
    '08006': { code: 500, msg: 'Database connection error.' },
    '40001': { code: 500, msg: 'Transaction conflict. Please retry.' },
};
