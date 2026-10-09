package com.aprendaplus.controller;

import com.aprendaplus.entity.Aula;
import com.aprendaplus.service.AulaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/aulas")
public class AulaController {

    @Autowired
    private AulaService aulaService;

    @GetMapping
    public List<Aula> listar() {
        return aulaService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Aula> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(aulaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Aula> criar(@RequestBody Aula aula) {
        return ResponseEntity.ok(aulaService.salvar(aula));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Aula> atualizar(@PathVariable Integer id, @RequestBody Aula aula) {
        aula.setIdAula(id);
        return ResponseEntity.ok(aulaService.salvar(aula));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        aulaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}