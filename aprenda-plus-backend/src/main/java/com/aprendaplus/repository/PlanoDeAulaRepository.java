package com.aprendaplus.repository;

import com.aprendaplus.entity.PlanoDeAula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanoDeAulaRepository extends JpaRepository<PlanoDeAula, Integer> {

    // O plano (sala de aula) de uma turma
    Optional<PlanoDeAula> findFirstByTurma_IdTurma(Integer idTurma);

    // Salas de aula em que o professor é o responsável (Portal do Professor)
    List<PlanoDeAula> findByProfessorResponsavel_IdProfessor(Integer idProfessor);
}
