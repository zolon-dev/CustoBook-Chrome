// メッセージ待機
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SAVE_AND_REGISTER") {
        // 保存と登録関数呼び出し
        handleSaveAndRegister(message.payload, sendResponse);
        
        return true; // sendResponse維持
    }
});

// 保存と登録処理
async function handleSaveAndRegister(data, sendResponse) {
    try {
        const domainkey = data.text_domain; // キーとして
        if (!domainkey) throw new Error("ドメイン情報がありません");

        // ストレージ保存処理
        // 現在のルールJSONを取得
        const reseult = await chrome.storage.local.get(["CustoBook_Rules"]);
        const rules = reseult.CustoBook_Rules || {}; // 新規作成だったら空リスト追加

        // ドメインをキーにしてデータを格納
        // 既存ドメインであれば上書き、新規なら追加
        rules[domainkey] = {
            "site_name": data["site_name"] || "名称未設定",
            ...data // すべての内容を展開
        };

        await chrome.storage.local.set({"CustoBook_Rules": rules }); // 保存実行

        // ブラウザにドメイン監視を登録
        // 重複を避けるためいったん削除する
        try {
            await chrome.scripting.unregisterContentScripts({ ids: [`script-${domainkey}`]});
        } catch (e) {
            // 重複がなかった場合エラーになるが無視
        }

        // ドメイン登録処理
        await chrome.scripting.registerContentScripts([{
            id: `script-${domainkey}`,
            // httpとhttpsだけ許可
            matches: [
                `https://${domainkey}/*`,
                `http://${domainkey}/*`
            ],
            js: ["content.js"], // content.jsを呼び出す(個別のルールはcontent.js内で識別)
            runAt: "document_end" // ページ表示後に実行
        }]);

        // popup.jsに成功をつたえる
        sendResponse({ status: "success" });
    } catch (error) {
        console.error("[CustoBook] Error in SW: ", error);
        // popup.jsに失敗を伝える
        sendResponse({ status: "error", message: error.message});
    }
}