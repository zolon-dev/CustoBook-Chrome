// npm run build
const fs = require('fs');
const path = require('path');

// 処理対象を content.js に限定
const targetFile = path.join(__dirname, 'dist', 'js', 'content.js');

console.log(`[CustoBook] Target: ${targetFile}`);

if (fs.existsSync(targetFile)) {
    let content = fs.readFileSync(targetFile, 'utf8');
    
    // content.js 内の export {}; を消去
    // (TypeScriptが自動挿入する空のexport文を削除して、ブラウザでのSyntaxErrorを防ぐ)
    const newContent = content.replace(/export\s*\{\s*\}\s*;?\n?/g, '');
    
    if (content !== newContent) {
        fs.writeFileSync(targetFile, newContent, 'utf8');
        console.log(`[CustoBook] Successfully stripped export from content.js`);
    } else {
        console.log(`[CustoBook] No export found in content.js`);
    }
} else {
    console.warn('[CustoBook] content.js not found. Skipping strip process.');
}
