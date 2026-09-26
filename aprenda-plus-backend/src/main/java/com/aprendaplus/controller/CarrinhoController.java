package com.aprendaplus.controller;

import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.service.CarrinhoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/carrinhos")
public class CarrinhoController {

    @Autowired
    private CarrinhoService carrinhoService;

    @GetMapping
    public List<Carrinho> listar() {
        return carrinhoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Carrinho> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(carrinhoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Carrinho> criar(@RequestBody Carrinho carrinho) {
        return ResponseEntity.ok(carrinhoService.salvar(carrinho));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        carrinhoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}