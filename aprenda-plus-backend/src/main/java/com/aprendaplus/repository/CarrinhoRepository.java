package com.aprendaplus.repository;

import com.aprendaplus.entity.Carrinho;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CarrinhoRepository extends JpaRepository<Carrinho, Integer> {
}