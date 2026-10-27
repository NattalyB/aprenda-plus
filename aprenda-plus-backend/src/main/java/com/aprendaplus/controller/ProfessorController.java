package com.aprendaplus.controller;

import com.aprendaplus.dto.VinculosProfessor;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.service.ProfessorService;
import com.aprendaplus.service.RecuperacaoSenhaService;
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

    @Autowired
    private RecuperacaoSenhaService recuperacaoSenhaService;

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

    // Envia ao professor o link para criar a senha do Portal do Professor.
    // Devolve o link também, para a secretaria copiar caso o e-mail não chegue.
    @PostMapping("/{id}/acesso")
    public ResponseEntity<?> enviarAcesso(@PathVariable Integer id) {
        return ResponseEntity.ok(recuperacaoSenhaService.enviarAcessoProfessor(id));
    }

    // Cursos e disciplinas que o professor leciona
    @GetMapping("/{id}/vinculos")
    public ResponseEntity<VinculosProfessor> buscarVinculos(@PathVariable Integer id) {
        return ResponseEntity.ok(professorService.buscarVinculos(id));
    }

    @PutMapping("/{id}/vinculos")
    public ResponseEntity<VinculosProfessor> salvarVinculos(@PathVariable Integer id,
                                                            @RequestBody VinculosProfessor vinculos) {
        return ResponseEntity.ok(professorService.salvarVinculos(id, vinculos));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        professorService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}