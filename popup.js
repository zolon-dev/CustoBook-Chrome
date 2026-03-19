// 登録ボタン
// すべてのページを読み込んだら処理開始
document.addEventListener("DOMContentLoaded", () => {
    // 登録ボタン処理
    document.getElementById("btn-register").onclick = async () => {
        // URLフィールドから取り出す
        const url = document.getElementById("url-input").value;
        
        // 空欄 or 拡張子チェック
        if (!url) return alert("URLを入力してください");
        if (!url.toLowerCase().endsWith('.json')) {
            return alert("JSONファイルを指定してください");
        }

        try {
            // JSON取得
            const response = await fetch(url);

            // エラーチェック
            if (!response.ok) throw new Error("ファイルが見付かりません");

            // JSONとして解析
            const data = await response.json();

            // ストレージ保存

            // キーとなるドメインの存在チェック
            if (!data["text_domain"]) {
                throw new Error("JSONにtext_domainが定義されていません");
            }

            const domainkey = data["text_domain"]; // キーとして

            // 現在のルールJSONを取得
            chrome.storage.local.get(["CustoBook_Rules"], (result) => {
                let rules = result.CustoBook_Rules || {}; // 新規作成だったら空リスト追加

                // ドメインをキーにしてデータを格納
                // 既存ドメインであれば上書き、新規なら追加
                rules[domainkey] = {
                    "site_name": data["site_name"] || "名称未設定",
                    ...data // すべての内容を展開
                };

                // ストレージに保存
                chrome.storage.local.set({"CustoBook_Rules": rules }, () => {
                    if (chrome.runtime.lastError) {
                        alert("エラー: " + chrome.runtime.lastError.message);
                    } else {
                        alert("登録が完了しました"); // 登録完了
                        window.close(); // 閉じる
                    }
                });
            });
        } catch (error) {
            console.error("エラーが発生しました：", error);
            alert("エラーが発生しました。\n" + error.message);
        }
    };

    // ヘルプボタン
    document.getElementById("btn-help").onclick = () => {
        // 新しいタブでマニュアルを開く(GitHub)
        window.open("https://github.com/zolon-dev/CustoBook-Chrome", "_blank");
    };
});

