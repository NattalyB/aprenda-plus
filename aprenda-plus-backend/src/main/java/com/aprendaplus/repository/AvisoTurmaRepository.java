package com.aprendaplus.repository;

import com.aprendaplus.entity.AvisoTurma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvisoTurmaRepository extends JpaRepository<AvisoTurma, Integer> {

    // Fixados primeiro, depois os mais novos
    List<AvisoTurma> findByTurma_IdTurmaOrderByFixadoDescCriadoEmDesc(Integer idTurma);
}
