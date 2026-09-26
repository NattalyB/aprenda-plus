package com.aprendaplus.controller;

import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.service.DisciplinaProfessorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/disciplina-professor")
public class DisciplinaProfessorController {

    @Autowired
    private DisciplinaProfessorService disciplinaProfessorService;

    @GetMapping
    public List<DisciplinaProfessor> listar() {
        return disciplinaProfessorService.listarTodos();
    }

    @PostMapping
    public ResponseEntity<DisciplinaProfessor> criar(@RequestBody DisciplinaProfessor disciplinaProfessor) {
        return ResponseEntity.ok(disciplinaProfessorService.salvar(disciplinaProfessor));
    }
}