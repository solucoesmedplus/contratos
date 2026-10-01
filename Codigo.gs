const SPREADSHEET_ID = "10a45h_2Q61vukwukcS6VzG7mGLPV7nlGnyv8H51763w";
const CABECALHO_GARANTIA = 'TÉRMINO_GARANTIA';

function normalizarCabecalho(valor) {
  return String(valor || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
}

function cabecalhosDaPlanilha(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function indiceColuna(cabecalhos, nome) {
  return cabecalhos.findIndex(c => normalizarCabecalho(c) === normalizarCabecalho(nome));
}

function obterPlanilha() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('CADASTRO');
  if (!sheet) throw new Error('A aba CADASTRO não foi encontrada.');
  return sheet;
}

// Reutiliza a coluna antiga com suas datas ou cria a nova, sem apagar registros.
function colunaFimGarantia(sheet) {
  const cabecalhos = cabecalhosDaPlanilha(sheet);
  const tipo = indiceColuna(cabecalhos, 'TIPO_CONTRATO');
  if (tipo < 0) throw new Error('O cabeçalho TIPO_CONTRATO não foi encontrado.');
  let garantia = indiceColuna(cabecalhos, CABECALHO_GARANTIA);
  if (garantia < 0) garantia = indiceColuna(cabecalhos, 'DATA_FIM_GARANTIA');

  if (garantia < 0) {
    sheet.insertColumnAfter(tipo + 1);
  } else if (garantia !== tipo + 1) {
    // O destino usa as posições ANTES da movimentação das colunas.
    sheet.moveColumns(sheet.getRange(1, garantia + 1), tipo + 2);
  }
  const coluna = indiceColuna(cabecalhosDaPlanilha(sheet), 'TIPO_CONTRATO') + 2;
  sheet.getRange(1, coluna).setValue(CABECALHO_GARANTIA);
  return coluna;
}

// Execute esta função uma vez no editor depois de atualizar a implantação.
function prepararColunaGarantia() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const coluna = colunaFimGarantia(obterPlanilha());
    Logger.log('Coluna ' + CABECALHO_GARANTIA + ' pronta na posição ' + coluna + '.');
  } finally {
    if (lock.hasLock()) {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
  }
}

function respostaTexto(texto) {
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.TEXT);
}

function dadosParaColunas(dados, sheet) {
  let garantia = '';
  if (dados.tipoContrato === 'VENDA' && dados.dataFimGarantia) {
    const texto = String(dados.dataFimGarantia);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new Error('Data de término da garantia inválida.');
    const zona = sheet.getParent().getSpreadsheetTimeZone();
    garantia = Utilities.parseDate(texto, zona, 'yyyy-MM-dd');
    if (Utilities.formatDate(garantia, zona, 'yyyy-MM-dd') !== texto) {
      throw new Error('Data de término da garantia inválida.');
    }
  }
  return {
    'CÓDIGO': dados.codigo, 'CLIENTE': dados.cliente,
    'TIPO_DOC': dados.tipoDoc, 'DOCUMENTO': dados.documento,
    'NOME_FANTASIA': dados.nomeFantasia, 'EQUIPAMENTO': dados.equipamento,
    'TIPO_CONTRATO': dados.tipoContrato, 'TÉRMINO_GARANTIA': garantia,
    'ENDERECO_INSTALACAO': dados.endereco, 'FRANQUIA_MES': dados.franquia,
    'CONTATO': dados.contato, 'TELEFONE': dados.telefone,
    'DATA_RENOVACAO': dados.dataRenovacao, 'CANCELAMENTO': dados.cancelamento,
    'COMPROVANTES': dados.comprovantes, 'TIPO_COBRANCA': dados.tipoCobranca || '',
    'STATUS': dados.status || ''
  };
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const payload = JSON.parse(e.postData.contents);
    const acao = payload.acao;
    const dados = payload.dados;
    if (!['inserir', 'atualizar', 'deletar', 'atualizarInadimplencia'].includes(acao)) {
      return respostaTexto('Ação inválida');
    }
    const sheet = obterPlanilha();
    const colunaGarantia = colunaFimGarantia(sheet);
    const data = sheet.getDataRange().getValues();
    const cabecalhos = data[0];
    const codigo = indiceColuna(cabecalhos, 'CÓDIGO');
    if (codigo < 0) throw new Error('O cabeçalho CÓDIGO não foi encontrado.');
    const registro = data.findIndex((row, i) => i > 0 && row[codigo] == dados.codigo);

    if (acao === 'atualizarInadimplencia') {
      if (registro < 0) return respostaTexto('Erro: Código não encontrado');
      const inadimplente = indiceColuna(cabecalhos, 'INADIMPLENTE');
      if (inadimplente < 0) throw new Error('O cabeçalho INADIMPLENTE não foi encontrado.');
      sheet.getRange(registro + 1, inadimplente + 1).setValue(dados.inadimplente);
      return respostaTexto('Inadimplência atualizada com sucesso');
    }
    if (acao === 'deletar') {
      if (registro < 0) return respostaTexto('Erro: Código não encontrado');
      sheet.deleteRow(registro + 1);
      return respostaTexto('Deletado com sucesso');
    }
    if (acao === 'inserir' && registro >= 0) {
      return respostaTexto('Erro: Este CÓDIGO já está cadastrado.');
    }
    if (acao === 'atualizar' && registro < 0) return respostaTexto('Erro: Código não encontrado');

    const campos = dadosParaColunas(dados, sheet);
    // Valida todos os cabeçalhos antes de gravar para evitar alterações parciais.
    const colunas = Object.keys(campos).map(nome => {
      const indice = indiceColuna(cabecalhos, nome);
      if (indice < 0) throw new Error('O cabeçalho ' + nome + ' não foi encontrado.');
      return { indice: indice, valor: campos[nome] == null ? '' : campos[nome] };
    });
    let linha;
    if (acao === 'inserir') {
      const novaLinha = cabecalhos.map(() => '');
      colunas.forEach(c => novaLinha[c.indice] = c.valor);
      sheet.appendRow(novaLinha);
      linha = sheet.getLastRow();
    } else {
      linha = registro + 1;
      // Atualiza apenas os campos do formulário, preservando INADIMPLENTE e extras.
      colunas.forEach(c => sheet.getRange(linha, c.indice + 1).setValue(c.valor));
    }
    sheet.getRange(linha, colunaGarantia).setNumberFormat('dd/MM/yyyy');
    return respostaTexto(acao === 'inserir' ? 'Inserido com sucesso' : 'Atualizado com sucesso');
  } catch (error) {
    return respostaTexto('Erro: ' + error.toString());
  } finally {
    if (lock.hasLock()) {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
  }
}

function doGet() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sheet = obterPlanilha();
    colunaFimGarantia(sheet);
    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const zona = sheet.getParent().getSpreadsheetTimeZone();
    const json = values.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        const garantia = normalizarCabecalho(header) === normalizarCabecalho(CABECALHO_GARANTIA);
        obj[garantia ? CABECALHO_GARANTIA : header] = garantia && row[i] instanceof Date
          ? Utilities.formatDate(row[i], zona, 'yyyy-MM-dd') : row[i];
      });
      // Compatibilidade com o script.js anterior durante a atualização dos arquivos.
      obj.DATA_FIM_GARANTIA = obj[CABECALHO_GARANTIA] || '';
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (lock.hasLock()) {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
  }
}
