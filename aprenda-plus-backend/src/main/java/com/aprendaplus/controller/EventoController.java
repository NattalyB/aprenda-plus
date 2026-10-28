package com.aprendaplus.controller;

import com.aprendaplus.dto.EventoForm;
import com.aprendaplus.security.JwtUtil;
import com.aprendaplus.service.EventoService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Recebe do site o que as pessoas fazem (buscas, cursos abertos, cursos postos no carrinho).
// Rota pública: visitante sem login também é contado, de forma anônima.
// Se vier o token de um aluno logado, o evento fica ligado a ele (o id vem do token, nunca do corpo).
@RestController
@RequestMapping("/eventos")
public class EventoController {

    @Autowired
    private EventoService eventoService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping
    public ResponseEntity<Void> registrar(@RequestBody EventoForm form,
                                         @RequestHeader(name = "Authorization", required = false) String autorizacao) {
        eventoService.registrar(form, alunoLogado(autorizacao));
        return ResponseEntity.noContent().build();
    }

    // Id do aluno logado, ou null (visitante, token vencido ou de outro tipo de usuário)
    private Integer alunoLogado(String autorizacao) {
        if (autorizacao == null || !autorizacao.startsWith("Bearer ")) {
            return null;
        }
        try {
            Claims dados = jwtUtil.validarToken(autorizacao.substring(7));
            return "ALUNO".equals(dados.get("papel", String.class)) ? dados.get("id", Integer.class) : null;
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
