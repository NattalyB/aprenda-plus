package com.aprendaplus.controller;

import com.aprendaplus.entity.Pagamento;
import com.aprendaplus.service.PagamentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pagamentos")
public class PagamentoController {

    @Autowired
    private PagamentoService pagamentoService;

    @GetMapping
    public List<Pagamento> listar() {
        return pagamentoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pagamento> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(pagamentoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Pagamento> criar(@RequestBody Pagamento pagamento) {
        return ResponseEntity.ok(pagamentoService.salvar(pagamento));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pagamento> atualizar(@PathVariable Integer id, @RequestBody Pagamento pagamento) {
        pagamento.setIdPagamento(id);
        return ResponseEntity.ok(pagamentoService.salvar(pagamento));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        pagamentoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}