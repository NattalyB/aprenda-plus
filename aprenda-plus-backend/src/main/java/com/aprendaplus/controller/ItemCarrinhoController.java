package com.aprendaplus.controller;

import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.service.ItemCarrinhoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/itens-carrinho")
public class ItemCarrinhoController {

    @Autowired
    private ItemCarrinhoService itemCarrinhoService;

    @GetMapping
    public List<ItemCarrinho> listar() {
        return itemCarrinhoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemCarrinho> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(itemCarrinhoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<ItemCarrinho> criar(@RequestBody ItemCarrinho itemCarrinho) {
        return ResponseEntity.ok(itemCarrinhoService.salvar(itemCarrinho));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        itemCarrinhoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}