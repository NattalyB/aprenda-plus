package com.aprendaplus.dto;

import com.aprendaplus.entity.RegistroAtividade;

import java.util.List;

// Uma página do histórico de alterações
public record PaginaAtividades(List<RegistroAtividade> itens, long total, int pagina, int tamanho, int totalPaginas) {
}
