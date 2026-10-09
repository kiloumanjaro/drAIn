/**
 * Read a request body as text, giving up once it is larger than `maxBytes`.
 *
 * `request.text()` and `request.json()` read whatever is sent, however large,
 * before any check can run. This stops at the limit instead: a declared
 * Content-Length over it is refused without reading, and a body that turns out
 * longer than it said (or said nothing) is dropped part-way.
 *
 * Returns null when the body is over the limit.
 */
export async function readTextCapped(
  request: Request,
  maxBytes: number
): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}
