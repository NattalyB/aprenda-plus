package com.aprendaplus.controller;

import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.AvisoForm;
import com.aprendaplus.service.ConteudoEadService;
import com.aprendaplus.service.DocenteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.function.Supplier;

// Portal do Professor (login com papel PROFESSOR, conferido no AuthInterceptor).
// Toda rota confere se a turma é do professor logado antes de fazer qualquer coisa.
@RestController
@RequestMapping("/docente")
public class DocenteController {

    @Autowired
    private DocenteService docenteService;

    @Autowired
    private ConteudoEadService conteudoEadService;

    @GetMapping("/eu")
    public ResponseEntity<?> eu(@RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        if (professor == null) return naoLogado();
        return ResponseEntity.ok(docenteService.meusDados(professor));
    }

    @GetMapping("/turmas")
    public ResponseEntity<?> turmas(@RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        if (professor == null) return naoLogado();
        return ResponseEntity.ok(docenteService.turmas(professor));
    }

    @GetMapping("/turmas/{idTurma}")
    public ResponseEntity<?> sala(@PathVariable Integer idTurma,
                                  @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, idTurma, () -> conteudoEadService.planoDaTurma(idTurma));
    }

    @GetMapping("/turmas/{idTurma}/andamento")
    public ResponseEntity<?> andamento(@PathVariable Integer idTurma,
                                       @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, idTurma, () -> conteudoEadService.andamento(idTurma));
    }

    @GetMapping("/turmas/{idTurma}/disciplinas")
    public ResponseEntity<?> disciplinas(@PathVariable Integer idTurma,
                                         @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, idTurma, () -> docenteService.disciplinasDaTurma(idTurma));
    }

    // ===== Aulas =====

    @PostMapping("/turmas/{idTurma}/aulas")
    public ResponseEntity<?> novaAula(@PathVariable Integer idTurma, @RequestBody AulaForm aula,
                                      @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, idTurma, () -> conteudoEadService.adicionarAula(idTurma, aula));
    }

    @PutMapping("/aulas/{idAula}")
    public ResponseEntity<?> editarAula(@PathVariable Integer idAula, @RequestBody AulaForm aula,
                                        @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, conteudoEadService.turmaDaAula(idAula), () -> conteudoEadService.atualizarAula(idAula, aula));
    }

    @DeleteMapping("/aulas/{idAula}")
    public ResponseEntity<?> excluirAula(@PathVariable Integer idAula,
                                         @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, conteudoEadService.turmaDaAula(idAula), () -> conteudoEadService.excluirAula(idAula));
    }

    @PutMapping("/aulas/{idAula}/mover")
    public ResponseEntity<?> moverAula(@PathVariable Integer idAula, @RequestParam String direcao,
                                       @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, conteudoEadService.turmaDaAula(idAula), () -> conteudoEadService.moverAula(idAula, direcao));
    }

    // ===== Mural =====

    @PostMapping("/turmas/{idTurma}/avisos")
    public ResponseEntity<?> publicarAviso(@PathVariable Integer idTurma, @RequestBody AvisoForm aviso,
                                           @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, idTurma,
                () -> conteudoEadService.publicarAvisoDe(idTurma, aviso, docenteService.nome(professor)));
    }

    @PutMapping("/avisos/{idAviso}")
    public ResponseEntity<?> editarAviso(@PathVariable Integer idAviso, @RequestBody AvisoForm aviso,
                                         @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, conteudoEadService.turmaDoAviso(idAviso), () -> conteudoEadService.editarAviso(idAviso, aviso));
    }

    @DeleteMapping("/avisos/{idAviso}")
    public ResponseEntity<?> excluirAviso(@PathVariable Integer idAviso,
                                          @RequestAttribute(name = "usuarioId", required = false) Integer professor) {
        return seForDaTurma(professor, conteudoEadService.turmaDoAviso(idAviso), () -> conteudoEadService.excluirAviso(idAviso));
    }

    // ===== Conferência de acesso =====

    private ResponseEntity<?> seForDaTurma(Integer professor, Integer idTurma, Supplier<Object> acao) {
        if (professor == null) return naoLogado();
        if (idTurma == null) {
            return ResponseEntity.status(404).body(Map.of("mensagem", "Não encontrado."));
        }
        if (!docenteService.ehTurmaDoProfessor(professor, idTurma)) {
            return ResponseEntity.status(403).body(Map.of("mensagem", "Esta turma não é sua."));
        }
        return ResponseEntity.ok(acao.get());
    }

    private ResponseEntity<?> naoLogado() {
        return ResponseEntity.status(401).body(Map.of("mensagem", "Faça login como professor para continuar."));
    }
}
