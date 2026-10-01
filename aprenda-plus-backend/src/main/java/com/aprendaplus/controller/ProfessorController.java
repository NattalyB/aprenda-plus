package com.aprendaplus.controller;

import com.aprendaplus.entity.Professor;
import com.aprendaplus.service.ProfessorService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/professores")
public class ProfessorController {

    @Autowired
    private ProfessorService professorService;

    @GetMapping
    public List<Professor> listar() {
        return professorService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Professor> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(professorService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Professor> criar(@Valid @RequestBody Professor professor) {
        return ResponseEntity.ok(professorService.salvar(professor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Professor> atualizar(@PathVariable Integer id, @Valid @RequestBody Professor professor) {
        professor.setIdProfessor(id);
        return ResponseEntity.ok(professorService.salvar(professor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        professorService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}