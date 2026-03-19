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

            alert("登録が完了しました"); // 登録完了
            window.close(); // 閉じる

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

