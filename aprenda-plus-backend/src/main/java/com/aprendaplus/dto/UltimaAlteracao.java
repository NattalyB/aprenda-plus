package com.aprendaplus.dto;

import java.time.LocalDateTime;

// Quem cadastrou e quem alterou por último um registro (aparece nos formulários do painel).
// Campos nulos quando não há registro (ex.: cadastros feitos antes do histórico existir).
public record UltimaAlteracao(String criadoPor, LocalDateTime criadoEm,
                              String alteradoPor, LocalDateTime alteradoEm, String ultimaAcao) {
}
