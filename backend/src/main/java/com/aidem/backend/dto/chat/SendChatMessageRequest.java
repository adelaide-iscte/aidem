package com.aidem.backend.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendChatMessageRequest(
    @NotBlank(message = "A mensagem não pode estar vazia.")
    @Size(
        max = 2000,
        message = "A mensagem não pode ultrapassar 2000 caracteres."
    )
    String content
) {
}