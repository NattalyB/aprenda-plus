package com.aprendaplus.controller;

import com.aprendaplus.entity.Matricula;
import com.aprendaplus.service.MatriculaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/matriculas")
public class MatriculaController {

    @Autowired
    private MatriculaService matriculaService;

    @GetMapping
    public List<Matricula> listar() {
        return matriculaService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Matricula> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(matriculaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Matricula> criar(@RequestBody Matricula matricula) {
        return ResponseEntity.ok(matriculaService.salvar(matricula));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Matricula> atualizar(@PathVariable Integer id, @RequestBody Matricula matricula) {
        matricula.setIdMatricula(id);
        return ResponseEntity.ok(matriculaService.salvar(matricula));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        matriculaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}