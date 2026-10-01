const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4jh-h8ExuLEEUhTA34kn8rzfibHqyNUiIu6rbII4VLa9gAoXRDX7f--v0KO5gHZX6/exec";

// ================= FUNÇÕES DE MODAL =================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    document.querySelectorAll('.modal-overlay.active').forEach(item => {
        if (item.id !== modalId) item.classList.remove('active');
    });

    modal.classList.add('active');
    document.body.classList.add('modal-open');

    // Se for o modal de cadastro, gera o código randômico de 3 dígitos
    // apenas quando não estivermos editando um contrato.
    if (modalId === 'modalCadastro' && !codigoEmEdicao) {
        gerarCodigoRandomico();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');

    if (!document.querySelector('.modal-overlay.active')) {
        document.body.classList.remove('modal-open');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
    document.body.classList.remove('modal-open');
}

// Fechar modal ao clicar fora da caixa (desktop)
window.addEventListener('click', function(event) {
    const modal = event.target.closest('.modal-overlay');
    if (modal && event.target === modal && window.innerWidth > 700) {
        closeModal(modal.id);
    }
});

// Atalho de teclado para fechar a tela atual
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modalAtivo = document.querySelector('.modal-overlay.active');
        if (modalAtivo) closeModal(modalAtivo.id);
    }
});

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
    atualizarCampoGarantia();
    gerarCodigoRandomico(); // Gera um novo código após limpar
    toggleDocType(); // Reseta os labels de CPF/CNPJ
}

function atualizarCampoGarantia() {
    const venda = document.getElementById('cadTipoContrato').value === 'VENDA';
    const grupo = document.getElementById('grupoFimGarantia');
    const campo = document.getElementById('cadFimGarantia');
    grupo.hidden = !venda;
    campo.disabled = !venda;
    if (!venda) campo.value = '';
}

function dataParaInput(valor) {
    if (!valor) return '';
    const texto = String(valor);
    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
    const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
    return brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : '';
}

function exibirDataGarantia(valor) {
    const data = dataParaInput(valor);
    return data ? `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}` : '';
}

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
        dataFimGarantia: document.getElementById('cadTipoContrato').value === 'VENDA'
            ? document.getElementById('cadFimGarantia').value : '',
        endereco: document.getElementById('cadEndereco').value,
        franquia: document.getElementById('cadFranquia').value,
        contato: document.getElementById('cadContato').value,
        telefone: document.getElementById('cadTelefone').value,
        dataRenovacao: document.getElementById('cadDataRenovacao').value,
        cancelamento: document.getElementById('cadCancelamento').value,
        comprovantes: document.getElementById('cadComprovantes').value,
        tipoCobranca: document.getElementById('cadTipoCobranca').value,
        status: document.getElementById('cadStatus').value 
    };

    if (dados.cliente.trim() === '') {
        alert('Por favor, preencha pelo menos o nome do Cliente.');
        return;
    }

    const btn = event ? event.target : document.querySelector('.modal-footer button:last-child');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-text">Processando...</span>';
    }

    const acaoAtual = codigoEmEdicao ? 'atualizar' : 'inserir';

    // NOVA TRAVA DE DUPLICIDADE NO FRONT-END
    if (acaoAtual === 'inserir') {
        const codigoDigitado = document.getElementById('cadCodigo').value;
        // Verifica se o código já existe na lista de contratos que já carregamos
        const codigoJaExiste = contratosGerais.some(c => c.CÓDIGO == codigoDigitado);
        
        if (codigoJaExiste) {
            alert('⚠️ Atenção: Este CÓDIGO já está em uso! Clique em "Limpar" ou gere um novo código antes de cadastrar.');
            return; // Interrompe o envio
        }
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({ acao: acaoAtual, dados: dados }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });

        const resultado = await response.text();

        if (resultado.includes("sucesso")) {
            alert(`Contrato ${acaoAtual === 'inserir' ? 'registrado' : 'atualizado'} com sucesso!`);
            closeModal('modalCadastro');
            limparCadastro(); 
            
            codigoEmEdicao = null;
            document.querySelector('#modalCadastro h2').innerText = "Cadastro de Cliente e Equipamento";
            if (btn) btn.innerHTML = '<span class="btn-text">Cadastrar</span>';
            
            carregarDados();
        } else {
            alert('Aviso do Servidor: ' + resultado);
        }
    } catch (error) {
        alert('Erro de Conexão: Verifique a URL do Script.');
    } finally {
        if (btn && !codigoEmEdicao) {
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-text">Cadastrar</span>';
        }
    }
}

// ================= MÁSCARAS E VALIDAÇÕES (Vanilla JS) =================

function maskDoc(input) {
    let value = input.value.replace(/\D/g, ''); 
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

function maskPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);

    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    }

    input.value = value;
}

// ================= VARIÁVEIS GLOBAIS E AUTOLOAD =================
let contratosGerais = []; 

// Atualiza a função openModal existente para carregar os dados ao abrir
const openModalOriginal = openModal;
openModal = function(modalId) {
    openModalOriginal(modalId);
    if (modalId === 'modalPesquisa') {
        carregarDados();
    }
};

// ================= LÓGICA DE BUSCA NO BACK-END =================
let direcaoOrdenacao = 1; 
let ultimaColunaOrdenada = 'CLIENTE';

async function carregarDados() {
    const tbody = document.getElementById('tabelaResultados');
    tbody.innerHTML = '<tr><td colspan="18" class="empty-state">Buscando contratos no servidor... ⏳</td></tr>';

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        
        contratosGerais = data; 

        contratosGerais.sort((a, b) => {
            const valA = (a['CLIENTE'] || '').toString().toLowerCase();
            const valB = (b['CLIENTE'] || '').toString().toLowerCase();
            return valA.localeCompare(valB);
        });

        renderizarTabela(contratosGerais);
        
        const ths = document.querySelectorAll('.futuristic-table thead th');
        ths.forEach(th => {
            if(th.innerText === 'CLIENTE') th.classList.add('sort-asc');
        });

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="18" class="empty-state" style="color: #ff4545;">Erro ao conectar com a base de dados.</td></tr>';
    }
}

function ordenarTabela(elemento, coluna) {
    if (ultimaColunaOrdenada === coluna) {
        direcaoOrdenacao *= -1;
    } else {
        direcaoOrdenacao = 1;
        ultimaColunaOrdenada = coluna;
    }

    const ths = document.querySelectorAll('.futuristic-table thead th');
    ths.forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    elemento.classList.add(direcaoOrdenacao === 1 ? 'sort-asc' : 'sort-desc');

    contratosGerais.sort((a, b) => {
        let valA = a[coluna] || (coluna === 'TÉRMINO_GARANTIA' ? a.DATA_FIM_GARANTIA : '') || '';
        let valB = b[coluna] || (coluna === 'TÉRMINO_GARANTIA' ? b.DATA_FIM_GARANTIA : '') || '';

        if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            return (Number(valA) - Number(valB)) * direcaoOrdenacao;
        }

        if (coluna === 'DATA_RENOVACAO' || coluna === 'TÉRMINO_GARANTIA') {
            return (new Date(valA) - new Date(valB)) * direcaoOrdenacao;
        }

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
        tbody.innerHTML = '<tr><td colspan="18" class="empty-state">Nenhum registro encontrado.</td></tr>';
        return;
    }

    dados.forEach(contrato => {
        const tr = document.createElement('tr');
        
        // 1. Verifica Inadimplência (Cor Vermelha)
        const isInadimplente = contrato.INADIMPLENTE === "SIM";
        if (isInadimplente) {
            tr.classList.add('linha-inadimplente');
        }

        // 2. NOVA REGRA: Verifica Status Cancelado (Cor Amarela)
        // Se estiver cancelado, a classe 'linha-cancelada' será aplicada
        if (contrato.STATUS === "Cancelado") {
            tr.classList.add('linha-cancelada');
        }

        const dataFormatada = contrato.DATA_RENOVACAO ? new Date(contrato.DATA_RENOVACAO).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';
        const checkedAttr = isInadimplente ? 'checked' : '';

        const statusAtual = contrato.STATUS || '';
        const statusClass = statusAtual === 'Ativo' ? 'ativo' : (statusAtual === 'Cancelado' ? 'cancelado' : 'neutro');

        tr.innerHTML = `
            <td class="action-cells" data-label="Ações">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhprNvUSaf_9NtktdIAp4ed4ce9_ykKfQ0xx57TClS19TUafNGRTjf_tGlqutY_kGWZRsdKoDNIz5GCjWuD_uVrAmXWjqvOlIeVFWjwOvC2ewZYBuB-4BLzXvX_3IW63iaj8HzzOuNMw249lpNdcVgWKceydKRdCC728U0_OfvhCaw2vrbTx5XB1YEr6cBF/s16000/editar.webp" class="icon-btn" onclick="editarContrato('${contrato.CÓDIGO}')" alt="Editar" title="Editar contrato">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgSt2Tly0v-6nc2v-sag_s4_c_GoXujXz5-MfpNC6qrAwfax3VQ_jsH51i1yyDMEffnePLPg1j7z4PiC-Xo3U4vmRoDpoY1f75VjWp5eGiBS8qsZZs3-_etXbjBOxFBc_UFTFhrddmoIRg2h8KKt9eGdCO1yDtsbCF7LP_2fchd_qCDfpiq0LcVZ1NS9eTi/s16000/limpar.webp" class="icon-btn" onclick="excluirContrato('${contrato.CÓDIGO}')" alt="Excluir" title="Excluir contrato">
            </td>
            <td data-label="Código">${contrato.CÓDIGO || ''}</td>
            <td data-label="Cliente">${contrato.CLIENTE || ''}</td>
            <td data-label="Documento">${contrato.DOCUMENTO || ''}</td>
            <td data-label="Nome fantasia">${contrato.NOME_FANTASIA || ''}</td>
            <td data-label="Equipamento">${contrato.EQUIPAMENTO || ''}</td>
            <td data-label="Tipo contrato">${contrato.TIPO_CONTRATO || ''}</td>
            <td data-label="Término da garantia">${contrato.TIPO_CONTRATO === 'VENDA' ? exibirDataGarantia((contrato['TÉRMINO_GARANTIA'] || contrato.DATA_FIM_GARANTIA)) : ''}</td>
            <td data-label="Endereço">${contrato.ENDERECO_INSTALACAO || ''}</td>
            <td data-label="Franquia / mês">${contrato.FRANQUIA_MES || ''}</td>
            <td data-label="Contato">${contrato.CONTATO || ''}</td>
            <td data-label="Telefone">${contrato.TELEFONE || ''}</td>
            <td data-label="Renovação">${dataFormatada}</td>
            <td data-label="Cancelamento">${contrato.CANCELAMENTO || ''}</td>
            <td data-label="Comprovantes">${contrato.COMPROVANTES || ''}</td>
            <td data-label="Tipo cobrança">${contrato.TIPO_COBRANCA || ''}</td>
            <td data-label="Status"><span class="status-pill ${statusClass}">${statusAtual || 'Não informado'}</span></td>
            <td data-label="Inadimplente">
            <input type="checkbox" class="check-inadimplente" ${checkedAttr} onchange="toggleInadimplencia(this, '${contrato.CÓDIGO}')" aria-label="Marcar contrato ${contrato.CÓDIGO || ''} como inadimplente">
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para aplicar a cor na linha e mantê-la salva no banco
async function toggleInadimplencia(checkbox, codigo) {
    const linha = checkbox.closest('tr');
    const statusInadimplencia = checkbox.checked ? "SIM" : ""; 

    if (checkbox.checked) {
        linha.classList.add('linha-inadimplente');
    } else {
        linha.classList.remove('linha-inadimplente');
    }

    const index = contratosGerais.findIndex(c => c.CÓDIGO == codigo);
    if (index !== -1) {
        contratosGerais[index].INADIMPLENTE = statusInadimplencia;
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({
                acao: 'atualizarInadimplencia',
                dados: { 
                    codigo: codigo, 
                    inadimplente: statusInadimplencia 
                }
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        console.log(`Inadimplência do contrato ${codigo} salva como: ${statusInadimplencia}`);
    } catch (error) {
        console.error("Erro ao salvar o status de inadimplência:", error);
        alert("Aviso: Houve um erro ao salvar o status de inadimplência na planilha.");
    }
}

// ================= FILTROS E PESQUISA DINÂMICA =================
function mudarFiltro() {
    const input = document.getElementById('termoPesquisa');
    if(input) {
        input.value = ''; 
        input.focus();
    }
    filtrarPesquisa();
}

function maskPesquisa(input) {
    const filtroElement = document.getElementById('filtroTipo');
    const tipo = filtroElement ? filtroElement.value : ''; 
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
    
    filtrarPesquisa(); 
}

function filtrarPesquisa() {
    const inputPesquisa = document.getElementById('termoPesquisa');
    if (!inputPesquisa) return; 

    const termo = inputPesquisa.value.toLowerCase();
    const filtroElement = document.getElementById('filtroTipo');
    const filtroTipo = filtroElement ? filtroElement.value : '';

    const dadosFiltrados = contratosGerais.filter(contrato => {
        if (filtroTipo && termo) {
            let valorAlvo = '';
            switch(filtroTipo) {
                case 'Cidade': valorAlvo = contrato.ENDERECO_INSTALACAO || ''; break;
                case 'Cliente': valorAlvo = contrato.CLIENTE || ''; break;
                case 'CNPJ': valorAlvo = contrato.DOCUMENTO || ''; break;
                case 'ClienteCPF': valorAlvo = contrato.DOCUMENTO || ''; break;
                case 'NomeFantasia': valorAlvo = contrato.NOME_FANTASIA || ''; break;
                case 'TipoContrato': valorAlvo = contrato.TIPO_CONTRATO || ''; break;
                case 'STATUS': valorAlvo = contrato.STATUS || ''; break;
            }
            return valorAlvo.toString().toLowerCase().includes(termo);
        }

        return Object.values(contrato).some(valor => 
            valor !== null && valor !== undefined && valor.toString().toLowerCase().includes(termo)
        );
    });

    renderizarTabela(dadosFiltrados);
}

function limparPesquisa() {
    const filtroElement = document.getElementById('filtroTipo');
    if (filtroElement) filtroElement.value = ''; 
    
    const inputPesquisa = document.getElementById('termoPesquisa');
    if (inputPesquisa) {
        inputPesquisa.value = '';
        inputPesquisa.focus();
    }
    
    renderizarTabela(contratosGerais); 
}

// ================= BOTÕES DE AÇÃO =================
function editarContrato(codigo) {
    const contrato = contratosGerais.find(c => c.CÓDIGO == codigo);
    if (!contrato) return;

    codigoEmEdicao = codigo;

    document.getElementById('cadCodigo').value = contrato.CÓDIGO || '';
    document.getElementById('cadCliente').value = contrato.CLIENTE || '';
    document.getElementById('cadFantasia').value = contrato.NOME_FANTASIA || '';
    document.getElementById('cadEquipamento').value = contrato.EQUIPAMENTO || '';
    document.getElementById('cadTipoContrato').value = contrato.TIPO_CONTRATO || '';
    atualizarCampoGarantia();
    document.getElementById('cadFimGarantia').value = dataParaInput((contrato['TÉRMINO_GARANTIA'] || contrato.DATA_FIM_GARANTIA));
    document.getElementById('cadEndereco').value = contrato.ENDERECO_INSTALACAO || '';
    document.getElementById('cadFranquia').value = contrato.FRANQUIA_MES || '';
    document.getElementById('cadContato').value = contrato.CONTATO || '';
    document.getElementById('cadTelefone').value = contrato.TELEFONE || '';
    document.getElementById('cadCancelamento').value = contrato.CANCELAMENTO || '';
    document.getElementById('cadComprovantes').value = contrato.COMPROVANTES || '';
    document.getElementById('cadTipoCobranca').value = contrato.TIPO_COBRANCA || '';
    document.getElementById('cadStatus').value = contrato.STATUS || '';

    if (contrato.DATA_RENOVACAO) {
        const dataFormatada = new Date(contrato.DATA_RENOVACAO).toISOString().split('T')[0];
        document.getElementById('cadDataRenovacao').value = dataFormatada;
    }

    const docValue = contrato.DOCUMENTO || '';
    if (docValue.length > 14 || contrato.TIPO_DOC === 'CNPJ') {
        document.querySelector('input[name="tipoDoc"][value="CNPJ"]').checked = true;
    } else {
        document.querySelector('input[name="tipoDoc"][value="CPF"]').checked = true;
    }
    toggleDocType();
    document.getElementById('cadDoc').value = docValue;

    document.querySelector('#modalCadastro h2').innerText = `Editar Contrato: ${codigo}`;
    const btnSalvar = document.querySelector('.modal-footer button:last-child');
    if(btnSalvar) btnSalvar.innerHTML = '<span class="btn-text">Atualizar</span>';

    closeModal('modalPesquisa');
    document.getElementById('modalCadastro').classList.add('active');
}

async function excluirContrato(codigo) {
    if(confirm(`ATENÇÃO: Tem certeza que deseja excluir o contrato ${codigo}?`)) {
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
                carregarDados();
            } else {
                alert('Erro no Servidor: ' + resultado);
            }
        } catch (error) {
            alert('Erro de Conexão ao tentar excluir.');
        }
    }
}

// PRELOADER
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        if (preloader) preloader.classList.add('loaded');
    }, 1000);
});

//PRELOADER
// Remove o Preloader após o carregamento completo da página
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');

    // Pequeno delay para garantir que a renderização foi concluída
    setTimeout(() => {
        preloader.classList.add('loaded');
    }, 1000);
});
