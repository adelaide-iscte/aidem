package com.aidem.backend.service;

import com.aidem.backend.model.Patient;
import com.aidem.backend.repository.PatientCaregiverRepository;
import com.aidem.backend.repository.PatientRepository;
import com.aidem.backend.repository.SessionPlanExerciseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class PatientAccessService {

    private final PatientRepository patientRepository;

    private final PatientCaregiverRepository
            patientCaregiverRepository;

    private final SessionPlanExerciseRepository
            sessionPlanExerciseRepository;

    public PatientAccessService(
            PatientRepository patientRepository,
            PatientCaregiverRepository patientCaregiverRepository,
            SessionPlanExerciseRepository sessionPlanExerciseRepository
    ) {
        this.patientRepository = patientRepository;

        this.patientCaregiverRepository =
                patientCaregiverRepository;

        this.sessionPlanExerciseRepository =
                sessionPlanExerciseRepository;
    }

    /*
     * ADMIN vê todos os utentes.
     * Os cuidadores veem apenas os associados.
     */
    @Transactional(readOnly = true)
    public List<Patient> getAccessiblePatients(
            Authentication authentication
    ) {
        if (isAdmin(authentication)) {
            return patientRepository.findAll();
        }

        requireAuthenticated(authentication);

        return patientCaregiverRepository
                .findByUser_EmailIgnoreCaseOrderByPatient_FullNameAsc(
                        authentication.getName()
                )
                .stream()
                .map(association ->
                        association.getPatient()
                )
                .toList();
    }

    /*
     * Protege endpoints que recebem diretamente
     * o ID de um utente.
     */
    @Transactional(readOnly = true)
    public void requirePatientAccess(
            Long patientId,
            Authentication authentication
    ) {
        if (isAdmin(authentication)) {
            return;
        }

        requireAuthenticated(authentication);

        boolean hasAccess =
                patientCaregiverRepository
                        .existsByPatient_IdAndUser_EmailIgnoreCase(
                                patientId,
                                authentication.getName()
                        );

        if (!hasAccess) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Não tem permissão para aceder a este utente."
            );
        }
    }

    /*
     * Descobre a que utente pertence uma atividade
     * da sessão antes de permitir alterações.
     */
    @Transactional(readOnly = true)
    public void requireSessionExerciseAccess(
            Long sessionPlanExerciseId,
            Authentication authentication
    ) {
        Long patientId =
                sessionPlanExerciseRepository
                        .findById(sessionPlanExerciseId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Atividade da sessão não encontrada."
                                )
                        )
                        .getSessionPlan()
                        .getPatient()
                        .getId();

        requirePatientAccess(
                patientId,
                authentication
        );
    }

    private boolean isAdmin(
            Authentication authentication
    ) {
        return authentication != null &&
                authentication
                        .getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ADMIN".equals(
                                        authority.getAuthority()
                                )
                        );
    }

    private void requireAuthenticated(
            Authentication authentication
    ) {
        if (
                authentication == null ||
                authentication.getName() == null ||
                authentication.getName().isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "É necessário iniciar sessão."
            );
        }
    }
}