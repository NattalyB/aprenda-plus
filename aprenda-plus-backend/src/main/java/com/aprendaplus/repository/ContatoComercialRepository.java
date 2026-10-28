package com.aprendaplus.repository;

import com.aprendaplus.entity.ContatoComercial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContatoComercialRepository extends JpaRepository<ContatoComercial, Integer> {

    // Mais recentes primeiro: o primeiro de cada aluno é o "último contato"
    List<ContatoComercial> findAllByOrderByQuandoDescIdContatoDesc();

    List<ContatoComercial> findByAlunoIdOrderByQuandoDescIdContatoDesc(Integer alunoId);
}
