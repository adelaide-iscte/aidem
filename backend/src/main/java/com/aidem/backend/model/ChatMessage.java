package com.aidem.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "chat_messages",
        indexes = {
                @Index(
                        name = "idx_chat_messages_sender_recipient",
                        columnList = "sender_id,recipient_id,id"
                ),
                @Index(
                        name = "idx_chat_messages_recipient_sender",
                        columnList = "recipient_id,sender_id,id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "sender_id",
            nullable = false
    )
    private User sender;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "recipient_id",
            nullable = false
    )
    private User recipient;

    @Column(
            nullable = false,
            columnDefinition = "text"
    )
    private String content;

    @Column(
            nullable = false,
            updatable = false
    )
    private Instant sentAt;

    @PrePersist
    void onCreate() {
        if (sentAt == null) {
            sentAt = Instant.now();
        }
    }
}