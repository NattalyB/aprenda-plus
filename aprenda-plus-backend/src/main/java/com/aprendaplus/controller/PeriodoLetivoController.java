package com.aprendaplus.controller;

import com.aprendaplus.entity.PeriodoLetivo;
import com.aprendaplus.service.PeriodoLetivoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/periodos-letivos")
public class PeriodoLetivoController {

    @Autowired
    private PeriodoLetivoService periodoLetivoService;

    @GetMapping
    public List<PeriodoLetivo> listar() {
        return periodoLetivoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PeriodoLetivo> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(periodoLetivoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<PeriodoLetivo> criar(@RequestBody PeriodoLetivo periodoLetivo) {
        return ResponseEntity.ok(periodoLetivoService.salvar(periodoLetivo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PeriodoLetivo> atualizar(@PathVariable Integer id, @RequestBody PeriodoLetivo periodoLetivo) {
        periodoLetivo.setIdPeriodoLetivo(id);
        return ResponseEntity.ok(periodoLetivoService.salvar(periodoLetivo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        periodoLetivoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}