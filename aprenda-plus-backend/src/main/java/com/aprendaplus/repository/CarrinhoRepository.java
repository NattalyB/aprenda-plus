package com.aprendaplus.repository;

import com.aprendaplus.entity.Carrinho;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CarrinhoRepository extends JpaRepository<Carrinho, Integer> {

    // Busca o carrinho de um aluno pelo id do aluno
    Optional<Carrinho> findFirstByAluno_IdAluno(Integer idAluno);
}