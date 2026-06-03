import { configureStore } from '@reduxjs/toolkit'
import userSlice from './features/user/userSlice.js'
import commonSlice from './features/common/commonSlice.js'
import subjectSlice from './features/subject/subjectSlice.js'
import classEntitySlice from './features/class/classEntitySlice.js'
import systemSettingSlice from './features/system-setting/systemSettingSlice.js'

export const store = configureStore({
  reducer: {
    user: userSlice,
    common: commonSlice,
    subject: subjectSlice,
    classEntity: classEntitySlice,
    systemSetting: systemSettingSlice
  }
})
