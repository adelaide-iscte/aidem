package com.aidem.backend.service;

import com.aidem.backend.dto.session.ExerciseFeedbackRequest;
import com.aidem.backend.dto.session.SessionPlanExerciseResponse;
import com.aidem.backend.dto.session.SessionPlanResponse;
import com.aidem.backend.model.*;
import com.aidem.backend.model.enums.*;
import com.aidem.backend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SessionPlanService {

    private static final int TARGET_MINUTES = 45;
    private static final int MIN_MINUTES = 30;
    private static final int MAX_MINUTES = 60;
    private static final Set<String> SUMMARY_DOMAINS = Set.of(
            "constrangimentos físicos",
            "prevalência motora",
            "prevalência cognitiva",
            "total"
    );

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;
    private final DomainScoreRepository domainScoreRepository;
    private final ExerciseRepository exerciseRepository;
    private final SessionPlanRepository sessionPlanRepository;
    private final SessionPlanExerciseRepository sessionPlanExerciseRepository;
    private final ExerciseFeedbackRepository exerciseFeedbackRepository;

    public SessionPlanService(
            PatientRepository patientRepository,
            UserRepository userRepository,
            AssessmentRepository assessmentRepository,
            DomainScoreRepository domainScoreRepository,
            ExerciseRepository exerciseRepository,
            SessionPlanRepository sessionPlanRepository,
            SessionPlanExerciseRepository sessionPlanExerciseRepository,
            ExerciseFeedbackRepository exerciseFeedbackRepository
    ) {
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.assessmentRepository = assessmentRepository;
        this.domainScoreRepository = domainScoreRepository;
        this.exerciseRepository = exerciseRepository;
        this.sessionPlanRepository = sessionPlanRepository;
        this.sessionPlanExerciseRepository = sessionPlanExerciseRepository;
        this.exerciseFeedbackRepository = exerciseFeedbackRepository;
    }

    @Transactional
    public SessionPlanResponse getOrGenerateTodayPlan(Long patientId, String userEmail) {
        LocalDate today = LocalDate.now();

        List<SessionPlan> existing = sessionPlanRepository.findByPatientIdAndSessionDateOrderByIdDesc(patientId, today);
        if (!existing.isEmpty()) {
            return toResponse(existing.get(0));
        }

        return toResponse(generatePlan(patientId, userEmail, today));
    }

    @Transactional
    public SessionPlanResponse regenerateTodayPlan(Long patientId, String userEmail) {
        LocalDate today = LocalDate.now();
        List<SessionPlan> existing = sessionPlanRepository.findByPatientIdAndSessionDateOrderByIdDesc(patientId, today);
        sessionPlanRepository.deleteAll(existing);
        return toResponse(generatePlan(patientId, userEmail, today));
    }

    @Transactional
    public SessionPlanExerciseResponse submitFeedback(Long sessionPlanExerciseId, ExerciseFeedbackRequest request) {
        SessionPlanExercise planExercise = sessionPlanExerciseRepository.findById(sessionPlanExerciseId)
                .orElseThrow(() -> new IllegalArgumentException("Atividade do plano não encontrada."));

        boolean completed = Boolean.TRUE.equals(request.completed());
        planExercise.setStatus(completed ? ExerciseStatus.COMPLETED : ExerciseStatus.FAILED);
        sessionPlanExerciseRepository.save(planExercise);

        exerciseFeedbackRepository.deleteBySessionPlanExercise_Id(sessionPlanExerciseId);

        exerciseFeedbackRepository.save(ExerciseFeedback.builder()
                .sessionPlanExercise(planExercise)
                .completed(completed)
                .difficultyFeedback(parseDifficulty(request.difficultyFeedback()))
                .emotionFeedback(request.emotionFeedback())
                .notes(request.notes())
                .build());

        updateSessionStatusIfFinished(planExercise.getSessionPlan());
        return toExerciseResponse(planExercise);
    }

    @Transactional
    public SessionPlanExerciseResponse skipExercise(Long sessionPlanExerciseId, String notes) {
        SessionPlanExercise planExercise = sessionPlanExerciseRepository.findById(sessionPlanExerciseId)
                .orElseThrow(() -> new IllegalArgumentException("Atividade do plano não encontrada."));

        planExercise.setStatus(ExerciseStatus.SKIPPED);
        sessionPlanExerciseRepository.save(planExercise);

        exerciseFeedbackRepository.deleteBySessionPlanExercise_Id(sessionPlanExerciseId);

        exerciseFeedbackRepository.save(ExerciseFeedback.builder()
                .sessionPlanExercise(planExercise)
                .completed(false)
                .difficultyFeedback(DifficultyFeedback.TOO_HARD)
                .notes(notes)
                .build());

        updateSessionStatusIfFinished(planExercise.getSessionPlan());
        return toExerciseResponse(planExercise);
    }

    @Transactional
    public SessionPlanExerciseResponse resetExercise(Long sessionPlanExerciseId) {
        SessionPlanExercise planExercise = sessionPlanExerciseRepository.findById(sessionPlanExerciseId)
                .orElseThrow(() -> new IllegalArgumentException("Atividade do plano não encontrada."));

        planExercise.setStatus(ExerciseStatus.PENDING);
        sessionPlanExerciseRepository.save(planExercise);

        exerciseFeedbackRepository.deleteBySessionPlanExercise_Id(sessionPlanExerciseId);

        SessionPlan plan = planExercise.getSessionPlan();
        List<SessionPlanExercise> items = sessionPlanExerciseRepository.findBySessionPlan_IdOrderByOrderIndexAsc(plan.getId());
        boolean hasProgress = items.stream()
                .anyMatch(item -> !item.getId().equals(sessionPlanExerciseId) && item.getStatus() != ExerciseStatus.PENDING);
        plan.setStatus(hasProgress ? SessionStatus.IN_PROGRESS : SessionStatus.PLANNED);
        sessionPlanRepository.save(plan);

        return toExerciseResponse(planExercise);
    }

    private SessionPlan generatePlan(Long patientId, String userEmail, LocalDate date) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Utente não encontrado."));

        Assessment assessment = assessmentRepository.findFirstByPatient_IdOrderByAssessmentDateDescIdDesc(patientId)
                .orElseThrow(() -> new IllegalStateException("Este utente ainda não tem avaliação EGP."));

        List<DomainScore> domainScores = domainScoreRepository
                .findByAssessment_IdOrderByDisplayOrderAscIdAsc(assessment.getId())
                .stream()
                .filter(score -> !isSummaryDomain(score.getDomain()))
                .toList();

        if (domainScores.isEmpty()) {
            throw new IllegalStateException("A avaliação EGP não tem domínios utilizáveis para recomendação.");
        }

        List<Exercise> allExercises = exerciseRepository.findByActiveTrue();
        if (allExercises.isEmpty()) {
            throw new IllegalStateException("Não existem exercícios ativos na base de dados.");
        }

        Map<RiskLevel, List<DomainScore>> riskGroups = classifyRiskGroups(domainScores);
        List<Exercise> selected = selectExercises(patientId, date, domainScores, riskGroups, allExercises);

        User generatedBy = userEmail == null ? null : userRepository.findByEmailIgnoreCase(userEmail).orElse(null);

        SessionPlan plan = SessionPlan.builder()
                .patient(patient)
                .assessment(assessment)
                .generatedBy(generatedBy)
                .sessionDate(date)
                .targetDurationMinutes(TARGET_MINUTES)
                .status(SessionStatus.PLANNED)
                .build();
        sessionPlanRepository.save(plan);

        int order = 1;
        for (Exercise exercise : selected) {
            sessionPlanExerciseRepository.save(SessionPlanExercise.builder()
                    .sessionPlan(plan)
                    .exercise(exercise)
                    .orderIndex(order++)
                    .recommendedDurationMinutes(duration(exercise))
                    .reason(buildReason(exercise, domainScores))
                    .status(ExerciseStatus.PENDING)
                    .build());
        }

        return plan;
    }

    private List<Exercise> selectExercises(
            Long patientId,
            LocalDate date,
            List<DomainScore> scores,
            Map<RiskLevel, List<DomainScore>> riskGroups,
            List<Exercise> allExercises
    ) {
        Random random = new Random(Objects.hash(patientId, date));
        List<Exercise> selected = new ArrayList<>();
        Set<Long> selectedIds = new HashSet<>();

        ActivityType priorityType = getPriorityType(scores);
        List<DomainScore> sortedScores = scores.stream()
                .sorted(Comparator.comparing(this::scoreValue))
                .toList();

        // Regra: incluir sempre pelo menos 1 atividade da área prioritária.
        pickFirstValid(patientId, allExercises, selectedIds,
                sortedScores.stream().map(DomainScore::getDomain).toList(),
                null,
                priorityType,
                random
        ).ifPresent(ex -> addExercise(selected, selectedIds, ex));

        // Regra: uma atividade de cada divisão interna/risk group.
        for (RiskLevel risk : List.of(RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW)) {
            List<String> domains = riskGroups.getOrDefault(risk, List.of()).stream()
                    .map(DomainScore::getDomain)
                    .toList();

            pickFirstValid(patientId, allExercises, selectedIds, domains, toDifficulty(risk), null, random)
                    .ifPresent(ex -> addExercise(selected, selectedIds, ex));
        }

        // Regra: pelo menos uma motora e uma cognitiva.
        ensureActivityType(patientId, allExercises, selected, selectedIds, ActivityType.MOTOR, random);
        ensureActivityType(patientId, allExercises, selected, selectedIds, ActivityType.COGNITIVE, random);

        // Regra: preferencialmente 3 domínios distintos e perto de 45 min.
        List<String> domainPriority = sortedScores.stream().map(DomainScore::getDomain).toList();
        while (totalMinutes(selected) < MIN_MINUTES) {
            Optional<Exercise> next = pickFirstValid(patientId, allExercises, selectedIds, domainPriority, null, null, random);
            if (next.isEmpty() || totalMinutes(selected) + duration(next.get()) > MAX_MINUTES) break;
            addExercise(selected, selectedIds, next.get());
        }

        while (totalMinutes(selected) < TARGET_MINUTES) {
            Optional<Exercise> next = pickFirstValid(patientId, allExercises, selectedIds, domainPriority, null, null, random);
            if (next.isEmpty() || totalMinutes(selected) + duration(next.get()) > TARGET_MINUTES) break;
            addExercise(selected, selectedIds, next.get());
        }

        return selected.stream()
                .sorted(Comparator
                        .comparing((Exercise ex) -> priorityOrder(ex, scores))
                        .thenComparing(Exercise::getId))
                .toList();
    }

    private Optional<Exercise> pickFirstValid(
            Long patientId,
            List<Exercise> allExercises,
            Set<Long> selectedIds,
            List<String> domains,
            DifficultyLevel difficulty,
            ActivityType activityType,
            Random random
    ) {
        List<Exercise> pool = allExercises.stream()
                .filter(ex -> !selectedIds.contains(ex.getId()))
                .filter(ex -> domains == null || domains.isEmpty() || domains.stream().anyMatch(d -> sameDomain(d, ex.getDomain())))
                .filter(ex -> difficulty == null || ex.getDifficultyLevel() == difficulty)
                .filter(ex -> activityType == null || ex.getActivityType() == activityType || ex.getActivityType() == ActivityType.MIXED)
                .filter(ex -> isAllowedAfterFailure(patientId, ex))
                .sorted(Comparator.comparing((Exercise ex) -> wasCompletedBefore(patientId, ex.getId())).thenComparing(Exercise::getId))
                .collect(Collectors.toCollection(ArrayList::new));

        if (pool.isEmpty() && difficulty != null) {
            pool = allExercises.stream()
                    .filter(ex -> !selectedIds.contains(ex.getId()))
                    .filter(ex -> domains == null || domains.isEmpty() || domains.stream().anyMatch(d -> sameDomain(d, ex.getDomain())))
                    .filter(ex -> activityType == null || ex.getActivityType() == activityType || ex.getActivityType() == ActivityType.MIXED)
                    .filter(ex -> isAllowedAfterFailure(patientId, ex))
                    .sorted(Comparator.comparing((Exercise ex) -> wasCompletedBefore(patientId, ex.getId())).thenComparing(Exercise::getId))
                    .collect(Collectors.toCollection(ArrayList::new));
        }

        if (pool.isEmpty()) return Optional.empty();

        // Mantém rotação determinística, mas evita sempre a mesma escolha quando há vários empatados.
        boolean firstWasCompleted = wasCompletedBefore(patientId, pool.get(0).getId());
        List<Exercise> bestPool = pool.stream()
                .filter(ex -> wasCompletedBefore(patientId, ex.getId()) == firstWasCompleted)
                .toList();
        return Optional.of(bestPool.get(random.nextInt(bestPool.size())));
    }

    private void ensureActivityType(
            Long patientId,
            List<Exercise> allExercises,
            List<Exercise> selected,
            Set<Long> selectedIds,
            ActivityType type,
            Random random
    ) {
        boolean alreadyPresent = selected.stream().anyMatch(ex -> ex.getActivityType() == type || ex.getActivityType() == ActivityType.MIXED);
        if (alreadyPresent) return;

        pickFirstValid(patientId, allExercises, selectedIds, List.of(), null, type, random)
                .filter(ex -> totalMinutes(selected) + duration(ex) <= MAX_MINUTES)
                .ifPresent(ex -> addExercise(selected, selectedIds, ex));
    }

    private Map<RiskLevel, List<DomainScore>> classifyRiskGroups(List<DomainScore> scores) {
        Map<RiskLevel, List<DomainScore>> byExistingRisk = scores.stream()
                .collect(Collectors.groupingBy(DomainScore::getRiskLevel));

        if (byExistingRisk.keySet().containsAll(List.of(RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW))) {
            return byExistingRisk;
        }

        List<DomainScore> sorted = scores.stream()
                .sorted(Comparator.comparing(this::scoreValue))
                .toList();
        int n = sorted.size();
        Map<RiskLevel, List<DomainScore>> result = new EnumMap<>(RiskLevel.class);
        result.put(RiskLevel.HIGH, new ArrayList<>());
        result.put(RiskLevel.MEDIUM, new ArrayList<>());
        result.put(RiskLevel.LOW, new ArrayList<>());

        for (int i = 0; i < n; i++) {
            if (i < Math.ceil(n / 3.0)) result.get(RiskLevel.HIGH).add(sorted.get(i));
            else if (i < Math.ceil(2 * n / 3.0)) result.get(RiskLevel.MEDIUM).add(sorted.get(i));
            else result.get(RiskLevel.LOW).add(sorted.get(i));
        }
        return result;
    }

    private ActivityType getPriorityType(List<DomainScore> scores) {
        BigDecimal motor = findScore(scores, "Prevalência motora");
        BigDecimal cognitive = findScore(scores, "Prevalência cognitiva");

        if (motor == null && cognitive == null) return ActivityType.MIXED;
        if (motor == null) return ActivityType.COGNITIVE;
        if (cognitive == null) return ActivityType.MOTOR;
        return motor.compareTo(cognitive) <= 0 ? ActivityType.MOTOR : ActivityType.COGNITIVE;
    }

    private BigDecimal findScore(List<DomainScore> scores, String domain) {
        return scores.stream()
                .filter(score -> sameDomain(score.getDomain(), domain))
                .map(score -> score.getNormalizedScore() != null ? score.getNormalizedScore() : score.getScore())
                .findFirst()
                .orElse(null);
    }

    private boolean wasCompletedBefore(Long patientId, Long exerciseId) {
        return sessionPlanExerciseRepository.findCompletedExerciseIdsByPatient(patientId).contains(exerciseId);
    }

    private boolean isAllowedAfterFailure(Long patientId, Exercise exercise) {
        List<SessionPlanExercise> failures = sessionPlanExerciseRepository
                .findBySessionPlan_Patient_IdAndStatusInOrderByUpdatedAtDesc(patientId, List.of(ExerciseStatus.FAILED, ExerciseStatus.SKIPPED))
                .stream()
                .filter(spe -> Objects.equals(spe.getExercise().getId(), exercise.getId()))
                .toList();

        if (failures.isEmpty()) return true;

        SessionPlanExercise latestFailure = failures.get(0);
        LocalDateTime failedAt = latestFailure.getUpdatedAt() != null ? latestFailure.getUpdatedAt() : latestFailure.getCreatedAt();
        if (failedAt == null) return false;

        return sessionPlanExerciseRepository.countCompletedInDomainAfter(patientId, exercise.getDomain(), failedAt) >= 5;
    }

    private DifficultyLevel toDifficulty(RiskLevel riskLevel) {
        return switch (riskLevel) {
            case HIGH -> DifficultyLevel.HIGH;
            case MEDIUM -> DifficultyLevel.MEDIUM;
            case LOW -> DifficultyLevel.LOW;
        };
    }

    private void addExercise(List<Exercise> selected, Set<Long> selectedIds, Exercise exercise) {
        if (selectedIds.add(exercise.getId())) selected.add(exercise);
    }

    private Integer priorityOrder(Exercise exercise, List<DomainScore> scores) {
        Map<String, Integer> map = new HashMap<>();
        List<DomainScore> sorted = scores.stream().sorted(Comparator.comparing(this::scoreValue)).toList();
        for (int i = 0; i < sorted.size(); i++) map.put(normalize(sorted.get(i).getDomain()), i);
        return map.getOrDefault(normalize(exercise.getDomain()), 999);
    }

    private int totalMinutes(List<Exercise> exercises) {
        return exercises.stream().mapToInt(this::duration).sum();
    }

    private int duration(Exercise exercise) {
        return exercise.getDurationMinutes() == null ? 10 : exercise.getDurationMinutes();
    }

    private BigDecimal scoreValue(DomainScore score) {
        return score.getNormalizedScore() != null ? score.getNormalizedScore() : score.getScore();
    }

    private boolean isSummaryDomain(String domain) {
        return SUMMARY_DOMAINS.contains(normalize(domain));
    }

    private boolean sameDomain(String a, String b) {
        String left = normalizeDomainBase(a);
        String right = normalizeDomainBase(b);
        return left.equals(right) || left.startsWith(right + " ") || right.startsWith(left + " ");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeDomainBase(String value) {
        String normalized = normalize(value);
        return normalized
                .replaceAll("\\s+i$", "")
                .replaceAll("\\s+ii$", "")
                .replaceAll("\\s+iii$", "")
                .trim();
    }

    private String buildReason(Exercise exercise, List<DomainScore> scores) {
        DomainScore score = scores.stream()
                .filter(s -> sameDomain(s.getDomain(), exercise.getDomain()))
                .findFirst()
                .orElse(null);

        if (score == null) {
            return "Selecionado para equilibrar a sessão diária.";
        }

        return "Domínio " + exercise.getDomain()
                + " com NR " + scoreValue(score)
                + " e nível de risco " + score.getRiskLevel().name()
                + ".";
    }

    private DifficultyFeedback parseDifficulty(String value) {
        if (value == null || value.isBlank()) return null;
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "easy", "fácil", "facil" -> DifficultyFeedback.EASY;
            case "medium", "média", "media", "ok" -> DifficultyFeedback.OK;
            case "hard", "difícil", "dificil" -> DifficultyFeedback.HARD;
            case "too_hard", "too-hard", "muito difícil", "muito dificil" -> DifficultyFeedback.TOO_HARD;
            default -> DifficultyFeedback.OK;
        };
    }

    private void updateSessionStatusIfFinished(SessionPlan plan) {
        List<SessionPlanExercise> items = sessionPlanExerciseRepository.findBySessionPlan_IdOrderByOrderIndexAsc(plan.getId());
        boolean allFinished = items.stream().allMatch(item -> item.getStatus() != ExerciseStatus.PENDING);
        if (allFinished) {
            plan.setStatus(SessionStatus.COMPLETED);
            sessionPlanRepository.save(plan);
        } else if (items.stream().anyMatch(item -> item.getStatus() != ExerciseStatus.PENDING)) {
            plan.setStatus(SessionStatus.IN_PROGRESS);
            sessionPlanRepository.save(plan);
        }
    }

    private SessionPlanResponse toResponse(SessionPlan plan) {
        List<SessionPlanExercise> items = sessionPlanExerciseRepository.findBySessionPlan_IdOrderByOrderIndexAsc(plan.getId());
        List<SessionPlanExerciseResponse> exercises = items.stream().map(this::toExerciseResponse).toList();
        int totalDuration = items.stream().mapToInt(item -> item.getRecommendedDurationMinutes() == null ? 0 : item.getRecommendedDurationMinutes()).sum();

        return new SessionPlanResponse(
                plan.getId(),
                plan.getPatient().getId(),
                plan.getAssessment() == null ? null : plan.getAssessment().getId(),
                plan.getSessionDate(),
                plan.getTargetDurationMinutes(),
                totalDuration,
                plan.getStatus().name(),
                exercises
        );
    }

    private SessionPlanExerciseResponse toExerciseResponse(SessionPlanExercise item) {
        Exercise ex = item.getExercise();
        return new SessionPlanExerciseResponse(
                item.getId(),
                ex.getId(),
                item.getOrderIndex(),
                ex.getTitle(),
                ex.getDescription(),
                ex.getDomain(),
                ex.getActivityType().name(),
                ex.getDifficultyLevel().name(),
                item.getRecommendedDurationMinutes(),
                ex.getSets(),
                ex.getRepetitions(),
                ex.getRestSeconds(),
                ex.getMaterials(),
                ex.getInstructions(),
                ex.getMediaUrl(),
                item.getReason(),
                item.getStatus().name()
        );
    }

    @Transactional
    public void resetCompletedExercises(Long patientId) {
        List<SessionPlanExercise> completedExercises =
                sessionPlanExerciseRepository.findBySessionPlan_Patient_IdAndStatus(
                        patientId,
                        ExerciseStatus.COMPLETED
                );

        for (SessionPlanExercise exercise : completedExercises) {
            exercise.setStatus(ExerciseStatus.PENDING);
            exerciseFeedbackRepository.deleteBySessionPlanExercise_Id(exercise.getId());

            SessionPlan plan = exercise.getSessionPlan();
            plan.setStatus(SessionStatus.PLANNED);
            sessionPlanRepository.save(plan);
        }

        sessionPlanExerciseRepository.saveAll(completedExercises);
    }

    @Transactional
    public void resetAllCompletedExercises() {

        List<SessionPlanExercise> completedExercises =
                sessionPlanExerciseRepository.findByStatus(ExerciseStatus.COMPLETED);

        for (SessionPlanExercise exercise : completedExercises) {
            exercise.setStatus(ExerciseStatus.PENDING);
        }

        sessionPlanExerciseRepository.saveAll(completedExercises);
    }
}
