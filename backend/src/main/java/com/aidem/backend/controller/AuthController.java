package com.aidem.backend.controller;

import com.aidem.backend.dto.auth.LoginRequest;
import com.aidem.backend.dto.auth.LoginResponse;
import com.aidem.backend.dto.auth.UserResponse;
import com.aidem.backend.model.User;
import com.aidem.backend.repository.UserRepository;
import com.aidem.backend.security.JwtService;
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

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        System.out.println("LOGIN START: " + request.email());

        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        System.out.println("USER FOUND: " + user.getEmail());
        System.out.println("HASH LENGTH: " + user.getPasswordHash().length());

        boolean passwordOk = passwordEncoder.matches(request.password(), user.getPasswordHash());

        System.out.println("PASSWORD OK: " + passwordOk);

        if (!passwordOk) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateToken(user);

        System.out.println("TOKEN GENERATED");

        return new LoginResponse(
                token,
                new UserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getFullName(),
                        user.getRole().name()
                )
        );
    }
}