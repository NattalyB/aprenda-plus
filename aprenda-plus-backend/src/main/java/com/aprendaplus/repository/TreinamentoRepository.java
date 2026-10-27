package com.aprendaplus.repository;

import com.aprendaplus.entity.Treinamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreinamentoRepository extends JpaRepository<Treinamento, Integer> {

    List<Treinamento> findAllByOrderByOrdemAscIdTreinamentoAsc();
}
