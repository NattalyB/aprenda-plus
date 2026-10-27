package com.aprendaplus.controller;

import com.aprendaplus.service.AtividadeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

// Histórico de alterações do sistema.
// GET /atividades: lista com filtros (só o Master). GET /atividades/ultima: usado nos formulários (toda a equipe).
@RestController
@RequestMapping("/atividades")
public class AtividadeController {

    @Autowired
    private AtividadeService atividadeService;

    @GetMapping
    public ResponseEntity<?> buscar(@RequestParam(required = false) String modulo,
                                    @RequestParam(required = false) String tipo,
                                    @RequestParam(required = false) String acao,
                                    @RequestParam(required = false) String busca,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
                                    @RequestParam(defaultValue = "1") int pagina,
                                    @RequestParam(defaultValue = "20") int tamanho) {
        return ResponseEntity.ok(atividadeService.buscar(modulo, tipo, acao, busca, de, ate, pagina, tamanho));
    }

    // Ex.: /atividades/ultima?alvo=alunos&id=12
    @GetMapping("/ultima")
    public ResponseEntity<?> ultima(@RequestParam String alvo, @RequestParam Integer id) {
        return ResponseEntity.ok(atividadeService.ultima(alvo, id));
    }
}
