// Keep login and email-confirmation returns on explicitly supported private routes.
export function loginDestination(next?: string | null): string {
  if (next === 'new' || next === '/new') return '/new';
  if (next === 'purchases' || next === '/purchases') return '/purchases';
  if (next === '/purchases/recover/claim') return next;
  if (next && /^\/purchases\/save\/[a-f0-9]{24}$/.test(next)) return next;
  return '/dashboard';
}
