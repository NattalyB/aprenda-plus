package com.aprendaplus.repository;

import com.aprendaplus.entity.Disciplina;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisciplinaRepository extends JpaRepository<Disciplina, Integer> {
}