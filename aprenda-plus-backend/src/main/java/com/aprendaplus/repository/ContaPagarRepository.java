package com.aprendaplus.repository;

import com.aprendaplus.entity.ContaPagar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContaPagarRepository extends JpaRepository<ContaPagar, Integer> {

    // Pagamentos de hora-aula de um professor (o mais recente primeiro)
    List<ContaPagar> findByProfessorIdOrderByReferenciaDesc(Integer professorId);

    // Pagamentos de hora-aula de um mês ("2026-10")
    List<ContaPagar> findByReferencia(String referencia);
}
