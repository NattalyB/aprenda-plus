package com.aprendaplus.controller;

import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.service.CursoProfessorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/curso-professor")
public class CursoProfessorController {

    @Autowired
    private CursoProfessorService cursoProfessorService;

    @GetMapping
    public List<CursoProfessor> listar() {
        return cursoProfessorService.listarTodos();
    }

    @PostMapping
    public ResponseEntity<CursoProfessor> criar(@RequestBody CursoProfessor cursoProfessor) {
        return ResponseEntity.ok(cursoProfessorService.salvar(cursoProfessor));
    }
}