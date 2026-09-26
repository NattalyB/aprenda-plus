package com.aprendaplus.controller;

import com.aprendaplus.entity.PlanoDeAula;
import com.aprendaplus.service.PlanoDeAulaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/planos-de-aula")
public class PlanoDeAulaController {

    @Autowired
    private PlanoDeAulaService planoDeAulaService;

    @GetMapping
    public List<PlanoDeAula> listar() {
        return planoDeAulaService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlanoDeAula> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(planoDeAulaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<PlanoDeAula> criar(@RequestBody PlanoDeAula planoDeAula) {
        return ResponseEntity.ok(planoDeAulaService.salvar(planoDeAula));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlanoDeAula> atualizar(@PathVariable Integer id, @RequestBody PlanoDeAula planoDeAula) {
        planoDeAula.setIdPlano(id);
        return ResponseEntity.ok(planoDeAulaService.salvar(planoDeAula));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        planoDeAulaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}