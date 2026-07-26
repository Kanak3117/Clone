export interface User {
    id: string;
    username: string;
    phone_number?: string | null;
    display_name: string;
    avatar_url?: string | null;
    status_text?: string | null;
    is_online: boolean;
    last_seen?: string | null;
}

export interface Contact {
    id: string;
    owner_id: string;
    contact_user_id: string;
    nickname?: string | null;
    created_at: string;
    contact_user?: User;
}

export interface ConversationParticipant {
    id: string;
    conversation_id: string;
    user_id: string;
    role: "admin" | "member";
    joined_at: string;
    last_read_message_id?: string | null;
    user?: User;
}

export interface ParticipantInfo {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    display_name: string;
    username: string;
    avatar_url?: string | null;
    is_online: boolean;
    last_seen?: string | null;
}

export interface Conversation {
    id: string;
    type: "direct" | "group";
    name?: string | null;
    avatar_url?: string | null;
    chat_color?: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    participants: ParticipantInfo[];
    unread_count?: number;
}

export interface MessageSender {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    username: string;
}

export interface MessageStatusInfo {
    user_id: string;
    status: string;
    updated_at?: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: "text" | "system";
    created_at: string;
    sender: MessageSender;
    client_status?: "sending" | "failed"; // For optimistic UI
    statuses?: MessageStatusInfo[];
}

export interface MessageStatus {
    id: string;
    message_id: string;
    user_id: string;
    status: "sent" | "delivered" | "read";
    updated_at: string;
}

// WebSocket Events
export type WSEvent =
    | { type: "message:new"; message: Message; temp_id?: string }
    | { type: "message:status"; message_id: string; user_id: string; status: string; conversation_id: string }
    | { type: "typing:update"; conversation_id: string; user_id: string; is_typing: boolean }
    | { type: "presence:update"; user_id: string; is_online: boolean; last_seen?: string | null };
