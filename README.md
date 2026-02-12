# Mahjong Game Web（网页版麻将小游戏）

一个关于麻将小游戏的网站

---

## 1. 项目是什么

一些与麻将相关的小游戏，目前做了麻将猜手牌与麻将连连看的小游戏，后续可能还会做其他麻将小游戏。

### 1.1 麻将猜手牌 (Mahjong Handle)

- **核心玩法**：每局有一个隐藏答案（14 张牌），玩家最多进行若干次猜测（默认 6 次）。每次提交 14 张牌后，系统给出判色反馈，帮助你逐步逼近正确答案。
- **输入方式**：支持「点选输入」与「文字输入」两种模式。
- **提示系统**：「立直麻将」模式每局会给出与答案相关的提示信息（例如役种、番符、点数、场风/自风等），「普通麻将」模式无提示。

### 演示截图

初始页面示意图

![image-20260212191617146](docs/%E7%8C%9C%E6%89%8B%E7%89%8C%E7%95%8C%E9%9D%A2%E5%B1%95%E7%A4%BA%E6%88%AA%E5%9B%BE1.png)

游戏成功示意图

![image-20260212191754246](docs/%E7%8C%9C%E6%89%8B%E7%89%8C%E7%95%8C%E9%9D%A2%E5%B1%95%E7%A4%BA%E6%88%AA%E5%9B%BE2.png)



### 1.2 麻将连连看 (Mahjong Link)

- **核心玩法**：从8行17列麻将牌堆中，每次选择任意一列顶部的一张牌放入暂存区中。如果暂存区有两张相同的麻将牌，则消除。如果暂存区有若干张（默认为6张）不同的麻将牌，且放入的下一张麻将牌与暂存区中所有牌都不同则失败；消除所有麻将牌则胜利。

### 演示截图

![image-20260212192037501](docs/%E8%BF%9E%E8%BF%9E%E7%9C%8B%E7%95%8C%E9%9D%A2%E5%B1%95%E7%A4%BA%E6%88%AA%E5%9B%BE1.png)

### 演示截图

## 2. 怎么跑起来

下面以 **本地开发模式**为例（Windows / PowerShell）。

### 2.1 后端（FastAPI）
进入后端目录并安装依赖：

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

设置利用内存存储数据，启动后端（默认 8000 端口）：

```
$env:GAME_REPO="memory"
uvicorn app.main:app --reload --port 8000
```

### 2.2 前端（Vite + React + TypeScript）

进入前端目录并安装依赖：

```
cd frontend/react-ts
npm install
```

启动前端（Vite 默认 5173 端口）：

```
npm run dev
```

------

## 3. 游戏怎么玩

### 3.1 麻将猜手牌

#### 3.1.1 基本规则

- 每局答案为 **14 张牌**。
- 每次猜测需要提交 **14 张牌**。
- 默认最多猜测 **6 次**（由后端参数控制）。
- **输入不合规不会消耗猜测次数**：例如格式错误、无法解析成 14 张牌、包含非法牌等，会提示错误并要求重新输入。

#### 3.1.2 文字输入格式（示例）

文字输入采用紧凑编码（常见日麻牌谱编码风格），示例：

```
123m456p789s11555z
```

含义：

- `m`：万子
- `p`：筒子
- `s`：索子
- `z`：字牌
- 数字表示牌序号：
  - 万/筒/索：`1-9`
  - 字牌：`1-7`（对应「东南西北白发中」）

#### 3.1.3 判色规则（反馈机制）

每次提交后，系统会对 14 张牌给出反馈（通常包含以下三类）：

- **蓝色（完全正确）**：牌的“种类”和“位置”都正确。
- **黄色（存在但位置不对）**：该牌在答案中存在，但当前放置位置不正确。
- **灰色（不存在）**：该牌不在答案中，若你猜测某牌出现次数 > 答案中该牌出现次数，多余的会判为“不存在”。

### 3.2 麻将连连看

#### 3.2.1 基本规则

- 场上共有 136 张牌，摆成 8 行 17 列。
- 每一列只能拿最上面那一张牌。
- 拿到的牌放进暂存区；如果放入的牌和暂存区里已有的牌一样，就会立刻消掉这一对。
- 暂存区最多放 6 张牌，放满之后，放入的下一张牌没有和已有的牌消除就算失败。
- 所有牌都消完就算胜利。

------

## 4. 前后端地址 / API 文档入口

### 4.1 本地访问地址（默认）

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8000`

### 4.2 API 文档入口（FastAPI）

- Swagger UI：`http://localhost:8000/docs`
- ReDoc：`http://localhost:8000/redoc`

------

## 5. 配置项（Redis URL 等）

后端支持通过环境变量进行配置（示例以 PowerShell 为例）。

### 5.1 常用环境变量

| 变量名         | 含义                                  | 默认值（示例）             | 示例                       |
| -------------- | ------------------------------------- | -------------------------- | -------------------------- |
| `GAME_REPO`    | 状态存储方式（如 `memory` / `redis`） | `memory`                   | `redis`                    |
| `REDIS_URL`    | Redis 连接串                          | `redis://localhost:6379/0` | `redis://localhost:6379/0` |
| `CORS_ORIGINS` | 允许跨域的前端地址（如有）            | 视实现而定                 | `http://localhost:5173`    |

PowerShell 设置示例：

```
$env:GAME_REPO="redis"
$env:REDIS_URL="redis://localhost:6379/0"
uvicorn app.main:app --reload --port 8000
```

如果你希望不依赖 Redis，可使用内存模式：

```
$env:GAME_REPO="memory"
uvicorn app.main:app --reload --port 8000
```

------

## 6. License 与素材/代码致谢

### 6.1 License

本项目采用 **MIT License** 开源发布。

- 许可协议全文请见仓库根目录的 `LICENSE` 文件。
- Copyright (c) 2026 Yoln0001

### 6.2 素材致谢

本项目使用的麻将牌面素材来源于以下项目：
- 主要来自 [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles)，该项目的资源已声明为公有领域（public domain）。
- 部分素材被引用于 [xnuk/mahjong-handle](https://github.com/xnuk/mahjong-handle) 项目。

感谢上述项目的贡献，使得本项目能够利用其素材资源。

### 6.3 代码致谢

- 网页布局灵感来源于 [xnuk/mahjong-handle](https://github.com/xnuk/mahjong-handle) 项目。感谢该项目的设计，启发了本项目的界面布局和用户交互。
- 部分代码思路来源于 [ElainaFanBoy/nonebot_plugin_mahjong_hand_guess](https://github.com/ElainaFanBoy/nonebot_plugin_mahjong_hand_guess)。感谢该项目的代码实现，为本项目提供了思路和方法支持。



## 7. API 契约（API Contract）

本文档约定了 Mahjong Handle Web 后端对外提供的 HTTP API、统一返回结构、错误码与关键业务口径。
所有客户端（前端/CLI/机器人）均应以此契约为准，避免重复实现判色与算番逻辑。

### 7.1 基础约定

- Base URL：`/api`
- Content-Type：`application/json`
- 身份识别：当前以 `userId` 字符串作为用户唯一标识（MVP），不做鉴权与登录。
- 重要规则：
  - **猜测次数上限**由 `maxGuess` 决定（默认 6）。
  - **非法输入不消耗猜测次数**：当 `ok=false` 时，后端保证不扣次数、不写入历史记录。
  - 判色（blue/orange/gray）与番符点、役提示均由后端计算，前端只渲染。

### 7.2 统一响应结构

所有接口都返回以下结构：

#### 7.2.1 成功响应

```json
{
  "ok": true,
  "data": { },
  "error": null
}
```

#### 7.2.2 失败响应（非法输入、状态不允许、资源不存在等）

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "FORMAT_ERROR",
    "message": "输入包含非法字符",
    "detail": { }
  }
}
```

字段说明：

- `ok`：是否成功
- `data`：成功时返回的数据；失败时为 `null`
- `error`：失败时返回错误信息；成功时为 `null`
  - `code`：错误码（见第 6 节）
  - `message`：面向用户的简短描述（前端可直接 toast）
  - `detail`：可选的调试信息（前端一般不直接展示）

### 7.3 数据结构约定

#### 7.3.1 猜手牌游戏颜色枚举

`colors14` 是长度为 14 的数组，每项为以下之一：

- `blue`：牌与位置都正确
- `orange`：牌存在但位置不对（已按答案牌数量做重复牌修复）
- `gray`：牌不存在或超出数量

#### 7.3.2 牌面编码（ASCII）

`guessTiles14` 为长度 14 的数组，每项为两字符编码：

- 数牌：`1m..9m`（万） / `1p..9p`（筒） / `1s..9s`（索）
- 字牌：`1z..7z`（东南西北白发中）

### 7.4 猜手牌相关API

#### 7.4.1 开局：POST `/handle/start`

创建新的一局游戏。

##### 7.4.1.1 Request

```json
{
  "userId": "u1",
  "maxGuess": 6,
  "handIndex": null
}
```

字段说明：

- `userId`：用户标识（必填）
- `maxGuess`：最大猜测次数（可选，默认6）
- `handIndex`：调试用，指定题库索引（可选）

##### 7.4.1.2 Response（成功）

```json
{
  "ok": true,
  "data": {
    "gameId": "a58ef75ba4fa4cc887c6d0cd7ccd7b16",
    "maxGuess": 6,
    "createdAt": 1769957119.5193772,
    "hint": {
      "yakuTip": "Tanyao",
      "hanTip": "2番40符",
      "windTip": "自风：西，场风：南",
      "isTsumo": "荣和"
    }
  },
  "error": null
}
```

说明：

- `gameId`：该局唯一标识。后续 guess/status/reset 均需携带。

#### 7.4.2 提交猜测：POST `/handle/{gameId}/guess`

提交一次猜测，返回判色结果与剩余次数等信息。

##### 7.4.2.1 Request

```json
{
  "userId": "u1",
  "guess": "123m123p123s11555z"
}
```

字段说明：

- `userId`：用户标识（必填）
- `guess`：14 张牌的输入字符串（必填）
  - 支持 m/p/s/z 一行编码（one-line string）
  - 可支持中文牌名混输（由后端转换）
  - 输入合法性由后端校验，非法将返回 `ok=false`

##### 7.4.2.2 Response（成功：合法提交）

```
{
  "ok": true,
  "data": {
    "guessTiles14": ["1m","2m","3m","1p","2p","3p","1s","2s","3s","1z","1z","5z","...","..."],
    "colors14": ["gray","orange","blue","...","..."],
    "remain": 0,
    "finish": false,
    "win": false,
    "createdAt": 1769957172.2428248,
    "hitCountValid": 6,
    "gameCreatedAt": 1769957119.5193772,
    "hint": {
      "yakuTip": "Tanyao",
      "hanTip": "2番40符",
      "windTip": "自风：西，场风：南",
      "isTsumo": "荣和"
    }
  },
  "error": null
}
```

字段说明：

- `guessTiles14`：后端解析后的 14 张牌（数组）
- `colors14`：与 `guessTiles14` 对应的判色数组（长度 14）
- `remain`：剩余合法提交次数（= maxGuess - hitCountValid）
- `finish`：是否结束（猜中或次数用尽）
- `win`：是否猜中答案
- `createdAt`：创建时间
- `hitCountValid`：有效猜测次数
- `gameCreatedAt`游戏创建时间
- `hint`：答案提示（与 start/status 保持一致）

##### 7.4.2.3 Response（失败：非法输入，不扣次数）

```
{
  "ok": false,
  "data": null,
  "error": {
    "code": "FORMAT_ERROR",
    "message": "输入包含非法字符",
    "detail": {
      "input": "abc???###"
    }
  }
}
```

关键口径：

- 当 `ok=false` 时：**后端保证不扣次数、不写入历史记录**。

#### 7.4.3 查看状态：GET `/handle/{gameId}/status?userId=...`

用于刷新/断线重连恢复当前局状态与历史记录。

##### 7.4.3.1 Response（成功）

```
{
  "ok": true,
  "data": {
    "gameId": "a1b2c3...",
    "maxGuess": 6,
    "hitCountValid": 1,
    "remain": 5,
    "finish": false,
    "win": false,
    "history": [
      {
        "guessTiles14": ["..."],
        "colors14": ["..."],
        "createdAt": 1730000001.0
      }
    ],
    "hint": {
      "tip": "提示: ...",
      "hanTip": "..."
    }
  },
  "error": null
}
```

字段说明：

- `hitCountValid`：已进行的“合法提交”次数
- `history`：仅包含合法提交产生的历史记录（非法输入不会写入）

#### 7.4.4 重开：POST `/game/{gameId}/reset`

删除旧局并创建新局，返回新的 `gameId`。

##### 7.4.4.1 Request

```
{
  "userId": "u1",
  "maxGuess": 6,
  "handIndex": null
}
```

##### 7.4.4.2 Response（成功）

```
{
  "ok": true,
  "data": {
    "gameId": "newGameId...",
    "maxGuess": 6,
    "createdAt": 1730000100.0
  },
  "error": null
}
```

#### 7.4.5 错误码（Error Codes）

| code             | 含义                        | 典型触发场景                     |
| ---------------- | --------------------------- | -------------------------------- |
| FORMAT_ERROR     | 输入格式/字符非法，无法解析 | 包含非法字符；解析 one-line 失败 |
| COUNT_ERROR      | 牌数不正确或牌数规则不满足  | 不是 14 张；某牌超 4（若启用）   |
| NOT_WINNING_HAND | 该手牌无法和牌              | 输入不是和牌形                   |
| NO_YAKU          | 无役（按规则判为非法）      | 能和牌但 0 番                    |
| GAME_FINISHED    | 游戏已结束仍提交            | finish=true 后再次 guess         |
| GAME_NOT_FOUND   | gameId 不存在/已过期        | status/guess/reset 指向不存在局  |

### 7.5 连连看相关API

#### 7.5.1 开局：POST `/link/start`

创建新的一局连连看游戏。

##### 7.5.1.1 Request

```json
{
  "userId": "u1",
  "handIndex": null,
  "tempLimit": 7
}
```

字段说明：

- `userId`：用户标识（必填）
- `handIndex`：调试用，指定题库索引（可选）
- `tempLimit`：暂存区容量（可选，默认 7）

##### 7.5.1.2 Response（成功）

```json
{
  "ok": true,
  "data": {
    "gameId": "abc123...",
    "createdAt": 1769957119.5193772,
    "columns": [["1m","2m","..."], ["..."]],
    "topTiles": ["1m", "2p", null, "..."],
    "columnCounts": [8,8,0,"..."],
    "tempSlots": [],
    "tempLimit": 7,
    "remainTiles": 136,
    "finish": false,
    "win": false,
    "failReason": null
  },
  "error": null
}
```

字段说明：

- `columns`：17 列牌堆（每列从底到顶）
- `topTiles`：每列栈顶牌（空列为 `null`）
- `columnCounts`：每列剩余张数
- `tempSlots`：暂存区当前牌
- `tempLimit`：暂存区容量
- `remainTiles`：剩余牌总数（列中 + 暂存区）
- `finish`：是否结束
- `win`：是否胜利
- `failReason`：失败原因（可为空）

#### 7.5.2 取牌：POST `/link/{gameId}/pick`

从指定列取栈顶牌并更新状态。

##### 7.5.2.1 Request

```json
{
  "userId": "u1",
  "column": 3
}
```

字段说明：

- `userId`：用户标识（必填）
- `column`：列索引（0-16）

##### 7.5.2.2 Response（成功）

```json
{
  "ok": true,
  "data": {
    "picked": { "column": 3, "tile": "5p" },
    "removed": { "tile": "5p", "count": 2 },
    "columns": [["..."], ["..."]],
    "topTiles": ["..."],
    "columnCounts": [8,7,8,"..."],
    "tempSlots": ["1m","3p","..."],
    "tempLimit": 7,
    "remainTiles": 120,
    "finish": false,
    "win": false,
    "failReason": null
  },
  "error": null
}
```

字段说明：

- `picked`：本次取牌信息
- `removed`：若形成一对消除，返回被消除的牌（否则为 `null`）
- 其余字段与 `start/status` 相同

##### 7.5.2.3 Response（失败）

```
{
  "ok": false,
  "data": null,
  "error": {
    "code": "COLUMN_EMPTY",
    "message": "COLUMN_EMPTY",
    "detail": null
  }
}
```

常见错误码：`GAME_FINISHED`、`COLUMN_EMPTY`、`COLUMN_OUT_OF_RANGE`。

#### 7.5.3 查看状态：GET `/link/{gameId}/status?userId=...`

用于刷新/断线重连恢复当前局状态。

##### 7.5.3.1 Response（成功）

```json
{
  "ok": true,
  "data": {
    "gameId": "abc123...",
    "createdAt": 1769957119.5193772,
    "columns": [["..."], ["..."]],
    "topTiles": ["..."],
    "columnCounts": [8,7,8,"..."],
    "tempSlots": ["1m","3p","..."],
    "tempLimit": 7,
    "remainTiles": 120,
    "finish": false,
    "win": false,
    "failReason": null
  },
  "error": null
}
```

#### 7.5.4 重开：POST `/link/{gameId}/reset`

删除旧局并创建新局，返回新的 `gameId`。

##### 7.5.4.1 Request

```json
{
  "userId": "u1",
  "handIndex": null,
  "tempLimit": 7
}
```

##### 7.5.4.2 Response（成功）

```json
{
  "ok": true,
  "data": {
    "gameId": "newGameId...",
    "createdAt": 1769957200.123
  },
  "error": null
}
```

#### 7.5.5 错误码（Error Codes）

| code                | 含义                     | 典型触发场景            |
| ------------------- | ------------------------ | ----------------------- |
| GAME_NOT_FOUND      | gameId 不存在/已过期     | status/guess/reset 失败 |
| GAME_FINISHED       | 游戏已结束仍取牌         | finish=true 后仍 pick   |
| COLUMN_OUT_OF_RANGE | 列索引非法               | column 不在 0-16        |
| COLUMN_EMPTY        | 该列为空                 | 取牌列已空              |
| START_FAILED        | 开局失败                 | 题库错误等              |

