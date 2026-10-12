# 直到大地变成一颗酸橙

[English](README.en.md)

明日方舟活动 UI 网页复刻：公路入场、双主页切换，以及普通 / EX / S 地图。

## 预览

![双主页动画](media/preview.gif)

| 街景主页 | 天空主页 |
| --- | --- |
| ![街景](media/home-street.jpg) | ![天空](media/home-sky.jpg) |

| 普通地图 | EX 地图 | S 地图 |
| --- | --- | --- |
| ![普通](media/map-normal.jpg) | ![EX](media/map-ex.jpg) | ![S](media/map-s.jpg) |

![地图动画](media/maps.gif)

## 启动

需要 **Node.js 22+** 和支持 **WebGL 2** 的桌面浏览器，无需安装 npm 依赖。

Windows 双击 `start-preview.cmd`；或在本目录打开终端运行：

```sh
npm start
```

浏览器访问 http://127.0.0.1:4173/ 。保持终端打开，按 Ctrl+C 停止。不要直接双击 HTML。

端口占用时，在 PowerShell 执行 `$env:PORT='4174'; npm start`，然后打开 http://127.0.0.1:4174/ 。

## 操作

| 操作 | 功能 |
| --- | --- |
| 主页左下图标 / B | 切换主页插画 |
| 主页右侧入口 | 打开普通 / EX / S 地图 |
| 地图右下章节按钮 | 切换章节 |
| 地图左上按钮 / Esc | 返回主页 |
| 普通地图拖动 / 滚轮 | 横向浏览 |
| Space / R / H | 暂停或继续 / 重播 / 隐藏或显示工具栏 |

工具栏另有倍速、时间线与全屏控制。若画面停住，检查网址是否带有 `?frame=`；若无法加载，检查 Node.js 和浏览器硬件加速。

## 项目范围

无战斗、账号和音效；部分 UI、Logo、关卡节点与余额按项目范围省略。材质、粒子和过场仍有近似，未通过原版逐帧一致性验收。预览来自本项目实际渲染。

## 来源、许可与免责声明

本项目为非官方复刻，与鹰角网络（[Hypergryph](https://www.hypergryph.com/)）及相关权利人无隶属关系。原创代码与文档采用 [MIT 许可](LICENSE)；《明日方舟》的插画、标识、贴图、动画、布局、材质及网格数据归原权利人所有，不在 MIT 授权范围内。截图、GIF 和视频含有相同游戏素材，不因此获得额外授权。来源记录不等于再分发许可。

使用的 `NotoSansHans-Medium.otf` 保持原样，内嵌版权为 © 2014 Adobe Systems Incorporated，内嵌许可声明为 Apache 2.0。随项目附上 [字体声明](assets/fonts/NotoSansHans-NOTICE.txt) 与 [Apache 2.0 许可](assets/fonts/Apache-2.0.txt)；依据为实际字体文件的声明，而非同系列新版字体。

参考：[原版演示](https://www.bilibili.com/video/BV1mQ4R6gEfj/) · [复刻项目视频](https://www.bilibili.com/video/BV14aYL6GEbx/) · [arknights-motion-library](https://github.com/Ulchemist/arknights-motion-library)。视频用于效果与时序参考，发布包不含其副本；列出复刻项目不代表复用了其代码。

<details>
<summary>素材来源记录</summary>

- 游戏资源来自活动 `act53side`，历史版本 `26-08-07-14-53-29_30b8f0`；原始 AB 的 MD5 为 `ca93746869f49db6b59c1be4d971cfef`。
- `assets/native` 保存派生素材；活动包包含 477 个图像条目、24 段 AnimationClip，布局、动画及道路网格对应 `scene.json`、`road-mesh.json` 和 `chapters/layout.json`。
- 返回与主页导航图标来自客户端 `sharedassets1.assets` 的 Sprite 448 / 638；字体来自 Font 357，版本 1.000，name 表 13/14 声明 Apache 2.0（[官方文本](https://www.apache.org/licenses/LICENSE-2.0.txt)）。
- 原包、UnityPy 提取工具与研究证据保存在开发目录，不进入运行包；UnityPy 不是运行依赖。

</details>
