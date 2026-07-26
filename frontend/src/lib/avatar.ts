const AVATAR_COLORS = [
    'bg-[var(--avatar-0)]',
    'bg-[var(--avatar-1)]',
    'bg-[var(--avatar-2)]',
    'bg-[var(--avatar-3)]',
    'bg-[var(--avatar-4)]',
    'bg-[var(--avatar-5)]',
    'bg-[var(--avatar-6)]',
    'bg-[var(--avatar-7)]',
];

export function getAvatarColorClass(id: string | undefined | null): string {
    if (!id) return AVATAR_COLORS[0];
    
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % 8;
    return AVATAR_COLORS[index];
}

export function getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
