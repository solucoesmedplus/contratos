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
        status: document.getElementById('cadStatus').value 
    };

    if (dados.cliente.trim() === '') {
        alert('Por favor, preencha pelo menos o nome do Cliente.');
        return;
    }

    const btn = event ? event.target : document.querySelector('.modal-footer button:last-child');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "⏳ Processando...";
    }

    const acaoAtual = codigoEmEdicao ? 'atualizar' : 'inserir';

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
            if (btn) btn.innerHTML = '<span class="btn-text">💾 Cadastrar</span>';
            
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
    tbody.innerHTML = '<tr><td colspan="17" class="empty-state">Buscando contratos no servidor... ⏳</td></tr>';

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
        tbody.innerHTML = '<tr><td colspan="17" class="empty-state" style="color: #ff4545;">Erro ao conectar com a base de dados.</td></tr>';
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
        let valA = a[coluna] || '';
        let valB = b[coluna] || '';

        if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            return (Number(valA) - Number(valB)) * direcaoOrdenacao;
        }

        if (coluna === 'DATA_RENOVACAO') {
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
        tbody.innerHTML = '<tr><td colspan="17" class="empty-state">Nenhum registro encontrado.</td></tr>';
        return;
    }

    dados.forEach(contrato => {
        const tr = document.createElement('tr');
        const dataFormatada = contrato.DATA_RENOVACAO ? new Date(contrato.DATA_RENOVACAO).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';

        const isInadimplente = contrato.INADIMPLENTE === "SIM";
        if (isInadimplente) {
            tr.classList.add('linha-inadimplente');
        }
        const checkedAttr = isInadimplente ? 'checked' : '';

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
            <td>${contrato.STATUS || ''}</td>
            <td style="text-align: center;">
                <input type="checkbox" class="check-inadimplente" ${checkedAttr} onchange="toggleInadimplencia(this, '${contrato.CÓDIGO}')">
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
    document.getElementById('cadDoc').value = docValue;
    if (docValue.length > 14 || contrato.TIPO_DOC === 'CNPJ') {
        document.querySelector('input[name="tipoDoc"][value="CNPJ"]').checked = true;
    } else {
        document.querySelector('input[name="tipoDoc"][value="CPF"]').checked = true;
    }
    toggleDocType(); 

    document.querySelector('#modalCadastro h2').innerText = `Editar Contrato: ${codigo}`;
    const btnSalvar = document.querySelector('.modal-footer button:last-child');
    if(btnSalvar) btnSalvar.innerHTML = '<span class="btn-text">🔄 Atualizar</span>';

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