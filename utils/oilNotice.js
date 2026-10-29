const TEMPLATE_ID = 'B1PjfE9EqEsrXxuTov1BiA5zD1rV2KSKx0LKIm2a-cs'

function miniprogramState() {
  try {
    const env = wx.getAccountInfoSync().miniProgram.envVersion
    if (env === 'develop') return 'developer'
    if (env === 'trial') return 'trial'
  } catch (e) {}
  return 'formal'
}

function requestOilSubscribe() {
  return new Promise((resolve) => {
    if (!wx.requestSubscribeMessage) {
      resolve(false)
      return
    }
    let accepted = false
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve(accepted)
    }
    try {
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success(res) {
          accepted = !!(res && res[TEMPLATE_ID] === 'accept')
        },
        complete: done
      })
    } catch (e) {
      done()
    }
  })
}

function openOilPrice(url) {
  const target = url || '/packageTravel/pages/oilprice/oilprice'
  const go = () => wx.navigateTo({ url: target })
  requestOilSubscribe().then((accepted) => {
    if (accepted && wx.cloud) {
      wx.cloud.callFunction({
        name: 'oilNotice',
        data: {
          action: 'subscribe',
          miniprogramState: miniprogramState()
        }
      }).catch((err) => {
        console.error('oilNotice subscribe', err)
      })
    }
    go()
  })
}

module.exports = {
  openOilPrice
}
