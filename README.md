# 胸外智分（TNM 分期辅助系统）

## 本地运行

```bash
npm.cmd install
npm.cmd run dev
```

## 生成可安装 App（PWA）

本项目已配置为 PWA（可在手机/电脑浏览器中“安装到桌面/主屏幕”）。

- 浏览器打开部署后的网址
- Chrome/Edge：地址栏右侧会出现“安装”按钮，或菜单里选择“安装应用”
- iOS Safari：分享按钮 → “添加到主屏幕”

## 构建发布

```bash
npm.cmd run build
```

构建产物在 `dist/`。

## 发布到 GitHub Pages

仓库已包含 GitHub Pages 的自动部署工作流（推送到 `master` 后自动构建并发布）。

- GitHub 仓库 → Settings → Pages
- Build and deployment 选择 GitHub Actions
