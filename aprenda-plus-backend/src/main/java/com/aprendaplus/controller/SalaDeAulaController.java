package com.aprendaplus.controller;

import com.aprendaplus.service.SalaDeAulaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Sala de aula EAD do aluno logado. A matrícula na turma é conferida no service.
@RestController
@RequestMapping("/sala")
public class SalaDeAulaController {

    @Autowired
    private SalaDeAulaService salaDeAulaService;

    @GetMapping("/minhas-turmas")
    public ResponseEntity<?> minhasTurmas(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                          @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (naoEhAluno(usuarioId, papel)) {
            return naoAutorizado();
        }
        return ResponseEntity.ok(salaDeAulaService.minhasTurmas(usuarioId));
    }

    @GetMapping("/turmas/{idTurma}")
    public ResponseEntity<?> sala(@PathVariable Integer idTurma,
                                  @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                  @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (naoEhAluno(usuarioId, papel)) {
            return naoAutorizado();
        }
        return ResponseEntity.ok(salaDeAulaService.sala(usuarioId, idTurma));
    }

    @PutMapping("/aulas/{idAula}/concluida")
    public ResponseEntity<?> concluir(@PathVariable Integer idAula,
                                      @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                      @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (naoEhAluno(usuarioId, papel)) {
            return naoAutorizado();
        }
        return ResponseEntity.ok(salaDeAulaService.marcarAula(usuarioId, idAula, true));
    }

    @DeleteMapping("/aulas/{idAula}/concluida")
    public ResponseEntity<?> desmarcar(@PathVariable Integer idAula,
                                       @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                       @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (naoEhAluno(usuarioId, papel)) {
            return naoAutorizado();
        }
        return ResponseEntity.ok(salaDeAulaService.marcarAula(usuarioId, idAula, false));
    }

    @PostMapping("/turmas/{idTurma}/certificado")
    public ResponseEntity<?> certificado(@PathVariable Integer idTurma,
                                         @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                         @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (naoEhAluno(usuarioId, papel)) {
            return naoAutorizado();
        }
        return ResponseEntity.ok(salaDeAulaService.emitirCertificado(usuarioId, idTurma));
    }

    private static boolean naoEhAluno(Integer usuarioId, String papel) {
        return usuarioId == null || !"ALUNO".equals(papel);
    }

    private static ResponseEntity<?> naoAutorizado() {
        return ResponseEntity.status(401).body(Map.of("erro", "Faça login como aluno para acessar a sala de aula."));
    }
}
