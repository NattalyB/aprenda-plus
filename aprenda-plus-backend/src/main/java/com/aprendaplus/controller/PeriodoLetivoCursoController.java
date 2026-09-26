package com.aprendaplus.controller;

import com.aprendaplus.entity.PeriodoLetivoCurso;
import com.aprendaplus.service.PeriodoLetivoCursoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/periodo-letivo-curso")
public class PeriodoLetivoCursoController {

    @Autowired
    private PeriodoLetivoCursoService periodoLetivoCursoService;

    @GetMapping
    public List<PeriodoLetivoCurso> listar() {
        return periodoLetivoCursoService.listarTodos();
    }

    @PostMapping
    public ResponseEntity<PeriodoLetivoCurso> criar(@RequestBody PeriodoLetivoCurso periodoLetivoCurso) {
        return ResponseEntity.ok(periodoLetivoCursoService.salvar(periodoLetivoCurso));
    }
}