package com.aprendaplus.repository;

import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.entity.DisciplinaProfessorId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisciplinaProfessorRepository extends JpaRepository<DisciplinaProfessor, DisciplinaProfessorId> {
}