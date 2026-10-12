package com.aprendaplus.repository;

import com.aprendaplus.entity.Matricula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MatriculaRepository extends JpaRepository<Matricula, Integer> {

    // Matrícula de um aluno numa turma (no máximo uma)
    Optional<Matricula> findFirstByAluno_IdAlunoAndTurma_IdTurma(Integer idAluno, Integer idTurma);
}
