# ブラウザ保存データをMySQLへ取り込む

1. データを保存していたブラウザ・プロファイルで、元のProject Managerページを表示します。localStorageはURLのオリジン（プロトコル・ホスト・ポート）ごとに異なります。
2. F12で開発者ツールのConsoleを開き、`02.src/database/export_browser_cache_sql.js` の内容を貼り付けて実行します。
3. `mysql_import_browser_cache.sql` がダウンロードされます。Consoleにはデータ種別ごとの件数が表示されます。
4. phpMyAdminで `ss181301_tamitools` を選択し、「インポート」からSQLファイルを指定して実行します。テーブルがない場合は先に `02.src/database/mysql_setup.sql` を実行してください。

コマンドラインで取り込む場合:

```powershell
mysql --default-character-set=utf8mb4 -u YOUR_USER -p --execute="source C:/path/to/mysql_import_browser_cache.sql"
```

取り込む対象は `projects`、`tickets`、`sprints`、`recent` です。同じkeyの既存データは、エクスポートした配列全体で上書きされます。空配列も取り込みます。localStorageに存在しないkeyはSQLに含めません。実行前に対象テーブルをバックアップしてください。

JSONの解析に失敗した場合や配列以外が保存されていた場合は、SQLを出力せず終了します。SQLではUTF-8の16進リテラルを使用するため、日本語・改行・引用符・バックスラッシュを保持できます。

このスクリプトはブラウザ内でSQLを生成するだけで、DBへの送信やブラウザ保存データの変更は行いません。元ページを開くとアプリがAPIのデータをlocalStorageへ保存する動作があるため、元データが残っているページで取得してください。
