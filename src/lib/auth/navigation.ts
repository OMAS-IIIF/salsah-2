/** Accept only local application paths as post-login destinations. */
export function safeReturnPath(value: string | null): string {
	const containsControlCharacter = value
		? [...value].some((character) => {
				const codePoint = character.codePointAt(0) ?? 0;
				return codePoint <= 0x1f || codePoint === 0x7f;
			})
		: false;
	if (
		!value ||
		!value.startsWith('/') ||
		value.startsWith('//') ||
		value.includes('\\') ||
		containsControlCharacter
	) {
		return '/';
	}
	return value;
}
