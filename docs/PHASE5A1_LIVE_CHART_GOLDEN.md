# PHASE 5-A.1 BLOCKED

日期：2026-09-23  
目标：用现有启动方式拿到当前生产 `POST /chart` 的原始响应。没有拿到。没有手写数字。

## A. runtime status

试过的启动方式：`START_HERE.bat`，环境变量 `HOROSA_NO_BROWSER=1`。这是仓库自己的 Windows 启动器，会去拉 Java、jar，再开 `:9999` 和 `:8899`。

启动器在服务起来之前就停了，停在 “Press Enter to exit”。`:9999` 和 `:8899` 都没有在听。`GET /heartbeat`、`GET /common/time`、`POST /chart` 都没有打到。

日志目录 `local\workspace\Horosa-Web-...\astrostudy...\.horosa-local-logs-win\20260923_093124` 是空的，服务进程没有写出日志。失败原因在启动器窗口里。

## B. Java status

启动器按自己的路径装好了便携 Java：

`runtime\windows\java\bin\java.exe`  
`openjdk version "17.0.20.1"`

`astrostudyboot.jar` 不存在。期望路径：

`astrostudysrv\astrostudyboot\target\astrostudyboot.jar`

启动器接着做了它自己的三步，都没有得到 jar：

1. 本地 Maven 构建失败。`maven-source-plugin:2.3` 从 alimaven 拉取失败，报错里有 `.pom.part.lock` 路径找不到。
2. 捆绑 jar 恢复：仓库里没有这份 jar。
3. 下载 `https://media.githubusercontent.com/media/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/main/local/workspace/runtime/windows/bundle/astrostudyboot.jar`，BITS、Invoke-WebRequest、curl 都是 404。

没有 Java 进程在 `:9999`。

## C. Python status

`runtime\windows\python\python.exe` 不存在。系统 Python 3.12 执行 `import swisseph` 得到 `ModuleNotFoundError`。

启动器还没走到安装 Python 依赖和启动 `webchartsrv.py`，因为 jar 缺失时它先退出。`:8899` 没有进程。

## D. `/chart` response status

没有响应。没有保存任何 LIVE-GOLDEN。

仓库里原有的 `realChartResult.json` 仍然只是 **HISTORICAL-GOLDEN**。这次没有把它改标成 LIVE，也没有往里面写新数字。

## E. LIVE-GOLDEN count

```text
0
```

## F. fixture list

计划里的 1900、1950、1976、1990、2000、2026，以及高纬、南半球、恒星黄道、多宫制、逆行、月亮速度，都没有发出请求。宫制清单仍以 `AstroConst.HOUSE_SYSTEM_OPTIONS` 为准（含 Regiomontanus、Placidus），但没有生产输出可存。

## G. missing fields

没有响应，所以黄经、黄纬、速度、赤纬、ASC、MC、宫头、落宫、相位、阿拉伯点、接纳、互容、赤纬平行、夹攻、七政星宿段、恒星黄道，都没有从这次 `/chart` 里看到。

## H. errors

```text
BACKEND GOLDEN CAPTURE BLOCKED
```

- 缺少 `astrostudyboot.jar`
- Maven 构建失败（alimaven / maven-source-plugin）
- 启动器自带的 jar 地址返回 404
- Python 没有 `swisseph`，而且启动器没有运行到依赖安装
- `:9999`、`:8899` 都没有起来

## I. tests

没有跑对拍。没有服务，就不能把响应存成 golden。

## J. build

```text
BUILD: NOT RUN
REASON: production source unchanged
```

启动器自己的 Maven 构建失败，那不是 `npm run build:file`。

## K. production source changed

没有。没有改 `astrostudyui/src`、Java Controller、Python PerChart、`astrostudyui/package.json`。没有提交，没有推送。

启动器按它自己的逻辑下载了便携 Java 17 到 `runtime\windows\java`。这不是源码改动。

## L. next step

不进入 5-A.2，也不进入 5-B。要先有能响应的 `POST /chart`：一份能用的 `astrostudyboot.jar`，以及带 `swisseph` 的 Python `:8899`。在那之前不能写 LIVE-GOLDEN。

**PHASE 5-A.1 到此停止。**  
**未开始 PHASE 5-A.2。**  
**未开始 PHASE 5-B。**
