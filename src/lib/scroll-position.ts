type Position = { x: number; y: number };
const positions = new Map<string, Position>();
let pending: { url: string; position: Position } | null = null;

export function rememberScroll(url: string, position: Position) {
  positions.delete(url);
  positions.set(url, position);
  if (positions.size > 80) positions.delete(positions.keys().next().value!);
}

export function requestScrollRestore(url: string) {
  const position = positions.get(url) ?? { x: 0, y: 0 };
  pending = { url, position };
}

export function takeScrollRestore(url: string) {
  const request = pending;
  pending = null;
  return request?.url === url ? request.position : null;
}
