package com.aidem.backend.service;

import com.aidem.backend.dto.patient.SessionHistoryExerciseResponse;
import com.aidem.backend.dto.patient.SessionHistoryResponse;
import com.aidem.backend.dto.session.ExerciseFeedbackRequest;
import com.aidem.backend.dto.session.SessionPlanExerciseResponse;
import com.aidem.backend.dto.session.SessionPlanResponse;
import com.aidem.backend.dto.session.AddSessionPlanExerciseRequest;
import com.aidem.backend.model.*;
import com.aidem.backend.model.enums.*;
import com.aidem.backend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

@Service
public class SessionPlanService {

    /*
     * A aplicação é usada em Portugal.
     * O servidor de produção pode estar em UTC, por isso nunca
     * devemos depender do timezone da máquina para decidir qual é "hoje".
     */
    private static final ZoneId LISBON_ZONE =
            ZoneId.of("Europe/Lisbon");

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
    private final SessionHistoryRepository sessionHistoryRepository;

    public SessionPlanService(
            PatientRepository patientRepository,
            UserRepository userRepository,
            AssessmentRepository assessmentRepository,
            DomainScoreRepository domainScoreRepository,
            ExerciseRepository exerciseRepository,
            SessionPlanRepository sessionPlanRepository,
            SessionPlanExerciseRepository sessionPlanExerciseRepository,
            ExerciseFeedbackRepository exerciseFeedbackRepository,
            SessionHistoryRepository sessionHistoryRepository
    ) {
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.assessmentRepository = assessmentRepository;
        this.domainScoreRepository = domainScoreRepository;
        this.exerciseRepository = exerciseRepository;
        this.sessionPlanRepository = sessionPlanRepository;
        this.sessionPlanExerciseRepository = sessionPlanExerciseRepository;
        this.exerciseFeedbackRepository = exerciseFeedbackRepository;
        this.sessionHistoryRepository = sessionHistoryRepository;
    }

    @Transactional
    public List<SessionHistoryResponse> getPatientSessionHistory(Long patientId) {

        if (!patientRepository.existsById(patientId)) {
            throw new IllegalArgumentException("Utente não encontrado.");
        }

        return sessionPlanRepository
                .findByPatient_IdOrderBySessionDateDescIdDesc(patientId)
                .stream()
                .filter(this::hasSessionProgress)
                .map(this::toHistoryResponse)
                .toList();
    }

    private boolean hasSessionProgress(SessionPlan plan) {
        List<SessionPlanExercise> items =
                sessionPlanExerciseRepository
                        .findBySessionPlan_IdOrderByOrderIndexAsc(plan.getId());

        return items.stream()
                .anyMatch(item -> item.getStatus() != ExerciseStatus.PENDING);
    }

    @Transactional
    public SessionPlanResponse getOrGenerateTodayPlan(
            Long patientId,
            String userEmail
    ) {
        LocalDate today = today();

        return toResponse(
                getOrGeneratePlan(
                        patientId,
                        userEmail,
                        today
                )
        );
    }

    @Transactional
    public SessionPlanResponse regenerateTodayPlan(Long patientId, String userEmail) {
        LocalDate today = today();
        List<SessionPlan> existing = sessionPlanRepository.findByPatientIdAndSessionDateOrderByIdDesc(patientId, today);
        sessionHistoryRepository.deleteByPatientIdAndSessionDate(patientId, today);
        sessionPlanRepository.deleteAll(existing);
        return toResponse(generatePlan(patientId, userEmail, today));
    }

    @Transactional
    public SessionPlanExerciseResponse submitFeedback(Long sessionPlanExerciseId, ExerciseFeedbackRequest request) {
        SessionPlanExercise planExercise = sessionPlanExerciseRepository.findById(sessionPlanExerciseId)
                .orElseThrow(() -> new IllegalArgumentException("Atividade do plano não encontrada."));

        validateExerciseCanBeClassified(planExercise);

        boolean completed = Boolean.TRUE.equals(request.completed());
        planExercise.setStatus(completed ? ExerciseStatus.COMPLETED : ExerciseStatus.FAILED);
        sessionPlanExerciseRepository.save(planExercise);


        ExerciseFeedback feedback = exerciseFeedbackRepository
                .findBySessionPlanExercise_Id(sessionPlanExerciseId)
                .orElseGet(() -> ExerciseFeedback.builder()
                        .sessionPlanExercise(planExercise)
                        .build());

        feedback.setCompleted(completed);
        feedback.setDifficultyFeedback(parseDifficulty(request.difficultyFeedback()));
        feedback.setEmotionFeedback(request.emotionFeedback());
        feedback.setNotes(request.notes());

        exerciseFeedbackRepository.save(feedback);

        updateSessionStatusIfFinished(planExercise.getSessionPlan());
        return toExerciseResponse(planExercise);
    }

    @Transactional
    public SessionPlanExerciseResponse skipExercise(Long sessionPlanExerciseId, String notes) {
        SessionPlanExercise planExercise = sessionPlanExerciseRepository.findById(sessionPlanExerciseId)
                .orElseThrow(() -> new IllegalArgumentException("Atividade do plano não encontrada."));

        validateExerciseCanBeClassified(planExercise);

        planExercise.setStatus(ExerciseStatus.SKIPPED);
        sessionPlanExerciseRepository.save(planExercise);

        ExerciseFeedback feedback = exerciseFeedbackRepository
                .findBySessionPlanExercise_Id(sessionPlanExerciseId)
                .orElseGet(() -> ExerciseFeedback.builder()
                        .sessionPlanExercise(planExercise)
                        .build());

        feedback.setCompleted(false);
        feedback.setDifficultyFeedback(DifficultyFeedback.TOO_HARD);
        feedback.setEmotionFeedback("skipped");
        feedback.setNotes(notes);

        exerciseFeedbackRepository.save(feedback);

        updateSessionStatusIfFinished(planExercise.getSessionPlan());
        return toExerciseResponse(planExercise);
    }

    @Transactional
    public SessionPlanExerciseResponse resetExercise(Long sessionPlanExerciseId) {
        SessionPlanExercise planExercise = sessionPlanExerciseRepository.findById(sessionPlanExerciseId)
                .orElseThrow(() -> new IllegalArgumentException("Atividade do plano não encontrada."));

        if (!planExercise.getSessionPlan().getSessionDate().equals(today())) {
            throw new IllegalStateException(
                    "Só é possível anular a classificação de atividades do dia atual."
            );
        }

        planExercise.setStatus(ExerciseStatus.PENDING);
        sessionPlanExerciseRepository.save(planExercise);

        exerciseFeedbackRepository.deleteBySessionPlanExercise_Id(sessionPlanExerciseId);

        SessionPlan plan = planExercise.getSessionPlan();
        List<SessionPlanExercise> items = sessionPlanExerciseRepository.findBySessionPlan_IdOrderByOrderIndexAsc(plan.getId());
        boolean hasProgress = items.stream()
                .anyMatch(item -> !item.getId().equals(sessionPlanExerciseId) && item.getStatus() != ExerciseStatus.PENDING);
        plan.setStatus(hasProgress ? SessionStatus.IN_PROGRESS : SessionStatus.PLANNED);
        sessionHistoryRepository.deleteByPatientIdAndSessionDate(
                plan.getPatient().getId(),
                plan.getSessionDate()
        );
        sessionPlanRepository.save(plan);

        return toExerciseResponse(planExercise);
    }

    private void validateExerciseCanBeClassified(
            SessionPlanExercise planExercise
    ) {
        if (planExercise.getStatus() != ExerciseStatus.PENDING) {
            throw new IllegalStateException(
                    "Esta atividade já foi classificada e não pode ser realizada novamente."
            );
        }

        if (planExercise.getSessionPlan().getSessionDate().isAfter(today())) {
            throw new IllegalStateException(
                    "Ainda não é possível realizar uma atividade de um dia futuro."
            );
        }
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
        SelectionHistory selectionHistory = loadSelectionHistory(patientId);
        List<Exercise> selected = selectExercises(patientId, date, domainScores, riskGroups, allExercises, selectionHistory);
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
            List<Exercise> allExercises,
            SelectionHistory selectionHistory
    ) {
        Random random = new Random(Objects.hash(patientId, date));
        List<Exercise> selected = new ArrayList<>();
        Set<Long> selectedIds = new HashSet<>();

        ActivityType priorityType = getPriorityType(scores);
        List<DomainScore> sortedScores = scores.stream()
                .sorted(Comparator.comparing(this::scoreValue))
                .toList();

        // Regra: incluir sempre pelo menos 1 atividade da área prioritária.
        pickFirstValid(allExercises,
                selectedIds,
                sortedScores.stream().map(DomainScore::getDomain).toList(),
                null,
                priorityType,
                random,
                selectionHistory
        ).ifPresent(ex -> addExercise(selected, selectedIds, ex));

        // Regra: uma atividade de cada divisão interna/risk group.
        for (RiskLevel risk : List.of(RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW)) {
            List<String> domains = riskGroups.getOrDefault(risk, List.of()).stream()
                    .map(DomainScore::getDomain)
                    .toList();

            pickFirstValid(        allExercises,
                    selectedIds,
                    domains,
                    toDifficulty(risk),
                    null,
                    random,
                    selectionHistory)
                    .ifPresent(ex -> addExercise(selected, selectedIds, ex));
        }

        // Regra: pelo menos uma motora e uma cognitiva.
        ensureActivityType(
                allExercises,
                selected,
                selectedIds,
                ActivityType.MOTOR,
                random,
                selectionHistory
        );

        ensureActivityType(
                allExercises,
                selected,
                selectedIds,
                ActivityType.COGNITIVE,
                random,
                selectionHistory
        );

        // Regra: preferencialmente 3 domínios distintos e perto de 45 min.
        List<String> domainPriority = sortedScores.stream().map(DomainScore::getDomain).toList();
        while (totalMinutes(selected) < MIN_MINUTES) {
            Optional<Exercise> next = pickFirstValid(allExercises,
                    selectedIds,
                    domainPriority,
                    null,
                    null,
                    random,
                    selectionHistory);
            if (next.isEmpty() || totalMinutes(selected) + duration(next.get()) > MAX_MINUTES) break;
            addExercise(selected, selectedIds, next.get());
        }

        while (totalMinutes(selected) < TARGET_MINUTES) {
            Optional<Exercise> next = pickFirstValid(allExercises,
                    selectedIds,
                    domainPriority,
                    null,
                    null,
                    random,
                    selectionHistory);
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
            List<Exercise> allExercises,
            Set<Long> selectedIds,
            List<String> domains,
            DifficultyLevel difficulty,
            ActivityType activityType,
            Random random,
            SelectionHistory selectionHistory
    ) {
        List<Exercise> pool = buildPool(allExercises, selectedIds, domains, difficulty, activityType, selectionHistory);

        if (pool.isEmpty() && difficulty != null) {
            pool = buildPool(allExercises, selectedIds, domains, null, activityType, selectionHistory);
        }

        if (pool.isEmpty()) return Optional.empty();

        boolean firstWasCompleted = wasCompletedBefore(selectionHistory, pool.get(0).getId());

        List<Exercise> bestPool = pool.stream()
                .filter(ex -> wasCompletedBefore(selectionHistory, ex.getId()) == firstWasCompleted)
                .toList();

        return Optional.of(bestPool.get(random.nextInt(bestPool.size())));
    }

    private List<Exercise> buildPool(
            List<Exercise> allExercises,
            Set<Long> selectedIds,
            List<String> domains,
            DifficultyLevel difficulty,
            ActivityType activityType,
            SelectionHistory selectionHistory
    ) {
        return allExercises.stream()
                .filter(ex -> !selectedIds.contains(ex.getId()))
                .filter(ex -> domains == null || domains.isEmpty() || domains.stream().anyMatch(d -> sameDomain(d, ex.getDomain())))
                .filter(ex -> difficulty == null || ex.getDifficultyLevel() == difficulty)
                .filter(ex -> activityType == null || ex.getActivityType() == activityType || ex.getActivityType() == ActivityType.MIXED)
                .filter(ex -> isAllowedAfterFailure(selectionHistory, ex))
                .sorted(Comparator
                        .comparing((Exercise ex) -> wasCompletedBefore(selectionHistory, ex.getId()))
                        .thenComparing(Exercise::getId))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private void ensureActivityType(
            List<Exercise> allExercises,
            List<Exercise> selected,
            Set<Long> selectedIds,
            ActivityType type,
            Random random,
            SelectionHistory selectionHistory
    ) {
        boolean alreadyPresent = selected.stream()
                .anyMatch(ex ->
                        ex.getActivityType() == type
                                || ex.getActivityType() == ActivityType.MIXED
                );

        if (alreadyPresent) {
            return;
        }

        pickFirstValid(
                allExercises,
                selectedIds,
                List.of(),
                null,
                type,
                random,
                selectionHistory
        )
                .filter(ex ->
                        totalMinutes(selected) + duration(ex) <= MAX_MINUTES
                )
                .ifPresent(ex ->
                        addExercise(selected, selectedIds, ex)
                );
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

    private SelectionHistory loadSelectionHistory(Long patientId) {
        List<SessionPlanExercise> completedExercises = sessionPlanExerciseRepository
                .findBySessionPlan_Patient_IdAndStatus(patientId, ExerciseStatus.COMPLETED);

        Set<Long> completedExerciseIds = completedExercises.stream()
                .map(item -> item.getExercise().getId())
                .collect(Collectors.toSet());

        Map<Long, SessionPlanExercise> latestFailureByExerciseId = sessionPlanExerciseRepository
                .findBySessionPlan_Patient_IdAndStatusInOrderByUpdatedAtDesc(
                        patientId,
                        List.of(ExerciseStatus.FAILED, ExerciseStatus.SKIPPED)
                )
                .stream()
                .collect(Collectors.toMap(
                        item -> item.getExercise().getId(),
                        item -> item,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));

        return new SelectionHistory(completedExerciseIds, latestFailureByExerciseId, completedExercises);
    }

    private boolean wasCompletedBefore(SelectionHistory selectionHistory, Long exerciseId) {
        return selectionHistory.completedExerciseIds().contains(exerciseId);
    }

    private boolean isAllowedAfterFailure(SelectionHistory selectionHistory, Exercise exercise) {
        SessionPlanExercise latestFailure = selectionHistory.latestFailureByExerciseId().get(exercise.getId());

        if (latestFailure == null) return true;

        LocalDateTime failedAt = latestFailure.getUpdatedAt() != null
                ? latestFailure.getUpdatedAt()
                : latestFailure.getCreatedAt();

        if (failedAt == null) return false;

        long completedInDomainAfterFailure = selectionHistory.completedExercises().stream()
                .filter(item -> item.getUpdatedAt() != null)
                .filter(item -> item.getUpdatedAt().isAfter(failedAt))
                .filter(item -> sameDomain(item.getExercise().getDomain(), exercise.getDomain()))
                .count();

        return completedInDomainAfterFailure >= 5;
    }

    private record SelectionHistory(
            Set<Long> completedExerciseIds,
            Map<Long, SessionPlanExercise> latestFailureByExerciseId,
            List<SessionPlanExercise> completedExercises
    ) {
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
        List<SessionPlanExercise> items =
                sessionPlanExerciseRepository.findBySessionPlan_IdOrderByOrderIndexAsc(plan.getId());

        boolean allFinished = items.stream()
                .allMatch(item -> item.getStatus() != ExerciseStatus.PENDING);

        if (allFinished) {
            plan.setStatus(SessionStatus.COMPLETED);
            sessionPlanRepository.save(plan);
            saveSessionHistory(plan, items);
        } else if (items.stream().anyMatch(item -> item.getStatus() != ExerciseStatus.PENDING)) {
            plan.setStatus(SessionStatus.IN_PROGRESS);
            sessionPlanRepository.save(plan);
        }
    }

    private void saveSessionHistory(SessionPlan plan, List<SessionPlanExercise> items) {
        Long patientId = plan.getPatient().getId();
        LocalDate sessionDate = plan.getSessionDate();

        int completedActivities = (int) items.stream()
                .filter(item -> item.getStatus() == ExerciseStatus.COMPLETED)
                .count();

        List<ExerciseFeedback> feedbacks =
                exerciseFeedbackRepository.findBySessionPlanExercise_SessionPlan_Id(plan.getId());

        String averageDifficulty = calculateAverageDifficulty(feedbacks);

        SessionHistory history = sessionHistoryRepository
                .findByPatientIdAndSessionDate(patientId, sessionDate)
                .orElseGet(() -> SessionHistory.builder()
                        .patientId(patientId)
                        .sessionDate(sessionDate)
                        .build());

        history.setCompletedActivities(completedActivities);
        history.setAverageDifficulty(averageDifficulty);

        sessionHistoryRepository.save(history);
    }

    private String calculateAverageDifficulty(List<ExerciseFeedback> feedbacks) {
        List<Integer> values = feedbacks.stream()
                .map(ExerciseFeedback::getDifficultyFeedback)
                .filter(Objects::nonNull)
                .map(this::difficultyValue)
                .toList();

        if (values.isEmpty()) {
            return "-";
        }

        double average = values.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);

        if (average <= 1.5) return "Fácil";
        if (average <= 2.5) return "Média";
        return "Difícil";
    }

    private SessionHistoryResponse toHistoryResponse(SessionPlan plan) {

        List<SessionPlanExercise> items =
                sessionPlanExerciseRepository
                        .findBySessionPlan_IdOrderByOrderIndexAsc(plan.getId());

        List<Long> itemIds = items.stream()
                .map(SessionPlanExercise::getId)
                .toList();

        Map<Long, ExerciseFeedback> feedbackByExerciseId =
                itemIds.isEmpty()
                        ? Map.of()
                        : exerciseFeedbackRepository
                        .findBySessionPlanExercise_IdIn(itemIds)
                        .stream()
                        .collect(Collectors.toMap(
                                feedback ->
                                        feedback
                                                .getSessionPlanExercise()
                                                .getId(),
                                feedback -> feedback
                        ));

        List<SessionHistoryExerciseResponse> exercises =
                items.stream()
                        .map(item ->
                                toHistoryExerciseResponse(
                                        item,
                                        feedbackByExerciseId.get(item.getId())
                                )
                        )
                        .toList();

        int completedActivities = (int) items.stream()
                .filter(item ->
                        item.getStatus() == ExerciseStatus.COMPLETED
                )
                .count();

        return new SessionHistoryResponse(
                plan.getId(),
                plan.getPatient().getId(),
                plan.getSessionDate(),
                plan.getStatus().name(),
                completedActivities,
                items.size(),
                averageDifficultyLabel(feedbackByExerciseId.values()),
                exercises
        );
    }

    private SessionHistoryExerciseResponse toHistoryExerciseResponse(
            SessionPlanExercise item,
            ExerciseFeedback feedback
    ) {

        Exercise exercise = item.getExercise();

        return new SessionHistoryExerciseResponse(
                item.getId(),
                exercise.getId(),
                item.getOrderIndex(),
                exercise.getTitle(),
                exercise.getDomain(),
                exercise.getActivityType().name(),
                exercise.getDifficultyLevel().name(),
                item.getRecommendedDurationMinutes(),
                item.getStatus().name(),
                item.getReason(),

                feedback == null
                        ? null
                        : feedback.getCompleted(),

                feedback == null ||
                        feedback.getDifficultyFeedback() == null
                        ? null
                        : feedback.getDifficultyFeedback().name(),

                feedback == null
                        ? null
                        : feedback.getEmotionFeedback(),

                feedback == null
                        ? null
                        : feedback.getNotes()
        );
    }

    private String averageDifficultyLabel(
            Collection<ExerciseFeedback> feedbacks
    ) {

        List<Integer> values = feedbacks.stream()
                .map(ExerciseFeedback::getDifficultyFeedback)
                .filter(Objects::nonNull)
                .map(this::difficultyValue)
                .toList();

        if (values.isEmpty()) {
            return "-";
        }

        double average = values.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);

        if (average < 1.5) {
            return "Fácil";
        }

        if (average < 2.5) {
            return "Média";
        }

        if (average < 3.5) {
            return "Difícil";
        }

        return "Muito difícil";
    }

    private int difficultyValue(
            DifficultyFeedback difficultyFeedback
    ) {

        return switch (difficultyFeedback) {
            case EASY -> 1;
            case OK -> 2;
            case HARD -> 3;
            case TOO_HARD -> 4;
        };
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

    private SessionPlanResponse toRangeResponse(
            SessionPlan plan
    ) {

        List<SessionPlanExercise> items =
                sessionPlanExerciseRepository
                        .findBySessionPlan_IdOrderByOrderIndexAsc(
                                plan.getId()
                        );

        List<SessionPlanExerciseResponse> exercises =
                items.stream()
                        .map(this::toRangeExerciseResponse)
                        .toList();

        int totalDuration =
                items.stream()
                        .mapToInt(item ->
                                item.getRecommendedDurationMinutes() == null
                                        ? 0
                                        : item.getRecommendedDurationMinutes()
                        )
                        .sum();

        return new SessionPlanResponse(
                plan.getId(),
                plan.getPatient().getId(),
                plan.getAssessment() == null
                        ? null
                        : plan.getAssessment().getId(),
                plan.getSessionDate(),
                plan.getTargetDurationMinutes(),
                totalDuration,
                plan.getStatus().name(),
                exercises
        );
    }

    private SessionPlanExerciseResponse
    toRangeExerciseResponse(
            SessionPlanExercise item
    ) {

        Exercise exercise =
                item.getExercise();

        return new SessionPlanExerciseResponse(
                item.getId(),
                exercise.getId(),
                item.getOrderIndex(),

                exercise.getTitle(),

                null, // description

                exercise.getDomain(),

                exercise.getActivityType().name(),
                exercise.getDifficultyLevel().name(),

                item.getRecommendedDurationMinutes(),

                null, // sets
                null, // repetitions
                null, // restSeconds
                null, // materials
                null, // instructions

                resolveExerciseMedia(exercise),

                /*
                 * MUITO IMPORTANTE:
                 * não carregar as imagens de instruções
                 * de todos os exercícios dos 7 dias.
                 */
                List.of(),

                item.getReason(),

                item.getStatus().name()
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
                resolveExerciseMedia(ex),
                resolveInstructionMedia(ex),
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
            sessionHistoryRepository.deleteByPatientIdAndSessionDate(
                    plan.getPatient().getId(),
                    plan.getSessionDate()
            );
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

            SessionPlan plan = exercise.getSessionPlan();

            sessionHistoryRepository.deleteByPatientIdAndSessionDate(
                    plan.getPatient().getId(),
                    plan.getSessionDate()
            );
        }

        sessionPlanExerciseRepository.saveAll(completedExercises);
    }


    private String resolveExerciseMedia(
            Exercise exercise
    ) {
        if (
                exercise.getMedia2() != null &&
                        !exercise.getMedia2().isBlank()
        ) {
            return exercise.getMedia2();
        }

        if (
                exercise.getMediaUrl() != null &&
                        !exercise.getMediaUrl().isBlank()
        ) {
            return exercise.getMediaUrl();
        }

        return "/icons/generic_exercise.svg";
    }

    private List<String> resolveInstructionMedia(
            Exercise exercise
    ) {
        List<String> instructionMedia = new ArrayList<>();

        addInstructionMedia(
                instructionMedia,
                exercise.getInstructionMedia2()
        );

        addInstructionMedia(
                instructionMedia,
                exercise.getInstructionMedia3()
        );

        addInstructionMedia(
                instructionMedia,
                exercise.getInstructionMedia4()
        );

        addInstructionMedia(
                instructionMedia,
                exercise.getInstructionMedia5()
        );

        addInstructionMedia(
                instructionMedia,
                exercise.getInstructionMedia6()
        );

        addInstructionMedia(
                instructionMedia,
                exercise.getInstructionMedia7()
        );

        return instructionMedia;
    }

    private void addInstructionMedia(
            List<String> instructionMedia,
            String media
    ) {
        if (
                media != null &&
                        !media.isBlank()
        ) {
            instructionMedia.add(media.trim());
        }
    }

    private LocalDate today() {
        return LocalDate.now(LISBON_ZONE);
    }

    private LocalDate getStartOfWeek(
            LocalDate date
    ) {
        return date.with(
                TemporalAdjusters.previousOrSame(
                        DayOfWeek.MONDAY
                )
        );
    }

    private SessionPlan getOrGeneratePlan(
            Long patientId,
            String userEmail,
            LocalDate date
    ) {
        List<SessionPlan> existing =
                sessionPlanRepository
                        .findByPatientIdAndSessionDateOrderByIdDesc(
                                patientId,
                                date
                        );

        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        return generatePlan(
                patientId,
                userEmail,
                date
        );
    }

    @Transactional
    public List<SessionPlanResponse>
    getOrGenerateWeekPlan(
            Long patientId,
            String userEmail,
            LocalDate requestedDate
    ) {
        if (!patientRepository.existsById(patientId)) {
            throw new IllegalArgumentException(
                    "Utente não encontrado."
            );
        }

        LocalDate startOfWeek =
                getStartOfWeek(requestedDate);

        LocalDate endOfWeek =
                startOfWeek.plusDays(6);

        Map<LocalDate, SessionPlan> plansByDate =
                sessionPlanRepository
                        .findByPatient_IdAndSessionDateBetweenOrderBySessionDateAscIdDesc(
                                patientId,
                                startOfWeek,
                                endOfWeek
                        )
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        SessionPlan::getSessionDate,
                                        plan -> plan,
                                        (
                                                first,
                                                duplicate
                                        ) -> first,
                                        TreeMap::new
                                )
                        );

        for (
                LocalDate date = startOfWeek;
                !date.isAfter(endOfWeek);
                date = date.plusDays(1)
        ) {
            if (
                    !date.isBefore(today()) &&
                            !plansByDate.containsKey(date)
            ) {
                SessionPlan generatedPlan =
                        generatePlan(
                                patientId,
                                userEmail,
                                date
                        );

                plansByDate.put(
                        date,
                        generatedPlan
                );
            }
        }

        return plansByDate
                .values()
                .stream()
                .sorted(
                        Comparator.comparing(
                                SessionPlan::getSessionDate
                        )
                )
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<SessionPlanResponse>
    getExistingPlanRange(
            Long patientId,
            LocalDate startDate,
            int numberOfDays
    ) {
        if (!patientRepository.existsById(patientId)) {
            throw new IllegalArgumentException(
                    "Utente não encontrado."
            );
        }

        int safeNumberOfDays =
                Math.max(1, Math.min(numberOfDays, 7));

        LocalDate endDate =
                startDate.plusDays(safeNumberOfDays - 1L);

        LocalDate today = today();
        LocalDate earliestAllowedDate = today.minusDays(14);
        LocalDate latestAllowedDate = today.plusDays(13);

        return sessionPlanRepository
                .findByPatient_IdAndSessionDateBetweenOrderBySessionDateAscIdDesc(
                        patientId,
                        startDate,
                        endDate
                )
                .stream()
                .filter(plan ->
                        !plan.getSessionDate().isBefore(earliestAllowedDate) &&
                                !plan.getSessionDate().isAfter(latestAllowedDate)
                )
                .collect(
                        Collectors.toMap(
                                SessionPlan::getSessionDate,
                                plan -> plan,
                                (first, duplicate) -> first,
                                TreeMap::new
                        )
                )
                .values()
                .stream()
                .map(this::toRangeResponse)
                .toList();
    }

    @Transactional
    public void ensurePlanRange(
            Long patientId,
            String userEmail,
            LocalDate startDate,
            int numberOfDays
    ) {
        if (!patientRepository.existsById(patientId)) {
            throw new IllegalArgumentException(
                    "Utente não encontrado."
            );
        }

        int safeNumberOfDays =
                Math.max(
                        1,
                        Math.min(numberOfDays, 31)
                );

        LocalDate endDate =
                startDate.plusDays(
                        safeNumberOfDays - 1L
                );

        LocalDate today = today();

        Set<LocalDate> existingDates =
                new HashSet<>(
                        sessionPlanRepository
                                .findExistingDates(
                                        patientId,
                                        startDate,
                                        endDate
                                )
                );

        /*
         * Apenas garantimos que os planos existem.
         *
         * Não construímos SessionPlanResponse porque este método
         * é usado pelo scheduler e o resultado não é apresentado
         * ao utilizador.
         */
        for (
                LocalDate date = startDate;
                !date.isAfter(endDate);
                date = date.plusDays(1)
        ) {
            if (
                    !date.isBefore(today) &&
                            !existingDates.contains(date)
            ) {
                generatePlan(
                        patientId,
                        userEmail,
                        date
                );

                existingDates.add(date);
            }
        }
    }


    @Transactional
    public List<SessionPlanResponse>
    getOrGeneratePlanRange(
            Long patientId,
            String userEmail,
            LocalDate startDate,
            int numberOfDays
    ) {
        if (!patientRepository.existsById(patientId)) {
            throw new IllegalArgumentException(
                    "Utente não encontrado."
            );
        }

        int safeNumberOfDays = Math.max(1, Math.min(numberOfDays, 31));
        LocalDate endDate = startDate.plusDays(safeNumberOfDays - 1L);
        LocalDate today = today();

        Map<LocalDate, SessionPlan> plansByDate =
                sessionPlanRepository
                        .findByPatient_IdAndSessionDateBetweenOrderBySessionDateAscIdDesc(
                                patientId,
                                startDate,
                                endDate
                        )
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        SessionPlan::getSessionDate,
                                        plan -> plan,
                                        (first, duplicate) -> first,
                                        TreeMap::new
                                )
                        );

        /*
         * Nunca criamos retroativamente planos em dias passados.
         * Assim, os registos históricos já recolhidos são preservados
         * e não inventamos sessões que não existiam durante o estudo.
         * Para hoje e para o futuro, os planos em falta são gerados
         * normalmente.
         */
        for (
                LocalDate date = startDate;
                !date.isAfter(endDate);
                date = date.plusDays(1)
        ) {
            if (
                    !date.isBefore(today) &&
                            !plansByDate.containsKey(date)
            ) {
                SessionPlan generatedPlan =
                        generatePlan(
                                patientId,
                                userEmail,
                                date
                        );

                plansByDate.put(
                        date,
                        generatedPlan
                );
            }
        }

        return plansByDate
                .values()
                .stream()
                .sorted(
                        Comparator.comparing(
                                SessionPlan::getSessionDate
                        )
                )
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SessionPlanResponse addExerciseToPlan(
            Long sessionPlanId,
            Long exerciseId
    ) {
        SessionPlan plan =
                sessionPlanRepository
                        .findById(sessionPlanId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Plano não encontrado."
                                )
                        );

        validateEditablePlanDate(plan);

        Exercise exercise =
                exerciseRepository
                        .findById(exerciseId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Atividade não encontrada."
                                )
                        );

        if (!Boolean.TRUE.equals(exercise.getActive())) {
            throw new IllegalArgumentException(
                    "Esta atividade já não está ativa."
            );
        }

        List<SessionPlanExercise> currentItems =
                sessionPlanExerciseRepository
                        .findBySessionPlan_IdOrderByOrderIndexAsc(
                                plan.getId()
                        );

        boolean alreadyExists =
                currentItems.stream()
                        .anyMatch(
                                item ->
                                        item.getExercise()
                                                .getId()
                                                .equals(exerciseId)
                        );

        if (alreadyExists) {
            throw new IllegalArgumentException(
                    "Esta atividade já faz parte deste plano."
            );
        }

        int nextOrder =
                currentItems.stream()
                        .map(SessionPlanExercise::getOrderIndex)
                        .filter(Objects::nonNull)
                        .max(Integer::compareTo)
                        .orElse(0)
                        + 1;

        SessionPlanExercise newItem =
                SessionPlanExercise.builder()
                        .sessionPlan(plan)
                        .exercise(exercise)
                        .orderIndex(nextOrder)
                        .recommendedDurationMinutes(
                                duration(exercise)
                        )
                        .reason(
                                "Adicionada manualmente pelo administrador."
                        )
                        .status(ExerciseStatus.PENDING)
                        .build();

        sessionPlanExerciseRepository.save(newItem);

        refreshPlanStatusAfterManualChange(plan);

        return toResponse(plan);
    }

    @Transactional
    public SessionPlanResponse removeExerciseFromPlan(
            Long sessionPlanExerciseId
    ) {
        SessionPlanExercise item =
                sessionPlanExerciseRepository
                        .findById(sessionPlanExerciseId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Atividade do plano não encontrada."
                                )
                        );

        SessionPlan plan =
                item.getSessionPlan();

        validateEditablePlanDate(plan);

        if (
                item.getStatus()
                        != ExerciseStatus.PENDING
        ) {
            throw new IllegalStateException(
                    "Só é possível remover atividades que ainda não foram realizadas ou classificadas."
            );
        }

        sessionPlanExerciseRepository.delete(item);
        sessionPlanExerciseRepository.flush();

        reorderPlanExercises(plan.getId());

        refreshPlanStatusAfterManualChange(plan);

        return toResponse(plan);
    }

    private void validateEditablePlanDate(
            SessionPlan plan
    ) {
        LocalDate today =
                today();

        if (
                plan.getSessionDate()
                        .isBefore(today)
        ) {
            throw new IllegalStateException(
                    "Não é possível alterar planos de dias anteriores."
            );
        }
    }

    private void reorderPlanExercises(
            Long sessionPlanId
    ) {
        List<SessionPlanExercise> items =
                sessionPlanExerciseRepository
                        .findBySessionPlan_IdOrderByOrderIndexAsc(
                                sessionPlanId
                        );

        for (
                int index = 0;
                index < items.size();
                index++
        ) {
            items.get(index)
                    .setOrderIndex(index + 1);
        }

        sessionPlanExerciseRepository
                .saveAll(items);
    }

    private void refreshPlanStatusAfterManualChange(
            SessionPlan plan
    ) {
        List<SessionPlanExercise> items =
                sessionPlanExerciseRepository
                        .findBySessionPlan_IdOrderByOrderIndexAsc(
                                plan.getId()
                        );

        boolean hasProgress =
                items.stream()
                        .anyMatch(
                                item ->
                                        item.getStatus()
                                                != ExerciseStatus.PENDING
                        );

        boolean allFinished =
                !items.isEmpty() &&
                        items.stream()
                                .allMatch(
                                        item ->
                                                item.getStatus()
                                                        != ExerciseStatus.PENDING
                                );

        if (allFinished) {
            plan.setStatus(
                    SessionStatus.COMPLETED
            );
        } else if (hasProgress) {
            plan.setStatus(
                    SessionStatus.IN_PROGRESS
            );
        } else {
            plan.setStatus(
                    SessionStatus.PLANNED
            );
        }

        sessionPlanRepository.save(plan);
    }


}