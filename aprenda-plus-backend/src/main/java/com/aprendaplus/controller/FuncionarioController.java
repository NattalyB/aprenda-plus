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

    // Quem não é Master não vê as contas Master (usadas só pelos devs/suporte)
    @GetMapping
    public List<Funcionario> listar(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        List<Funcionario> todos = funcionarioService.listarTodos();
        if (usuarioId == null || funcionarioService.podeVerContasMaster(usuarioId)) {
            return todos;
        }
        return todos.stream().filter(f -> !FuncionarioService.ehContaMaster(f)).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscar(@PathVariable Integer id,
                                    @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        Funcionario funcionario = funcionarioService.buscarPorId(id);
        if (usuarioId != null && FuncionarioService.ehContaMaster(funcionario)
                && !funcionarioService.podeVerContasMaster(usuarioId)) {
            return ResponseEntity.status(404).body(Map.of("mensagem", "Funcionário não encontrado."));
        }
        return ResponseEntity.ok(funcionario);
    }

    @PostMapping
    public ResponseEntity<Funcionario> criar(@RequestBody Funcionario funcionario,
                                             @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        funcionario.setIdFuncionario(null);
        return ResponseEntity.ok(funcionarioService.salvar(funcionario, usuarioId));
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
        return ResponseEntity.ok(funcionarioService.salvar(funcionario, usuarioId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id,
                                     @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        if (id.equals(usuarioId)) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", "Você não pode excluir a sua própria conta."));
        }
        funcionarioService.deletar(id, usuarioId);
        return ResponseEntity.noContent().build();
    }
}