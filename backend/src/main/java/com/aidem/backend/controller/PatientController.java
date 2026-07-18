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

import com.aidem.backend.service.PatientAccessService;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.Map;
import java.util.stream.Collectors;

import com.aidem.backend.model.Assessment;
import com.aidem.backend.model.DomainScore;
import com.aidem.backend.model.enums.RiskLevel;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private static final Logger log = LoggerFactory.getLogger(PatientController.class);

    private final PatientRepository patientRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final DomainScoreRepository domainScoreRepository;
    private final AssessmentRepository assessmentRepository;
    private final SessionPlanService sessionPlanService;
    private final PatientAccessService patientAccessService;
    private final UserRepository userRepository;

    private final PatientCaregiverRepository patientCaregiverRepository;
    public PatientController(
            PatientRepository patientRepository,
            SessionHistoryRepository sessionHistoryRepository,
            DomainScoreRepository domainScoreRepository,
            AssessmentRepository assessmentRepository,
            SessionPlanService sessionPlanService,
            PatientAccessService patientAccessService,
            UserRepository userRepository,
            PatientCaregiverRepository patientCaregiverRepository
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
                patient.getAvatar(),
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
                "/icons/generic_user.svg",
                age + " anos - Paciente com demência"
        );
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
                .findByAssessment_IdOrderByDisplayOrderAscIdAsc(assessment.getId());

        Map<String, BigDecimal> scoresByDomain = scores.stream()
                .collect(Collectors.toMap(
                        DomainScore::getDomain,
                        DomainScore::getScore,
                        (first, second) -> first
                ));

        BigDecimal physicalConstraints = sumScores(
                scoresByDomain,
                "Mobilização articular dos membros superiores",
                "Mobilização articular dos membros inferiores"
        );

        BigDecimal motorPrevalence = sumScores(
                scoresByDomain,
                "Equilíbrio Estático I",
                "Equilíbrio Estático II",
                "Equilíbrio Dinâmico I",
                "Equilíbrio Dinâmico II",
                "Motricidade fina dos membros inferiores"
        );

        BigDecimal cognitivePrevalence = sumScores(
                scoresByDomain,
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
        );

        BigDecimal total = physicalConstraints
                .add(motorPrevalence)
                .add(cognitivePrevalence);

        var rows = scores.stream()
                .map(score -> {
                    BigDecimal pd = switch (score.getDomain()) {
                        case "Constrangimentos físicos" -> physicalConstraints;
                        case "Prevalência motora" -> motorPrevalence;
                        case "Prevalência cognitiva" -> cognitivePrevalence;
                        case "Total" -> total;
                        default -> score.getScore();
                    };

                    return new EgpRowResponse(
                            score.getDomain(),
                            pd,
                            score.getNormalizedScore() != null
                                    ? score.getNormalizedScore()
                                    : score.getScore(),
                            score.getRiskLevel().name(),
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

    private boolean isEgpSummaryRow(String domain) {
        if (domain == null) {
            return false;
        }

        return "Constrangimentos físicos".equalsIgnoreCase(domain)
                || "Prevalência motora".equalsIgnoreCase(domain)
                || "Prevalência cognitiva".equalsIgnoreCase(domain)
                || "Total".equalsIgnoreCase(domain);
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
                .informalCaregiverPhone(request.informalCaregiverPhone())
                .informalCaregiverEmail(request.informalCaregiverEmail())
                .notes(request.notes())
                .avatar("/icons/generic_user.svg")
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
                        .riskLevel(parseRiskLevel(row.riskLevel()))
                        .displayOrder(row.displayOrder())
                        .build())
                .toList();

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

            if (row.normalizedScore() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NR do domínio " + row.domain() + " é obrigatório.");
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

        requireText(
                request.informalCaregiverPhone(),
                "Telefone do cuidador é obrigatório."
        );

        requireText(
                request.informalCaregiverEmail(),
                "Email do cuidador é obrigatório."
        );

        if (
                request.email() != null &&
                        !request.email().isBlank() &&
                        !isValidEmail(request.email())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email do utente inválido."
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

}