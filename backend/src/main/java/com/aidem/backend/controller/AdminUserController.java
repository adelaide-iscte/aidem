package com.aidem.backend.controller;

import com.aidem.backend.dto.admin.CaregiverPatientResponse;
import com.aidem.backend.dto.admin.CaregiverUserResponse;
import com.aidem.backend.dto.admin.SaveCaregiverUserRequest;
import com.aidem.backend.model.Patient;
import com.aidem.backend.model.PatientCaregiver;
import com.aidem.backend.model.User;
import com.aidem.backend.model.enums.CaregiverRelationshipType;
import com.aidem.backend.model.enums.UserRole;
import com.aidem.backend.repository.PatientCaregiverRepository;
import com.aidem.backend.repository.PatientRepository;
import com.aidem.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.aidem.backend.repository.ChatMessageRepository;
import com.aidem.backend.repository.AssessmentRepository;
import com.aidem.backend.repository.SessionPlanRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final AssessmentRepository
            assessmentRepository;

    private final SessionPlanRepository
            sessionPlanRepository;
    private final PatientCaregiverRepository patientCaregiverRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserController(
            UserRepository userRepository,
            PatientRepository patientRepository,
            PatientCaregiverRepository patientCaregiverRepository,
            AssessmentRepository assessmentRepository,
            SessionPlanRepository sessionPlanRepository,
            ChatMessageRepository chatMessageRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.patientCaregiverRepository = patientCaregiverRepository;
        this.assessmentRepository = assessmentRepository;
        this.sessionPlanRepository = sessionPlanRepository;
        this.passwordEncoder = passwordEncoder;
        this.chatMessageRepository = chatMessageRepository;
    }

    /*
     * Devolve apenas contas de cuidadores.
     * A conta ADMIN não aparece nesta gestão.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<CaregiverUserResponse> getCaregivers() {

        return userRepository
                .findByRoleInOrderByFullNameAsc(
                        List.of(
                                UserRole.FORMAL_CAREGIVER,
                                UserRole.INFORMAL_CAREGIVER
                        )
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /*
     * Cria uma nova conta.
     */
    @PostMapping
    @Transactional
    public CaregiverUserResponse createCaregiver(
            @RequestBody SaveCaregiverUserRequest request
    ) {
        UserRole role =
                validateRequest(
                        request,
                        true,
                        null
                );

        User user = User.builder()
                .fullName(
                        request.fullName().trim()
                )
                .email(
                        normalizeEmail(request.email())
                )
                .passwordHash(
                        passwordEncoder.encode(
                                request.password()
                        )
                )
                .role(role)
                .active(true)
                .build();

        User savedUser =
                userRepository.save(user);

        replaceAssociations(
                savedUser,
                role,
                request.patientIds()
        );

        return toResponse(savedUser);
    }

    /*
     * Atualiza os dados da conta e substitui
     * as associações aos utentes.
     */
    @PutMapping("/{id}")
    @Transactional
    public CaregiverUserResponse updateCaregiver(
            @PathVariable Long id,
            @RequestBody SaveCaregiverUserRequest request
    ) {
        User user = userRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Utilizador não encontrado."
                        )
                );

        if (user.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A conta de administrador não pode ser alterada aqui."
            );
        }

        UserRole role =
                validateRequest(
                        request,
                        false,
                        id
                );

        user.setFullName(
                request.fullName().trim()
        );

        user.setEmail(
                normalizeEmail(request.email())
        );

        user.setRole(role);

        /*
         * Na edição, a password é opcional.
         * Se estiver vazia, mantém-se a atual.
         */
        if (
                request.password() != null &&
                !request.password().isBlank()
        ) {
            user.setPasswordHash(
                    passwordEncoder.encode(
                            request.password()
                    )
            );
        }

        User savedUser =
                userRepository.save(user);

        replaceAssociations(
                savedUser,
                role,
                request.patientIds()
        );

        return toResponse(savedUser);
    }

    /*
     * Remove uma conta de cuidador.
     * Mantém as avaliações e os planos antigos,
     * retirando apenas a referência ao utilizador.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteCaregiver(
            @PathVariable Long id
    ) {
        User user = userRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Utilizador não encontrado."
                        )
                );

        if (user.getRole() == UserRole.ADMIN) {
            throw badRequest(
                    "A conta de administrador não pode ser apagada."
            );
        }
        chatMessageRepository.deleteByUserId(id);
        patientCaregiverRepository.deleteByUserId(id);
        assessmentRepository.clearPerformedByUser(id);
        sessionPlanRepository.clearGeneratedByUser(id);
        userRepository.delete(user);
        userRepository.flush();
    }

    private UserRole validateRequest(
            SaveCaregiverUserRequest request,
            boolean creating,
            Long currentUserId
    ) {
        if (request == null) {
            throw badRequest(
                    "Os dados da conta são obrigatórios."
            );
        }

        if (
                request.fullName() == null ||
                request.fullName().isBlank()
        ) {
            throw badRequest(
                    "O nome é obrigatório."
            );
        }

        if (
                request.email() == null ||
                request.email().isBlank()
        ) {
            throw badRequest(
                    "O email é obrigatório."
            );
        }

        String email =
                normalizeEmail(request.email());

        if (
                !email.matches(
                        "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
                )
        ) {
            throw badRequest(
                    "Indique um email válido."
            );
        }

        boolean emailAlreadyUsed;

        if (currentUserId == null) {
            emailAlreadyUsed =
                    userRepository
                            .existsByEmailIgnoreCase(
                                    email
                            );
        } else {
            emailAlreadyUsed =
                    userRepository
                            .existsByEmailIgnoreCaseAndIdNot(
                                    email,
                                    currentUserId
                            );
        }

        if (emailAlreadyUsed) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Já existe uma conta com este email."
            );
        }

        if (
                creating &&
                (
                        request.password() == null ||
                        request.password().isBlank()
                )
        ) {
            throw badRequest(
                    "A palavra-passe é obrigatória."
            );
        }

        if (
                request.password() != null &&
                !request.password().isBlank() &&
                request.password().length() < 6
        ) {
            throw badRequest(
                    "A palavra-passe deve ter pelo menos 6 caracteres."
            );
        }

        UserRole role =
                parseCaregiverRole(
                        request.role()
                );

        Set<Long> patientIds =
                normalizePatientIds(
                        request.patientIds()
                );

        /*
         * Informal: apenas um utente.
         * Formal: pode ter vários.
         */
        if (
                role == UserRole.INFORMAL_CAREGIVER &&
                patientIds.size() > 1
        ) {
            throw badRequest(
                    "Um cuidador informal só pode ter um utente associado."
            );
        }

        return role;
    }

    private UserRole parseCaregiverRole(
            String value
    ) {
        if (
                value == null ||
                value.isBlank()
        ) {
            throw badRequest(
                    "O tipo de cuidador é obrigatório."
            );
        }

        try {
            UserRole role =
                    UserRole.valueOf(
                            value
                                    .trim()
                                    .toUpperCase(
                                            Locale.ROOT
                                    )
                    );

            if (role == UserRole.ADMIN) {
                throw badRequest(
                        "Apenas podem ser criadas contas de cuidadores."
                );
            }

            return role;

        } catch (IllegalArgumentException exception) {
            throw badRequest(
                    "Tipo de cuidador inválido."
            );
        }
    }

    /*
     * Apaga as associações anteriores e cria
     * as associações que vieram do frontend.
     */
    private void replaceAssociations(
            User user,
            UserRole role,
            List<Long> requestedPatientIds
    ) {
        Set<Long> patientIds =
                normalizePatientIds(
                        requestedPatientIds
                );

        List<Patient> patients =
                patientRepository.findAllById(
                        patientIds
                );

        if (
                patients.size() !=
                patientIds.size()
        ) {
            throw badRequest(
                    "Um dos utentes selecionados já não existe."
            );
        }

        List<PatientCaregiver> existing =
                patientCaregiverRepository
                        .findByUser_IdOrderByPatient_FullNameAsc(
                                user.getId()
                        );

        if (!existing.isEmpty()) {
            patientCaregiverRepository
                    .deleteAll(existing);

            patientCaregiverRepository.flush();
        }

        CaregiverRelationshipType relationshipType =
                role == UserRole.FORMAL_CAREGIVER
                        ? CaregiverRelationshipType.FORMAL
                        : CaregiverRelationshipType.INFORMAL;

        List<PatientCaregiver> associations =
                new ArrayList<>();

        for (Patient patient : patients) {
            associations.add(
                    PatientCaregiver.builder()
                            .patient(patient)
                            .user(user)
                            .relationshipType(
                                    relationshipType
                            )
                            .build()
            );
        }

        patientCaregiverRepository
                .saveAll(associations);
    }

    private CaregiverUserResponse toResponse(
            User user
    ) {
        List<CaregiverPatientResponse> patients =
                patientCaregiverRepository
                        .findByUser_IdOrderByPatient_FullNameAsc(
                                user.getId()
                        )
                        .stream()
                        .map(association ->
                                new CaregiverPatientResponse(
                                        association
                                                .getPatient()
                                                .getId(),

                                        association
                                                .getPatient()
                                                .getFullName(),

                                        "IP" +
                                        association
                                                .getPatient()
                                                .getId()
                                )
                        )
                        .sorted(
                                Comparator.comparing(
                                        CaregiverPatientResponse::name,
                                        String.CASE_INSENSITIVE_ORDER
                                )
                        )
                        .toList();

        return new CaregiverUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                patients
        );
    }

    private Set<Long> normalizePatientIds(
            List<Long> patientIds
    ) {
        LinkedHashSet<Long> normalized =
                new LinkedHashSet<>();

        if (patientIds == null) {
            return normalized;
        }

        for (Long patientId : patientIds) {
            if (patientId != null) {
                normalized.add(patientId);
            }
        }

        return normalized;
    }

    private String normalizeEmail(
            String email
    ) {
        return email
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException badRequest(
            String message
    ) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}