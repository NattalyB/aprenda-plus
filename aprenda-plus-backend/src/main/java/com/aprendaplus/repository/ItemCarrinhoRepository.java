package com.aprendaplus.repository;

import com.aprendaplus.entity.ItemCarrinho;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemCarrinhoRepository extends JpaRepository<ItemCarrinho, Integer> {

    // Lista os itens de um carrinho específico
    List<ItemCarrinho> findByCarrinho_IdCarrinho(Integer idCarrinho);
}