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
                    console.log("root: " + root);

                } catch (e) {
                    console.error("fetch失敗したので通常ドキュメント代用");
                    root = document;
                }
            } else {
                // JS実行後HTML(たぶん)
                root = document;
            }

            // タイトル
            if (currentPage.type == "index") {
                const novelTitle = root.querySelector(currentPage.selector_title)?.innerText.trim();
                console.log("タイトル: " + novelTitle);
                const novelAuthor = root.querySelector(currentPage.selector_author)?.innerText.trim();
                console.log("著者: " + novelAuthor); // 「作者：」を汎用処理を維持しつつ抜くには？
                const novelSummary = root.querySelector(currentPage.selector_summary)?.innerText.trim();
                console.log("あらすじ: " + novelSummary);

                // 目次の箱を押さえる
                if (currentPage.selector_episode_list) {
                    const episodeNodes = root.querySelectorAll(currentPage.selector_episode_list);
                    const episodes = []; // 格納変数

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
                    console.table(episodes);
                }
            } else if (currentPage.type == "episode") {
                const subTitle = root.querySelector(currentPage.selector_subtitle)?.innerText.trim();
                console.log("サブタイトル: " + subTitle);
                const contentEl = root.querySelector(currentPage.selector_content);
                const bodyText = contentEl ? contentEl.innerText.trim() : "本文なし";
                const epNumber = root.querySelector(currentPage.selector_number)?.innerText.trim();
                console.log("話数: " + epNumber);
                console.log(bodyText.substring(0, 100) + "...");
            }
        }
    } else {
        console.log("ルールが存在しないよ");
    }
})();