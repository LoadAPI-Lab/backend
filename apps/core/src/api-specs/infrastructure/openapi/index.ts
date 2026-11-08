import type { Provider } from '@nestjs/common';

import { SpecParser } from '../../domain/ports';
import { SpecParserImpl } from './spec-parser';

export * from './spec-parser';

export const OPENAPI_PROVIDERS: Provider[] = [{ provide: SpecParser, useClass: SpecParserImpl }];
