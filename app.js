const { checkLocalVersion, checkMiniProgramUpdate } = require('./utils/version')
const { getThemeId } = require('./utils/theme')

App({
  globalData: {
    theme: 'forest'
  },

  onLaunch() {
    this.globalData.theme = getThemeId()

    const versionInfo = checkLocalVersion()
    if (versionInfo.upgraded) {
      console.log(
        `[version] 本地版本已从 ${versionInfo.from} 升级到 ${versionInfo.to}，已清理计算缓存并保留我的方案`
      )
    }

    // 正式版/体验版：自动检查微信后台是否有新版本包
    checkMiniProgramUpdate()
  }
})
