package com.aprendaplus.repository;

import com.aprendaplus.entity.Inscricao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InscricaoRepository extends JpaRepository<Inscricao, Integer> {
}