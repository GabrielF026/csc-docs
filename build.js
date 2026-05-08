const fs = require('fs');
const path = require('path');

// --- CONFIGURAÇÃO DE CAMINHOS ---
const paths = {
    static: path.join(__dirname, 'static'),
    dist: path.join(__dirname, 'dist'),
    distStatic: path.join(__dirname, 'dist', 'static')
};

/**
 * Função utilitária para copiar pastas recursivamente
 */
function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    
    fs.readdirSync(from).forEach(element => {
        const stat = fs.lstatSync(path.join(from, element));
        if (stat.isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else if (stat.isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

// --- PROCESSO DE BUILD ---

// 1. Garantir que a pasta dist existe
if (!fs.existsSync(paths.dist)) {
    fs.mkdirSync(paths.dist);
}

// 2. SEU CÓDIGO ATUAL DE GERAÇÃO DE HTML (Exemplo)
// Aqui deve estar a lógica que lê o page.html e o content/ e gera os arquivos na pasta dist.
console.log('Gerando arquivos HTML...');

// 3. COPIAR ARQUIVOS ESTÁTICOS (A parte que estava faltando!)
console.log('Copiando pasta static para dist...');
if (fs.existsSync(paths.static)) {
    copyFolderSync(paths.static, paths.distStatic);
    console.log('✅ Pasta static copiada com sucesso!');
} else {
    console.log('⚠️ Aviso: Pasta static não encontrada.');
}

console.log('🚀 Build finalizado com sucesso!');
