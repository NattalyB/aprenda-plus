package com.aprendaplus.controller;

import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.service.FuncionarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/funcionarios")
public class FuncionarioController {

    @Autowired
    private FuncionarioService funcionarioService;

    @GetMapping
    public List<Funcionario> listar() {
        return funcionarioService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Funcionario> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(funcionarioService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Funcionario> criar(@RequestBody Funcionario funcionario) {
        return ResponseEntity.ok(funcionarioService.salvar(funcionario));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Funcionario funcionario,
                                       @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        // Ninguém inativa ou bloqueia a própria conta (para não se trancar fora do painel)
        boolean propriaConta = id.equals(usuarioId);
        if (propriaConta && funcionario.getStatus() != null && !"ativo".equals(funcionario.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensagem", "Você não pode inativar ou bloquear a sua própria conta."));
        }
        funcionario.setIdFuncionario(id);
        return ResponseEntity.ok(funcionarioService.salvar(funcionario));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id,
                                     @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        if (id.equals(usuarioId)) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", "Você não pode excluir a sua própria conta."));
        }
        funcionarioService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}