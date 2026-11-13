package com.aprendaplus.repository;

import com.aprendaplus.entity.Aluno;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlunoRepository extends JpaRepository<Aluno, Integer> {
    Aluno findByEmail(String email);

    // Login com o Google: o e-mail do Google pode vir com letras maiúsculas/minúsculas diferentes do cadastro
    Aluno findFirstByEmailIgnoreCase(String email);

    // Usados na importação por planilha (não deixa cadastrar o mesmo aluno duas vezes)
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByCpf(String cpf);
}