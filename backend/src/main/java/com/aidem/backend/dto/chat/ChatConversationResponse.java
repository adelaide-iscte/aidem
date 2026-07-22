package com.aidem.backend.dto.chat;

import java.time.Instant;

public record ChatConversationResponse(
    Long contactId,
    String contactName,
    String contactRole,
    String lastMessage,
    Instant lastMessageAt,
    boolean lastMessageMine
) {
}