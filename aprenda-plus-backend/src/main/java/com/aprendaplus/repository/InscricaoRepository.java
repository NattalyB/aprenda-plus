package com.aprendaplus.repository;

import com.aprendaplus.entity.Inscricao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InscricaoRepository extends JpaRepository<Inscricao, Integer> {

    // Inscrições de um aluno (área "Minhas inscrições")
    List<Inscricao> findByAluno_IdAlunoOrderByIdInscricaoDesc(Integer idAluno);

    // Quantas inscrições ocupam vaga na turma
    // (canceladas e as que estão na lista de espera não ocupam)
    long countByTurma_IdTurmaAndStatusNotIn(Integer idTurma, Collection<String> status);

    // Primeira inscrição da lista de espera da turma (a mais antiga)
    Optional<Inscricao> findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(Integer idTurma, String status);
}
