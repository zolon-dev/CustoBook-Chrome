// コンテンツ取得・表示
import type { CustoBookJson, PageConfig, IndexConfig, EpisodeConfig, ShortStoryConfig } from "./types/config";

// 呼び出し
(async () => {
    // 現在のURL取得
    const hostname = location.hostname;
    const path = location.pathname + location.search;

    console.log("location.hostname: " + location.hostname);
    console.log("location.pathname: " + location.pathname);
    console.log("location.search: " + location.search);

    // ストレージから全ルールを取り出す
    const result = await chrome.storage.local.get(["CustoBook_Rules"]);
    const rules = (result.CustoBook_Rules || {}) as Record<string, CustoBookJson>;

    // 該当ルールを取り出す
    const rule: CustoBookJson | undefined = rules[hostname];

    if (!rule) {
        console.log("[CustoBook] このサイトのルールは未定義です");
        return;
    }
    
    console.log("[CustoBook] 該当ルールを発見しました");

    // ページタイプ識別(index/episode/short_story)        
    let currentPage: PageConfig | null = null;
    for (const page of rule.pages) {
        if (new RegExp(page.pattern).test(path)) {
            // 連載目次と短編の識別、あればどちらか、なければepisode
            if (page.required_selector) {
                if (!document.querySelector(page.required_selector)) {
                    continue; // 該当しないので次
                }
            }
            currentPage = page;
            console.log("type: " + page.type);
            break;
        }
    }

    if (!currentPage) {
        console.log("[CustoBook] ページタイプ未定義です");
        return;
    }
    
    console.log(`mode: ${currentPage.execution_type}  type: ${currentPage.type}`)

    // DOM取得
    const root = await getRootDocument(currentPage.execution_type || "");

    //========
    // 共通UI
    //========
    
    console.log("[CustoBook] UI構築開始");

    // UIの土台
    const uiRoot = document.createElement("div");
    uiRoot.id = "custobook-root";

    // 目次(index)
    if (currentPage?.type === "index") {
        const config = currentPage as IndexConfig;
        const novelTitle = root.querySelector(config.selector_title)?.textContent?.trim() || "タイトル不明";
        console.log("タイトル: " + novelTitle);
        const novelAuthor = root.querySelector(config.selector_author)?.textContent?.trim() || "著者不明";
        console.log("著者: " + novelAuthor);
        const novelSummary = root.querySelector(config.selector_summary)?.textContent?.trim() || "あらすじ不明";
        console.log("あらすじ: " + novelSummary);

        const episodes = scrapeIndex(root, config); // エピソードリスト

        uiRoot.innerHTML = renderIndex(novelTitle, novelAuthor, novelSummary, episodes);

    // 個別エピソード(eposode)
    } else if (currentPage.type === "episode") {
        const config = currentPage as EpisodeConfig;
        const subTitle = root.querySelector(config.selector_subtitle)?.textContent?.trim();
        console.log("サブタイトル: " + subTitle);
        
        const content = scrapeContent(root, config);
        console.log("前書き: " + content.prefaceText)
        console.log("本文: " + content.bodyText?.substring(0, 500));
        console.log("後書き: " + content.afterwordText);

        uiRoot.innerHTML = renderViewer(subTitle || 'タイトル不明', content);

    // 短編(short_story)
    } else if (currentPage.type === "short_story") {
        const config = currentPage as ShortStoryConfig;
        const novelTitle = root.querySelector(config.selector_title)?.textContent?.trim();
        console.log("タイトル: " + novelTitle);
        const novelAuthor = root.querySelector(config.selector_author)?.textContent?.trim();
        console.log("著者: " + novelAuthor);

        const content = scrapeContent(root, config);
        console.log("前書き: " + content.prefaceText)
        console.log("本文: " + content.bodyText?.substring(0, 500));
        console.log("後書き: " + content.afterwordText);

        uiRoot.innerHTML = renderViewer(novelTitle || 'タイトル不明', content, novelAuthor);
    }

    // ブラウザに挿入
    document.body.appendChild(uiRoot);
    console.log("[CustoBook] UI構築完了");

    // ESCキー監視リスナー追加
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            console.log("[CustoBook] ESCキー押下");
            document.documentElement.classList.add("custobook-off");
        }
    });
})();

// 目次UI
function renderIndex(title: string, author: string, summary: string, episodes: any[]): string {
    const rows = episodes.map(ep => `
        <tr class="cb-episode-list-row">
            <td class="cb-episode-list-title">
                <a href="${ep.url}" class="cb-episode-list-link">${ep.title}</a>
            </td>
        </tr>
    `).join('');

    return `
        <div class="cb-container">
            <h1 class="cb-title">${title || 'タイトル不明'}</h1>
            <p class="cb-author">${author || '著者不明'}</p>

            <div class="cb-summary">${summary || 'あらすじ不明'}</div>

            <table class="cb-episode-list">
                ${rows}
            </table>
                    
            <footer style="margin-top: 100px; padding-bottom: 10px; text-align: center; color: #ffffff;">
                CustoBook v0.1.0 - ESC to exit
            </footer>
        </div>`;
}

// エピソード/短編UI,  authorは短編のみ
function renderViewer(title: string, content: any, author?: string) {
    let html = "";
    html += `<div class="cb-container">`;
    html += `<h1 class="${author ? 'cb-title' : 'cb-subtitle'}">${title}</h1>`;

    // 著者があれば
    if (author) {
        html += `<p class="cb-author">${author}</p>`;
    }

    // 前書き
    if (content.prefaceText) {
        html += `<div class="cb-preface">${content.prefaceText.replace(/\n/g, '<br />')}</div><hr class="cb-separator">`;
    }

    // 本文
    html += `<div class="cb-body">${(content.bodyText || "").replace(/\n/g, '<br />')}</div>`; // 本文は必ずある

    // 後書き
    if (content.afterwordText) {
        html += `<hr class="cb-separator"><div class="cb-afterword">${content.afterwordText.replace(/\n/g, '<br />')}</div>`;
    }

    html += `
        <footer style="margin-top: 100px; padding-bottom: 10px; text-align: center; color: #ffffff;">
            CustoBook v0.1.0 - ESC to exit
        </footer>`;
    html += `</div>`;

    return html;
}

/**
 * HTML取得部分  
 * サイトにあわせてfetch(素のHTML)かJS実行後HTMLか判定
 * @param executionType 実行タイプ(syncなど)
 * @return DOM全体
 */
async function getRootDocument(executionType: string): Promise<Document> {
    // type=syncはfetchする
    if (executionType === "sync") {
        try {
            const response = await fetch(location.href);
            const htmlText = await response.text();
            const parser = new DOMParser();
            return parser.parseFromString(htmlText, "text/html");
        } catch (error) {
            console.error("fetchに失敗したので現在のDOMを使用:" + error);
            return document;
        }
    } else {
        return document; // それ以外
    }
}

//================================
// スクレイピング部分
//================================

// 目次ページ(index)
function scrapeIndex(root: Document, config: IndexConfig) {
    const episodes: { title: string, url: string }[] = [];

    // エピソードリストの取得
    if (config.selector_episode_list) {
        const episodeNodes = root.querySelectorAll(config.selector_episode_list); // まとまり単位
        episodeNodes.forEach((node) => {
            const linkEl = node.querySelector(config.selector_episode_link) as HTMLAnchorElement;
            if (linkEl) {
                episodes.push({
                    title: linkEl.innerText.trim(),
                    url: linkEl.href
                });
            }
        });
    }

    return episodes;
}

// 本文・短編共通(前書き・本文・後書き)
function scrapeContent(root: Document, config: EpisodeConfig | ShortStoryConfig) {
    return {
        prefaceText: root.querySelector(config.selector_content_preface || "")?.textContent?.trim(), // 前書き
        bodyText: root.querySelector(config.selector_content)?.textContent?.trim(), // 本文
        afterwordText: root.querySelector(config.selector_content_afterword || "")?.textContent?.trim() // 後書き
    };
}
