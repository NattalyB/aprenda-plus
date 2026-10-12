package com.aprendaplus.repository;

import com.aprendaplus.entity.Turma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TurmaRepository extends JpaRepository<Turma, Integer> {

    // Turmas de um curso
    List<Turma> findByCurso_IdCursoOrderByNomeAsc(Integer idCurso);
}
