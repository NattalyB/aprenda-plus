package com.aprendaplus.controller;

import com.aprendaplus.entity.ConfiguracaoFinanceira;
import com.aprendaplus.service.FinanceiroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
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

    // Baixa: { "dataPagamento": "2026-10-12", "formaPagamento": "Pix",
    //          "isentarEncargos": false, "desconto": "10.00" } (tudo opcional)
    // Multa, juros e desconto são calculados pelas regras de cobrança.
    @PutMapping("/parcelas/{id}/pagamento")
    public ResponseEntity<?> registrarPagamento(@PathVariable Integer id,
                                                @RequestBody(required = false) Map<String, Object> corpo) {
        Map<String, Object> dados = corpo == null ? Map.of() : corpo;
        LocalDate dataPagamento;
        BigDecimal desconto;
        try {
            dataPagamento = lerData(dados.get("dataPagamento"));
            desconto = lerValor(dados.get("desconto"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", e.getMessage()));
        }
        Object forma = dados.get("formaPagamento");
        return ResponseEntity.ok(financeiroService.registrarPagamento(id, dataPagamento,
                forma == null ? null : String.valueOf(forma), sim(dados.get("isentarEncargos")), desconto));
    }

    // Prévia da baixa: quanto fica a parcela se for paga na data (com multa, juros ou desconto)
    @GetMapping("/parcelas/{id}/calculo")
    public ResponseEntity<?> calcular(@PathVariable Integer id,
                                      @RequestParam(required = false) String data,
                                      @RequestParam(required = false) String isentarEncargos,
                                      @RequestParam(required = false) String desconto) {
        try {
            return ResponseEntity.ok(financeiroService.calcular(id, lerData(data), sim(isentarEncargos), lerValor(desconto)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", e.getMessage()));
        }
    }

    // Regras de cobrança: multa, juros ao mês, desconto de pontualidade e dias de carência
    @GetMapping("/configuracao")
    public ResponseEntity<ConfiguracaoFinanceira> regras() {
        return ResponseEntity.ok(financeiroService.regras());
    }

    @PutMapping("/configuracao")
    public ResponseEntity<ConfiguracaoFinanceira> salvarRegras(@RequestBody ConfiguracaoFinanceira regras) {
        return ResponseEntity.ok(financeiroService.salvarRegras(regras));
    }

    @PutMapping("/parcelas/{id}/estorno")
    public ResponseEntity<?> estornar(@PathVariable Integer id) {
        return ResponseEntity.ok(financeiroService.estornar(id));
    }

    @PostMapping("/gerar-parcelas")
    public ResponseEntity<?> gerarParcelasQueFaltam() {
        return ResponseEntity.ok(Map.of("matriculas", financeiroService.gerarParcelasQueFaltam()));
    }

    // ===== Leitura do que vem da tela =====

    static LocalDate lerData(Object valor) {
        if (valor == null || String.valueOf(valor).isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(String.valueOf(valor).trim());
        } catch (java.time.DateTimeException e) {
            throw new IllegalArgumentException("Informe a data do pagamento no formato AAAA-MM-DD.");
        }
    }

    static BigDecimal lerValor(Object valor) {
        if (valor == null || String.valueOf(valor).isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(String.valueOf(valor).trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Informe o desconto em reais, por exemplo 10.50.");
        }
    }

    static boolean sim(Object valor) {
        return valor != null && "true".equalsIgnoreCase(String.valueOf(valor).trim());
    }
}
