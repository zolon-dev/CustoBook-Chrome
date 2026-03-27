import type { CustoBookJson } from "./types/config";

// メッセージ通信の型
type Message = {
  type: "SAVE_AND_REGISTER";
  payload: CustoBookJson;
};

// レスポンスの型
type MessageResponse = {
    status: "success" | "error";
    message?: string;
}

// メッセージ待機
chrome.runtime.onMessage.addListener(
    (message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
        if (message.type === "SAVE_AND_REGISTER") {
            // 保存と登録関数呼び出し
            handleSaveAndRegister(message.payload, sendResponse);

            return true; // 非同期でsendResponseを維持
        }
        return false;
    }
);

// 設定の保存とスクリプト登録処理
async function handleSaveAndRegister(data: CustoBookJson, sendResponse: (response: MessageResponse) => void): Promise<void> {
    try {
        const domainkey = data.text_domain; // キーとして
        if (!domainkey) throw new Error("ドメイン情報がありません");

        // ストレージから現在のルールを取得
        const result = await chrome.storage.local.get(["CustoBook_Rules"]);
        const rules = (result.CustoBook_Rules || {}) as Record<string, CustoBookJson>; // 新規作成だったら空リスト追加

        // ドメインをキーにしてデータを格納
        // 既存ドメインであれば上書き、新規なら追加
        rules[domainkey] = {
            ...data, // すべての内容を展開
            site_name: data.site_name || "名称未設定"
        }

        // ストレージに保存
        await chrome.storage.local.set({"CustoBook_Rules": rules});

        // コンテンツスクリプトの動的登録・更新
        await registerAllScript();

        // 成功を通知
        sendResponse({ status: "success" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        console.error("[CustoBook] Error in SW: ", message);
        sendResponse({ status: "error", message });
    }
}

// 拡張機能のインストール・更新時
chrome.runtime.onInstalled.addListener(() => { registerAllScript(); });

// コンテンツスクリプトをすべて再登録
async function registerAllScript(): Promise<void> {
    try {
        // 設定を読み込み
        const result = await chrome.storage.local.get(["CustoBook_Rules"]);
        const rules = (result.CustoBook_Rules || {}) as Record<string, CustoBookJson>; // 新規作成だったら空リスト追加

        // ループしてすべてのルールを再登録
        for (const domainkey in rules) {
            const rule = rules[domainkey]; // 現在のサイトルール
            // ID定義
            const scriptId = `script-${domainkey}`;
            const cssId = `css-${domainkey}`;
            
            // 既存の登録を解除(重複防止)
            await chrome.scripting.unregisterContentScripts({ ids: [scriptId, cssId] })
                .catch(() => {}); // 未登録は無視

            // 共有URLパターン httpとhttpsだけ許可
            const matches = [
                `https://${domainkey}/*`,
                `http://${domainkey}/*`
            ];

            // スクリプト登録
            const scriptConfig: chrome.scripting.RegisteredContentScript = {
                id: scriptId,
                matches: matches,
                js: ["js/content.js"], // content.jsを呼び出す(個別のルールはcontent.js内で識別)
                runAt: "document_end" // ページ表示後に実行
            };

            // CSS登録
            const cssConfig: chrome.scripting.RegisteredContentScript = {
                id: cssId,
                matches: matches,
                css: ["overlay.css"],
                runAt: "document_start" // ブラウザ描写前にかぶせる
            };

            // 除外設定があれば反映
            if (rule?.exclude && rule.exclude.trim() !== "") {
                const excludes = [
                    `https://${domainkey}/${rule.exclude}/*`,
                    `http://${domainkey}/${rule.exclude}/*`
                ];

                scriptConfig.excludeMatches = excludes;
                cssConfig.excludeMatches = excludes;
            }

            // ドメイン登録処理
            await chrome.scripting.registerContentScripts([scriptConfig, cssConfig]);    
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "登録エラー";
        console.error("[CustoBook] 登録失敗: ", message);
    }
}
