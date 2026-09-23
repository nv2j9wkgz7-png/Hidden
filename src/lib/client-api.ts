export async function api(path: string, body: unknown, method = 'POST') {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || 'Request failed. Please retry.');
  return data;
}

export async function logout() {
  const response = await fetch('/auth/logout', {
    method: 'POST',
    // Native form navigations send Origin: null under no-referrer. CORS-mode
    // fetch preserves the origin without sending a Referer or relaxing CSRF checks.
    mode: 'cors',
    credentials: 'same-origin',
    referrerPolicy: 'no-referrer',
    redirect: 'follow',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Unable to log out. Please try again.');
  }
}
