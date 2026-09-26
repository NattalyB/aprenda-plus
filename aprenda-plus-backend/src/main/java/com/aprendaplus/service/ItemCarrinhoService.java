package com.aprendaplus.service;

import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ItemCarrinhoService {

    @Autowired
    private ItemCarrinhoRepository itemCarrinhoRepository;

    public List<ItemCarrinho> listarTodos() {
        return itemCarrinhoRepository.findAll();
    }

    public ItemCarrinho buscarPorId(Integer id) {
        return itemCarrinhoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item de carrinho não encontrado com id: " + id));
    }

    public ItemCarrinho salvar(ItemCarrinho itemCarrinho) {
        return itemCarrinhoRepository.save(itemCarrinho);
    }

    public void deletar(Integer id) {
        itemCarrinhoRepository.deleteById(id);
    }
}