package com.aprendaplus.controller;

import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.AvisoForm;
import com.aprendaplus.service.ConteudoEadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

// Painel: sala de aula EAD de cada turma (módulo "Sala de aula").
// Cada alteração devolve a sala inteira atualizada, para a tela redesenhar de uma vez.
@RestController
@RequestMapping("/planos-de-aula")
public class ConteudoEadController {

    @Autowired
    private ConteudoEadService conteudoEadService;

    @GetMapping("/resumo")
    public ResponseEntity<?> resumo() {
        return ResponseEntity.ok(conteudoEadService.quantidadeDeAulasPorTurma());
    }

    @GetMapping("/turma/{idTurma}")
    public ResponseEntity<?> planoDaTurma(@PathVariable Integer idTurma) {
        return ResponseEntity.ok(conteudoEadService.planoDaTurma(idTurma));
    }

    @GetMapping("/turma/{idTurma}/andamento")
    public ResponseEntity<?> andamento(@PathVariable Integer idTurma) {
        return ResponseEntity.ok(conteudoEadService.andamento(idTurma));
    }

    // Corpo: { "idProfessor": 3 }
    @PutMapping("/turma/{idTurma}/professor")
    public ResponseEntity<?> professor(@PathVariable Integer idTurma, @RequestBody Map<String, Integer> corpo) {
        return ResponseEntity.ok(conteudoEadService.definirProfessor(idTurma, corpo == null ? null : corpo.get("idProfessor")));
    }

    @PostMapping("/turma/{idTurma}/aulas")
    public ResponseEntity<?> adicionarAula(@PathVariable Integer idTurma, @RequestBody AulaForm aula) {
        return ResponseEntity.ok(conteudoEadService.adicionarAula(idTurma, aula));
    }

    @PutMapping("/aulas/{idAula}")
    public ResponseEntity<?> atualizarAula(@PathVariable Integer idAula, @RequestBody AulaForm aula) {
        return ResponseEntity.ok(conteudoEadService.atualizarAula(idAula, aula));
    }

    @DeleteMapping("/aulas/{idAula}")
    public ResponseEntity<?> excluirAula(@PathVariable Integer idAula) {
        return ResponseEntity.ok(conteudoEadService.excluirAula(idAula));
    }

    @PutMapping("/aulas/{idAula}/mover")
    public ResponseEntity<?> moverAula(@PathVariable Integer idAula, @RequestParam String direcao) {
        return ResponseEntity.ok(conteudoEadService.moverAula(idAula, direcao));
    }

    // Copia as aulas de outra turma: POST /planos-de-aula/turma/5/copiar?origem=2
    @PostMapping("/turma/{idTurma}/copiar")
    public ResponseEntity<?> copiar(@PathVariable Integer idTurma, @RequestParam Integer origem) {
        int copiadas = conteudoEadService.copiarAulas(idTurma, origem);
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("copiadas", copiadas);
        resposta.put("plano", conteudoEadService.planoDaTurma(idTurma));
        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/turma/{idTurma}/avisos")
    public ResponseEntity<?> publicarAviso(@PathVariable Integer idTurma, @RequestBody AvisoForm aviso,
                                           @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        return ResponseEntity.ok(conteudoEadService.publicarAviso(idTurma, aviso, usuarioId));
    }

    @DeleteMapping("/avisos/{idAviso}")
    public ResponseEntity<?> excluirAviso(@PathVariable Integer idAviso) {
        return ResponseEntity.ok(conteudoEadService.excluirAviso(idAviso));
    }
}
