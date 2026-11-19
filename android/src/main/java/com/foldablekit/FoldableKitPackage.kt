package com.foldablekit

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class FoldableKitPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == FoldableKitModule.NAME) FoldableKitModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      FoldableKitModule.NAME to ReactModuleInfo(
        FoldableKitModule.NAME,
        FoldableKitModule.NAME,
        false,
        false,
        false,
        true
      )
    )
  }
}
