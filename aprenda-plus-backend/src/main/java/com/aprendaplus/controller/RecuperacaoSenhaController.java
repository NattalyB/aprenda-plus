package com.aprendaplus.controller;

import com.aprendaplus.service.RecuperacaoSenhaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// "Esqueci minha senha" (rotas abertas, como o login)
@RestController
@RequestMapping("/auth")
public class RecuperacaoSenhaController {

    static final String RESPOSTA_PEDIDO =
            "Se este e-mail estiver cadastrado, você vai receber em alguns minutos um link para criar uma nova senha.";

    @Autowired
    private RecuperacaoSenhaService recuperacaoSenhaService;

    // Corpo: { "email": "...", "tipo": "aluno" | "funcionario" }
    @PostMapping("/esqueci-senha")
    public ResponseEntity<?> esqueciSenha(@RequestBody Map<String, String> corpo) {
        recuperacaoSenhaService.solicitar(corpo.get("email"), corpo.get("tipo"));
        return ResponseEntity.ok(Map.of("mensagem", RESPOSTA_PEDIDO));
    }

    // Corpo: { "token": "...", "novaSenha": "..." }
    @PostMapping("/redefinir-senha")
    public ResponseEntity<?> redefinirSenha(@RequestBody Map<String, String> corpo) {
        String tipo = recuperacaoSenhaService.redefinir(corpo.get("token"), corpo.get("novaSenha"));
        return ResponseEntity.ok(Map.of("mensagem", "Senha alterada! Agora é só entrar com a nova senha.", "tipo", tipo));
    }
}
