package com.aprendaplus.controller;

import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.service.TurmaProfessorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/turma-professor")
public class TurmaProfessorController {

    @Autowired
    private TurmaProfessorService turmaProfessorService;

    @GetMapping
    public List<TurmaProfessor> listar() {
        return turmaProfessorService.listarTodos();
    }

    @PostMapping
    public ResponseEntity<TurmaProfessor> criar(@RequestBody TurmaProfessor turmaProfessor) {
        return ResponseEntity.ok(turmaProfessorService.salvar(turmaProfessor));
    }
}