package com.aidem.backend.controller;

import com.aidem.backend.dto.auth.LoginRequest;
import com.aidem.backend.dto.auth.LoginResponse;
import com.aidem.backend.dto.auth.UserResponse;
import com.aidem.backend.model.User;
import com.aidem.backend.repository.UserRepository;
import com.aidem.backend.security.JwtService;
import com.aidem.backend.security.LoginAttemptService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    public AuthController(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        LoginAttemptService loginAttemptService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        if (loginAttemptService.isBlocked(request.email())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts");
        }

        User user = userRepository.findByEmailIgnoreCase(request.email()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttemptService.loginFailed(request.email());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        loginAttemptService.loginSucceeded(request.email());

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account disabled");
        }

        String token = jwtService.generateToken(user);

        return new LoginResponse(
            token,
            new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name())
        );
    }
}
