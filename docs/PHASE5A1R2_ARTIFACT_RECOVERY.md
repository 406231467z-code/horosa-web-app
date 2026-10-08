# PHASE 5-A.1R2 BLOCKED

日期：2026-09-23

```text
PYTHON_RUNTIME_RECOVERED
JAVA_RUNTIME_BLOCKED
BASELINE_MISMATCH
```

没有把任何候选 jar 放进 runtime。没有调用 `POST /chart`。没有写 LIVE-GOLDEN。

## A. Baseline

```text
HEAD=4e6d20d393ae618828b648d3bbb9ad907538cd6b
requestedBaseline=ebc4d9e3ea93cdd1dc62a0c37957e5907900d50d
gitStatus=tracked worktree clean; untracked runtime/, local/runtime/, caches, probe logs
```

HEAD 是 `ebc4d9e` 之上的文档/实验提交。`ebc4d9e..HEAD` 为 14 个文件、+3693 行，全部在 `docs/` 与 `experiments/phase5a-sweph-parity/`。Java、Python、前端产品源与 `ebc4d9e` 相同。PASS 要求 HEAD 等于 `ebc4d9e`，因此本阶段记 `BASELINE_MISMATCH`，没有改代码，也没有 checkout。

## B. Artifact Provenance

```text
artifact=runtime/windows/bundle/astrostudyboot.jar
source=git blob 7c2ba349f5275c428d2adea6d0ee0cdc9a98fe95
commit=0fe55d81cac9d14f6ec601701cf272f6c31c2ee8 (2026-03-02), deleted the same day by 5c06943d
version=unknown
size=git object 134 bytes (Git LFS pointer). Claimed payload 303890214 bytes. Payload absent.
sha256=LFS oid aff1bc03653558a192071ec4149b1037bb91491c6f6e19d6a4b31f5d20c4f3e8 (object not in this clone)
classification=UNKNOWN
```

指针正文：

```text
version https://git-lfs.github.com/spec/v1
oid sha256:aff1bc03653558a192071ec4149b1037bb91491c6f6e19d6a4b31f5d20c4f3e8
size 303890214
```

`.gitattributes` 不存在。`.git/lfs` 不存在。`ebc4d9e`、`4e6d20d`、`28fd212` 的树都没有 `runtime/windows/bundle`。

`0fe55d81` 是 runtime-only 提交，树里没有 `ChartController.java`、`ModernChartController.java`、`QueryChartController.java`、`PredictiveController.java`、`JieQiController.java`、`perchart.py`。这些文件只存在于后来的 `local/workspace/...` 树。无法做类签名或 blob 对拍。

文档里的 v2.6.4 jar 大小是 324,254,239 字节。LFS 指针声称 303,890,214 字节。两者不是同一份文件。v2.6.4 / v2.6.5 没有被当作当前基线。

启动器期望的路径：

```text
$JarPath = <ProjectDir>\astrostudysrv\astrostudyboot\target\astrostudyboot.jar
fallback = <repo>\local\runtime\windows\bundle\astrostudyboot.jar
fallback = <repo>\local\runtime\bundle\astrostudyboot.jar
URL = https://media.githubusercontent.com/media/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/main/local/workspace/runtime/windows/bundle/astrostudyboot.jar
```

仓库没有这份 jar，是因为唯一进过 git 的对象是 LFS 指针，当天就被删掉，而且本克隆没有 LFS 对象。下载 URL 在上一轮 BITS / Invoke-WebRequest / curl 均为 404。`%USERPROFILE%\.m2\repository` 没有 `spacex` / `astrostudyboot`。工作区、`target/`、Downloads 都没有 `astrostudyboot*.jar`。

## C. Java

```text
javaVersion=openjdk 17.0.20.1 (Temurin-17.0.20.1+1) at runtime\windows\java\bin\java.exe
mavenVersion=Apache Maven 3.8.1
jar=MISSING
port=9999 DOWN
heartbeat=NOT CALLED
commonTime=NOT CALLED
```

默认 `mvn` 在未设置 `JAVA_HOME` 时使用 Oracle Java 1.8.0_201。诊断构建把 `JAVA_HOME` 指到这份 JDK 17。`javac` 为 17.0.20.1。

## D. Maven

```text
status=MAVEN_BUILD_BLOCKED
command=mvn -DskipTests -Dmaven.source.skip=true install
module=astrostudysrv/boundless
plugin=org.apache.maven.plugins:maven-source-plugin:2.3
repository=alimaven mirrorOf=* http://maven.aliyun.com/nexus/content/repositories/central/
localRepository=C:/Program Files/apache-maven-3.8.1/maven-repository
settings=C:\Program Files\apache-maven-3.8.1\conf\settings.xml
userSettings=%USERPROFILE%\.m2\settings.xml MISSING
MAVEN_OPTS=(empty)
exactError=Could not transfer maven-source-plugin-2.3.pom from alimaven. Failed to create parent directories for the .pom.lastUpdated file. Lock path not found: C:\Program Files\apache-maven-3.8.1\maven-repository\org\apache\maven\plugins\maven-source-plugin\2.3\maven-source-plugin-2.3.pom.part.lock (系统找不到指定的路径). BUILD FAILURE in ~0.6s.
```

`-Dmaven.source.skip=true` 已传给命令行。它挡不住插件 POM 的解析。按本阶段规则，skip 无效后停止，没有改 `pom.xml`，没有继续后面的 module。

## E. Python

```text
pythonVersion=3.11.15 (main, May 10 2026, 19:31:25) [MSC v.1944 64 bit (AMD64)]
pythonPath=C:\Users\Jiliason\horosa-web-app\local\runtime\windows\python\python.exe
venv=pinned python-build-standalone cpython-3.11.15+20260510, SHA256 c0d6d9da1286640790c07f32c74516486c4ccd170a65952eebb3e125c34e6c67
pyswisseph=20230604 (site-packages\swisseph.cp311-win_amd64.pyd)
flatlib=vendored flatlib-ctrad2
jsonpickle=4.1.2
port=8899 health checked, then process stopped
health=GET /healthz 200 {"ok": true, "service": "chart", "warm": true, "pdSyncRev": "pd_method_sync_v15"}; GET /horosaIdentity 200 {"app": "horosa-chart", "proto": 2, "nonce": ""}
```

这是按 `Prepare_Runtime_Windows.ps1` 的钉死解释器，加上 `astropy/requirements.txt` 全量安装（pip exit 0）。系统上原本没有 Python 3.11，也没有 `runtime\windows\python\python.exe`。安装完成后用启动器同一条 `python -X utf8 -c` bootstrap 拉起现有 `webchartsrv.py`。验证后已停止 PID 14416，端口 8899 已释放。

## F. Integration

```text
JavaToPython=NOT ATTEMPTED
```

Java `:9999` 没有进程。

## G. `/chart`

```text
httpCode=NOT CALLED
requestSource=realChartResult.json input was not sent
responseBytes=0
status=NOT CALLED
```

## H. Golden

```text
HISTORICAL-GOLDEN=astrostudyui/src/divination/engine/__tests__/fixtures/realChartResult.json
LIVE-GOLDEN=0
LIVE-GOLDEN_FILES=(none)
```

## I. Source Changes

```text
frontend=UNCHANGED
javaAlgorithm=UNCHANGED
pythonAlgorithm=UNCHANGED
vendor=UNCHANGED
```

工作区相对索引没有已跟踪文件的 diff。`pom.xml`、`package.json`、Controller、PerChart、`webchartsrv.py` 都没有改。新增内容是未跟踪的 runtime（JDK 17、钉死的 Python 3.11 与其 site-packages）以及本记录。

## J. Exact Errors

```text
BASELINE_MISMATCH: HEAD 4e6d20d != ebc4d9e
CANDIDATE-UNVERIFIED / UNKNOWN: git object is an LFS pointer; payload not in clone; introducing commit has no Java/Python sources
MAVEN_BUILD_BLOCKED: maven-source-plugin:2.3 from alimaven; .pom.part.lock path not found under C:\Program Files\apache-maven-3.8.1\maven-repository
JAVA_RUNTIME_BLOCKED: astrostudyboot.jar missing; :9999 down
jar download URL 404 (prior launcher attempt, unchanged)
```

## K. Build

```text
BUILD: NOT RUN
REASON: production source unchanged
```

另有一次 runtime 恢复构建，不是前端生产构建：

```text
BUILD:
PURPOSE: runtime artifact recovery
RESULT: MAVEN_BUILD_BLOCKED on boundless install (maven-source-plugin:2.3 / alimaven / .pom.part.lock)
```

## L. Next Step

```text
PHASE 5-A.1R2 BLOCKED
STOP.

PHASE 5-A.2 NOT STARTED.
PHASE 5-B NOT STARTED.
```
