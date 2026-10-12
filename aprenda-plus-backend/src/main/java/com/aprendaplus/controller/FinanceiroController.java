package com.aprendaplus.controller;

import com.aprendaplus.service.FinanceiroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

// Módulo Financeiro do painel + "meus pagamentos" do aluno.
// Quem pode usar cada rota é conferido no AuthInterceptor.
@RestController
@RequestMapping("/financeiro")
public class FinanceiroController {

    @Autowired
    private FinanceiroService financeiroService;

    @GetMapping("/parcelas")
    public ResponseEntity<?> parcelas() {
        return ResponseEntity.ok(financeiroService.listarParcelas());
    }

    @GetMapping("/resumo")
    public ResponseEntity<?> resumo() {
        return ResponseEntity.ok(financeiroService.resumo());
    }

    @GetMapping("/alertas")
    public ResponseEntity<?> alertas() {
        return ResponseEntity.ok(financeiroService.alertas());
    }

    // Área do aluno: só as parcelas do aluno logado
    @GetMapping("/meus")
    public ResponseEntity<?> meus(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                  @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (usuarioId == null || !"ALUNO".equals(papel)) {
            return ResponseEntity.status(401).body(Map.of("erro", "Faça login como aluno para ver seus pagamentos."));
        }
        return ResponseEntity.ok(financeiroService.parcelasDoAluno(usuarioId));
    }

    // Baixa: { "dataPagamento": "2026-10-12", "formaPagamento": "Pix" } (os dois são opcionais)
    @PutMapping("/parcelas/{id}/pagamento")
    public ResponseEntity<?> registrarPagamento(@PathVariable Integer id,
                                                @RequestBody(required = false) Map<String, String> corpo) {
        Map<String, String> dados = corpo == null ? Map.of() : corpo;
        String data = dados.get("dataPagamento");
        LocalDate dataPagamento;
        try {
            dataPagamento = data == null || data.isBlank() ? null : LocalDate.parse(data);
        } catch (java.time.DateTimeException e) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", "Informe a data do pagamento no formato AAAA-MM-DD."));
        }
        return ResponseEntity.ok(financeiroService.registrarPagamento(id, dataPagamento, dados.get("formaPagamento")));
    }

    @PutMapping("/parcelas/{id}/estorno")
    public ResponseEntity<?> estornar(@PathVariable Integer id) {
        return ResponseEntity.ok(financeiroService.estornar(id));
    }

    @PostMapping("/gerar-parcelas")
    public ResponseEntity<?> gerarParcelasQueFaltam() {
        return ResponseEntity.ok(Map.of("matriculas", financeiroService.gerarParcelasQueFaltam()));
    }
}
