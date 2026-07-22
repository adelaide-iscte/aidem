package com.aidem.backend.controller;

import com.aidem.backend.dto.chat.ChatContactResponse;
import com.aidem.backend.dto.chat.ChatConversationResponse;
import com.aidem.backend.dto.chat.ChatMessageResponse;
import com.aidem.backend.dto.chat.SendChatMessageRequest;
import com.aidem.backend.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(
            ChatService chatService
    ) {
        this.chatService = chatService;
    }

    /*
     * Utilizadores disponíveis para iniciar
     * uma conversa.
     */
    @GetMapping("/contacts")
    public List<ChatContactResponse> getContacts(
            Authentication authentication
    ) {
        return chatService.getContacts(
                authentication
        );
    }

    /*
     * Conversas que já possuem mensagens.
     */
    @GetMapping("/conversations")
    public List<ChatConversationResponse>
    getConversations(
            Authentication authentication
    ) {
        return chatService.getConversations(
                authentication
        );
    }

    /*
     * Mensagens privadas com um contacto.
     */
    @GetMapping(
            "/conversations/{contactId}/messages"
    )
    public List<ChatMessageResponse> getMessages(
            @PathVariable Long contactId,
            @RequestParam(required = false)
            Long afterId,
            Authentication authentication
    ) {
        return chatService.getMessages(
                contactId,
                afterId,
                authentication
        );
    }

    /*
     * Envio de uma nova mensagem.
     */
    @PostMapping(
            "/conversations/{contactId}/messages"
    )
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse sendMessage(
            @PathVariable Long contactId,
            @Valid
            @RequestBody
            SendChatMessageRequest request,
            Authentication authentication
    ) {
        return chatService.sendMessage(
                contactId,
                request,
                authentication
        );
    }
}