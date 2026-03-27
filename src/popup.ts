// ポップアップウインドウ

import type { CustoBookJson } from './types/config';

// イベントリスター
// すべてのページを読み込んだら処理開始
document.addEventListener('DOMContentLoaded', () => {
    const btnRegister = document.getElementById("btn-register") as HTMLButtonElement | null;
    const btnHelp = document.getElementById("btn-help") as HTMLButtonElement | null;
    const urlInput = document.getElementById("url-input") as HTMLInputElement | null;

    // 登録処理
    if (btnRegister) {
        btnRegister.onclick = async () => {
            const url = urlInput?.value;

            if (!url) return alert("URLを入力してください");
            if (!url.toLowerCase().endsWith('.json')) {
                return alert("JSONファイルを指定してください");
            }

            try {
                // JSON取得
                const response = await fetch(url);
                if (!response.ok) throw new Error("ファイルが見付かりません");

                // 型指定
                const data: CustoBookJson = await response.json();

                // キーとなるドメインの存在チェック
                if (!data.text_domain) {
                    throw new Error("JSONにtext_domainが定義されていません");
                }

                // Service Workerにストレージ保存とドメイン登録を任せる
                chrome.runtime.sendMessage({
                    type: "SAVE_AND_REGISTER",
                    payload: data
                }, (response: { status: string; message?: string;}) => { // SWから返事
                    if (response?.status === "success") {
                        alert("登録が完了しました"); // 登録完了
                        window.close();
                    } else {
                        alert("エラーが発生しました: " + (response?.message || "不明なエラー"));
                    }
                });
            } catch (error) {
                console.error("エラーが発生しました:", error);
                // エラー画面
                const message = error instanceof Error ? error.message : "不明なエラー";
                alert(message);
            }
        }
    }

    // ヘルプボタン
    if (btnHelp) {
        btnHelp.onclick = () => {
            // 新しいタブでマニュアルを開く(GitHub)
            window.open("https://github.com/zolon-dev/CustoBook-Chrome", "_blank");
        }
    }
});