import { format, formatRelative } from 'date-fns';

export function parseDate(dateStr: string | Date | null | undefined): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    
    // If it's a naive date string from SQL (e.g. 2026-07-26T21:49:00), append 'Z' to treat as UTC
    // The regex checks for timezone info at the end (Z or +HH:MM or -HH:MM)
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(dateStr)) {
        return new Date(dateStr + 'Z');
    }
    return new Date(dateStr);
}
