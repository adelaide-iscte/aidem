package com.aidem.backend.dto.chat;

import java.time.Instant;

public record ChatMessageResponse(
    Long id,
    Long senderId,
    Long recipientId,
    String content,
    Instant sentAt,
    boolean mine
) {
}