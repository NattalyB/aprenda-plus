package com.aprendaplus.service;

import com.aprendaplus.entity.AtualizacaoSistema;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AtualizacaoSistemaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

// Atualizações do sistema: o que mudou (novidades, melhorias, correções) e as manutenções programadas.
// Toda a equipe do painel consulta; só o Master publica, edita e exclui (regra no AuthInterceptor).
// As manutenções que ainda não terminaram também aparecem no Portal do Professor.
@Service
public class AtualizacaoSistemaService {

    public static final String MANUTENCAO = "manutencao";
    public static final Set<String> TIPOS = Set.of("novidade", "melhoria", "correcao", MANUTENCAO);
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    @Autowired
    private AtualizacaoSistemaRepository repository;

    public record Dados(String titulo, String descricao, String tipo, String versao,
                        LocalDateTime inicioManutencao, LocalDateTime fimManutencao) {
    }

    public List<AtualizacaoSistema> listar() {
        return repository.findAllByOrderByPublicadoEmDescIdAtualizacaoDesc();
    }

    public List<AtualizacaoSistema> manutencoesPendentes() {
        return repository.findByTipoAndFimManutencaoAfterOrderByInicioManutencaoAsc(MANUTENCAO, agora());
    }

    @Transactional
    public AtualizacaoSistema criar(Dados dados, Integer idFuncionario) {
        AtualizacaoSistema atualizacao = new AtualizacaoSistema();
        LocalDateTime agora = agora();
        atualizacao.setPublicadoEm(agora);
        atualizacao.setCriadoPorId(idFuncionario);
        preencher(atualizacao, dados, agora);
        return repository.save(atualizacao);
    }

    @Transactional
    public AtualizacaoSistema editar(Integer id, Dados dados) {
        AtualizacaoSistema atualizacao = buscar(id);
        preencher(atualizacao, dados, agora());
        return repository.save(atualizacao);
    }

    @Transactional
    public void excluir(Integer id) {
        repository.delete(buscar(id));
    }

    private AtualizacaoSistema buscar(Integer id) {
        if (id == null) {
            throw new RegraDeNegocioException("Atualização não encontrada.");
        }
        return repository.findById(id).orElseThrow(() -> new RegraDeNegocioException("Atualização não encontrada."));
    }

    private static void preencher(AtualizacaoSistema atualizacao, Dados dados, LocalDateTime agora) {
        if (dados == null) {
            throw new RegraDeNegocioException("Informe os dados da atualização.");
        }
        String titulo = limpar(dados.titulo());
        if (titulo == null) {
            throw new RegraDeNegocioException("Informe o título da atualização.");
        }
        if (titulo.length() > 150) {
            throw new RegraDeNegocioException("O título pode ter no máximo 150 caracteres.");
        }
        String descricao = limpar(dados.descricao());
        if (descricao == null) {
            throw new RegraDeNegocioException("Descreva o que mudou.");
        }
        if (descricao.length() > 5000) {
            throw new RegraDeNegocioException("A descrição pode ter no máximo 5000 caracteres.");
        }
        String tipo = limpar(dados.tipo());
        if (tipo == null || !TIPOS.contains(tipo)) {
            throw new RegraDeNegocioException("Escolha o tipo: novidade, melhoria, correção ou manutenção.");
        }
        String versao = limpar(dados.versao());
        if (versao != null && versao.length() > 20) {
            throw new RegraDeNegocioException("A versão pode ter no máximo 20 caracteres.");
        }

        LocalDateTime inicio = null;
        LocalDateTime fim = null;
        if (MANUTENCAO.equals(tipo)) {
            inicio = dados.inicioManutencao();
            fim = dados.fimManutencao();
            if (inicio == null || fim == null) {
                throw new RegraDeNegocioException("Informe o início e o fim da manutenção.");
            }
            if (!fim.isAfter(inicio)) {
                throw new RegraDeNegocioException("O fim da manutenção precisa ser depois do início.");
            }
        }

        atualizacao.setTitulo(titulo);
        atualizacao.setDescricao(descricao);
        atualizacao.setTipo(tipo);
        atualizacao.setVersao(versao);
        atualizacao.setInicioManutencao(inicio);
        atualizacao.setFimManutencao(fim);
        atualizacao.setAtualizadoEm(agora);
    }

    private static String limpar(String valor) {
        if (valor == null) {
            return null;
        }
        String limpo = valor.trim();
        return limpo.isEmpty() ? null : limpo;
    }

    private static LocalDateTime agora() {
        return LocalDateTime.now(FUSO);
    }
}
