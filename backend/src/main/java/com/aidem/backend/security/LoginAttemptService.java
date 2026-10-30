package com.aidem.backend.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration BLOCK_TIME = Duration.ofMinutes(15);

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String email) {
        Attempts current = attempts.get(key(email));
        if (current == null || current.blockedUntil() == null) {
            return false;
        }
        if (Instant.now().isAfter(current.blockedUntil())) {
            attempts.remove(key(email));
            return false;
        }
        return true;
    }

    public void loginFailed(String email) {
        attempts.compute(key(email), (k, current) -> {
            int count = current == null ? 1 : current.count() + 1;
            Instant blockedUntil = count >= MAX_ATTEMPTS ? Instant.now().plus(BLOCK_TIME) : null;
            return new Attempts(count, blockedUntil);
        });
    }

    public void loginSucceeded(String email) {
        attempts.remove(key(email));
    }

    private String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private record Attempts(int count, Instant blockedUntil) {}
}
