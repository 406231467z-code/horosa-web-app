# PHASE 4-I：Electron / 安装器退场

## 基线

- 分支 `main`，HEAD `28fd212`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节 4-I；`docs/WEB_MIGRATION_AUDIT.md` 已记录本检出没有 Electron main / preload / NSIS / `Horosa.exe`
- 客户端改为浏览器。Java `:9999` 与 Python `:8899` 保留。西洋星历、部分 kentang、部分服务是否再迁进浏览器，不在这一步

## 检出事实

| 项 | 本检出 |
|---|---|
| `desktop_installer_bundle/` | 不存在 |
| `*.nsi` / `*.iss` / `Horosa.exe` | 仓库根下没有安装脚本和 Horosa 可执行文件 |
| `astrostudyui/package.json` | 没有 `electron`、`electron-builder` |
| `src` 生产代码 | 没有 `require('electron')` / `from 'electron'` |
| `START_HERE.bat` | 转去 `local\Horosa_Local_Windows.bat` |
| `Horosa_Local_Windows.ps1` | 拉起 Java、Python、静态页，再用系统浏览器 `--app=` 打开。文件里没有 `Horosa-Setup` |
| `astrostudysrv` / `astropy` | 仍在产品源目录 |

`--app=` 是 Chrome / Edge 的应用窗口参数，进程仍是系统浏览器，不是 Horosa 安装包。

`window.horosaDesktop` / `__TAURI__` 仍是 PHASE 4-A 的浏览器降级判断。纯浏览器没有这两个对象。这一步不删这段判断，也不删 Java / Python / `vendor`。

## 入口

1. 双击 `START_HERE.bat`。本机 Java `:9999`、Python `:8899`、静态页起来之后，系统浏览器打开页面。`HOROSA_NO_BROWSER=1` 只起服务。
2. 开发：在 `astrostudyui` 里 `npm start`。
3. 静态交付：`npm run build:file`，产物 `dist-file`。启动脚本在已有产物时用 Python `http.server` 提供这一目录。
4. Git Bash / WSL：产品源里的 `start_horosa_local.sh`，同一套 Java / Python / 静态页。

## 修改文件

| 文件 | 变化 |
|---|---|
| `README.md` | 客户端改为浏览器；去掉安装包下载 |
| `README_ZH.md` | 同上，常见问题改为启动脚本 |
| `README_EN.md` | 同上 |
| `START_HERE.bat` | 说明打开浏览器，不安装 Horosa.exe |
| `local/Horosa_Local_Windows.ps1` | 文件头注明浏览器入口；启动逻辑未改 |
| `start_horosa_local.sh` | 文件头注明不启动 Horosa.exe；启动逻辑未改 |
| `windows-adaptations/README.md` | 注明安装器树不是入口；补丁记录保留 |
| `astrostudyui/src/utils/__tests__/phase4iInstallerExit.test.js` | 入口、依赖、后端仍在、生产源不引用 electron |
| `docs/PHASE4I_INSTALLER_EXIT.md` | 本记录 |

## 测试

`npx umi-test src/utils/__tests__/phase4iInstallerExit.test.js --forceExit`

1 suite，3 tests，exit 0。未改 `astrostudyui` 生产源，未再跑 `build:file`。上一阶段 4-H 的 `build:file` 已通过。

## 失败分类

无。

## 停止点

PHASE 4-I 完成。未开始最终总审计。未提交，未推送。
