// Share links: encode a hex dump into a base64url fragment (#d=...) and
// decode it back. Pure; wired to the Copy link button in main.js.
export function encodeShare(input) {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(s) {
  if (typeof s !== "string" || s === "" || !/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
