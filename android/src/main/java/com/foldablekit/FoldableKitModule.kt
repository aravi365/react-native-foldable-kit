package com.foldablekit

import android.app.Activity
import android.content.Context
import android.graphics.Rect
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.View
import androidx.core.content.ContextCompat
import androidx.core.util.Consumer
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import java.lang.ref.WeakReference

private const val CLOSED_BELOW = 15f

private data class Region(
  val kind: String,
  val x: Double,
  val y: Double,
  val width: Double,
  val height: Double,
  val separating: Boolean
)

private data class Snapshot(
  val isFoldable: Boolean = false,
  val hingeStatus: String = "unknown",
  val hingeAngle: Double = -1.0,
  val regions: List<Region> = emptyList()
)

class FoldableKitModule(reactContext: ReactApplicationContext) :
  NativeFoldableKitSpec(reactContext), LifecycleEventListener, SensorEventListener {

  companion object {
    const val NAME = "FoldableKit"
  }

  private val main = Handler(Looper.getMainLooper())
  private val sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
  private val hingeSensor: Sensor? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) sensorManager?.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE) else null

  private var activity: WeakReference<Activity>? = null
  private var tracker: WindowInfoTrackerCallbackAdapter? = null
  private var features: List<FoldingFeature> = emptyList()
  private var sawFold = false
  private var angle: Float? = null
  private var sensorOn = false
  private var emitScheduled = false

  @Volatile private var angleEnabled = false
  @Volatile private var snapshot = Snapshot()

  private val layoutConsumer = Consumer<WindowLayoutInfo> { info ->
    features = info.displayFeatures.filterIsInstance<FoldingFeature>()
    if (features.isNotEmpty()) sawFold = true
    scheduleEmit()
  }

  private val layoutListener = View.OnLayoutChangeListener { _, l, t, r, b, oldL, oldT, oldR, oldB ->
    if (l != oldL || t != oldT || r != oldR || b != oldB) scheduleEmit()
  }

  init {
    reactContext.addLifecycleEventListener(this)
    main.post { attach() }
  }

  override fun getState(): WritableMap {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      attach()
      snapshot = compute()
    }
    return toMap(snapshot)
  }

  override fun setAngleUpdatesEnabled(enabled: Boolean) {
    angleEnabled = enabled
    scheduleEmit()
  }

  // Lifecycle

  override fun onHostResume() = attach()

  override fun onHostPause() = detach()

  override fun onHostDestroy() = detach()

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    main.post { detach() }
    super.invalidate()
  }

  private fun attach() {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      main.post { attach() }
      return
    }
    val current = reactApplicationContext.currentActivity ?: return
    if (activity?.get() === current && tracker != null) return
    detach()
    activity = WeakReference(current)
    tracker = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(current)).also {
      it.addWindowLayoutInfoListener(current, ContextCompat.getMainExecutor(current), layoutConsumer)
    }
    current.window?.decorView?.addOnLayoutChangeListener(layoutListener)
    hingeSensor?.let {
      sensorOn = sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) == true
    }
    scheduleEmit()
  }

  private fun detach() {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      main.post { detach() }
      return
    }
    tracker?.removeWindowLayoutInfoListener(layoutConsumer)
    tracker = null
    activity?.get()?.window?.decorView?.removeOnLayoutChangeListener(layoutListener)
    activity = null
    if (sensorOn) sensorManager?.unregisterListener(this)
    sensorOn = false
  }

  // Sensor

  override fun onSensorChanged(event: SensorEvent) {
    angle = event.values.firstOrNull()
    scheduleEmit()
  }

  override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) = Unit

  // State

  private fun scheduleEmit() {
    if (emitScheduled) return
    emitScheduled = true
    main.post {
      emitScheduled = false
      val next = compute()
      if (next == snapshot) return@post
      snapshot = next
      emitOnChange(toMap(next))
    }
  }

  private fun compute(): Snapshot {
    val act = activity?.get()
    val density = reactApplicationContext.resources.displayMetrics.density
    val regions = mutableListOf<Region>()

    for (f in features) {
      val separating = f.isSeparating || f.occlusionType == FoldingFeature.OcclusionType.FULL
      regions += f.bounds.toRegion("division", density, separating)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      act?.window?.decorView?.rootWindowInsets?.displayCutout?.boundingRects?.forEach {
        regions += it.toRegion("occlusion", density, false)
      }
    }

    val a = angle
    val state = features.firstOrNull()?.state
    val status = when {
      state == FoldingFeature.State.HALF_OPENED -> "partiallyOpen"
      state == FoldingFeature.State.FLAT -> "fullyOpen"
      a != null && a <= CLOSED_BELOW -> "closed"
      else -> "unknown"
    }

    return Snapshot(
      isFoldable = hingeSensor != null || sawFold,
      hingeStatus = status,
      hingeAngle = if (angleEnabled && a != null) a.toDouble() else -1.0,
      regions = regions
    )
  }

  private fun Rect.toRegion(kind: String, density: Float, separating: Boolean) = Region(
    kind,
    (left / density).toDouble(),
    (top / density).toDouble(),
    (width() / density).toDouble(),
    (height() / density).toDouble(),
    separating
  )

  private fun toMap(s: Snapshot): WritableMap = Arguments.createMap().apply {
    putBoolean("isSupported", true)
    putBoolean("isFoldable", s.isFoldable)
    putString("hingeStatus", s.hingeStatus)
    putDouble("hingeAngle", s.hingeAngle)
    putString("verticalBarEdge", "none")
    putString("horizontalSizeClass", "unspecified")
    putString("verticalSizeClass", "unspecified")
    putArray("regions", Arguments.createArray().apply {
      s.regions.forEach { r ->
        pushMap(Arguments.createMap().apply {
          putString("kind", r.kind)
          putDouble("x", r.x)
          putDouble("y", r.y)
          putDouble("width", r.width)
          putDouble("height", r.height)
          putBoolean("active", true)
          putBoolean("separating", r.separating)
        })
      }
    })
  }
}
