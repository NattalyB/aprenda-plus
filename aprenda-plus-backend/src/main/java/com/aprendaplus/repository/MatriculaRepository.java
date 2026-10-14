package com.aprendaplus.repository;

import com.aprendaplus.entity.Matricula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatriculaRepository extends JpaRepository<Matricula, Integer> {

    // Matrícula de um aluno numa turma (no máximo uma)
    Optional<Matricula> findFirstByAluno_IdAlunoAndTurma_IdTurma(Integer idAluno, Integer idTurma);

    // Turmas do aluno (sala de aula)
    List<Matricula> findByAluno_IdAluno(Integer idAluno);

    // Alunos de uma turma (andamento)
    List<Matricula> findByTurma_IdTurma(Integer idTurma);
}
