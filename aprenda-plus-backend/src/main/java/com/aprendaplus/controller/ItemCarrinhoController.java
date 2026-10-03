package com.aprendaplus.controller;

import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.service.ItemCarrinhoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/itens-carrinho")
public class ItemCarrinhoController {

    @Autowired
    private ItemCarrinhoService itemCarrinhoService;

    @Autowired
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @Autowired
    private CarrinhoRepository carrinhoRepository;

    // Confere se o carrinho pertence ao aluno do token (admin sempre pode)
    private boolean podeMexerNoCarrinho(Integer idCarrinho, Integer usuarioId, String papel) {
        if ("ADMIN".equals(papel)) return true;
        if (idCarrinho == null || usuarioId == null) return false;

        Optional<Carrinho> carrinho = carrinhoRepository.findById(idCarrinho);
        return carrinho.isPresent()
                && carrinho.get().getAluno() != null
                && usuarioId.equals(carrinho.get().getAluno().getIdAluno());
    }

    // ===== Rotas do aluno logado =====

    // Lista só os itens do carrinho do aluno do token
    @GetMapping("/meus")
    public ResponseEntity<?> meusItens(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        if (usuarioId == null) {
            return ResponseEntity.status(401).body(Map.of("erro", "Faça login para continuar."));
        }

        return carrinhoRepository.findFirstByAluno_IdAluno(usuarioId)
                .<ResponseEntity<?>>map(carrinho ->
                        ResponseEntity.ok(itemCarrinhoRepository.findByCarrinho_IdCarrinho(carrinho.getIdCarrinho())))
                .orElseGet(() -> ResponseEntity.ok(List.of()));
    }

    @PostMapping
    public ResponseEntity<?> criar(
            @RequestBody ItemCarrinho itemCarrinho,
            @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
            @RequestAttribute(name = "usuarioPapel", required = false) String papel) {

        Integer idCarrinho = itemCarrinho.getCarrinho() != null ? itemCarrinho.getCarrinho().getIdCarrinho() : null;
        if (!podeMexerNoCarrinho(idCarrinho, usuarioId, papel)) {
            return ResponseEntity.status(403).body(Map.of("erro", "Esse carrinho não pertence a você."));
        }

        return ResponseEntity.ok(itemCarrinhoService.salvar(itemCarrinho));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(
            @PathVariable Integer id,
            @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
            @RequestAttribute(name = "usuarioPapel", required = false) String papel) {

        Optional<ItemCarrinho> item = itemCarrinhoRepository.findById(id);
        if (item.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Integer idCarrinho = item.get().getCarrinho() != null ? item.get().getCarrinho().getIdCarrinho() : null;
        if (!podeMexerNoCarrinho(idCarrinho, usuarioId, papel)) {
            return ResponseEntity.status(403).body(Map.of("erro", "Esse item não pertence a você."));
        }

        itemCarrinhoService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Rotas do admin =====

    @GetMapping
    public List<ItemCarrinho> listar() {
        return itemCarrinhoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemCarrinho> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(itemCarrinhoService.buscarPorId(id));
    }
}