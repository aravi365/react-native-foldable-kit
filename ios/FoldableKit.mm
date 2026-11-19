#import "FoldableKit.h"

#import <React/RCTInvalidating.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>

// iOS 27.1 SDK (Xcode 27.1+). Older Xcode still compiles; the module then reports inert values.
#if __has_include(<UIKit/UIHingeInteraction.h>)
#define FK_HAS_DUO_SDK 1
#else
#define FK_HAS_DUO_SDK 0
#endif

using namespace facebook::react;

#pragma mark - Region tracker

// UIKit has no reserved-region notification. Reading regions inside updateConstraints makes UIKit
// re-run it whenever a region moves or toggles active, which is the change signal.
@interface FKRegionTrackerView : UIView
@property (nonatomic, copy, nullable) dispatch_block_t onChange;
@end

@implementation FKRegionTrackerView

+ (BOOL)requiresConstraintBasedLayout
{
  return YES;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.translatesAutoresizingMaskIntoConstraints = NO;
    self.userInteractionEnabled = NO;
    self.backgroundColor = UIColor.clearColor;
    self.accessibilityElementsHidden = YES;
  }
  return self;
}

- (void)attachTo:(UIView *)view
{
  [view addSubview:self];
  [NSLayoutConstraint activateConstraints:@[
    [self.topAnchor constraintEqualToAnchor:view.topAnchor],
    [self.bottomAnchor constraintEqualToAnchor:view.bottomAnchor],
    [self.leadingAnchor constraintEqualToAnchor:view.leadingAnchor],
    [self.trailingAnchor constraintEqualToAnchor:view.trailingAnchor],
  ]];
}

- (void)updateConstraints
{
#if FK_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    (void)[self reservedRegionsOfKind:[UIViewReservedRegionKind occlusionRegionKind]
                              options:UIViewReservedRegionQueryOptionsIncludeInactive];
    (void)[self reservedRegionsOfKind:[UIViewReservedRegionKind divisionRegionKind]
                              options:UIViewReservedRegionQueryOptionsIncludeInactive];
  }
#endif
  [super updateConstraints];
  dispatch_block_t cb = self.onChange;
  if (cb) {
    dispatch_async(dispatch_get_main_queue(), cb);
  }
}

@end

#pragma mark - Helpers

static UIWindow *FKWindowInScenes(NSInteger state)
{
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class]) {
      continue;
    }
    if (state != NSNotFound && scene.activationState != state) {
      continue;
    }
    UIWindow *first = nil;
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      if (window.isKeyWindow) {
        return window;
      }
      first = first ?: window;
    }
    if (first) {
      return first;
    }
  }
  return nil;
}

static UIView *FKRootView(void)
{
  for (NSNumber *state in @[ @(UISceneActivationStateForegroundActive), @(UISceneActivationStateForegroundInactive) ]) {
    UIWindow *window = FKWindowInScenes(state.integerValue);
    if (window) {
      return window.rootViewController.view ?: window;
    }
  }
  UIWindow *window = FKWindowInScenes(NSNotFound);
  return window.rootViewController.view ?: window;
}

static NSString *FKSizeClass(UIUserInterfaceSizeClass c)
{
  switch (c) {
    case UIUserInterfaceSizeClassCompact:
      return @"compact";
    case UIUserInterfaceSizeClassRegular:
      return @"regular";
    default:
      return @"unspecified";
  }
}

#pragma mark - Module

@interface FoldableKit () <RCTInvalidating>
@end

@implementation FoldableKit {
  BOOL _invalidated;
  BOOL _angleEnabled;
  BOOL _hasHinge;
  NSString *_hingeStatus;
  double _hingeAngle;
  NSDictionary *_lastState;
  BOOL _emitScheduled;
  __weak UIView *_view;
  id _hingeInteraction;
  id _traitRegistration;
  FKRegionTrackerView *_tracker;
}

+ (NSString *)moduleName
{
  return @"FoldableKit";
}

- (instancetype)init
{
  if (self = [super init]) {
    _hingeStatus = @"unknown";
    _hingeAngle = -1;
    [NSNotificationCenter.defaultCenter addObserver:self
                                           selector:@selector(_sceneDidActivate)
                                               name:UISceneDidActivateNotification
                                             object:nil];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeFoldableKitSpecJSI>(params);
}

// UIKit view and interaction changes must happen on main; the bridge invalidates elsewhere.
- (void)invalidate
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
  dispatch_async(dispatch_get_main_queue(), ^{
    self->_invalidated = YES;
    UIView *view = self->_view;
    if (view) {
      [self _detachFrom:view];
    }
  });
}

- (void)dealloc
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
  UIView *view = _view;
  if (!view) {
    return;
  }
  [view removeObserver:self forKeyPath:@"bounds"];
  id traits = _traitRegistration;
  id hinge = _hingeInteraction;
  FKRegionTrackerView *tracker = _tracker;
  dispatch_block_t detach = ^{
    if (traits) {
      if (@available(iOS 17.0, *)) {
        [view unregisterForTraitChanges:traits];
      }
    }
    if (hinge) {
      [view removeInteraction:hinge];
    }
    tracker.onChange = nil;
    [tracker removeFromSuperview];
  };
  if (NSThread.isMainThread) {
    detach();
  } else {
    dispatch_async(dispatch_get_main_queue(), detach);
  }
}

#pragma mark Spec

- (NSDictionary *)getState
{
  __block NSDictionary *state = nil;
  RCTUnsafeExecuteOnMainQueueSync(^{
    [self _ensureObserving];
    state = [self _computeState];
    self->_lastState = state;
  });
  return state;
}

- (void)setAngleUpdatesEnabled:(BOOL)enabled
{
  [self _onMain:^{
    self->_angleEnabled = enabled;
    [self _scheduleEmit];
  }];
}

#pragma mark State (main queue)

- (NSDictionary *)_computeState
{
  UIView *view = _view ?: FKRootView();
  BOOL supported = NO;
  NSString *edge = @"none";
  NSMutableArray<NSDictionary *> *regions = [NSMutableArray new];
  UITraitCollection *traits = view.traitCollection;

#if FK_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    supported = YES;
    if (view) {
      BOOL rtl = view.effectiveUserInterfaceLayoutDirection == UIUserInterfaceLayoutDirectionRightToLeft;
      switch (traits.verticalBarEdge) {
        case UIVerticalBarEdgeLeading:
          edge = rtl ? @"right" : @"left";
          break;
        case UIVerticalBarEdgeTrailing:
          edge = rtl ? @"left" : @"right";
          break;
        default:
          break;
      }

      NSArray<NSString *> *names = @[ @"occlusion", @"division" ];
      NSArray<UIViewReservedRegionKind *> *kinds =
          @[ [UIViewReservedRegionKind occlusionRegionKind], [UIViewReservedRegionKind divisionRegionKind] ];
      for (NSUInteger i = 0; i < kinds.count; i++) {
        for (UIViewReservedRegion *region in
             [view reservedRegionsOfKind:kinds[i] options:UIViewReservedRegionQueryOptionsIncludeInactive]) {
          CGRect f = [view convertRect:region.frame toView:nil];
          [regions addObject:@{
            @"kind" : names[i],
            @"x" : @(f.origin.x),
            @"y" : @(f.origin.y),
            @"width" : @(f.size.width),
            @"height" : @(f.size.height),
            @"active" : @(region.isActive),
            // UIKit can leave the division active briefly after the hinge opens fully.
            @"separating" : @(i == 1 && region.isActive && [_hingeStatus isEqualToString:@"partiallyOpen"]),
          }];
        }
      }
    }
  }
#endif

  return @{
    @"isSupported" : @(supported),
    @"isFoldable" : @(_hasHinge),
    @"hingeStatus" : _hingeStatus,
    @"hingeAngle" : @(_angleEnabled ? _hingeAngle : -1),
    @"verticalBarEdge" : edge,
    @"horizontalSizeClass" : FKSizeClass(traits.horizontalSizeClass),
    @"verticalSizeClass" : FKSizeClass(traits.verticalSizeClass),
    @"regions" : regions,
  };
}

- (void)_onMain:(dispatch_block_t)block
{
  if (NSThread.isMainThread) {
    block();
  } else {
    dispatch_async(dispatch_get_main_queue(), block);
  }
}

- (void)_sceneDidActivate
{
  [self _onMain:^{
    [self _ensureObserving];
    [self _scheduleEmit];
  }];
}

// Fold, trait and bounds changes arrive in bursts; emit once per runloop turn, only on change.
- (void)_scheduleEmit
{
  if (_emitScheduled) {
    return;
  }
  _emitScheduled = YES;
  dispatch_async(dispatch_get_main_queue(), ^{
    self->_emitScheduled = NO;
    if (self->_invalidated) {
      return;
    }
    NSDictionary *state = [self _computeState];
    if ([state isEqualToDictionary:self->_lastState]) {
      return;
    }
    self->_lastState = state;
    [self emitOnChange:state];
  });
}

- (void)_ensureObserving
{
  if (_invalidated) {
    return;
  }
  UIView *view = FKRootView();
  if (view == _view) {
    return;
  }
  UIView *previous = _view;
  if (previous) {
    [self _detachFrom:previous];
  }
  if (!view) {
    return;
  }
  _view = view;
  __weak __typeof(self) weakSelf = self;

  [view addObserver:self forKeyPath:@"bounds" options:0 context:nil];

  NSMutableArray *traits = [NSMutableArray new];
#if FK_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    [traits addObjectsFromArray:UITraitCollection.systemTraitsAffectingVerticalBarEdge];
  }
#endif
  if (@available(iOS 17.0, *)) {
    [traits addObject:UITraitHorizontalSizeClass.class];
    [traits addObject:UITraitVerticalSizeClass.class];
    _traitRegistration = [view registerForTraitChanges:traits
                                           withHandler:^(id<UITraitEnvironment> env, UITraitCollection *prev) {
                                             [weakSelf _scheduleEmit];
                                           }];
  }

#if FK_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    UIHingeInteraction *hinge =
        [[UIHingeInteraction alloc] initWithUpdateHandler:^(UIHingeInteraction *i, UIHingeInteractionUpdate *update) {
          UIHinge *latest = update.hinge;
          [weakSelf _onMain:^{
            [weakSelf _applyHinge:latest];
          }];
        }];
    [view addInteraction:hinge];
    _hingeInteraction = hinge;

    FKRegionTrackerView *tracker = [FKRegionTrackerView new];
    tracker.onChange = ^{
      [weakSelf _scheduleEmit];
    };
    [tracker attachTo:view];
    _tracker = tracker;
  }
#endif
}

- (void)_detachFrom:(UIView *)view
{
  [view removeObserver:self forKeyPath:@"bounds"];
  if (_traitRegistration) {
    if (@available(iOS 17.0, *)) {
      [view unregisterForTraitChanges:_traitRegistration];
    }
  }
  if (_hingeInteraction) {
    [view removeInteraction:_hingeInteraction];
  }
  _tracker.onChange = nil;
  [_tracker removeFromSuperview];
  _traitRegistration = nil;
  _hingeInteraction = nil;
  _tracker = nil;
  _hingeStatus = @"unknown";
  _hingeAngle = -1;
  _view = nil;
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary *)change
                       context:(void *)context
{
  [self _onMain:^{
    [self _scheduleEmit];
  }];
}

#if FK_HAS_DUO_SDK
- (void)_applyHinge:(UIHinge *)hinge API_AVAILABLE(ios(27.1))
{
  _hasHinge = hinge != nil;
  if (!hinge) {
    _hingeStatus = @"unknown";
    _hingeAngle = -1;
  } else {
    switch (hinge.status) {
      case UIHingeStatusClosed:
        _hingeStatus = @"closed";
        break;
      case UIHingeStatusPartiallyOpen:
        _hingeStatus = @"partiallyOpen";
        break;
      case UIHingeStatusFullyOpen:
        _hingeStatus = @"fullyOpen";
        break;
      default:
        _hingeStatus = @"unknown";
        break;
    }
    _hingeAngle = hinge.angle * 180.0 / M_PI;
  }
  [self _scheduleEmit];
}
#endif

@end
