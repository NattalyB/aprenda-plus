package com.aprendaplus.repository;

import com.aprendaplus.entity.Aluno;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlunoRepository extends JpaRepository<Aluno, Integer> {
    Aluno findByEmail(String email);
}