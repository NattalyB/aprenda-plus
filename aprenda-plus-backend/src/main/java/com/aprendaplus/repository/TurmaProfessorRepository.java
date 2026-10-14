package com.aprendaplus.repository;

import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.entity.TurmaProfessorId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TurmaProfessorRepository extends JpaRepository<TurmaProfessor, TurmaProfessorId> {

    // Professores ligados a uma turma (para sugerir o responsável pela sala de aula)
    List<TurmaProfessor> findByTurma_IdTurma(Integer idTurma);
}
