package com.aidem.backend.dto.auth;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        String role
) {}