package com.aprendaplus.repository;

import com.aprendaplus.entity.Aluno;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlunoRepository extends JpaRepository<Aluno, Integer> {
    Aluno findByEmail(String email);

    // Usados na importação por planilha (não deixa cadastrar o mesmo aluno duas vezes)
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByCpf(String cpf);
}