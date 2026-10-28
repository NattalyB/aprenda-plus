package com.aprendaplus.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// Pessoa que começou a comprar e não terminou (ou só se cadastrou).
// etapa: "inscricao_pendente" (inscrição sem pagamento), "carrinho" (cursos parados no carrinho)
// ou "cadastro" (se cadastrou e nunca comprou). Vale a etapa mais avançada da pessoa.
// jaEhAluno: já tem matrícula em algum curso (bom para oferecer um segundo curso).
public record LeadComercial(Integer idAluno, String nome, String email, String telefone,
                            boolean aceitaMarketing, boolean jaEhAluno,
                            String etapa, List<String> cursos, BigDecimal valor,
                            LocalDateTime desde, long diasParado,
                            UltimoContato ultimoContato, int totalContatos) {

    public record UltimoContato(LocalDateTime quando, String canal, String resultado,
                                String funcionarioNome, String observacao) {
    }
}
