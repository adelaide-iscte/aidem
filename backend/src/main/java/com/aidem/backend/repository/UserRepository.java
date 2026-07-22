package com.aidem.backend.repository;

import com.aidem.backend.model.User;
import com.aidem.backend.model.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(
            String email,
            Long id
    );

    List<User> findByRoleInOrderByFullNameAsc(
            Collection<UserRole> roles
    );

    List<User> findByActiveTrueAndIdNotOrderByFullNameAsc(
            Long id
    );
}