package com.aidem.backend.controller;

import com.aidem.backend.dto.patient.*;
import com.aidem.backend.model.Patient;
import org.springframework.security.access.prepost.PreAuthorize;
import com.aidem.backend.repository.AssessmentRepository;
import com.aidem.backend.repository.DomainScoreRepository;
import com.aidem.backend.repository.PatientRepository;
import com.aidem.backend.repository.SessionHistoryRepository;
import com.aidem.backend.service.SessionPlanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.aidem.backend.model.PatientCaregiver;
import com.aidem.backend.model.User;
import com.aidem.backend.model.enums.CaregiverRelationshipType;
import com.aidem.backend.repository.PatientCaregiverRepository;
import com.aidem.backend.repository.UserRepository;

import java.util.*;

import com.aidem.backend.service.PatientAccessService;
import org.springframework.security.core.Authentication;

import com.aidem.backend.service.PatientDeletionService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.stream.Collectors;

import com.aidem.backend.model.Assessment;
import com.aidem.backend.model.DomainScore;
import com.aidem.backend.model.enums.RiskLevel;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;
import java.time.Period;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private static final Logger log = LoggerFactory.getLogger(PatientController.class);

    private static final String[] PHYSICAL_CONSTRAINT_DOMAINS = {
            "Mobilização articular dos membros superiores",
            "Mobilização articular dos membros inferiores"
    };

    private static final String[] MOTOR_PREVALENCE_DOMAINS = {
            "Equilíbrio Estático I",
            "Equilíbrio Estático II",
            "Equilíbrio Dinâmico I",
            "Equilíbrio Dinâmico II",
            "Motricidade fina dos membros inferiores"
    };

    private static final String[] COGNITIVE_PREVALENCE_DOMAINS = {
            "Motricidade fina dos membros superiores",
            "Praxias",
            "Conhecimento das partes do corpo",
            "Vigilância",
            "Memória Percetiva",
            "Domínio Espacial",
            "Memória Verbal",
            "Perceção",
            "Domínio Temporal",
            "Comunicação"
    };

    private final PatientRepository patientRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final DomainScoreRepository domainScoreRepository;
    private final AssessmentRepository assessmentRepository;
    private final SessionPlanService sessionPlanService;
    private final PatientAccessService patientAccessService;
    private final UserRepository userRepository;
    private final PatientDeletionService patientDeletionService;

    private final PatientCaregiverRepository patientCaregiverRepository;
    public PatientController(
            PatientRepository patientRepository,
            SessionHistoryRepository sessionHistoryRepository,
            DomainScoreRepository domainScoreRepository,
            AssessmentRepository assessmentRepository,
            SessionPlanService sessionPlanService,
            PatientAccessService patientAccessService,
            UserRepository userRepository,
            PatientCaregiverRepository patientCaregiverRepository,
            PatientDeletionService patientDeletionService
    ) {
        this.patientRepository =
                patientRepository;

        this.sessionHistoryRepository =
                sessionHistoryRepository;

        this.domainScoreRepository =
                domainScoreRepository;

        this.assessmentRepository =
                assessmentRepository;

        this.sessionPlanService =
                sessionPlanService;

        this.patientAccessService =
                patientAccessService;

        this.userRepository =
                userRepository;

        this.patientCaregiverRepository =
                patientCaregiverRepository;

        this.patientDeletionService =
                patientDeletionService;
    }

    @Transactional(readOnly = true)
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<PatientListResponse>> getAllPatients(
            Authentication authentication
    ) {
        log.info("GET /api/patients START");

        List<Patient> patients =
                patientAccessService
                        .getAccessiblePatients(
                                authentication
                        );
        log.info("GET /api/patients DB returned {} rows", patients.size());

        List<PatientListResponse> response = patients.stream()
                .map(this::toResponse)
                .toList();

        log.info("GET /api/patients MAPPED {} rows", response.size());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public PatientProfileResponse getPatient(
            @PathVariable Long id,
            Authentication authentication
    ) {
        patientAccessService.requirePatientAccess(
                id,
                authentication
        );

        Patient patient =
                patientRepository.findById(id)
                        .orElseThrow();

        Integer age =
                Period.between(
                        patient.getBirthDate(),
                        LocalDate.now()
                ).getYears();

        return new PatientProfileResponse(
                patient.getId(),
                patient.getFullName(),
                patient.getFullName(),
                patient.getBirthDate(),
                age,
                "IP" + patient.getId(),
                patient.getDiagnosisType(),
                patient.getGender(),
                patient.getPhone(),
                patient.getEmail(),
                patient.getAddress(),
                patient.getEducation(),
                patient.getProfession(),
                patient.getSessionType(),
                patient.getInformalCaregiverName(),
                patient.getInformalCaregiverPhone(),
                patient.getInformalCaregiverEmail(),
                patient.getAvatar() != null &&
                        !patient.getAvatar().isBlank()
                        ? patient.getAvatar()
                        : "/icons/generic_user.svg",
                age + " anos - " + patient.getDiagnosisType()
        );
    }

    private PatientListResponse toResponse(Patient patient) {
        int age = patient.getBirthDate() == null
                ? 0
                : Period.between(patient.getBirthDate(), LocalDate.now()).getYears();

        return new PatientListResponse(
                patient.getId(),
                patient.getFullName(),
                patient.getBirthDate(),
                age,
                "IP" + patient.getId(),
                patient.getAvatar() != null &&
                        !patient.getAvatar().isBlank()
                        ? patient.getAvatar()
                        : "/icons/generic_user.svg",
                age + " anos - Paciente com demência"
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(
            "hasAnyAuthority('ADMIN', 'FORMAL_CAREGIVER')"
    )
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePatient(
            @PathVariable Long id,
            Authentication authentication
    ) {
        /*
         * O administrador pode remover qualquer utente.
         * O cuidador formal só pode remover utentes
         * que lhe estejam associados.
         */
        patientAccessService.requirePatientAccess(
                id,
                authentication
        );

        patientDeletionService.deletePatient(id);
    }

    @PutMapping(
            value = "/{id}",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize(
            "hasAnyAuthority('ADMIN', 'FORMAL_CAREGIVER')"
    )
    @Transactional
    public PatientProfileResponse updatePatient(
            @PathVariable Long id,
            @RequestBody UpdatePatientRequest request,
            Authentication authentication
    ) {
        /*
         * O administrador pode editar qualquer utente.
         * O cuidador formal só pode editar os utentes
         * que lhe estão associados.
         */
        patientAccessService.requirePatientAccess(
                id,
                authentication
        );

        validateUpdatePatient(request);

        Patient patient = patientRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Utente não encontrado."
                        )
                );

        patient.setFullName(
                request.fullName().trim()
        );

        patient.setBirthDate(
                request.birthDate()
        );

        patient.setGender(
                request.gender().trim()
        );

        patient.setDiagnosisType(
                request.diagnosisType().trim()
        );

        patient.setPhone(
                cleanOptional(request.phone())
        );

        patient.setEmail(
                cleanOptional(request.email())
        );

        patient.setAddress(
                request.address().trim()
        );

        patient.setEducation(
                request.education().trim()
        );

        patient.setProfession(
                request.profession().trim()
        );

        patient.setSessionType(
                request.sessionType().trim()
        );

        patient.setInformalCaregiverName(
                request.informalCaregiverName().trim()
        );

        patient.setInformalCaregiverPhone(
                request.informalCaregiverPhone().trim()
        );

        patient.setInformalCaregiverEmail(
                request.informalCaregiverEmail().trim()
        );
        patient.setAvatar(
                cleanAvatar(
                        request.avatar()
                )
        );

        patientRepository.saveAndFlush(patient);

        return getPatient(
                patient.getId(),
                authentication
        );
    }

    @GetMapping("/{id}/session-history")
    public List<SessionHistoryResponse> getSessionHistory(
            @PathVariable Long id,
            Authentication authentication
    ) {
        patientAccessService.requirePatientAccess(
                id,
                authentication
        );

        return sessionPlanService
                .getPatientSessionHistory(id);
    }

    @GetMapping("/{id}/egp/latest")
    @Transactional(readOnly = true)
    public ResponseEntity<EgpAssessmentResponse> getLatestEgp(
            @PathVariable Long id,
            Authentication authentication
    ) {
        patientAccessService.requirePatientAccess(
                id,
                authentication
        );

        if (!patientRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        var assessmentOpt = assessmentRepository
                .findFirstByPatient_IdOrderByAssessmentDateDescIdDesc(id);

        if (assessmentOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        var assessment = assessmentOpt.get();

        var scores = domainScoreRepository
                .findByAssessment_IdOrderByDisplayOrderAscIdAsc(
                        assessment.getId()
                );

        Map<String, BigDecimal> scoresByDomain =
                scores.stream()
                        .collect(Collectors.toMap(
                                DomainScore::getDomain,
                                DomainScore::getScore,
                                (first, second) -> first
                        ));

        Map<String, BigDecimal> normalizedScoresByDomain =
                scores.stream()
                        .filter(
                                score ->
                                        score.getNormalizedScore() != null
                        )
                        .collect(Collectors.toMap(
                                DomainScore::getDomain,
                                DomainScore::getNormalizedScore,
                                (first, second) -> first
                        ));

        BigDecimal physicalConstraints = sumScores(
                scoresByDomain,
                PHYSICAL_CONSTRAINT_DOMAINS
        );

        BigDecimal motorPrevalence = sumScores(
                scoresByDomain,
                MOTOR_PREVALENCE_DOMAINS
        );

        BigDecimal cognitivePrevalence = sumScores(
                scoresByDomain,
                COGNITIVE_PREVALENCE_DOMAINS
        );

        BigDecimal physicalConstraintsNr = averageScores(
                normalizedScoresByDomain,
                PHYSICAL_CONSTRAINT_DOMAINS
        );

        BigDecimal motorPrevalenceNr = averageScores(
                normalizedScoresByDomain,
                MOTOR_PREVALENCE_DOMAINS
        );

        BigDecimal cognitivePrevalenceNr = averageScores(
                normalizedScoresByDomain,
                COGNITIVE_PREVALENCE_DOMAINS
        );

        BigDecimal totalNr =
                averageIfComplete(
                        physicalConstraintsNr,
                        motorPrevalenceNr,
                        cognitivePrevalenceNr
                );

        BigDecimal total = physicalConstraints
                .add(motorPrevalence)
                .add(cognitivePrevalence);

        var rows = scores.stream()
                .map(score -> {
                    BigDecimal pd = switch (score.getDomain()) {
                        case "Constrangimentos físicos" ->
                                physicalConstraints;

                        case "Prevalência motora" ->
                                motorPrevalence;

                        case "Prevalência cognitiva" ->
                                cognitivePrevalence;

                        case "Total" ->
                                total;

                        default ->
                                score.getScore();
                    };

                    BigDecimal nr = switch (score.getDomain()) {
                        case "Constrangimentos físicos" ->
                                physicalConstraintsNr;

                        case "Prevalência motora" ->
                                motorPrevalenceNr;

                        case "Prevalência cognitiva" ->
                                cognitivePrevalenceNr;

                        case "Total" ->
                                totalNr;

                        default ->
                                score.getNormalizedScore() != null
                                        ? score.getNormalizedScore()
                                        : score.getScore();
                    };

                    return new EgpRowResponse(
                            score.getDomain(),
                            pd,
                            nr,
                            riskLevelForResponse(score),
                            score.getDisplayOrder(),
                            isEgpSummaryRow(score.getDomain())
                    );
                })
                .toList();

        return ResponseEntity.ok(
                new EgpAssessmentResponse(
                        assessment.getId(),
                        assessment.getAssessmentDate(),
                        rows
                )
        );
    }
    private BigDecimal averageIfComplete(
            BigDecimal... values
    ) {
        if (
                values == null ||
                        values.length == 0 ||
                        Arrays.stream(values)
                                .anyMatch(Objects::isNull)
        ) {
            return null;
        }

        BigDecimal total =
                Arrays.stream(values)
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );

        return total.divide(
                BigDecimal.valueOf(values.length),
                2,
                RoundingMode.HALF_UP
        );
    }

    @PutMapping(
            value = "/{id}/egp/latest",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize(
            "hasAnyAuthority('ADMIN', 'FORMAL_CAREGIVER')"
    )
    @Transactional
    public ResponseEntity<EgpAssessmentResponse> updateLatestEgp(
            @PathVariable Long id,
            @RequestBody UpdateEgpRequest request,
            Authentication authentication
    ) {
        /*
         * O administrador pode editar qualquer utente.
         * O cuidador formal apenas pode editar os utentes
         * aos quais tem acesso.
         */
        patientAccessService.requirePatientAccess(
                id,
                authentication
        );

        Assessment assessment = assessmentRepository
                .findFirstByPatient_IdOrderByAssessmentDateDescIdDesc(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Este utente ainda não tem uma avaliação EGP."
                        )
                );

        validateUpdateEgpRequest(
                request,
                assessment.getId()
        );

        List<DomainScore> scores = domainScoreRepository
                .findByAssessment_IdOrderByDisplayOrderAscIdAsc(
                        assessment.getId()
                );

        Map<String, UpdateEgpRequest.EgpScoreRequest> requestedRows =
                new LinkedHashMap<>();

        for (
                UpdateEgpRequest.EgpScoreRequest row :
                request.rows()
        ) {
            String label = row.label().trim();

            if (
                    requestedRows.putIfAbsent(
                            label,
                            row
                    ) != null
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "O domínio EGP '" +
                                label +
                                "' está repetido."
                );
            }
        }

        if (requestedRows.size() != scores.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A avaliação EGP está incompleta."
            );
        }

        for (DomainScore score : scores) {
            UpdateEgpRequest.EgpScoreRequest requestedRow =
                    requestedRows.remove(
                            score.getDomain()
                    );

            if (requestedRow == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Falta o domínio EGP '" +
                                score.getDomain() +
                                "'."
                );
            }

            /*
             * Os PD das linhas de resumo não são aceites
             * diretamente: serão recalculados no backend.
             */
            if (!isEgpSummaryRow(score.getDomain())) {
                score.setScore(
                        requestedRow.pd()
                );
            }

            /*
             * Estes três NRs são calculados automaticamente.
             */
            if (!isAutoCalculatedEgpNr(
                    score.getDomain()
            )) {
                score.setNormalizedScore(
                        requestedRow.nr()
                );
            }

            score.setRiskLevel(
                    riskLevelForStorage(
                            score.getDomain(),
                            requestedRow.riskLevel()
                    )
            );
        }

        if (!requestedRows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Foram enviados domínios que não pertencem a esta avaliação EGP."
            );
        }

        updateEgpSummaryScores(scores);

        assessment.setAssessmentDate(
                request.assessmentDate()
        );

        assessmentRepository.save(assessment);
        domainScoreRepository.saveAllAndFlush(scores);

        List<EgpRowResponse> responseRows =
                scores.stream()
                        .map(score ->
                                new EgpRowResponse(
                                        score.getDomain(),
                                        score.getScore(),
                                        score.getNormalizedScore() != null
                                                ? score.getNormalizedScore()
                                                : score.getScore(),
                                        riskLevelForResponse(score),
                                        score.getDisplayOrder(),
                                        isEgpSummaryRow(
                                                score.getDomain()
                                        )
                                )
                        )
                        .toList();

        return ResponseEntity.ok(
                new EgpAssessmentResponse(
                        assessment.getId(),
                        assessment.getAssessmentDate(),
                        responseRows
                )
        );
    }

    private BigDecimal sumScores(
            Map<String, BigDecimal> scoresByDomain,
            String... domains
    ) {
        BigDecimal total = BigDecimal.ZERO;

        for (String domain : domains) {
            BigDecimal value = scoresByDomain.get(domain);

            if (value != null) {
                total = total.add(value);
            }
        }

        return total;
    }

    private BigDecimal averageScores(
            Map<String, BigDecimal> scoresByDomain,
            String... domains
    ) {
        if (domains.length == 0) {
            return null;
        }

        BigDecimal total = BigDecimal.ZERO;

        for (String domain : domains) {
            BigDecimal value =
                    scoresByDomain.get(domain);

            /*
             * Não calcula uma média parcial.
             */
            if (value == null) {
                return null;
            }

            total = total.add(value);
        }

        return total.divide(
                BigDecimal.valueOf(domains.length),
                2,
                RoundingMode.HALF_UP
        );
    }

    private BigDecimal sumIfComplete(
            BigDecimal... values
    ) {
        BigDecimal total = BigDecimal.ZERO;

        for (BigDecimal value : values) {
            if (value == null) {
                return null;
            }

            total = total.add(value);
        }

        return total.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private boolean isEgpSummaryRow(String domain) {
        if (domain == null) {
            return false;
        }

        return "Constrangimentos físicos".equalsIgnoreCase(domain)
                || "Prevalência motora".equalsIgnoreCase(domain)
                || "Prevalência cognitiva".equalsIgnoreCase(domain)
                || "Total".equalsIgnoreCase(domain);
    }

    private boolean hasEgpRiskClassification(
            String domain
    ) {
        if (domain == null) {
            return true;
        }

        return !"Constrangimentos físicos".equalsIgnoreCase(domain)
                && !"Prevalência motora".equalsIgnoreCase(domain)
                && !"Prevalência cognitiva".equalsIgnoreCase(domain)
                && !"Total".equalsIgnoreCase(domain);
    }

    private boolean isAutoCalculatedEgpNr(
            String domain
    ) {
        if (domain == null) {
            return false;
        }

        return "Constrangimentos físicos".equalsIgnoreCase(domain)
                || "Prevalência motora".equalsIgnoreCase(domain)
                || "Prevalência cognitiva".equalsIgnoreCase(domain)
                || "Total".equalsIgnoreCase(domain);
    }

    private RiskLevel riskLevelForStorage(
            String domain,
            String requestedRiskLevel
    ) {
        /*
         * A coluna da base de dados continua obrigatória.
         * LOW é apenas um valor técnico para os três itens
         * sem classificação e nunca é devolvido ao frontend.
         */
        if (!hasEgpRiskClassification(domain)) {
            return RiskLevel.LOW;
        }

        return parseRiskLevel(requestedRiskLevel);
    }

    private String riskLevelForResponse(
            DomainScore score
    ) {
        if (!hasEgpRiskClassification(score.getDomain())) {
            return null;
        }

        return score.getRiskLevel().name();
    }

    private void validateUpdateEgpRequest(
            UpdateEgpRequest request,
            Long latestAssessmentId
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Os dados EGP são obrigatórios."
            );
        }

        if (request.assessmentId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A avaliação EGP é obrigatória."
            );
        }

        /*
         * Impede que o utilizador grave dados de uma
         * avaliação antiga entretanto substituída.
         */
        if (
                !request.assessmentId()
                        .equals(latestAssessmentId)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Existe uma avaliação EGP mais recente. " +
                            "Feche e volte a abrir os dados EGP."
            );
        }

        if (request.assessmentDate() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A data da avaliação EGP é obrigatória."
            );
        }

        if (
                request.rows() == null ||
                        request.rows().isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Os valores EGP são obrigatórios."
            );
        }

        for (
                UpdateEgpRequest.EgpScoreRequest row :
                request.rows()
        ) {
            if (
                    row == null ||
                            row.label() == null ||
                            row.label().isBlank()
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "O domínio EGP é obrigatório."
                );
            }

            if (
                    row.pd() == null ||
                            row.pd().signum() < 0
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "O PD de '" +
                                row.label() +
                                "' deve ser igual ou superior a zero."
                );
            }

            if (
                    !isAutoCalculatedEgpNr(row.label()) &&
                            (
                                    row.nr() == null ||
                                            row.nr().signum() < 0
                            )
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "O NR de '" +
                                row.label() +
                                "' deve ser igual ou superior a zero."
                );
            }

            if (hasEgpRiskClassification(row.label())) {
                String riskLevel =
                        row.riskLevel() == null
                                ? ""
                                : row.riskLevel()
                                .trim()
                                .toUpperCase();

                if (
                        !List.of(
                                "LOW",
                                "MEDIUM",
                                "HIGH"
                        ).contains(riskLevel)
                ) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Selecione o risco de '" +
                                    row.label() +
                                    "'."
                    );
                }
            }
        }
    }

    @PostMapping(
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Transactional
    public ResponseEntity<PatientProfileResponse> createPatient(
            @RequestBody CreatePatientRequest request,
            Authentication authentication
    ) {
        validateCreatePatient(request);

        Patient patient = Patient.builder()
                .fullName(request.fullName().trim())
                .birthDate(request.birthDate())
                .gender(request.gender())
                .diagnosisType(request.diagnosisType())
                .phone(request.phone())
                .email(request.email())
                .address(request.address())
                .education(request.education())
                .profession(request.profession())
                .sessionType(request.sessionType())
                .informalCaregiverName(request.informalCaregiverName())
                .informalCaregiverPhone(cleanOptional(request.informalCaregiverPhone()))
                .informalCaregiverEmail(cleanOptional(request.informalCaregiverEmail()))
                .notes(request.notes())
                .avatar(
                        cleanAvatar(
                                request.avatar()
                        )
                )
                .build();

        Patient savedPatient = patientRepository.save(patient);
        associateFormalCreator(
                savedPatient,
                authentication
        );

        Assessment assessment = Assessment.builder()
                .patient(savedPatient)
                .assessmentDate(request.assessmentDate())
                .notes("Avaliação EGP criada manualmente.")
                .build();

        Assessment savedAssessment = assessmentRepository.save(assessment);

        List<DomainScore> scores = request.egpScores().stream()
                .map(row -> DomainScore.builder()
                        .assessment(savedAssessment)
                        .domain(row.domain())
                        .score(row.score())
                        .normalizedScore(row.normalizedScore())
                        .riskLevel(
                                riskLevelForStorage(
                                        row.domain(),
                                        row.riskLevel()
                                )
                        )
                        .displayOrder(row.displayOrder())
                        .build())
                .toList();

        updateEgpSummaryScores(scores);
        domainScoreRepository.saveAll(scores);

        return ResponseEntity.ok(
                getPatient(
                        savedPatient.getId(),
                        authentication
                )
        );
    }

    private void validateCreatePatient(CreatePatientRequest request) {
        if (request.fullName() == null || request.fullName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome é obrigatório.");
        }

        if (request.birthDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data de nascimento é obrigatória.");
        }

        if (request.assessmentDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data da avaliação EGP é obrigatória.");
        }

        if (request.egpScores() == null || request.egpScores().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados EGP são obrigatórios.");
        }

        for (CreatePatientRequest.EgpScoreRequest row : request.egpScores()) {
            if (row.domain() == null || row.domain().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Domínio EGP é obrigatório.");
            }

            if (row.score() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PD do domínio " + row.domain() + " é obrigatório.");
            }

            if (
                    !isAutoCalculatedEgpNr(row.domain()) &&
                            row.normalizedScore() == null
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "NR do domínio " +
                                row.domain() +
                                " é obrigatório."
                );
            }
        }
    }

    private void validateUpdatePatient(
            UpdatePatientRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Os dados do utente são obrigatórios."
            );
        }

        requireText(
                request.fullName(),
                "Nome é obrigatório."
        );

        if (request.birthDate() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Data de nascimento é obrigatória."
            );
        }

        if (request.birthDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A data de nascimento não pode ser futura."
            );
        }

        requireText(
                request.gender(),
                "Sexo é obrigatório."
        );

        requireText(
                request.diagnosisType(),
                "Diagnóstico é obrigatório."
        );

        requireText(
                request.address(),
                "Morada é obrigatória."
        );

        requireText(
                request.education(),
                "Escolaridade é obrigatória."
        );

        requireText(
                request.profession(),
                "Profissão é obrigatória."
        );

        requireText(
                request.sessionType(),
                "Sessão é obrigatória."
        );

        requireText(
                request.informalCaregiverName(),
                "Nome do cuidador é obrigatório."
        );

        if (
                request.informalCaregiverEmail() != null &&
                        !request.informalCaregiverEmail().isBlank() &&
                        !isValidEmail(
                                request.informalCaregiverEmail()
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email do cuidador inválido."
            );
        }

        if (
                !isValidEmail(
                        request.informalCaregiverEmail()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email do cuidador inválido."
            );
        }
    }

    private void requireText(
            String value,
            String message
    ) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }
    }

    private boolean isValidEmail(
            String value
    ) {
        return value != null &&
                value.trim().matches(
                        "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
                );
    }

    private String cleanOptional(
            String value
    ) {
        return value == null
                ? ""
                : value.trim();
    }

    private void associateFormalCreator(
            Patient patient,
            Authentication authentication
    ) {
        if (authentication == null) {
            return;
        }

        boolean isFormalCaregiver =
                authentication
                        .getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "FORMAL_CAREGIVER".equals(
                                        authority.getAuthority()
                                )
                        );

        /*
         * Se foi o administrador que criou,
         * não fazemos uma associação automática.
         */
        if (!isFormalCaregiver) {
            return;
        }

        User formalCaregiver =
                userRepository
                        .findByEmailIgnoreCase(
                                authentication.getName()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Profissional de saúde não encontrado."
                                )
                        );

        PatientCaregiver association =
                PatientCaregiver.builder()
                        .patient(patient)
                        .user(formalCaregiver)
                        .relationshipType(
                                CaregiverRelationshipType.FORMAL
                        )
                        .build();

        patientCaregiverRepository.save(
                association
        );
    }

    private RiskLevel parseRiskLevel(String value) {
        if (value == null || value.isBlank()) {
            return RiskLevel.LOW;
        }

        return switch (value.toUpperCase()) {
            case "HIGH", "ALTO", "ELEVADO" -> RiskLevel.HIGH;
            case "MEDIUM", "MEDIO", "MÉDIO" -> RiskLevel.MEDIUM;
            default -> RiskLevel.LOW;
        };
    }

    private String cleanAvatar(
            String avatar
    ) {
        if (
                avatar == null ||
                        avatar.isBlank() ||
                        "/icons/generic_user.svg".equals(
                                avatar.trim()
                        )
        ) {
            return null;
        }

        String trimmedAvatar =
                avatar.trim();

        if (
                !trimmedAvatar.startsWith(
                        "data:image/jpeg;base64,"
                ) &&
                        !trimmedAvatar.startsWith(
                                "data:image/png;base64,"
                        ) &&
                        !trimmedAvatar.startsWith(
                                "data:image/webp;base64,"
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A fotografia selecionada não é válida."
            );
        }

        if (trimmedAvatar.length() > 1_500_000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A fotografia selecionada é demasiado grande."
            );
        }

        return trimmedAvatar;
    }

    private void updateEgpSummaryScores(
            List<DomainScore> scores
    ) {
        Map<String, BigDecimal> scoresByDomain =
                scores.stream()
                        .collect(
                                Collectors.toMap(
                                        DomainScore::getDomain,
                                        DomainScore::getScore,
                                        (first, second) -> first
                                )
                        );

        Map<String, BigDecimal> normalizedScoresByDomain =
                scores.stream()
                        .filter(
                                score ->
                                        score.getNormalizedScore() != null
                        )
                        .collect(
                                Collectors.toMap(
                                        DomainScore::getDomain,
                                        DomainScore::getNormalizedScore,
                                        (first, second) -> first
                                )
                        );

        BigDecimal physicalConstraints =
                sumScores(
                        scoresByDomain,
                        PHYSICAL_CONSTRAINT_DOMAINS
                );

        BigDecimal motorPrevalence =
                sumScores(
                        scoresByDomain,
                        MOTOR_PREVALENCE_DOMAINS
                );

        BigDecimal cognitivePrevalence =
                sumScores(
                        scoresByDomain,
                        COGNITIVE_PREVALENCE_DOMAINS
                );

        BigDecimal physicalConstraintsNr =
                averageScores(
                        normalizedScoresByDomain,
                        PHYSICAL_CONSTRAINT_DOMAINS
                );

        BigDecimal motorPrevalenceNr =
                averageScores(
                        normalizedScoresByDomain,
                        MOTOR_PREVALENCE_DOMAINS
                );

        BigDecimal cognitivePrevalenceNr =
                averageScores(
                        normalizedScoresByDomain,
                        COGNITIVE_PREVALENCE_DOMAINS
                );

        BigDecimal totalNr = averageIfComplete(
                physicalConstraintsNr,
                motorPrevalenceNr,
                cognitivePrevalenceNr
        );

        BigDecimal total =
                physicalConstraints
                        .add(motorPrevalence)
                        .add(cognitivePrevalence);

        for (DomainScore score : scores) {
            switch (score.getDomain()) {
                case "Constrangimentos físicos" -> {
                    score.setScore(
                            physicalConstraints
                    );

                    score.setNormalizedScore(
                            physicalConstraintsNr
                    );
                }

                case "Prevalência motora" -> {
                    score.setScore(
                            motorPrevalence
                    );

                    score.setNormalizedScore(
                            motorPrevalenceNr
                    );
                }

                case "Prevalência cognitiva" -> {
                    score.setScore(
                            cognitivePrevalence
                    );

                    score.setNormalizedScore(
                            cognitivePrevalenceNr
                    );
                }

                case "Total" -> {
                    score.setScore(total);
                    score.setNormalizedScore(totalNr);
                }
                default -> {
                    /*
                     * Os restantes valores já foram atualizados.
                     */
                }
            }
        }
    }

}