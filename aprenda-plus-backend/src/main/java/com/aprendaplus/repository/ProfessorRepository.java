package com.aprendaplus.repository;

import com.aprendaplus.entity.Professor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessorRepository extends JpaRepository<Professor, Integer> {

    // Usados na importação por planilha (não deixa cadastrar o mesmo professor duas vezes)
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByCpf(String cpf);
}