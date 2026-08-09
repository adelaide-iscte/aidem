package com.aidem.backend.controller;

import com.aidem.backend.dto.session.ExerciseFeedbackRequest;
import com.aidem.backend.dto.session.SessionPlanExerciseResponse;
import com.aidem.backend.dto.session.SessionPlanResponse;
import com.aidem.backend.service.PatientAccessService;
import com.aidem.backend.service.SessionPlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.aidem.backend.dto.session.AddSessionPlanExerciseRequest;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Map;
import java.time.LocalDate;
import java.util.List;


@RestController
@CrossOrigin(origins = "*")
public class SessionPlanController {

    private final SessionPlanService sessionPlanService;
    private final PatientAccessService patientAccessService;

    public SessionPlanController(
            SessionPlanService sessionPlanService,
            PatientAccessService patientAccessService
    ) {
        this.sessionPlanService =
                sessionPlanService;

        this.patientAccessService =
                patientAccessService;
    }

    @GetMapping(
            "/api/patients/{patientId}/session-plans/today"
    )
    public ResponseEntity<SessionPlanResponse>
    getTodaySessionPlan(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        patientAccessService.requirePatientAccess(
                patientId,
                authentication
        );

        String email =
                authentication == null
                        ? null
                        : authentication.getName();

        return ResponseEntity.ok(
                sessionPlanService
                        .getOrGenerateTodayPlan(
                                patientId,
                                email
                        )
        );
    }

    @PostMapping(
            "/api/patients/{patientId}/session-plans/today/regenerate"
    )
    public ResponseEntity<SessionPlanResponse>
    regenerateTodaySessionPlan(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        patientAccessService.requirePatientAccess(
                patientId,
                authentication
        );

        String email =
                authentication == null
                        ? null
                        : authentication.getName();

        return ResponseEntity.ok(
                sessionPlanService
                        .regenerateTodayPlan(
                                patientId,
                                email
                        )
        );
    }

    @PostMapping(
            "/api/session-plan-exercises/{sessionPlanExerciseId}/feedback"
    )
    public ResponseEntity<SessionPlanExerciseResponse>
    submitFeedback(
            @PathVariable Long sessionPlanExerciseId,
            @RequestBody ExerciseFeedbackRequest request,
            Authentication authentication
    ) {
        patientAccessService
                .requireSessionExerciseAccess(
                        sessionPlanExerciseId,
                        authentication
                );

        return ResponseEntity.ok(
                sessionPlanService.submitFeedback(
                        sessionPlanExerciseId,
                        request
                )
        );
    }

    @PostMapping(
            "/api/session-plan-exercises/{sessionPlanExerciseId}/skip"
    )
    public ResponseEntity<SessionPlanExerciseResponse>
    skipExercise(
            @PathVariable Long sessionPlanExerciseId,
            @RequestBody(required = false)
            Map<String, String> body,
            Authentication authentication
    ) {
        patientAccessService
                .requireSessionExerciseAccess(
                        sessionPlanExerciseId,
                        authentication
                );

        String notes =
                body == null
                        ? null
                        : body.get("notes");

        return ResponseEntity.ok(
                sessionPlanService.skipExercise(
                        sessionPlanExerciseId,
                        notes
                )
        );
    }

    @PatchMapping(
            "/api/session-plan-exercises/{sessionPlanExerciseId}/reset"
    )
    public ResponseEntity<SessionPlanExerciseResponse>
    resetExercise(
            @PathVariable Long sessionPlanExerciseId,
            Authentication authentication
    ) {
        patientAccessService
                .requireSessionExerciseAccess(
                        sessionPlanExerciseId,
                        authentication
                );

        return ResponseEntity.ok(
                sessionPlanService.resetExercise(
                        sessionPlanExerciseId
                )
        );
    }

    @PatchMapping(
            "/api/patients/{patientId}/session-plan-exercises/reset-completed"
    )
    public ResponseEntity<Void> resetCompletedExercises(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        patientAccessService.requirePatientAccess(
                patientId,
                authentication
        );

        sessionPlanService
                .resetCompletedExercises(patientId);

        return ResponseEntity
                .noContent()
                .build();
    }

    /*
     * Este endpoint atua sobre todos os utentes.
     * A regra do SecurityConfig permite apenas ADMIN.
     */
    @PatchMapping(
            "/api/session-plan-exercises/reset-completed"
    )
    public ResponseEntity<Void>
    resetAllCompletedExercises() {

        sessionPlanService
                .resetAllCompletedExercises();

        return ResponseEntity
                .noContent()
                .build();
    }

    @GetMapping(
            "/api/patients/{patientId}/session-plans/week"
    )
    public ResponseEntity<List<SessionPlanResponse>>
    getWeekSessionPlans(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        patientAccessService.requirePatientAccess(
                patientId,
                authentication
        );

        String email =
                authentication == null
                        ? null
                        : authentication.getName();

        return ResponseEntity.ok(
                sessionPlanService
                        .getOrGenerateWeekPlan(
                                patientId,
                                email,
                                LocalDate.now()
                        )
        );
    }

    @PostMapping(
            "/api/session-plans/{sessionPlanId}/exercises"
    )
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<SessionPlanResponse>
    addExerciseToPlan(
            @PathVariable Long sessionPlanId,
            @RequestBody AddSessionPlanExerciseRequest request
    ) {
        if (
                request == null ||
                        request.exerciseId() == null
        ) {
            throw new IllegalArgumentException(
                    "Indique a atividade a adicionar."
            );
        }

        return ResponseEntity.ok(
                sessionPlanService
                        .addExerciseToPlan(
                                sessionPlanId,
                                request.exerciseId()
                        )
        );
    }

    @DeleteMapping(
            "/api/session-plan-exercises/{sessionPlanExerciseId}"
    )
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<SessionPlanResponse>
    removeExerciseFromPlan(
            @PathVariable Long sessionPlanExerciseId
    ) {
        return ResponseEntity.ok(
                sessionPlanService
                        .removeExerciseFromPlan(
                                sessionPlanExerciseId
                        )
        );
    }

}