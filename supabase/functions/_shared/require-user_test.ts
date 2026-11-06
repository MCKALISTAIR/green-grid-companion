import { assertEquals } from 'jsr:@std/assert@1';
import { bearerToken, requireUser } from './require-user.ts';
import { fakeGetUser } from './fake-admin_test_harness.ts';

const req = (auth?: string) =>
  new Request('http://x/', { method: 'POST', headers: auth ? { Authorization: auth } : {} });

Deno.test('bearerToken reads only "Bearer <jwt>"', () => {
  assertEquals(bearerToken(req('Bearer abc')), 'abc');
  assertEquals(bearerToken(req('bearer abc')), 'abc');
  assertEquals(bearerToken(req('abc')), null);
  assertEquals(bearerToken(req('Bearer ')), null);
  assertEquals(bearerToken(req()), null);
});

Deno.test('requireUser: 401 with no header, without calling getUser', async () => {
  const seen: string[] = [];
  const r = await requireUser(req(), fakeGetUser(seen), 't');
  assertEquals('response' in r && r.response.status, 401);
  assertEquals(seen.length, 0);
});

Deno.test('requireUser: 401 for a bad token or a throwing getUser', async () => {
  const bad = await requireUser(req('Bearer nope'), fakeGetUser(), 't');
  assertEquals('response' in bad && bad.response.status, 401);
  const boom = await requireUser(req('Bearer x'), () => Promise.reject(new Error('net')), 't');
  assertEquals('response' in boom && boom.response.status, 401);
});

Deno.test('requireUser: passes the header token to getUser and returns the user', async () => {
  const seen: string[] = [];
  const r = await requireUser(req('Bearer good-token'), fakeGetUser(seen), 't');
  assertEquals(seen, ['good-token']);
  assertEquals('user' in r && r.user.id, 'user-aaaa-1111');
});
