const esbuild = require('esbuild');

async function runBuild() {
  try {
    await esbuild.build({
      // エントリーポイント
      entryPoints: {
        'content': 'src/content.ts',
        'background': 'src/background.ts',
        'popup': 'src/popup.ts',
      },
      bundle: true,           // importを1つにまとめる
      outdir: 'dist/js',      // 出力先
      minify: false,           // 常に圧縮（デバッグ時はfalse）
      sourcemap: false,
      target: ['chrome100'],
      platform: 'browser',
      format: 'iife',         // Chrome拡張で動く形式
      charset: 'utf8',
    });
    console.log('✨ Build Success! (output dist/js/)');
  } catch (e) {
    // エラー時はプロセスを終了させて、npm run buildを失敗させる
    process.exit(1);
  }
}

runBuild();