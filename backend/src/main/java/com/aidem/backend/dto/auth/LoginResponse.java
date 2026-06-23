package com.aidem.backend.dto.auth;

public record LoginResponse(
        String token,
        UserResponse user
) {}