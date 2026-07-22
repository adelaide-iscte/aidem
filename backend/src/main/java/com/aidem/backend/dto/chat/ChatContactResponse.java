package com.aidem.backend.dto.chat;

public record ChatContactResponse(
    Long id,
    String fullName,
    String role
) {
}