const { createPickerTick } = require('../../utils/pickerTick')
const { formatYMD, buildPickerState, applyPickerChange, clampYMD } = require('../../utils/solarPicker')

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '选择日期'
    },
    value: {
      type: String,
      value: ''
    },
    start: {
      type: String,
      value: '1900-01-01'
    },
    end: {
      type: String,
      value: '2100-12-31'
    }
  },

  data: {
    visible: false,
    years: [],
    months: [],
    days: [],
    pickerValue: [0, 0, 0]
  },

  lifetimes: {
    attached() {
      this._pickerTick = createPickerTick()
      this._min = { year: 1900, month: 1, day: 1 }
      this._max = { year: 2100, month: 12, day: 31 }
      this._pending = this._min
    },
    detached() {
      if (this._pickerTick) {
        this._pickerTick.destroy()
        this._pickerTick = null
      }
    }
  },

  observers: {
    show(show) {
      if (show) {
        this.openPicker()
        return
      }
      this.setData({ visible: false })
    }
  },

  methods: {
    openPicker() {
      const state = buildPickerState(this.data.value, this.data.start, this.data.end)
      this._min = state.min
      this._max = state.max
      this._pending = state.picked
      this._pickerReady = false
      this._syncing = false
      if (this._pickerTick) this._pickerTick.prepare()
      this.setData(
        {
          visible: true,
          years: state.years,
          months: state.months,
          days: state.days,
          pickerValue: state.pickerValue
        },
        () => {
          setTimeout(() => {
            this._pickerReady = true
          }, 180)
        }
      )
    },

    onPickerChange(e) {
      const value = (e.detail && e.detail.value) || []
      const next = applyPickerChange(value, this.data.months, this.data.days, this._min, this._max)
      this._pending = next.picked
      if (this._syncing) return
      if (this._pickerReady && this._pickerTick) this._pickerTick.play()
      if (next.columnsChanged) {
        this._syncing = true
        this.setData(
          {
            months: next.months,
            days: next.days,
            pickerValue: next.pickerValue
          },
          () => {
            this._syncing = false
          }
        )
      }
    },

    onConfirm() {
      const picked = clampYMD(this._pending, this._min, this._max)
      this.triggerEvent('confirm', { value: formatYMD(picked) })
    },

    onCancel() {
      this.triggerEvent('cancel')
    },

    onSheetTap() {},

    preventMove() {}
  }
})
