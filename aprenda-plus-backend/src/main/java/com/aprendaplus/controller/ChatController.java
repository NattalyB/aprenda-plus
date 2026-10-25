package com.aprendaplus.controller;

import com.aprendaplus.dto.ChatPergunta;
import com.aprendaplus.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

// Assistente virtual do site (rota pública: visitantes também podem perguntar).
// POST /chat  corpo: { "mensagem": "...", "historico": [ { "autor": "aluno", "texto": "..." }, ... ] }
@RestController
@RequestMapping("/chat")
public class ChatController {

    // Proteção simples para o limite gratuito da IA: cada visitante pode mandar até 12 mensagens por minuto
    static final int LIMITE_POR_MINUTO = 12;
    private static final long UM_MINUTO = 60_000L;

    private final ChatService chatService;
    private final LongSupplier relogio;
    private final Map<String, Deque<Long>> envios = new ConcurrentHashMap<>();

    @Autowired
    public ChatController(ChatService chatService) {
        this(chatService, System::currentTimeMillis);
    }

    ChatController(ChatService chatService, LongSupplier relogio) {
        this.chatService = chatService;
        this.relogio = relogio;
    }

    @PostMapping
    public ResponseEntity<?> perguntar(@RequestBody ChatPergunta pergunta, HttpServletRequest request) {
        if (!podeEnviar(visitante(request))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("mensagem",
                    "Você enviou muitas mensagens seguidas. Espere um minutinho e tente de novo."));
        }
        return ResponseEntity.ok(chatService.responder(pergunta));
    }

    boolean podeEnviar(String visitante) {
        long agora = relogio.getAsLong();
        if (envios.size() > 5_000) {
            // Limpa quem não manda mensagem há mais de um minuto (evita a memória crescer sem fim)
            envios.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    Long ultimo = e.getValue().peekLast();
                    return ultimo == null || agora - ultimo > UM_MINUTO;
                }
            });
        }
        Deque<Long> fila = envios.computeIfAbsent(visitante, v -> new ArrayDeque<>());
        synchronized (fila) {
            while (!fila.isEmpty() && agora - fila.peekFirst() >= UM_MINUTO) {
                fila.pollFirst();
            }
            if (fila.size() >= LIMITE_POR_MINUTO) {
                return false;
            }
            fila.addLast(agora);
            return true;
        }
    }

    // No Render o IP real do visitante vem no cabeçalho X-Forwarded-For
    static String visitante(HttpServletRequest request) {
        String encaminhado = request.getHeader("X-Forwarded-For");
        if (encaminhado != null && !encaminhado.isBlank()) {
            return encaminhado.split(",")[0].trim();
        }
        return request.getRemoteAddr() == null ? "desconhecido" : request.getRemoteAddr();
    }
}
