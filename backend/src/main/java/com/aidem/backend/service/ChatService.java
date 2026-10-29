package com.aidem.backend.service;

import com.aidem.backend.dto.chat.ChatContactResponse;
import com.aidem.backend.dto.chat.ChatConversationResponse;
import com.aidem.backend.dto.chat.ChatMessageResponse;
import com.aidem.backend.dto.chat.SendChatMessageRequest;
import com.aidem.backend.model.ChatMessage;
import com.aidem.backend.model.User;
import com.aidem.backend.model.enums.UserRole;
import com.aidem.backend.repository.ChatMessageRepository;
import com.aidem.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChatService {

    private static final int INITIAL_MESSAGE_LIMIT = 100;
    private static final int MAX_MESSAGE_LENGTH = 2000;

    private final ChatMessageRepository chatMessageRepository;

    private final UserRepository userRepository;

    public ChatService(ChatMessageRepository chatMessageRepository, UserRepository userRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ChatContactResponse> getContacts(Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);

        return userRepository
            .findByActiveTrueAndIdNotOrderByFullNameAsc(currentUser.getId())
            .stream()
            .filter(contact -> canCommunicateWith(currentUser, contact))
            .map(this::toContactResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatConversationResponse> getConversations(Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);

        List<ChatMessage> messages = chatMessageRepository.findAllConversationsForUser(currentUser.getId());

        Map<Long, ChatConversationResponse> conversations = new LinkedHashMap<>();

        for (ChatMessage message : messages) {
            User contact = message.getSender().getId().equals(currentUser.getId())
                ? message.getRecipient()
                : message.getSender();

            if (!Boolean.TRUE.equals(contact.getActive())) {
                continue;
            }

            if (!canCommunicateWith(currentUser, contact)) {
                continue;
            }

            conversations.putIfAbsent(
                contact.getId(),
                new ChatConversationResponse(
                    contact.getId(),
                    contact.getFullName(),
                    contact.getRole().name(),
                    contact.getAvatar(),
                    message.getContent(),
                    message.getSentAt(),
                    message.getSender().getId().equals(currentUser.getId())
                )
            );
        }

        return new ArrayList<>(conversations.values());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(Long contactId, Long afterId, Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);

        User contact = requireContact(contactId, currentUser);

        List<ChatMessage> messages;

        if (afterId == null) {
            messages = new ArrayList<>(
                chatMessageRepository.findLatestConversation(
                    currentUser.getId(),
                    contact.getId(),
                    PageRequest.of(0, INITIAL_MESSAGE_LIMIT)
                )
            );

            messages.sort(Comparator.comparing(ChatMessage::getId));
        } else {
            messages = chatMessageRepository.findConversationAfter(
                currentUser.getId(),
                contact.getId(),
                Math.max(0, afterId)
            );
        }

        return messages
            .stream()
            .map(message -> toMessageResponse(message, currentUser.getId()))
            .toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(
        Long contactId,
        SendChatMessageRequest request,
        Authentication authentication
    ) {
        User currentUser = requireCurrentUser(authentication);

        User contact = requireContact(contactId, currentUser);

        String content = request == null || request.content() == null ? "" : request.content().trim();

        if (content.isBlank()) {
            throw badRequest("A mensagem não pode estar vazia.");
        }

        if (content.length() > MAX_MESSAGE_LENGTH) {
            throw badRequest("A mensagem não pode ultrapassar 2000 caracteres.");
        }

        ChatMessage savedMessage = chatMessageRepository.save(
            ChatMessage.builder().sender(currentUser).recipient(contact).content(content).build()
        );

        return toMessageResponse(savedMessage, currentUser.getId());
    }

    private User requireCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "É necessário iniciar sessão.");
        }

        return userRepository
            .findByEmailIgnoreCase(authentication.getName())
            .filter(user -> Boolean.TRUE.equals(user.getActive()))
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilizador autenticado não encontrado.")
            );
    }

    private User requireContact(Long contactId, User currentUser) {
        if (contactId == null) {
            throw badRequest("É necessário selecionar um destinatário.");
        }

        if (contactId.equals(currentUser.getId())) {
            throw badRequest("Não pode enviar mensagens para si próprio.");
        }

        User contact = userRepository
            .findById(contactId)
            .filter(user -> Boolean.TRUE.equals(user.getActive()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Destinatário não encontrado."));

        if (!canCommunicateWith(currentUser, contact)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Nesta fase, apenas é possível comunicar com a Administração."
            );
        }

        return contact;
    }

    private boolean canCommunicateWith(User currentUser, User contact) {
        return currentUser.getRole() == UserRole.ADMIN || contact.getRole() == UserRole.ADMIN;
    }

    private ChatContactResponse toContactResponse(User user) {
        return new ChatContactResponse(user.getId(), user.getFullName(), user.getRole().name(), user.getAvatar());
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message, Long currentUserId) {
        return new ChatMessageResponse(
            message.getId(),
            message.getSender().getId(),
            message.getRecipient().getId(),
            message.getContent(),
            message.getSentAt(),
            message.getSender().getId().equals(currentUserId)
        );
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
