package com.aidem.backend.controller;

import com.aidem.backend.dto.patient.EgpAssessmentResponse;
import com.aidem.backend.dto.patient.EgpRowResponse;
import com.aidem.backend.dto.patient.PatientListResponse;
import com.aidem.backend.dto.patient.PatientProfileResponse;
import com.aidem.backend.model.Patient;
import com.aidem.backend.model.SessionHistory;
import com.aidem.backend.repository.AssessmentRepository;
import com.aidem.backend.repository.DomainScoreRepository;
import com.aidem.backend.repository.PatientRepository;
import com.aidem.backend.repository.SessionHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;


import com.aidem.backend.dto.patient.CreatePatientRequest;
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

    public PatientController(
            PatientRepository patientRepository,
            SessionHistoryRepository sessionHistoryRepository,
            DomainScoreRepository domainScoreRepository,
            AssessmentRepository assessmentRepository
    ) {
        this.patientRepository = patientRepository;
        this.sessionHistoryRepository = sessionHistoryRepository;
        this.domainScoreRepository = domainScoreRepository;
        this.assessmentRepository = assessmentRepository;
    }

    @Transactional(readOnly = true)
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<PatientListResponse>> getAllPatients() {
        log.info("GET /api/patients START");

        List<Patient> patients = patientRepository.findAll();
        log.info("GET /api/patients DB returned {} rows", patients.size());

        List<PatientListResponse> response = patients.stream()
                .map(this::toResponse)
                .toList();

        log.info("GET /api/patients MAPPED {} rows", response.size());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public PatientProfileResponse getPatient(
            @PathVariable Long id) {

        Patient patient = patientRepository.findById(id)
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

    @GetMapping("/{id}/session-history")
    public List<SessionHistory> getSessionHistory(@PathVariable Long id) {
        return sessionHistoryRepository.findByPatientIdOrderBySessionDateDesc(id);
    }

    @GetMapping("/{id}/egp/latest")
    @Transactional(readOnly = true)
    public ResponseEntity<EgpAssessmentResponse> getLatestEgp(@PathVariable Long id) {
        if (!patientRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        var assessmentOpt = assessmentRepository
                .findFirstByPatient_IdOrderByAssessmentDateDescIdDesc(id);

        if (assessmentOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        var assessment = assessmentOpt.get();

        var rows = domainScoreRepository
                .findByAssessment_IdOrderByDisplayOrderAscIdAsc(assessment.getId())
                .stream()
                .map(score -> new EgpRowResponse(
                        score.getDomain(),
                        score.getScore(),
                        score.getNormalizedScore() != null ? score.getNormalizedScore() : score.getScore(),
                        score.getRiskLevel().name(),
                        score.getDisplayOrder(),
                        "Total".equalsIgnoreCase(score.getDomain())
                ))
                .toList();

        return ResponseEntity.ok(
                new EgpAssessmentResponse(
                        assessment.getId(),
                        assessment.getAssessmentDate(),
                        rows
                )
        );
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public ResponseEntity<PatientProfileResponse> createPatient(@RequestBody CreatePatientRequest request) {
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

        return ResponseEntity.ok(getPatient(savedPatient.getId()));
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