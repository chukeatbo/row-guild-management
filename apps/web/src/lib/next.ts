/** path ที่จะพากลับไปหลัง login (`?next=`) — รับเฉพาะ path ภายในเว็บ กัน open redirect เช่น //evil.com */
export function safeNext(next: string | null | undefined, fallback = '/dashboard') {
	return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback;
}
