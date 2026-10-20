package com.aprendaplus.controller;

import com.aprendaplus.dto.ResultadoImportacao;
import com.aprendaplus.service.ImportacaoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Importação por planilha. Cada rota fica dentro do módulo do cadastro (/alunos, /cursos...),
// então só quem pode criar naquele módulo consegue importar (conferido no AuthInterceptor).
// Corpo: { "linhas": [ { "Nome completo": "Ana", "E-mail": "ana@email.com", ... } ] }
// ?confirmar=false (padrão) só confere; ?confirmar=true grava as linhas sem erro.
@RestController
public class ImportacaoController {

    @Autowired
    private ImportacaoService importacaoService;

    public record Planilha(List<Map<String, String>> linhas) {
    }

    @PostMapping("/alunos/importacao")
    public ResponseEntity<ResultadoImportacao> alunos(@RequestBody Planilha planilha,
                                                      @RequestParam(defaultValue = "false") boolean confirmar) {
        return ResponseEntity.ok(importacaoService.alunos(linhas(planilha), confirmar));
    }

    @PostMapping("/professores/importacao")
    public ResponseEntity<ResultadoImportacao> professores(@RequestBody Planilha planilha,
                                                           @RequestParam(defaultValue = "false") boolean confirmar) {
        return ResponseEntity.ok(importacaoService.professores(linhas(planilha), confirmar));
    }

    @PostMapping("/cursos/importacao")
    public ResponseEntity<ResultadoImportacao> cursos(@RequestBody Planilha planilha,
                                                      @RequestParam(defaultValue = "false") boolean confirmar) {
        return ResponseEntity.ok(importacaoService.cursos(linhas(planilha), confirmar));
    }

    @PostMapping("/disciplinas/importacao")
    public ResponseEntity<ResultadoImportacao> disciplinas(@RequestBody Planilha planilha,
                                                           @RequestParam(defaultValue = "false") boolean confirmar) {
        return ResponseEntity.ok(importacaoService.disciplinas(linhas(planilha), confirmar));
    }

    @PostMapping("/planos-de-aula/turma/{idTurma}/aulas/importacao")
    public ResponseEntity<ResultadoImportacao> aulas(@PathVariable Integer idTurma, @RequestBody Planilha planilha,
                                                     @RequestParam(defaultValue = "false") boolean confirmar) {
        return ResponseEntity.ok(importacaoService.aulas(idTurma, linhas(planilha), confirmar));
    }

    private static List<Map<String, String>> linhas(Planilha planilha) {
        return planilha == null ? null : planilha.linhas();
    }
}
