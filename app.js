const { checkLocalVersion, checkMiniProgramUpdate } = require('./utils/version')

App({
  onLaunch() {
    const versionInfo = checkLocalVersion()
    if (versionInfo.upgraded) {
      console.log(
        `[version] 本地版本已从 ${versionInfo.from} 升级到 ${versionInfo.to}，已清理旧缓存`
      )
    }

    // 正式版/体验版：自动检查微信后台是否有新版本包
    checkMiniProgramUpdate()
  }
})
