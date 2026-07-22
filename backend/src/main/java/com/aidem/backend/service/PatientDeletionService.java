package com.aidem.backend.service;

import com.aidem.backend.model.*;
import jakarta.persistence.EntityManager;
import com.aidem.backend.repository.AssessmentRepository;
import com.aidem.backend.repository.DomainScoreRepository;
import com.aidem.backend.repository.ExerciseFeedbackRepository;
import com.aidem.backend.repository.PatientCaregiverRepository;
import com.aidem.backend.repository.PatientRepository;
import com.aidem.backend.repository.RecommendationExplanationRepository;
import com.aidem.backend.repository.SessionHistoryRepository;
import com.aidem.backend.repository.SessionPlanExerciseRepository;
import com.aidem.backend.repository.SessionPlanRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.aidem.backend.repository.ChatMessageRepository;

import java.util.List;

@Service
public class PatientDeletionService {

    private final PatientRepository patientRepository;
    private final PatientCaregiverRepository patientCaregiverRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final SessionPlanRepository sessionPlanRepository;
    private final SessionPlanExerciseRepository sessionPlanExerciseRepository;
    private final ExerciseFeedbackRepository exerciseFeedbackRepository;
    private final RecommendationExplanationRepository recommendationExplanationRepository;
    private final AssessmentRepository assessmentRepository;
    private final DomainScoreRepository domainScoreRepository;
    private final EntityManager entityManager;
    private final ChatMessageRepository chatMessageRepository;

    public PatientDeletionService(
            PatientRepository patientRepository,
            PatientCaregiverRepository patientCaregiverRepository,
            SessionHistoryRepository sessionHistoryRepository,
            SessionPlanRepository sessionPlanRepository,
            SessionPlanExerciseRepository sessionPlanExerciseRepository,
            ExerciseFeedbackRepository exerciseFeedbackRepository,
            RecommendationExplanationRepository recommendationExplanationRepository,
            AssessmentRepository assessmentRepository,
            ChatMessageRepository chatMessageRepository,
            DomainScoreRepository domainScoreRepository,
            EntityManager entityManager
    ) {
        this.patientRepository = patientRepository;
        this.patientCaregiverRepository = patientCaregiverRepository;
        this.sessionHistoryRepository = sessionHistoryRepository;
        this.sessionPlanRepository = sessionPlanRepository;
        this.sessionPlanExerciseRepository = sessionPlanExerciseRepository;
        this.exerciseFeedbackRepository = exerciseFeedbackRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.recommendationExplanationRepository = recommendationExplanationRepository;
        this.assessmentRepository = assessmentRepository;
        this.domainScoreRepository = domainScoreRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public void deletePatient(Long patientId) {
        Patient patient = patientRepository
                .findById(patientId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Utente não encontrado."
                        )
                );
        chatMessageRepository.deleteByPatientId(patientId);

        List<SessionPlan> sessionPlans =
                sessionPlanRepository
                        .findByPatient_IdOrderBySessionDateDescIdDesc(
                                patientId
                        );

        for (SessionPlan sessionPlan : sessionPlans) {
            deleteSessionPlanExercises(
                    sessionPlan.getId()
            );
        }

        if (!sessionPlans.isEmpty()) {
            sessionPlanRepository
                    .deleteAllInBatch(sessionPlans);
        }

        List<Assessment> assessments =
                assessmentRepository
                        .findByPatient_Id(patientId);

        for (Assessment assessment : assessments) {
            List<DomainScore> domainScores =
                    domainScoreRepository
                            .findByAssessment_IdOrderByDisplayOrderAscIdAsc(
                                    assessment.getId()
                            );

            if (!domainScores.isEmpty()) {
                domainScoreRepository
                        .deleteAllInBatch(domainScores);
            }
        }

        if (!assessments.isEmpty()) {
            assessmentRepository
                    .deleteAllInBatch(assessments);
        }

        List<PatientCaregiver> caregiverAssociations =
                patientCaregiverRepository
                        .findByPatient_Id(patientId);

        if (!caregiverAssociations.isEmpty()) {
            patientCaregiverRepository
                    .deleteAllInBatch(
                            caregiverAssociations
                    );
        }

        List<SessionHistory> sessionHistory =
                sessionHistoryRepository
                        .findByPatientIdOrderBySessionDateDesc(
                                patientId
                        );

        if (!sessionHistory.isEmpty()) {
            sessionHistoryRepository
                    .deleteAllInBatch(sessionHistory);
        }

        entityManager.clear();

        patientRepository.deleteById(patientId);
        patientRepository.flush();
    }

    private void deleteSessionPlanExercises(
            Long sessionPlanId
    ) {
        List<SessionPlanExercise> exercises =
                sessionPlanExerciseRepository
                        .findBySessionPlan_IdOrderByOrderIndexAsc(
                                sessionPlanId
                        );

        if (exercises.isEmpty()) {
            return;
        }

        List<Long> exerciseIds = exercises
                .stream()
                .map(SessionPlanExercise::getId)
                .toList();

        List<ExerciseFeedback> feedback =
                exerciseFeedbackRepository
                        .findBySessionPlanExercise_IdIn(
                                exerciseIds
                        );

        if (!feedback.isEmpty()) {
            exerciseFeedbackRepository
                    .deleteAllInBatch(feedback);
        }

        List<RecommendationExplanation> explanations =
                recommendationExplanationRepository
                        .findBySessionPlanExercise_IdIn(
                                exerciseIds
                        );

        if (!explanations.isEmpty()) {
            recommendationExplanationRepository
                    .deleteAllInBatch(explanations);
        }

        sessionPlanExerciseRepository
                .deleteAllInBatch(exercises);
    }
}