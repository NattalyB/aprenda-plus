package com.aprendaplus.service;

import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.repository.CarrinhoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CarrinhoService {

    @Autowired
    private CarrinhoRepository carrinhoRepository;

    public List<Carrinho> listarTodos() {
        return carrinhoRepository.findAll();
    }

    public Carrinho buscarPorId(Integer id) {
        return carrinhoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Carrinho não encontrado com id: " + id));
    }

    public Carrinho salvar(Carrinho carrinho) {
        return carrinhoRepository.save(carrinho);
    }

    public void deletar(Integer id) {
        carrinhoRepository.deleteById(id);
    }
}