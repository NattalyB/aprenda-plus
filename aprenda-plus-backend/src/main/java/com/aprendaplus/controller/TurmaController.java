package com.aprendaplus.controller;

import com.aprendaplus.entity.Turma;
import com.aprendaplus.service.TurmaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/turmas")
public class TurmaController {

    @Autowired
    private TurmaService turmaService;

    @GetMapping
    public List<Turma> listar() {
        return turmaService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Turma> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(turmaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Turma> criar(@RequestBody Turma turma) {
        return ResponseEntity.ok(turmaService.salvar(turma));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Turma> atualizar(@PathVariable Integer id, @RequestBody Turma turma) {
        turma.setIdTurma(id);
        return ResponseEntity.ok(turmaService.salvar(turma));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        turmaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}