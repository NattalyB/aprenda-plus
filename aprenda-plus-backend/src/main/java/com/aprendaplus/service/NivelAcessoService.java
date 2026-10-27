package com.aprendaplus.service;

import com.aprendaplus.dto.MeuAcesso;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.NivelAcesso;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.NivelAcessoRepository;
import com.aprendaplus.security.Modulos;
import com.aprendaplus.security.PermissoesDoFuncionario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

// Níveis de acesso do painel (módulo "Sistema", só para o Master)
// e a consulta de permissões usada pela proteção da API.
@Service
public class NivelAcessoService implements PermissoesDoFuncionario {

    @Autowired
    private NivelAcessoRepository nivelAcessoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    // Cor usada quando o nível ainda não tem uma (cinza neutro)
    public static final String COR_PADRAO = "#64748b";
    private static final Pattern COR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    // O funcionário logado é Master?
    public boolean ehMaster(Integer idFuncionario) {
        if (idFuncionario == null) return false;
        return funcionarioRepository.findById(idFuncionario)
                .map(f -> f.getNivel() != null && f.getNivel().isMaster())
                .orElse(false);
    }

    public List<NivelAcesso> listar() {
        return nivelAcessoRepository.findAllByOrderByMasterDescNomeAsc();
    }

    public NivelAcesso salvar(NivelAcesso nivel) {
        String cor = validarCor(nivel.getCor());
        String nome = nivel.getNome() == null ? "" : nivel.getNome().trim();
        if (nome.isEmpty()) {
            throw new RegraDeNegocioException("Informe o nome do nível.");
        }
        if (nome.length() > 50) {
            throw new RegraDeNegocioException("O nome do nível pode ter no máximo 50 caracteres.");
        }

        if (nivel.getIdNivel() != null) {
            NivelAcesso atual = nivelAcessoRepository.findById(nivel.getIdNivel())
                    .orElseThrow(() -> new RegraDeNegocioException("Nível de acesso não encontrado."));
            if (atual.isMaster()) {
                // Do Master só dá para trocar a cor: nome e acesso total ficam como estão
                if (cor == null || cor.equalsIgnoreCase(atual.getCor())) {
                    throw new RegraDeNegocioException("O nível Master tem acesso a tudo e não pode ser alterado.");
                }
                atual.setCor(cor);
                return nivelAcessoRepository.save(atual);
            }
            if (cor == null) {
                // Sem cor no pedido: mantém a que já estava
                cor = atual.getCor();
            }
        }

        nivelAcessoRepository.findFirstByNomeIgnoreCase(nome)
                .filter(outro -> !outro.getIdNivel().equals(nivel.getIdNivel()))
                .ifPresent(outro -> {
                    throw new RegraDeNegocioException("Já existe um nível com o nome \"" + outro.getNome() + "\".");
                });

        nivel.setNome(nome);
        nivel.setCor(cor == null ? COR_PADRAO : cor);
        // Só existe um Master, criado pelo script do banco
        nivel.setMaster(false);
        return nivelAcessoRepository.save(nivel);
    }

    public void deletar(Integer id) {
        NivelAcesso nivel = nivelAcessoRepository.findById(id)
                .orElseThrow(() -> new RegraDeNegocioException("Nível de acesso não encontrado."));
        if (nivel.isMaster()) {
            throw new RegraDeNegocioException("O nível Master não pode ser excluído.");
        }
        long emUso = funcionarioRepository.countByNivel_IdNivel(id);
        if (emUso > 0) {
            throw new RegraDeNegocioException("O nível \"" + nivel.getNome() + "\" está sendo usado por " + emUso
                    + (emUso == 1 ? " funcionário" : " funcionários")
                    + ". Troque o nível dessas pessoas antes de excluir.");
        }
        nivelAcessoRepository.deleteById(id);
    }

    // Nível e módulos do funcionário logado (o front usa para montar o menu e os atalhos)
    public MeuAcesso doFuncionario(Integer idFuncionario) {
        Funcionario funcionario = funcionarioRepository.findById(idFuncionario)
                .orElseThrow(() -> new RegraDeNegocioException("Funcionário não encontrado."));
        NivelAcesso nivel = funcionario.getNivel();
        if (nivel == null) {
            return new MeuAcesso(null, false, List.of());
        }
        return new MeuAcesso(nivel.getNome(), nivel.isMaster(), nivel.getModulos(), nivel.getCor());
    }

    // null = sem cor escolhida. Aceita só "#rrggbb" e guarda em minúsculas.
    static String validarCor(String cor) {
        if (cor == null || cor.isBlank()) {
            return null;
        }
        String limpa = cor.trim();
        if (!COR.matcher(limpa).matches()) {
            throw new RegraDeNegocioException("Escolha uma cor válida para o nível (ex.: #16a34a).");
        }
        return limpa.toLowerCase();
    }

    // Usado pelo AuthInterceptor a cada requisição do painel.
    // Lê do banco na hora: se o Master mudar as permissões ou bloquear a conta,
    // vale imediatamente, sem precisar de novo login.
    @Override
    public Set<String> modulosLiberados(Integer idFuncionario) {
        if (idFuncionario == null) {
            return null;
        }
        Funcionario funcionario = funcionarioRepository.findById(idFuncionario).orElse(null);
        if (funcionario == null || !"ativo".equals(funcionario.getStatus())) {
            return null;
        }
        NivelAcesso nivel = funcionario.getNivel();
        if (nivel == null) {
            return Set.of();
        }
        return new LinkedHashSet<>(nivel.getModulos());
    }
}
