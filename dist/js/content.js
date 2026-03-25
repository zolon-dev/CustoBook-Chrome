// テストコード
(async () => {
    // 自分の現在のURLを取得
    const hostname = location.hostname;
    const path = location.pathname + location.search;
    console.log("location.pathname: " + location.pathname);
    console.log("location.search: " + location.search);

    console.log("現在のURL HOST: " + hostname);

    // ストレージから全ルールJSONを取り出す
    const result = await chrome.storage.local.get(["CustoBook_Rules"]);
    const rules = result.CustoBook_Rules || {};

    // 該当ルールを取り出す
    const ownRule = rules[hostname];

    if (ownRule) {
        console.log("該当ルールを発見");

        // ページタイプ識別(index/episode/short_story)
        let currentPage = null;
        for (const page of ownRule.pages) {
            if (new RegExp(page.pattern).test(path)) {
                // 連載目次と短編の識別、あればどっちか
                if (page.required_selector) {
                    if (!document.querySelector(page.required_selector)) {
                        continue;
                    }
                }

                currentPage = page;
                console.log("type: " + page.type);
                break;
            }
        }

        if (currentPage) {
            console.log(`mode: ${currentPage.execution_type}    type: ${currentPage.type}`);

            let root;
            if (currentPage.execution_type === "sync") {
                // JS実行前HTML入手のため、もう1回読み込む
                console.log("sync mode");
                try {
                    const response = await fetch(location.href);
                    const htmlText = await response.text();
                    const parser = new DOMParser();
                    root = parser.parseFromString(htmlText, "text/html");
                } catch (e) {
                    console.error("fetch失敗したので通常ドキュメント代用");
                    root = document;
                }
            } else {
                // JS実行後HTML(たぶん)
                root = document;
            }

            // root中身
            // console.log("HTML文字列：", root.documentElement.outerHTML);

            // タイトル
            if (currentPage.type == "index") {
                const novelTitle = root.querySelector(currentPage.selector_title)?.innerText.trim();
                // console.log("タイトル: " + novelTitle);
                const novelAuthor = root.querySelector(currentPage.selector_author)?.innerText.trim();
                console.log("著者: " + novelAuthor); // TODO: 「作者：」を汎用処理を維持しつつ抜く
                const novelSummary = root.querySelector(currentPage.selector_summary)?.innerText.trim();
                // console.log("あらすじ: " + novelSummary);

                // 目次の箱を押さえる
                const episodes = []; // 格納変数
                if (currentPage.selector_episode_list) {
                    const episodeNodes = root.querySelectorAll(currentPage.selector_episode_list);

                    // 箱から個別にタイトルやリンク、日付を取り出す
                    episodeNodes.forEach((node, index) => {
                        const linkEl = node.querySelector(currentPage.selector_episode_link);
                        const updateEl = node.querySelector(currentPage.selector_episode_update);
                        
                        if (linkEl) {
                            episodes.push({
                                no: index + 1,
                                title: linkEl.innerText.trim(),
                                url: new URL(linkEl.getAttribute("href"), location.href).href,
                                update: updateEl ? updateEl.innerText.trim() : ""
                            })
                        }
                    });

                    // とりあえず出力
                    // console.table(episodes);
                }

                console.log("[CustoBook] UI構築開始");

                // UIの土台
                const uiRoot = document.createElement("div");
                uiRoot.id = "custobook-root";

                // 目次の行作成
                const episodeLink = episodes.map(ep => `
                    <tr class="cb-episode-list-row">
                        <td class="cb-episode-list-title">
                            <a href="${ep.url}" class="cb-episode-list-link">${ep.title}</a>
                        </td>
                    </tr>
                `).join('');

                // 流し込み
                uiRoot.innerHTML = `
                    <div class="cb-container">
                        <h1 class="cb-title">${novelTitle || 'タイトル不明'}</h1>
                        <p class="cb-author">${novelAuthor || '著者不明'}</p>

                        <div class="cb-summary">${novelSummary || 'あらすじ不明'}</div>

                        <table class="cb-episode-list">
                            ${episodeLink}
                        </table>
                               
                        <footer style="margin-top: 100px; padding-bottom: 10px; text-align: center; color: #ffffff;">
                            CustoBook v0.1.0 - ESC to exit
                        </footer>
                    </div>`;

                // ブラウザに挿入
                document.body.appendChild(uiRoot);
                console.log("[CustoBook] UI構築完了");
            } else if (currentPage.type == "episode") {
                const subTitle = root.querySelector(currentPage.selector_subtitle)?.textContent.trim();
                // console.log("サブタイトル: " + subTitle);

                // Pタグ除去関数
                const getLines = (selector) => {
                    const el = root.querySelector(selector);
                    if (!el) return "";

                    // Pタグをループして1行ずつの配列にし、\nで繋ぐ
                    return Array.from(el.querySelectorAll('p')).map(p => {
                        const html = p.innerHTML.trim();
                        return (html === '<br>' || html === '<br />') ? "" : html;
                    }).join("\n");
                };

                // 前書き
                const prefaceText = getLines(currentPage.selector_content_preface);
                // if (prefaceText != "") { console.log("前書き: " + prefaceText); }

                // 本文
                const bodyText = getLines(currentPage.selector_content) || "本文なし";
                // console.log("本文: " + bodyText.substring(0, 500));

                // 後書き
                const afterwordText = getLines(currentPage.selector_content_afterword);
                // if (afterwordText != "") { console.log("後書き: " + afterwordText); }

                console.log("[CustoBook] UI構築開始");
                
                // UIの土台
                const uiRoot = document.createElement("div");
                uiRoot.id = "custobook-root";

                let htmlContent = "";
                htmlContent += `<div class="cb-container">`;
                htmlContent += `<h1 class="cb-subtitle">${subTitle || 'タイトル不明'}</h1>`;

                // 前書き
                if (prefaceText) {
                    htmlContent += `<div class="cb-preface">${prefaceText.replace(/\n/g, '<br />')}</div><hr class="cb-separator">`;
                }

                // 本文
                htmlContent += `<div class="cb-body">${bodyText.replace(/\n/g, '<br />')}</div>`; // 本文は必ずある

                // 後書き
                if (afterwordText) {
                    htmlContent += `<hr class="cb-separator"><div class="cb-afterword">${afterwordText.replace(/\n/g, '<br />')}</div>`;
                }

                htmlContent += `
                    <footer style="margin-top: 100px; padding-bottom: 10px; text-align: center; color: #ffffff;">
                        CustoBook v0.1.0 - ESC to exit
                    </footer>`;
                htmlContent += `</div>`;
                
                // ブラウザに挿入
                uiRoot.innerHTML = htmlContent;
                document.body.appendChild(uiRoot);

                console.log("[CustoBook] UI構築完了");

                // 現在の話数
                const epNumber = root.querySelector(currentPage.selector_number)?.textContent.trim();
                console.log("話数: " + epNumber);  
            } else if (currentPage.type == "short_story") {
                const novelTitle = root.querySelector(currentPage.selector_title)?.textContent.trim();
                // console.log("タイトル: " + novelTitle);

                const novelAuthor = root.querySelector(currentPage.selector_author)?.textContent.trim();
                console.log("著者: " + novelAuthor.replace(/\n/g, ''));

                // Pタグ除去関数
                const getLines = (selector) => {
                    const el = root.querySelector(selector);
                    if (!el) return "";

                    // Pタグをループして1行ずつの配列にし、\nで繋ぐ
                    return Array.from(el.querySelectorAll('p')).map(p => {
                        const html = p.innerHTML.trim();
                        return (html === '<br>' || html === '<br />') ? "" : html;
                    }).join("\n");
                };

                // 前書き
                const prefaceText = getLines(currentPage.selector_content_preface);
                // if (prefaceText != "") { console.log("前書き: " + prefaceText.substring(0, 100)); }

                // 本文
                const bodyText = getLines(currentPage.selector_content) || "本文なし";
                // console.log("本文: " + bodyText.substring(0, 300));

                // 後書き
                const afterwordText = getLines(currentPage.selector_content_afterword);
                // if (afterwordText != "") { console.log("後書き: " + afterwordText.substring(0, 100)); }

                console.log("[CustoBook] UI構築開始");

                // UIの土台
                const uiRoot = document.createElement("div");
                uiRoot.id = "custobook-root";

                let htmlContent = "";
                htmlContent += `<div class="cb-container">`;
                htmlContent += `<h1 class="cb-title">${novelTitle || 'タイトル不明'}</h1>`;
                htmlContent += `<p class="cb-author">${novelAuthor || '著者不明'}</p>`;

                // 前書き
                if (prefaceText) {
                    htmlContent += `<div class="cb-preface">${prefaceText.replace(/\n/g, '<br />')}</div><hr class="cb-separator">`;
                }

                // 本文
                htmlContent += `<div class="cb-body">${bodyText.replace(/\n/g, '<br />')}</div>`; // 本文は必ずある

                // 後書き
                if (afterwordText) {
                    htmlContent += `<hr class="cb-separator"><div class="cb-afterword">${afterwordText.replace(/\n/g, '<br />')}</div>`;
                }

                htmlContent += `
                    <footer style="margin-top: 100px; padding-bottom: 10px; text-align: center; color: #ffffff;">
                        CustoBook v0.1.0 - ESC to exit
                    </footer>`;
                htmlContent += `</div>`;

                // ブラウザに挿入
                uiRoot.innerHTML = htmlContent;
                document.body.appendChild(uiRoot);

                console.log("[CustoBook] UI構築完了");
            }
        }

        // ESCキー監視リスナー追加
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                console.log("[CustoBook] ESCキー押下");
                document.documentElement.classList.add("custobook-off");
            }
        });
    } else {
        console.log("ルールが存在しないよ");
    }
})();