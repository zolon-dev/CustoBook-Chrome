// 全体で使用するデータ型

/**
 * サイトルール
 * ユーザーが用意するJSONファイル定義
 */
export interface CustoBookJson {
    site_name: string; // サイト名
    text_domain: string; // 個別小説ページドメイン
    // img_domain?: string; // 画像サーバー
    exclude?: string; // 除外キーワード
    pages: PageConfig[]; // ページ詳細
}

// ページ詳細
export type PageConfig = EpisodeConfig | ShortStoryConfig | IndexConfig;

// ページ処理共通部分
interface BasePageConfig {
    // ページ種別：連載エピソード・短編・連載目次
    type: "episode" | "short_story" | "index";
    pattern: string; // URL抽出パターン
    // source_type: "dom" | "json"; // DOMかJSON
    execution_type?: "sync" | "async"; // JS実行前か実行後のページか
    required_selector?: string; // 短編か連載目次か判別のためのセレクタ
}

// 連載個別エピソード
export interface EpisodeConfig extends BasePageConfig {
    type: "episode"; // タイプ
    selector_subtitle: string; // エピソードタイトル
    selector_content_preface?: string; // 前書き(任意)
    selector_content: string; // 本文
    selector_content_afterword?: string; // 後書き(任意)
    // select_number: string; // 現在の話数
}

// 短編用
export interface ShortStoryConfig extends BasePageConfig {
    type: "short_story"; // タイプ
    selector_title: string; // タイトル
    selector_author: string; // 著者
    selector_content_preface?: string; // 前書き(任意)
    selector_content: string; // 本文
    selector_content_afterword?: string; // 後書き(任意)
}

// 連載目次
export interface IndexConfig extends BasePageConfig {
    type: "index"; // タイプ
    selector_title: string; // タイトル
    selector_author: string; // 著者
    selector_summary: string; // あらすじ
    selector_episode_list: string; // エピソード行
    selector_episode_link: string; // エピソードリンク
    // selector_episode_update?: string; // 更新日
}