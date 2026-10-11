package com.aprendaplus.repository;

import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.entity.DisciplinaProfessorId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisciplinaProfessorRepository extends JpaRepository<DisciplinaProfessor, DisciplinaProfessorId> {

    // Todas as disciplinas que um professor leciona (busca pelo professorId da chave composta)
    List<DisciplinaProfessor> findByIdProfessorId(Integer professorId);
}
