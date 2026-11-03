package com.aprendaplus.dto;

import java.math.BigDecimal;

// Uma das formas de pagamento escolhidas no carrinho quando o aluno divide o pagamento.
// forma: pix | cartao | boleto; parcelas: só para cartão e boleto;
// valor: quanto do PEDIDO inteiro (soma dos cursos do carrinho, sem desconto) vai nesta forma.
public record PartePagamento(String forma, Integer parcelas, BigDecimal valor) {
}
