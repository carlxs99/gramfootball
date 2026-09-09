/**
 * Builds the base64 BOC payload for a plain text comment message body.
 *
 * Done by hand instead of with @ton/core so the wallet screen never depends on
 * Node's Buffer inside the browser bundle. The body is a single cell holding a
 * 32-bit zero opcode followed by the UTF-8 comment (memo tags are short, so it
 * always fits in one cell without refs).
 */
export function commentPayloadBase64(text: string): string {
  const body = new TextEncoder().encode(text);
  if (body.length > 123 - 4) throw new Error("Comment is too long");

  const data = new Uint8Array(4 + body.length); // 4 zero bytes = opcode 0
  data.set(body, 4);

  const d1 = 0; // no refs, not exotic, level 0
  const d2 = data.length * 2; // byte-aligned data
  const cell = new Uint8Array(2 + data.length);
  cell[0] = d1;
  cell[1] = d2;
  cell.set(data, 2);

  const boc = new Uint8Array(11 + cell.length);
  boc.set([0xb5, 0xee, 0x9c, 0x72], 0);
  boc[4] = 0x01; // ref size 1 byte, no index, no crc
  boc[5] = 0x01; // offset size 1 byte
  boc[6] = 0x01; // cell count
  boc[7] = 0x01; // root count
  boc[8] = 0x00; // absent cells
  boc[9] = cell.length; // total cells size
  boc[10] = 0x00; // root index
  boc.set(cell, 11);

  let binary = "";
  for (const byte of boc) binary += String.fromCharCode(byte);
  return btoa(binary);
}
