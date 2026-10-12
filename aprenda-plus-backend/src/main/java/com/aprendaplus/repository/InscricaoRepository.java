package com.aprendaplus.repository;

import com.aprendaplus.entity.Inscricao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InscricaoRepository extends JpaRepository<Inscricao, Integer> {

    // Inscrições de um aluno (área "Minhas inscrições")
    List<Inscricao> findByAluno_IdAlunoOrderByIdInscricaoDesc(Integer idAluno);

    // Quantas inscrições ocupam vaga na turma (as canceladas liberam a vaga)
    long countByTurma_IdTurmaAndStatusNot(Integer idTurma, String status);
}
