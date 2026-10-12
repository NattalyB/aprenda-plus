package com.aprendaplus.dto;

import java.util.List;

// O que o funcionário logado pode usar no painel
public record MeuAcesso(
        String nivel,
        boolean master,
        List<String> modulos) {
}
