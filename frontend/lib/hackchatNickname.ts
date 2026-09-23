const PREFIX = "SE_";
const NICKNAME_MAX_LENGTH = 24;

/**
 * Derives a nickname for the community's hackchat.js.org room from a
 * member's address. hackchat caps nicknames at 24 characters and only
 * allows letters, numbers, and underscores, so a full 40-character hex
 * address doesn't fit as-is.
 *
 * Hex digits are already letters+numbers, so no hashing or re-encoding is
 * needed — this just takes the address's own trailing hex digits. 21 of
 * them preserve 84 bits of the real address, far more than enough to stay
 * unique across this community's realistic membership size, while still
 * letting other members visually cross-reference a hackchat nickname
 * against the Party Roster.
 */
export function deriveHackChatNickname(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, "");
  return `${PREFIX}${hex.slice(-(NICKNAME_MAX_LENGTH - PREFIX.length))}`;
}
