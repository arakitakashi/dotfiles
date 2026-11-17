---
name: herdr-split4
description: |
  herdr 上で動いている現在のセッションのペインを 2×2 の4分割にする。
  MANDATORY TRIGGERS: /herdr-split4, herdr-split4, ペインを4分割, ペインを４分割, 4分割して, 2x2 に分割, 画面を4分割。
  DO NOT TRIGGER: Ghostty や tmux など herdr 以外の分割、2分割や3分割など別の配置、ペインを閉じる・移動する依頼。
argument-hint: "[新しいペインの作業フォルダ]"
allowed-tools: Bash(herdr pane split:*), Bash(herdr pane layout:*), Bash(echo:*), Bash(jq:*)
---

# herdr-split4

現在のセッションが動いている herdr のペインを 2×2 に分割する。
新しい3つのペインは空のシェルで、フォーカスは元のペインに残す。

## 前提

- 分割するのは herdr のペインである。外側のターミナル（Ghostty など）を分割しない。
  外側を分割すると、新しいペインごとに herdr のクライアントが起動し、同じ画面が並ぶだけになる。
- キー入力の送信（`osascript` や `herdr pane send-keys`）は使わない。`herdr pane split` だけを使う。

## 手順

1. herdr の中にいることを確認する。
   - `echo "$HERDR_PANE_ID"` を実行する。
   - 空の場合は分割せず、herdr の中ではないため実行できないと報告して停止する。
2. 現在の配置を確認する。
   - `herdr pane layout` を実行する。
   - タブ内のペインが1つでない場合は分割せず、現在の配置を示して、どう分けるかをユーザーに確認する。
3. 作業フォルダを決める。
   - 引数があればそのパス、なければ現在の作業フォルダの絶対パスを使う。
4. 元のペインを右に分割し、返ってきた JSON の `.result.pane.pane_id` を右上のペイン ID として控える。

   ```
   herdr pane split --pane "$HERDR_PANE_ID" --direction right --no-focus --cwd <作業フォルダ>
   ```

5. 元のペインを下に分割する（左下ができる）。

   ```
   herdr pane split --pane "$HERDR_PANE_ID" --direction down --no-focus --cwd <作業フォルダ>
   ```

6. 右上のペインを下に分割する（右下ができる）。

   ```
   herdr pane split --pane <右上のペイン ID> --direction down --no-focus --cwd <作業フォルダ>
   ```

7. 結果を確認する。
   - `herdr pane layout` を実行し、ペインが4つで、`focused_pane_id` が元のペインであることを確かめる。
   - 途中のコマンドが失敗した場合は続行せず、できたペインの ID と失敗の内容を報告する。自動で閉じない。

## 完了報告

- 左上・右上・左下・右下のペイン ID を表で示す
- フォーカスのあるペイン
- 新しいペインの作業フォルダ
