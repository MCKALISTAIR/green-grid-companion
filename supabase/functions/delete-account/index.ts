import { handleDeleteAccount } from './handler.ts';

Deno.serve((req: Request) => handleDeleteAccount(req));
