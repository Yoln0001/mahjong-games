# 数织题目分享

随机题目与每日题目的工具栏均提供“分享题目”。创建后复制 `/nonogram/share/{id}` 短链接；接收者获得完全相同的尺寸、难度、答案与行列线索，但从空白棋盘独立作答，颜色、计时和进度只保存在接收者自己的浏览器中。分享者当前已填写的内容不会上传。

相同题目使用规范化内容的 SHA-256 前 20 位作为标识，因此重复分享得到相同链接。后端会重新计算线索并校验尺寸，拒绝答案尺寸错误或线索不一致的数据。分享页支持再次分享，不存在或格式错误的链接显示明确错误。

分享题目沿用每日题目的持久化仓库：生产使用现有 Redis，键为 `mh:nonogram-share:v1:{id}`；本地使用 `backend/data/nonogram-daily.sqlite3`。首次写入采用现有 `SET NX`/SQLite `INSERT OR IGNORE`，重启和部署不会覆盖。当前不设置过期时间，因此需继续保留 Redis 持久化和备份。

接口：

- `POST /api/nonogram-share`：校验并发布题目，返回 20 位分享 ID。
- `GET /api/nonogram-share/{id}`：读取分享题目，成功响应允许浏览器缓存一天。

此次需部署前端和后端，并重启后端。没有新增 npm 或 Python 依赖。后端测试命令：`python -m unittest tests.test_nonogram_share -v`。
