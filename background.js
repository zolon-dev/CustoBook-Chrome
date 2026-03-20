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
        const result = await chrome.storage.local.get(["CustoBook_Rules"]);
        const rules = result.CustoBook_Rules || {}; // 新規作成だったら空リスト追加

        // ドメインをキーにしてデータを格納
        // 既存ドメインであれば上書き、新規なら追加
        rules[domainkey] = {
            "site_name": data["site_name"] || "名称未設定",
            ...data // すべての内容を展開
        };

        await chrome.storage.local.set({"CustoBook_Rules": rules }); // 保存実行

        // ブラウザにドメイン監視を登録
        // 重複を避けるためいったん削除する
        await chrome.scripting.unregisterContentScripts({ ids: [`script-${domainkey}`]})
            .catch(() => {}); // エラーが出ても無視

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

// 拡張機能のオンオフ、更新ボタン押下時
chrome.runtime.onInstalled.addListener(async () => {
    // 設定を再読込
    const result = await chrome.storage.local.get(["CustoBook_Rules"]);
    const rules = result.CustoBook_Rules || {}; // 新規作成だったら空リスト追加

    // ループしてすべてのルールを再登録
    for (const domainkey in rules) {
        try {
            // あってもなくても一旦削除
            await chrome.scripting.unregisterContentScripts({ ids: [`script-${domainkey}`]})
                .catch(() => {}); // エラーが出ても無視

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
        } catch (e) {
            console.log("エラー:" + e.message);
        } // エラー無視
    }
});

// ブラウザ起動時処理
chrome.runtime.onStartup.addListener(() => {
    console.log("ブラウザ起動時処理");
});