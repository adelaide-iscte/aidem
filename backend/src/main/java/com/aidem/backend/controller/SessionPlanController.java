package com.aidem.backend.controller;

import com.aidem.backend.dto.session.ExerciseFeedbackRequest;
import com.aidem.backend.dto.session.SessionPlanExerciseResponse;
import com.aidem.backend.dto.session.SessionPlanResponse;
import com.aidem.backend.service.SessionPlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class SessionPlanController {

    private final SessionPlanService sessionPlanService;

    public SessionPlanController(SessionPlanService sessionPlanService) {
        this.sessionPlanService = sessionPlanService;
    }

    @GetMapping("/api/patients/{patientId}/session-plans/today")
    public ResponseEntity<SessionPlanResponse> getTodaySessionPlan(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        String email = authentication == null ? null : authentication.getName();
        return ResponseEntity.ok(sessionPlanService.getOrGenerateTodayPlan(patientId, email));
    }

    @PostMapping("/api/patients/{patientId}/session-plans/today/regenerate")
    public ResponseEntity<SessionPlanResponse> regenerateTodaySessionPlan(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        String email = authentication == null ? null : authentication.getName();
        return ResponseEntity.ok(sessionPlanService.regenerateTodayPlan(patientId, email));
    }

    @PostMapping("/api/session-plan-exercises/{sessionPlanExerciseId}/feedback")
    public ResponseEntity<SessionPlanExerciseResponse> submitFeedback(
            @PathVariable Long sessionPlanExerciseId,
            @RequestBody ExerciseFeedbackRequest request
    ) {
        return ResponseEntity.ok(sessionPlanService.submitFeedback(sessionPlanExerciseId, request));
    }

    @PostMapping("/api/session-plan-exercises/{sessionPlanExerciseId}/skip")
    public ResponseEntity<SessionPlanExerciseResponse> skipExercise(
            @PathVariable Long sessionPlanExerciseId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String notes = body == null ? null : body.get("notes");
        return ResponseEntity.ok(sessionPlanService.skipExercise(sessionPlanExerciseId, notes));
    }

    @PatchMapping("/api/session-plan-exercises/{sessionPlanExerciseId}/reset")
    public ResponseEntity<SessionPlanExerciseResponse> resetExercise(
            @PathVariable Long sessionPlanExerciseId
    ) {
        return ResponseEntity.ok(sessionPlanService.resetExercise(sessionPlanExerciseId));
    }

}
