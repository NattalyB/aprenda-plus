package com.aprendaplus.repository;

import com.aprendaplus.entity.Aula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AulaRepository extends JpaRepository<Aula, Integer> {

    // Aulas de um plano, na ordem da sala de aula
    List<Aula> findByPlano_IdPlanoOrderByNumeroAulaAsc(Integer idPlano);
}
