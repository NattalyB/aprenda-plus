package com.aprendaplus.controller;

import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.service.DisciplinaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/disciplinas")
public class DisciplinaController {

    @Autowired
    private DisciplinaService disciplinaService;

    @GetMapping
    public List<Disciplina> listar() {
        return disciplinaService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Disciplina> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(disciplinaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Disciplina> criar(@RequestBody Disciplina disciplina) {
        return ResponseEntity.ok(disciplinaService.salvar(disciplina));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Disciplina> atualizar(@PathVariable Integer id, @RequestBody Disciplina disciplina) {
        disciplina.setIdDisciplina(id);
        return ResponseEntity.ok(disciplinaService.salvar(disciplina));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        disciplinaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}