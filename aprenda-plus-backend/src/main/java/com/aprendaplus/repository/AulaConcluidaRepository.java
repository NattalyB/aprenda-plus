package com.aprendaplus.repository;

import com.aprendaplus.entity.AulaConcluida;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AulaConcluidaRepository extends JpaRepository<AulaConcluida, Integer> {

    Optional<AulaConcluida> findFirstByAluno_IdAlunoAndAula_IdAula(Integer idAluno, Integer idAula);

    // Aulas concluídas por um aluno numa sala (plano)
    List<AulaConcluida> findByAluno_IdAlunoAndAula_Plano_IdPlano(Integer idAluno, Integer idPlano);

    // Todas as conclusões de uma sala (para o andamento da turma)
    List<AulaConcluida> findByAula_Plano_IdPlano(Integer idPlano);
}
