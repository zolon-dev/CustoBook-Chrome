import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { extractBookData } from './extractor'; // content.ts分離後はパス変更

console.log("--- 実行開始 (run-test.ts) ---");

try {
    // パス
    const htmlPath = path.resolve(process.cwd(), 'test/sample.html'); 
    console.log("読み込むファイル:", htmlPath);

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // JSDOMの作成
    const dom = new JSDOM(htmlContent);

    // 実行
    const result = extractBookData(dom.window.document as unknown as Document);

    console.log(result);
} catch (err) {
    console.error("実行中にエラー発生:", err);
}