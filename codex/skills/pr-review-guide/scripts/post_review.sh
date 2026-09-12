#!/usr/bin/env bash
# PR にファイル単位のレビューガイドコメントを 1 レビューとして投稿する。
#
# 使い方:
#   post_review.sh --pr <番号> --comments <comments.json> --summary <summary.md> \
#                  [--repo owner/repo] [--dry-run]
#
# comments.json: [{"path": "リポジトリ相対パス", "body": "コメント本文"}, ...]
# summary.md   : レビュー本体に付けるサマリー（凡例・読み順）
#
# 流れ: ペンディングレビュー作成 → GraphQL addPullRequestReviewThread(subjectType: FILE)
#       でスレッド追加 → event=COMMENT で submit（通知は 1 回で済む）
set -euo pipefail

# サンドボックス環境で PATH が引き継がれないことがあるため、明示的に解決する
resolve() {
  command -v "$1" 2>/dev/null && return
  for p in "/opt/homebrew/bin/$1" "/usr/local/bin/$1" "/usr/bin/$1"; do
    [ -x "$p" ] && { echo "$p"; return; }
  done
  echo "エラー: $1 が見つかりません" >&2
  exit 1
}
GH=$(resolve gh)
JQ=$(resolve jq)

PR="" COMMENTS="" SUMMARY="" REPO="" DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --pr)       PR="$2"; shift 2 ;;
    --comments) COMMENTS="$2"; shift 2 ;;
    --summary)  SUMMARY="$2"; shift 2 ;;
    --repo)     REPO="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=1; shift ;;
    *) echo "不明な引数: $1" >&2; exit 1 ;;
  esac
done

[ -n "$PR" ] && [ -f "$COMMENTS" ] && [ -f "$SUMMARY" ] || {
  echo "使い方: post_review.sh --pr <番号> --comments <json> --summary <md> [--repo owner/repo] [--dry-run]" >&2
  exit 1
}

[ -n "$REPO" ] || REPO=$($GH repo view --json nameWithOwner --jq .nameWithOwner)

# comments.json の妥当性を先に検証する（投稿途中で気づくとペンディングレビューが残る）
$JQ -e 'type == "array" and all(.[]; (.path | type == "string") and (.body | type == "string"))' \
  "$COMMENTS" >/dev/null || { echo "エラー: comments.json の形式が不正です（[{path, body}] の配列が必要）" >&2; exit 1; }
N=$($JQ length "$COMMENTS")
[ "$N" -gt 0 ] || { echo "エラー: comments.json が空です" >&2; exit 1; }

if [ "$DRY_RUN" -eq 1 ]; then
  echo "=== dry-run: $REPO PR #$PR に以下の $N 件を投稿します ==="
  $JQ -r '.[] | "--- \(.path)\n\(.body)\n"' "$COMMENTS"
  echo "=== サマリー ==="
  cat "$SUMMARY"
  exit 0
fi

# 既存のペンディングレビューがあると作成に失敗する。下書き中の可能性があるため削除はしない
PENDING=$($GH api "repos/$REPO/pulls/$PR/reviews" --jq '[.[] | select(.state == "PENDING")] | length')
[ "$PENDING" -eq 0 ] || {
  echo "エラー: 既存のペンディングレビューがあります。内容を確認し、不要なら削除してから再実行してください" >&2
  exit 1
}

SHA=$($GH pr view "$PR" --repo "$REPO" --json headRefOid --jq .headRefOid)
REVIEW=$($GH api -X POST "repos/$REPO/pulls/$PR/reviews" -f commit_id="$SHA")
REVIEW_ID=$(echo "$REVIEW" | $JQ -r .id)
REVIEW_NODE=$(echo "$REVIEW" | $JQ -r .node_id)
echo "ペンディングレビュー作成: $REVIEW_ID"

FAIL=0
for i in $(seq 0 $((N - 1))); do
  path=$($JQ -r ".[$i].path" "$COMMENTS")
  body=$($JQ -r ".[$i].body" "$COMMENTS")
  $GH api graphql \
    -f query='mutation($rid: ID!, $path: String!, $body: String!) {
      addPullRequestReviewThread(input: {pullRequestReviewId: $rid, path: $path, body: $body, subjectType: FILE}) {
        thread { id }
      }
    }' \
    -f rid="$REVIEW_NODE" -f path="$path" -f body="$body" >/dev/null \
    || { echo "失敗: $path（path が diff と一致しているか確認）" >&2; FAIL=1; }
done
[ "$FAIL" -eq 0 ] || {
  echo "エラー: 一部のスレッド追加に失敗しました。ペンディングレビュー($REVIEW_ID)を削除して再実行してください" >&2
  exit 1
}
echo "$N 件のファイルコメントを追加しました"

$GH api -X POST "repos/$REPO/pulls/$PR/reviews/$REVIEW_ID/events" \
  -f event=COMMENT -f body="$(cat "$SUMMARY")" --jq '"投稿完了: " + .html_url'
