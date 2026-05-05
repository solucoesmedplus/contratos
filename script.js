const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4jh-h8ExuLEEUhTA34kn8rzfibHqyNUiIu6rbII4VLa9gAoXRDX7f--v0KO5gHZX6/exec";

// ================= FUNÇÕES DE MODAL =================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    // Se for o modal de cadastro, gera o código randômico de 3 dígitos
    if (modalId === 'modalCadastro') {
        gerarCodigoRandomico();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Fechar modal ao clicar fora da caixa
window.onclick = function(event) {
    const modais = document.getElementsByClassName('modal-overlay');
    for (let i = 0; i < modais.length; i++) {
        if (event.target === modais[i]) {
            modais[i].classList.remove('active');
        }
    }
}

// ================= LÓGICA DE CADASTRO =================
function gerarCodigoRandomico() {
    const inputCodigo = document.getElementById('cadCodigo');
    // Gera um número entre 100 e 999
    const numero = Math.floor(Math.random() * 900) + 100;
    inputCodigo.value = numero;
}

function toggleDocType() {
    const tipo = document.querySelector('input[name="tipoDoc"]:checked').value;
    const labelDoc = document.getElementById('lblDoc');
    const inputDoc = document.getElementById('cadDoc');
    
    inputDoc.value = ''; // Limpa o campo ao trocar
    
    if (tipo === 'CNPJ') {
        labelDoc.innerText = 'CNPJ';
        inputDoc.placeholder = '00.000.000/0000-00';
        inputDoc.setAttribute('maxlength', '18');
    } else {
        labelDoc.innerText = 'CPF';
        inputDoc.placeholder = '000.000.000-00';
        inputDoc.setAttribute('maxlength', '14');
    }
}

function limparCadastro() {
    document.getElementById('formCadastro').reset();
    gerarCodigoRandomico(); // Gera um novo código após limpar
    toggleDocType(); // Reseta os labels de CPF/CNPJ
}

// FUNÇÃO ÚNICA E CORRETA PARA SALVAR
// Variável para controlar se estamos criando ou editando
let codigoEmEdicao = null; 

async function salvarCadastro(event) {
    const dados = {
        codigo: document.getElementById('cadCodigo').value,
        cliente: document.getElementById('cadCliente').value,
        tipoDoc: document.querySelector('input[name="tipoDoc"]:checked').value,
        documento: document.getElementById('cadDoc').value,
        nomeFantasia: document.getElementById('cadFantasia').value,
        equipamento: document.getElementById('cadEquipamento').value,
        tipoContrato: document.getElementById('cadTipoContrato').value,
        endereco: document.getElementById('cadEndereco').value,
        franquia: document.getElementById('cadFranquia').value,
        contato: document.getElementById('cadContato').value,
        telefone: document.getElementById('cadTelefone').value,
        dataRenovacao: document.getElementById('cadDataRenovacao').value,
        cancelamento: document.getElementById('cadCancelamento').value,
        comprovantes: document.getElementById('cadComprovantes').value,
        tipoCobranca: document.getElementById('cadTipoCobranca').value,
        debito: document.getElementById('cadDebito') ? document.getElementById('cadDebito').value : "" 
    };

    if (dados.cliente.trim() === '') {
        alert('Por favor, preencha pelo menos o nome do Cliente.');
        return;
    }

    const btn = event ? event.target : document.querySelector('.modal-footer button:last-child');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Processando...";
    }

    // Define qual ação enviar para o Google Sheets
    const acaoAtual = codigoEmEdicao ? 'atualizar' : 'inserir';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({ acao: acaoAtual, dados: dados }), // Agora enviamos a AÇÃO + DADOS
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });

        const resultado = await response.text();

        if (resultado.includes("sucesso")) {
            alert(`Contrato ${acaoAtual === 'inserir' ? 'registrado' : 'atualizado'} com sucesso!`);
            closeModal('modalCadastro');
            limparCadastro(); 
            
            // Se estava editando, reseta a interface para o modo "Novo Cadastro"
            codigoEmEdicao = null;
            document.querySelector('#modalCadastro h2').innerText = "Cadastro de Cliente e Equipamento";
            if (btn) btn.innerHTML = '<span class="btn-text">💾 Cadastrar</span>';
            
            // Recarrega os dados da pesquisa se ela estiver aberta no fundo
            carregarDados();
        } else {
            alert('Aviso do Servidor: ' + resultado);
        }
    } catch (error) {
        alert('Erro de Conexão: Verifique a URL do Script.');
    } finally {
        if (btn && !codigoEmEdicao) {
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-text">💾 Cadastrar</span>';
        }
    }
}

// ================= LÓGICA DE PESQUISA =================
function limparPesquisa() {
    document.getElementById('filtroTipo').value = '';
    document.getElementById('termoPesquisa').value = '';
    document.getElementById('termoPesquisa').focus();
}

// ================= MÁSCARAS E VALIDAÇÕES (Vanilla JS) =================

// Máscara Dinâmica para CPF e CNPJ
function maskDoc(input) {
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é número
    const tipo = document.querySelector('input[name="tipoDoc"]:checked').value;

    if (tipo === 'CPF') {
        if (value.length > 11) value = value.substring(0, 11);
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        if (value.length > 14) value = value.substring(0, 14);
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    input.value = value;
}

// Máscara para Telefone (Celular e Fixo)
function maskPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);

    if (value.length > 10) {
        // Celular (11 dígitos)
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 5) {
        // Fixo (10 dígitos)
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    }

    input.value = value;
}

// ================= VARIÁVEIS GLOBAIS E AUTOLOAD =================
let contratosGerais = []; // Memória local para os dados da planilha

// Atualiza a função openModal existente para carregar os dados ao abrir
const openModalAntigo = openModal;
openModal = function(modalId) {
    openModalAntigo(modalId); // Roda o comportamento original
    if (modalId === 'modalPesquisa') {
        carregarDados();
    }
}

// ================= LÓGICA DE BUSCA NO BACK-END =================
let direcaoOrdenacao = 1; // 1 para ASC, -1 para DESC
let ultimaColunaOrdenada = 'CLIENTE';

async function carregarDados() {
    const tbody = document.getElementById('tabelaResultados');
    tbody.innerHTML = '<tr><td colspan="16" class="empty-state">Buscando contratos no servidor... ⏳</td></tr>';

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        
        // Salva na memória global
        contratosGerais = data; 

        // PADRONIZAÇÃO: Ordena por CLIENTE (A-Z) logo no carregamento
        contratosGerais.sort((a, b) => {
            const valA = (a['CLIENTE'] || '').toString().toLowerCase();
            const valB = (b['CLIENTE'] || '').toString().toLowerCase();
            return valA.localeCompare(valB);
        });

        renderizarTabela(contratosGerais);
        
        // Marca visualmente que a coluna CLIENTE está ordenada
        const ths = document.querySelectorAll('.futuristic-table thead th');
        ths.forEach(th => {
            if(th.innerText === 'CLIENTE') th.classList.add('sort-asc');
        });

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="16" class="empty-state" style="color: #ff4545;">Erro ao conectar com a base de dados.</td></tr>';
    }
}

function ordenarTabela(elemento, coluna) {
    // Inverte a direção se clicar na mesma coluna, senão começa com ASC
    if (ultimaColunaOrdenada === coluna) {
        direcaoOrdenacao *= -1;
    } else {
        direcaoOrdenacao = 1;
        ultimaColunaOrdenada = coluna;
    }

    // Atualiza classes visuais nos THs
    const ths = document.querySelectorAll('.futuristic-table thead th');
    ths.forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    elemento.classList.add(direcaoOrdenacao === 1 ? 'sort-asc' : 'sort-desc');

    // Lógica de comparação inteligente
    contratosGerais.sort((a, b) => {
        let valA = a[coluna] || '';
        let valB = b[coluna] || '';

        // Se for número (ex: Código ou Franquia), converte para comparar
        if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            return (Number(valA) - Number(valB)) * direcaoOrdenacao;
        }

        // Se for data
        if (coluna === 'DATA_RENOVACAO') {
            return (new Date(valA) - new Date(valB)) * direcaoOrdenacao;
        }

        // Comparação de texto (Alfabética)
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
        
        return valA.localeCompare(valB) * direcaoOrdenacao;
    });

    renderizarTabela(contratosGerais);
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('tabelaResultados');
    tbody.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="empty-state">Nenhum registro encontrado.</td></tr>';
        return;
    }

    dados.forEach(contrato => {
        const tr = document.createElement('tr');
        
        // Formata a data para o padrão brasileiro
        const dataFormatada = contrato.DATA_RENOVACAO ? 
            new Date(contrato.DATA_RENOVACAO).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';

        tr.innerHTML = `
            <td class="action-cells">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhprNvUSaf_9NtktdIAp4ed4ce9_ykKfQ0xx57TClS19TUafNGRTjf_tGlqutY_kGWZRsdKoDNIz5GCjWuD_uVrAmXWjqvOlIeVFWjwOvC2ewZYBuB-4BLzXvX_3IW63iaj8HzzOuNMw249lpNdcVgWKceydKRdCC728U0_OfvhCaw2vrbTx5XB1YEr6cBF/s16000/editar.webp" class="icon-btn" onclick="editarContrato('${contrato.CÓDIGO}')">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgSt2Tly0v-6nc2v-sag_s4_c_GoXujXz5-MfpNC6qrAwfax3VQ_jsH51i1yyDMEffnePLPg1j7z4PiC-Xo3U4vmRoDpoY1f75VjWp5eGiBS8qsZZs3-_etXbjBOxFBc_UFTFhrddmoIRg2h8KKt9eGdCO1yDtsbCF7LP_2fchd_qCDfpiq0LcVZ1NS9eTi/s16000/limpar.webp" class="icon-btn" onclick="excluirContrato('${contrato.CÓDIGO}')">
            </td>
            <td>${contrato.CÓDIGO || ''}</td>
            <td>${contrato.CLIENTE || ''}</td>
            <td>${contrato.DOCUMENTO || ''}</td>
            <td>${contrato.NOME_FANTASIA || ''}</td>
            <td>${contrato.EQUIPAMENTO || ''}</td>
            <td>${contrato.TIPO_CONTRATO || ''}</td>
            <td>${contrato.ENDERECO_INSTALACAO || ''}</td>
            <td>${contrato.FRANQUIA_MES || ''}</td>
            <td>${contrato.CONTATO || ''}</td>
            <td>${contrato.TELEFONE || ''}</td>
            <td>${dataFormatada}</td>
            <td>${contrato.CANCELAMENTO || ''}</td>
            <td>${contrato.COMPROVANTES || ''}</td>
            <td>${contrato.TIPO_COBRANCA || ''}</td>
            <td style="text-align: center;">
                <input type="checkbox" class="check-inadimplente" onchange="toggleInadimplencia(this, '${contrato.CÓDIGO}')">
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para aplicar a cor na linha ao marcar o checkbox
function toggleInadimplencia(checkbox, codigo) {
    const linha = checkbox.closest('tr');
    if (checkbox.checked) {
        linha.classList.add('linha-inadimplente');
    } else {
        linha.classList.remove('linha-inadimplente');
    }
    // Dica: Futuramente podemos salvar esse estado 'Inadimplente' na planilha também.
}

// ================= FILTROS E PESQUISA DINÂMICA =================
function mudarFiltro() {
    const input = document.getElementById('termoPesquisa');
    input.value = ''; // Limpa o campo de busca ao trocar o tipo de filtro
    filtrarPesquisa();
    input.focus();
}

function maskPesquisa(input) {
    const tipo = document.getElementById('filtroTipo').value;
    let value = input.value;

    if (tipo === 'CNPJ') {
        value = value.replace(/\D/g, '');
        if (value.length > 14) value = value.substring(0, 14);
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
        input.value = value;
    } else if (tipo === 'ClienteCPF') {
        value = value.replace(/\D/g, '');
        if (value.length > 11) value = value.substring(0, 11);
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        input.value = value;
    }
    
    // Filtra instantaneamente enquanto o usuário digita
    filtrarPesquisa(); 
}

function filtrarPesquisa() {
    const termo = document.getElementById('termoPesquisa').value.toLowerCase();
    const filtroTipo = document.getElementById('filtroTipo').value;

    const dadosFiltrados = contratosGerais.filter(contrato => {
        // Se houver um filtro específico selecionado
        if (filtroTipo && termo) {
            let valorAlvo = '';
            switch(filtroTipo) {
                case 'Cidade': valorAlvo = contrato.ENDERECO_INSTALACAO || ''; break;
                case 'Cliente': valorAlvo = contrato.CLIENTE || ''; break;
                case 'CNPJ': valorAlvo = contrato.DOCUMENTO || ''; break;
                case 'ContratoCPF': valorAlvo = contrato.DOCUMENTO || ''; break;
                case 'NomeFantasia': valorAlvo = contrato.NOME_FANTASIA || ''; break;
                case 'TipoContrato': valorAlvo = contrato.TIPO_CONTRATO || ''; break;
            }
            return valorAlvo.toString().toLowerCase().includes(termo);
        }

        // Se nenhum filtro estiver selecionado, pesquisa globalmente em todas as colunas
        return Object.values(contrato).some(valor => 
            valor && valor.toString().toLowerCase().includes(termo)
        );
    });

    renderizarTabela(dadosFiltrados);
}

// Redefine a função limparPesquisa antiga
function limparPesquisa() {
    document.getElementById('filtroTipo').value = '';
    document.getElementById('termoPesquisa').value = '';
    renderizarTabela(contratosGerais); // Devolve todos os registros para a tela
    document.getElementById('termoPesquisa').focus();
}

// ================= BOTÕES DE AÇÃO =================
function editarContrato(codigo) {
    // Procura todos os dados do contrato na memória que puxamos da planilha
    const contrato = contratosGerais.find(c => c.CÓDIGO == codigo);
    if (!contrato) return;

    // Avisa o sistema que estamos no modo "Edição"
    codigoEmEdicao = codigo;

    // Preenche os campos do formulário
    document.getElementById('cadCodigo').value = contrato.CÓDIGO || '';
    document.getElementById('cadCliente').value = contrato.CLIENTE || '';
    document.getElementById('cadFantasia').value = contrato.NOME_FANTASIA || '';
    document.getElementById('cadEquipamento').value = contrato.EQUIPAMENTO || '';
    document.getElementById('cadTipoContrato').value = contrato.TIPO_CONTRATO || '';
    document.getElementById('cadEndereco').value = contrato.ENDERECO_INSTALACAO || '';
    document.getElementById('cadFranquia').value = contrato.FRANQUIA_MES || '';
    document.getElementById('cadContato').value = contrato.CONTATO || '';
    document.getElementById('cadTelefone').value = contrato.TELEFONE || '';
    document.getElementById('cadCancelamento').value = contrato.CANCELAMENTO || '';
    document.getElementById('cadComprovantes').value = contrato.COMPROVANTES || '';
    document.getElementById('cadTipoCobranca').value = contrato.TIPO_COBRANCA || '';
    if(document.getElementById('cadDebito')) document.getElementById('cadDebito').value = contrato.DEBITO || '';

    // Formata e preenche a data
    if (contrato.DATA_RENOVACAO) {
        const dataFormatada = new Date(contrato.DATA_RENOVACAO).toISOString().split('T')[0];
        document.getElementById('cadDataRenovacao').value = dataFormatada;
    }

    // Seleciona o botão de rádio correto (CNPJ ou CPF)
    const docValue = contrato.DOCUMENTO || '';
    document.getElementById('cadDoc').value = docValue;
    if (docValue.length > 14 || contrato.TIPO_DOC === 'CNPJ') {
        document.querySelector('input[name="tipoDoc"][value="CNPJ"]').checked = true;
    } else {
        document.querySelector('input[name="tipoDoc"][value="CPF"]').checked = true;
    }
    toggleDocType(); // Atualiza a máscara no visual

    // Altera o título e o botão do modal
    document.querySelector('#modalCadastro h2').innerText = `Editar Contrato: ${codigo}`;
    const btnSalvar = document.querySelector('.modal-footer button:last-child');
    if(btnSalvar) btnSalvar.innerHTML = '<span class="btn-text">🔄 Atualizar</span>';

    // Fecha a pesquisa e abre o modal de cadastro já preenchido
    closeModal('modalPesquisa');
    document.getElementById('modalCadastro').classList.add('active');
}

async function excluirContrato(codigo) {
    if(confirm(`ATENÇÃO: Tem certeza que deseja excluir o contrato ${codigo} do banco de dados? Essa ação não pode ser desfeita.`)) {
        
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify({ acao: 'deletar', dados: { codigo: codigo } }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            
            const resultado = await response.text();
            
            if (resultado.includes("sucesso")) {
                alert("Contrato excluído com sucesso!");
                carregarDados(); // Recarrega a tabela na hora para o contrato sumir da tela
            } else {
                alert('Erro no Servidor: ' + resultado);
            }
        } catch (error) {
            alert('Erro de Conexão ao tentar excluir.');
        }
    }
}

//PRELOADER
// Remove o Preloader após o carregamento completo da página
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');

    // Pequeno delay para garantir que a renderização foi concluída
    setTimeout(() => {
        preloader.classList.add('loaded');
    }, 1000);
});
