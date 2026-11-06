import { handleExportData } from './handler.ts';

Deno.serve((req: Request) => handleExportData(req));
