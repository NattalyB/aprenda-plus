package com.aprendaplus.service;

import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.dto.ResultadoImportacao;
import com.aprendaplus.dto.ResultadoImportacao.LinhaImportada;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.DisciplinaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.regex.Pattern;

// Importação por planilha (CSV) no painel: alunos, professores, cursos, disciplinas e aulas do EAD.
// O front lê a planilha e manda as linhas como { "nome da coluna": "valor" }.
// Cada linha passa pelas MESMAS regras do cadastro normal. Primeiro vem a prévia (confirmar = false),
// que só confere e não grava nada; depois a confirmação grava só as linhas sem erro.
// Cada linha é gravada separada: se uma falhar, as outras continuam.
@Service
public class ImportacaoService {

    public static final int LIMITE_LINHAS = 500;
    static final int SENHA_MINIMA = 6;

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern CEP = Pattern.compile("^\\d{5}-?\\d{3}$");
    private static final Pattern UF = Pattern.compile("^[A-Za-z]{2}$");
    // STRICT: 31/02 é recusado (o padrão do Java trocaria por 29/02 sem avisar)
    private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("d/M/uuuu")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final SecureRandom SORTEIO = new SecureRandom();

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private CursoRepository cursoRepository;

    @Autowired
    private DisciplinaRepository disciplinaRepository;

    @Autowired
    private AlunoService alunoService;

    @Autowired
    private ProfessorService professorService;

    @Autowired
    private CursoService cursoService;

    @Autowired
    private DisciplinaService disciplinaService;

    @Autowired
    private ConteudoEadService conteudoEadService;

    // Uma linha já conferida: o que vai ser gravado e os problemas encontrados
    record Preparada<T>(int linha, String descricao, T dado, List<String> erros) {
    }

    // ===== Alunos =====

    public ResultadoImportacao alunos(List<Map<String, String>> linhas, boolean confirmar) {
        Set<String> emails = new HashSet<>();
        Set<String> cpfs = new HashSet<>();
        return processar(linhas, confirmar, linha -> {
            List<String> erros = new ArrayList<>();
            Pessoa p = pessoa(linha, erros, emails, cpfs, "aluno",
                    alunoRepository::existsByEmailIgnoreCase, alunoRepository::existsByCpf);

            String senha = linha.texto("senha");
            if (senha != null && senha.length() < SENHA_MINIMA) {
                erros.add("A senha deve ter pelo menos " + SENHA_MINIMA + " caracteres.");
            }

            Aluno aluno = new Aluno();
            p.copiarPara(aluno::setNomeCompleto, aluno::setEmail, aluno::setCpf, aluno::setTelefone,
                    aluno::setDataNascimento, aluno::setRua, aluno::setNumero, aluno::setComplemento,
                    aluno::setCep, aluno::setBairro, aluno::setCidade, aluno::setEstado);
            // Sem senha na planilha: fica uma senha sorteada e o aluno cria a dele em "Esqueci minha senha"
            aluno.setSenhaHash(senha != null ? senha : senhaSorteada());
            aluno.setStatus("ativo");
            return new Preparada<>(linha.numero(), p.nome, aluno, erros);
        }, alunoService::salvar);
    }

    // ===== Professores =====

    public ResultadoImportacao professores(List<Map<String, String>> linhas, boolean confirmar) {
        Set<String> emails = new HashSet<>();
        Set<String> cpfs = new HashSet<>();
        return processar(linhas, confirmar, linha -> {
            List<String> erros = new ArrayList<>();
            Pessoa p = pessoa(linha, erros, emails, cpfs, "professor",
                    professorRepository::existsByEmailIgnoreCase, professorRepository::existsByCpf);
            Professor professor = new Professor();
            p.copiarPara(professor::setNomeCompleto, professor::setEmail, professor::setCpf, professor::setTelefone,
                    professor::setDataNascimento, professor::setRua, professor::setNumero, professor::setComplemento,
                    professor::setCep, professor::setBairro, professor::setCidade, professor::setEstado);
            professor.setStatus("ativo");
            return new Preparada<>(linha.numero(), p.nome, professor, erros);
        }, professorService::salvar);
    }

    // ===== Cursos =====

    public ResultadoImportacao cursos(List<Map<String, String>> linhas, boolean confirmar) {
        Set<String> existentes = new HashSet<>();
        cursoRepository.findAll().forEach(c -> existentes.add(chave(c.getNome())));
        Set<String> naPlanilha = new HashSet<>();
        return processar(linhas, confirmar, linha -> {
            List<String> erros = new ArrayList<>();
            Curso curso = new Curso();

            String nome = obrigatorio(linha, erros, "Informe o nome do curso.", "nome", "nome do curso", "curso");
            maximo(erros, nome, 150, "O nome do curso pode ter no máximo 150 caracteres.");
            if (nome != null && existentes.contains(chave(nome))) {
                erros.add("Já existe um curso com o nome \"" + nome + "\".");
            } else if (nome != null && !naPlanilha.add(chave(nome))) {
                erros.add("O curso \"" + nome + "\" aparece mais de uma vez na planilha.");
            }
            curso.setNome(nome);

            String categoria = obrigatorio(linha, erros, "Informe a categoria (superior ou profissionalizante).", "categoria");
            if (categoria != null) {
                String valor = chave(categoria);
                if (!valor.equals("superior") && !valor.equals("profissionalizante")) {
                    erros.add("A categoria deve ser \"superior\" ou \"profissionalizante\".");
                }
                curso.setCategoria(valor);
            }

            curso.setCargaHoraria(inteiro(linha, erros, true, 1, 100000, "Carga horária", "carga", "horas"));

            String modalidade = obrigatorio(linha, erros, "Informe a modalidade (ex.: EAD).", "modalidade");
            maximo(erros, modalidade, 30, "A modalidade pode ter no máximo 30 caracteres.");
            curso.setModalidade(modalidade);

            String valorTexto = obrigatorio(linha, erros, "Informe o valor do curso.", "valor", "preco", "valor total");
            if (valorTexto != null) {
                BigDecimal valor = decimal(valorTexto);
                if (valor == null || valor.signum() < 0) {
                    erros.add("Valor inválido: \"" + valorTexto + "\" (use 12000,00 ou 12000.00).");
                } else {
                    curso.setValor(valor);
                }
            }

            curso.setNumeroParcelas(inteiro(linha, erros, false, 1, 120, "Número de parcelas", "parcelas"));

            String formas = linha.texto("formas de pagamento", "formas pagamento", "pagamento");
            maximo(erros, formas, 150, "As formas de pagamento podem ter no máximo 150 caracteres.");
            curso.setFormasPagamento(formas);
            curso.setDescricao(linha.texto("descricao"));
            curso.setConteudo(linha.texto("conteudo"));
            curso.setPreRequisitos(linha.texto("pre requisitos", "prerequisitos"));
            return new Preparada<>(linha.numero(), nome, curso, erros);
        }, cursoService::salvar);
    }

    // ===== Disciplinas =====

    public ResultadoImportacao disciplinas(List<Map<String, String>> linhas, boolean confirmar) {
        Map<String, Curso> cursosPorNome = new HashMap<>();
        cursoRepository.findAll().forEach(c -> cursosPorNome.putIfAbsent(chave(c.getNome()), c));
        Set<String> existentes = new HashSet<>();
        disciplinaRepository.findAll().forEach(d -> existentes.add(chave(d.getNome())));
        Set<String> naPlanilha = new HashSet<>();
        return processar(linhas, confirmar, linha -> {
            List<String> erros = new ArrayList<>();
            Disciplina disciplina = new Disciplina();

            String nome = obrigatorio(linha, erros, "Informe o nome da disciplina.", "nome", "nome da disciplina", "disciplina");
            maximo(erros, nome, 150, "O nome da disciplina pode ter no máximo 150 caracteres.");
            if (nome != null && existentes.contains(chave(nome))) {
                erros.add("Já existe uma disciplina com o nome \"" + nome + "\".");
            } else if (nome != null && !naPlanilha.add(chave(nome))) {
                erros.add("A disciplina \"" + nome + "\" aparece mais de uma vez na planilha.");
            }
            disciplina.setNome(nome);

            // Vários cursos separados por ";" (ex.: "Análise e Desenvolvimento de Sistemas; Engenharia de Software")
            String cursos = obrigatorio(linha, erros, "Informe o curso (ou os cursos, separados por ;).", "cursos", "curso");
            List<Curso> encontrados = new ArrayList<>();
            if (cursos != null) {
                for (String parte : cursos.split("[;|]")) {
                    String nomeCurso = parte.trim();
                    if (nomeCurso.isEmpty()) {
                        continue;
                    }
                    Curso curso = cursosPorNome.get(chave(nomeCurso));
                    if (curso == null) {
                        erros.add("Curso \"" + nomeCurso + "\" não encontrado. Use o nome igual ao do cadastro de cursos.");
                    } else if (!encontrados.contains(curso)) {
                        encontrados.add(curso);
                    }
                }
            }
            List<Curso> referencias = new ArrayList<>();
            encontrados.forEach(c -> {
                Curso ref = new Curso();
                ref.setIdCurso(c.getIdCurso());
                referencias.add(ref);
            });
            disciplina.setCursos(referencias);

            disciplina.setCargaHoraria(inteiro(linha, erros, true, 1, 100000, "Carga horária", "carga", "horas"));

            String modalidade = linha.texto("modalidade");
            maximo(erros, modalidade, 30, "A modalidade pode ter no máximo 30 caracteres.");
            disciplina.setModalidade(modalidade);

            String status = linha.texto("status", "situacao");
            if (status != null) {
                status = chave(status);
                if (!status.equals("ativa") && !status.equals("inativa")) {
                    erros.add("A situação deve ser \"ativa\" ou \"inativa\".");
                }
            }
            disciplina.setStatus(status == null ? "ativa" : status);
            disciplina.setDescricao(linha.texto("descricao"));
            disciplina.setConteudo(linha.texto("conteudo"));
            disciplina.setPreRequisitos(linha.texto("pre requisitos", "prerequisitos"));
            return new Preparada<>(linha.numero(), nome, disciplina, erros);
        }, disciplinaService::salvar);
    }

    // ===== Aulas do EAD (de uma turma) =====

    public ResultadoImportacao aulas(Integer idTurma, List<Map<String, String>> linhas, boolean confirmar) {
        PlanoDaTurma plano = conteudoEadService.planoDaTurma(idTurma);
        if (plano.idPlano() == null) {
            throw new RegraDeNegocioException("Escolha o professor responsável antes de importar as aulas.");
        }
        // Disciplinas do curso da turma, pelo nome
        Map<String, Integer> disciplinas = new HashMap<>();
        for (Disciplina d : disciplinaRepository.findAll()) {
            boolean doCurso = plano.idCurso() == null || d.getCursos() == null
                    || d.getCursos().stream().anyMatch(c -> Objects.equals(c.getIdCurso(), plano.idCurso()));
            if (doCurso) {
                disciplinas.putIfAbsent(chave(d.getNome()), d.getIdDisciplina());
            }
        }

        return processar(linhas, confirmar, linha -> {
            List<String> erros = new ArrayList<>();
            String titulo = linha.texto("titulo", "titulo da aula", "aula", "topico");
            if (titulo == null) {
                erros.add("Informe o título da aula.");
            }

            Integer idDisciplina = null;
            String disciplina = linha.texto("disciplina");
            if (disciplina != null) {
                idDisciplina = disciplinas.get(chave(disciplina));
                if (idDisciplina == null) {
                    erros.add("A disciplina \"" + disciplina + "\" não é do curso desta turma.");
                }
            }

            String tipo = tipoDaAula(linha.texto("tipo", "tipo da aula"));
            if (tipo == null) {
                erros.add("Tipo de aula inválido: use videoaula, leitura, ao vivo ou atividade.");
            }

            LocalDate liberacao = data(linha, erros, false, "Data de liberação", "liberacao", "data");
            Integer duracao = inteiro(linha, erros, false, 1, 600, "Duração (minutos)",
                    "duracao", "duracao em minutos", "minutos");

            Boolean publicada = true;
            String publicar = linha.texto("publicada", "publicar");
            if (publicar != null) {
                publicada = simOuNao(publicar);
                if (publicada == null) {
                    erros.add("Na coluna \"publicada\", use sim ou não.");
                }
            }

            AulaForm form = new AulaForm(titulo, idDisciplina, tipo == null ? "video" : tipo, liberacao,
                    linha.texto("video", "link do video", "youtube", "video url"),
                    linha.texto("material", "link do material", "material url"),
                    linha.texto("conteudo", "texto", "descricao"),
                    duracao, publicada == null || publicada);

            if (erros.isEmpty()) {
                // As mesmas regras do cadastro de uma aula (título, link do YouTube, material...)
                try {
                    conteudoEadService.conferirAula(idTurma, form);
                } catch (RegraDeNegocioException e) {
                    erros.add(e.getMessage());
                }
            }
            return new Preparada<>(linha.numero(), titulo, form, erros);
        }, form -> conteudoEadService.adicionarAula(idTurma, form));
    }

    // ===== Processamento comum =====

    <T> ResultadoImportacao processar(List<Map<String, String>> linhas, boolean confirmar,
                                      Function<Linha, Preparada<T>> preparar, Consumer<T> gravar) {
        if (linhas == null || linhas.isEmpty()) {
            throw new RegraDeNegocioException("A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho.");
        }
        if (linhas.size() > LIMITE_LINHAS) {
            throw new RegraDeNegocioException("Envie no máximo " + LIMITE_LINHAS + " linhas por vez.");
        }

        List<LinhaImportada> resultado = new ArrayList<>();
        int validas = 0;
        int importadas = 0;
        for (int i = 0; i < linhas.size(); i++) {
            Linha linha = new Linha(linhas.get(i), i + 2);
            if (linha.vazia()) {
                continue;
            }
            Preparada<T> preparada = preparar.apply(linha);
            List<String> erros = new ArrayList<>(preparada.erros());
            boolean importada = false;
            if (erros.isEmpty()) {
                validas++;
                if (confirmar) {
                    try {
                        gravar.accept(preparada.dado());
                        importada = true;
                        importadas++;
                    } catch (RegraDeNegocioException e) {
                        erros.add(e.getMessage());
                    } catch (RuntimeException e) {
                        erros.add("Não foi possível gravar esta linha. Confira se ela já não foi cadastrada.");
                    }
                }
            }
            String descricao = preparada.descricao() == null ? "Linha " + preparada.linha() : preparada.descricao();
            resultado.add(new LinhaImportada(preparada.linha(), descricao, erros, importada));
        }
        if (resultado.isEmpty()) {
            throw new RegraDeNegocioException("A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho.");
        }
        int comErro = (int) resultado.stream().filter(l -> !l.erros().isEmpty()).count();
        return new ResultadoImportacao(confirmar, resultado.size(), validas, comErro, importadas, resultado);
    }

    // Dados em comum de aluno e professor
    static final class Pessoa {
        String nome;
        String email;
        String cpf;
        String telefone;
        LocalDate nascimento;
        String rua;
        String numero;
        String complemento;
        String cep;
        String bairro;
        String cidade;
        String uf;

        @SuppressWarnings("java:S107")
        void copiarPara(Consumer<String> nome, Consumer<String> email, Consumer<String> cpf, Consumer<String> telefone,
                        Consumer<LocalDate> nascimento, Consumer<String> rua, Consumer<String> numero,
                        Consumer<String> complemento, Consumer<String> cep, Consumer<String> bairro,
                        Consumer<String> cidade, Consumer<String> uf) {
            nome.accept(this.nome);
            email.accept(this.email);
            cpf.accept(this.cpf);
            telefone.accept(this.telefone);
            nascimento.accept(this.nascimento);
            rua.accept(this.rua);
            numero.accept(this.numero);
            complemento.accept(this.complemento);
            cep.accept(this.cep);
            bairro.accept(this.bairro);
            cidade.accept(this.cidade);
            uf.accept(this.uf);
        }
    }

    private Pessoa pessoa(Linha linha, List<String> erros, Set<String> emails, Set<String> cpfs, String quem,
                          Function<String, Boolean> emailExiste, Function<String, Boolean> cpfExiste) {
        Pessoa p = new Pessoa();
        p.nome = obrigatorio(linha, erros, "Informe o nome completo.", "nome completo", "nome");
        maximo(erros, p.nome, 150, "O nome completo deve ter no máximo 150 caracteres.");

        String email = obrigatorio(linha, erros, "Informe o e-mail.", "email", "e-mail");
        if (email != null) {
            email = email.toLowerCase(Locale.ROOT);
            if (!EMAIL.matcher(email).matches() || email.length() > 150) {
                erros.add("E-mail inválido: \"" + email + "\".");
            } else if (Boolean.TRUE.equals(emailExiste.apply(email))) {
                erros.add("Já existe um " + quem + " com o e-mail " + email + ".");
            } else if (!emails.add(email)) {
                erros.add("O e-mail " + email + " aparece mais de uma vez na planilha.");
            }
        }
        p.email = email;

        String cpf = obrigatorio(linha, erros, "Informe o CPF.", "cpf");
        if (cpf != null) {
            cpf = cpf.replaceAll("\\D", "");
            if (cpf.length() != 11) {
                erros.add("O CPF deve ter 11 números.");
            } else if (Boolean.TRUE.equals(cpfExiste.apply(cpf))) {
                erros.add("Já existe um " + quem + " com o CPF " + cpfFormatado(cpf) + ".");
            } else if (!cpfs.add(cpf)) {
                erros.add("O CPF " + cpfFormatado(cpf) + " aparece mais de uma vez na planilha.");
            }
        }
        p.cpf = cpf;

        String telefone = obrigatorio(linha, erros, "Informe o telefone.", "telefone", "celular", "fone");
        p.telefone = telefone == null ? null : telefoneFormatado(telefone);
        maximo(erros, p.telefone, 20, "O telefone deve ter no máximo 20 caracteres.");

        p.nascimento = data(linha, erros, true, "Data de nascimento", "nascimento");
        if (p.nascimento != null && p.nascimento.isAfter(LocalDate.now(FUSO))) {
            erros.add("A data de nascimento não pode ser no futuro.");
        }

        String cep = obrigatorio(linha, erros, "Informe o CEP.", "cep");
        if (cep != null) {
            String digitos = cep.replaceAll("\\D", "");
            if (!CEP.matcher(cep.trim()).matches() && digitos.length() != 8) {
                erros.add("CEP inválido: \"" + cep + "\" (ex.: 92010-000).");
            } else {
                cep = digitos.substring(0, 5) + "-" + digitos.substring(5);
            }
        }
        p.cep = cep;

        p.rua = obrigatorio(linha, erros, "Informe a rua.", "rua", "logradouro", "endereco");
        maximo(erros, p.rua, 150, "A rua deve ter no máximo 150 caracteres.");
        p.numero = obrigatorio(linha, erros, "Informe o número do endereço.", "numero", "n", "no");
        maximo(erros, p.numero, 10, "O número deve ter no máximo 10 caracteres.");
        p.complemento = linha.texto("complemento");
        maximo(erros, p.complemento, 100, "O complemento deve ter no máximo 100 caracteres.");
        p.bairro = obrigatorio(linha, erros, "Informe o bairro.", "bairro");
        maximo(erros, p.bairro, 100, "O bairro deve ter no máximo 100 caracteres.");
        p.cidade = obrigatorio(linha, erros, "Informe a cidade.", "cidade");
        maximo(erros, p.cidade, 100, "A cidade deve ter no máximo 100 caracteres.");

        String uf = obrigatorio(linha, erros, "Informe a UF (ex.: RS).", "uf", "estado");
        if (uf != null && !UF.matcher(uf).matches()) {
            erros.add("A UF deve ter 2 letras (ex.: RS).");
        }
        p.uf = uf == null ? null : uf.toUpperCase(Locale.ROOT);
        return p;
    }

    // ===== Leitura dos valores =====

    // Uma linha da planilha. Os nomes das colunas são comparados sem acento, sem maiúsculas
    // e sem espaços: "Data de Nascimento", "data_nascimento" e "datanascimento" valem igual.
    static final class Linha {
        private final Map<String, String> valores = new HashMap<>();
        private final int numero;

        Linha(Map<String, String> original, int numeroPadrao) {
            int n = numeroPadrao;
            if (original != null) {
                for (Map.Entry<String, String> e : original.entrySet()) {
                    if (e.getKey() == null) {
                        continue;
                    }
                    if ("_linha".equals(e.getKey())) {
                        try {
                            n = Integer.parseInt(String.valueOf(e.getValue()).trim());
                        } catch (NumberFormatException ignorado) {
                            // fica o número calculado pela posição
                        }
                        continue;
                    }
                    valores.put(coluna(e.getKey()), e.getValue());
                }
            }
            this.numero = n;
        }

        int numero() {
            return numero;
        }

        boolean vazia() {
            return valores.values().stream().allMatch(v -> v == null || v.isBlank());
        }

        // Primeiro valor preenchido entre as colunas com esses nomes
        String texto(String... nomes) {
            for (String nome : nomes) {
                String valor = valores.get(coluna(nome));
                if (valor != null && !valor.isBlank()) {
                    return valor.trim();
                }
            }
            return null;
        }

        static String coluna(String nome) {
            return chave(nome).replaceAll("[^a-z0-9]", "");
        }
    }

    private static String obrigatorio(Linha linha, List<String> erros, String mensagem, String... colunas) {
        String valor = linha.texto(colunas);
        if (valor == null) {
            erros.add(mensagem);
        }
        return valor;
    }

    private static void maximo(List<String> erros, String valor, int limite, String mensagem) {
        if (valor != null && valor.length() > limite) {
            erros.add(mensagem);
        }
    }

    // rotulo = nome da coluna no modelo (também vale como nome de coluna); colunas = outros nomes aceitos
    private static String valorDaColuna(Linha linha, String rotulo, String... colunas) {
        String[] todas = new String[colunas.length + 1];
        todas[0] = rotulo;
        System.arraycopy(colunas, 0, todas, 1, colunas.length);
        return linha.texto(todas);
    }

    private static Integer inteiro(Linha linha, List<String> erros, boolean obrigatorio, int minimo, int maximo,
                                   String rotulo, String... colunas) {
        String texto = valorDaColuna(linha, rotulo, colunas);
        if (texto == null) {
            if (obrigatorio) {
                erros.add("Preencha a coluna \"" + rotulo + "\".");
            }
            return null;
        }
        try {
            int valor = Integer.parseInt(texto.replaceAll("(?i)\\s*(h|horas?|min|minutos?|x)$", "").trim());
            if (valor < minimo || valor > maximo) {
                erros.add("\"" + rotulo + "\" deve ficar entre " + minimo + " e " + maximo + ".");
                return null;
            }
            return valor;
        } catch (NumberFormatException e) {
            erros.add("\"" + rotulo + "\" deve ser um número inteiro (veio \"" + texto + "\").");
            return null;
        }
    }

    private static LocalDate data(Linha linha, List<String> erros, boolean obrigatorio, String rotulo,
                                  String... colunas) {
        String texto = valorDaColuna(linha, rotulo, colunas);
        if (texto == null) {
            if (obrigatorio) {
                erros.add("Preencha a coluna \"" + rotulo + "\".");
            }
            return null;
        }
        LocalDate valor = lerData(texto);
        if (valor == null) {
            erros.add("\"" + rotulo + "\" com data inválida: \"" + texto + "\" (use dd/mm/aaaa).");
        }
        return valor;
    }

    // "15/03/2001" ou "2001-03-15"
    static LocalDate lerData(String texto) {
        String limpo = texto.trim();
        try {
            return limpo.contains("/") ? LocalDate.parse(limpo, DATA_BR) : LocalDate.parse(limpo);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    // "12.500,90", "12500,90", "12500.90" e "R$ 12.500,90" -> 12500.90
    static BigDecimal decimal(String texto) {
        String limpo = texto.replaceAll("(?i)r\\$|\\s", "");
        if (limpo.contains(",")) {
            limpo = limpo.replace(".", "").replace(",", ".");
        }
        try {
            return new BigDecimal(limpo).setScale(2, java.math.RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // sim / não (aceita também s, n, x, true, false, 1, 0)
    static Boolean simOuNao(String texto) {
        String valor = chave(texto);
        if (Set.of("sim", "s", "x", "true", "1", "yes").contains(valor)) {
            return true;
        }
        if (Set.of("nao", "n", "false", "0", "no").contains(valor)) {
            return false;
        }
        return null;
    }

    // Nomes que as pessoas costumam escrever -> tipo guardado. Vazio = videoaula.
    static String tipoDaAula(String texto) {
        if (texto == null) {
            return "video";
        }
        String valor = chave(texto).replaceAll("[^a-z]", "");
        return switch (valor) {
            case "video", "videoaula", "videoaulas" -> "video";
            case "leitura", "texto" -> "leitura";
            case "aovivo", "live" -> "ao_vivo";
            case "atividade", "exercicio", "tarefa" -> "atividade";
            default -> null;
        };
    }

    // 51999998888 -> (51) 99999-8888; 5133334444 -> (51) 3333-4444; outro formato fica como veio
    static String telefoneFormatado(String telefone) {
        String d = telefone.replaceAll("\\D", "");
        if (d.length() == 11) {
            return "(" + d.substring(0, 2) + ") " + d.substring(2, 7) + "-" + d.substring(7);
        }
        if (d.length() == 10) {
            return "(" + d.substring(0, 2) + ") " + d.substring(2, 6) + "-" + d.substring(6);
        }
        return telefone.trim();
    }

    private static String cpfFormatado(String cpf) {
        return cpf.substring(0, 3) + "." + cpf.substring(3, 6) + "." + cpf.substring(6, 9) + "-" + cpf.substring(9);
    }

    // minúsculas, sem acento e sem espaços nas pontas: "Análise " -> "analise"
    static String chave(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static String senhaSorteada() {
        byte[] bytes = new byte[18];
        SORTEIO.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
