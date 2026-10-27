package com.aprendaplus.controller;

import com.aprendaplus.entity.ContaPagar;
import com.aprendaplus.service.ContaPagarService;
import com.aprendaplus.service.PagamentoProfessorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Financeiro, parte das saídas: contas a pagar, fluxo de caixa e pagamento dos professores.
// Tudo fica em /financeiro/..., então só quem tem o módulo Financeiro usa (AuthInterceptor).
@RestController
@RequestMapping("/financeiro")
public class ContaPagarController {

    @Autowired
    private ContaPagarService contaPagarService;

    @Autowired
    private PagamentoProfessorService pagamentoProfessorService;

    // ===== Contas a pagar =====

    @GetMapping("/contas")
    public List<ContaPagar> listar() {
        return contaPagarService.listar();
    }

    @GetMapping("/contas/categorias")
    public List<String> categorias() {
        return ContaPagarService.CATEGORIAS;
    }

    // ?repetirMeses=12 cria a mesma conta para os próximos 12 meses (ex.: aluguel)
    @PostMapping("/contas")
    public ResponseEntity<List<ContaPagar>> criar(@RequestBody ContaPagar conta,
                                                  @RequestParam(required = false) Integer repetirMeses) {
        conta.setIdConta(null);
        // Pagamento de professor só é criado pela tela de professores
        conta.setProfessorId(null);
        conta.setReferencia(null);
        conta.setHoras(null);
        conta.setValorHora(null);
        return ResponseEntity.ok(contaPagarService.criar(conta, repetirMeses));
    }

    @PutMapping("/contas/{id}")
    public ResponseEntity<ContaPagar> atualizar(@PathVariable Integer id, @RequestBody ContaPagar conta) {
        return ResponseEntity.ok(contaPagarService.atualizar(id, conta));
    }

    @DeleteMapping("/contas/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        contaPagarService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // { "dataPagamento": "2026-10-12", "formaPagamento": "Pix" } (os dois são opcionais)
    @PutMapping("/contas/{id}/pagamento")
    public ResponseEntity<?> pagar(@PathVariable Integer id, @RequestBody(required = false) Map<String, Object> corpo) {
        Map<String, Object> dados = corpo == null ? Map.of() : corpo;
        LocalDate data;
        try {
            data = FinanceiroController.lerData(dados.get("dataPagamento"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", e.getMessage()));
        }
        Object forma = dados.get("formaPagamento");
        return ResponseEntity.ok(contaPagarService.pagar(id, data, forma == null ? null : String.valueOf(forma)));
    }

    @PutMapping("/contas/{id}/estorno")
    public ResponseEntity<ContaPagar> estornar(@PathVariable Integer id) {
        return ResponseEntity.ok(contaPagarService.estornar(id));
    }

    // ===== Fluxo de caixa =====

    @GetMapping("/fluxo-caixa")
    public ResponseEntity<?> fluxo() {
        return ResponseEntity.ok(contaPagarService.fluxo());
    }

    // ===== Pagamento dos professores (hora-aula) =====

    // ?referencia=2026-10
    @GetMapping("/professores")
    public ResponseEntity<?> folha(@RequestParam String referencia) {
        return ResponseEntity.ok(pagamentoProfessorService.folha(referencia));
    }

    // { "valorHora": "55.00" } (vazio ou zero tira o valor)
    @PutMapping("/professores/{id}/valor-hora")
    public ResponseEntity<?> valorHora(@PathVariable Integer id, @RequestBody(required = false) Map<String, Object> corpo) {
        BigDecimal valor;
        try {
            valor = lerNumero(corpo == null ? null : corpo.get("valorHora"), "Informe o valor da hora-aula em reais, por exemplo 55.00.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", e.getMessage()));
        }
        Map<String, Object> resposta = new HashMap<>();
        resposta.put("idProfessor", id);
        resposta.put("valorHora", pagamentoProfessorService.definirValorHora(id, valor));
        return ResponseEntity.ok(resposta);
    }

    // { "referencia": "2026-10", "horas": "40", "vencimento": "2026-11-05" (opcional) }
    @PostMapping("/professores/{id}/pagamento")
    public ResponseEntity<?> gerarPagamento(@PathVariable Integer id, @RequestBody Map<String, Object> corpo) {
        BigDecimal horas;
        LocalDate vencimento;
        try {
            horas = lerNumero(corpo.get("horas"), "Informe as horas-aula do mês, por exemplo 40 ou 37.5.");
            vencimento = FinanceiroController.lerData(corpo.get("vencimento"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", e.getMessage()));
        }
        Object referencia = corpo.get("referencia");
        return ResponseEntity.ok(pagamentoProfessorService.gerarPagamento(id,
                referencia == null ? null : String.valueOf(referencia), horas, vencimento));
    }

    private static BigDecimal lerNumero(Object valor, String mensagem) {
        if (valor == null || String.valueOf(valor).isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(String.valueOf(valor).trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(mensagem);
        }
    }
}
