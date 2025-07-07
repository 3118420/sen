import { useState, useEffect } from 'react';

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'foldable';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation: 'portrait' | 'landscape';
  isFoldable: boolean;
  isFolded: boolean;
  hasNotch: boolean;
  hasDynamicIsland: boolean;
  touchCapable: boolean;
  pixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ResponsiveConfig {
  showSidebar: boolean;
  navigationStyle: 'bottom' | 'side' | 'top';
  chatLayout: 'single' | 'split' | 'overlay';
  emotionDisplayStyle: 'compact' | 'expanded' | 'dashboard';
  touchTargetSize: 'small' | 'medium' | 'large';
  animationLevel: 'minimal' | 'standard' | 'enhanced';
}

const BREAKPOINTS = {
  xs: 0,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

const DEVICE_CONFIGS: Record<string, Partial<ResponsiveConfig>> = {
  // iPhone SE (375×667px)
  'iphone-se': {
    navigationStyle: 'bottom',
    chatLayout: 'single',
    emotionDisplayStyle: 'compact',
    touchTargetSize: 'large',
    showSidebar: false
  },
  // iPhone XR/12/13 (414×896px)
  'iphone-standard': {
    navigationStyle: 'bottom',
    chatLayout: 'single',
    emotionDisplayStyle: 'compact',
    touchTargetSize: 'medium',
    showSidebar: false
  },
  // iPhone 14 Pro Max (430×932px)
  'iphone-pro-max': {
    navigationStyle: 'bottom',
    chatLayout: 'single',
    emotionDisplayStyle: 'expanded',
    touchTargetSize: 'medium',
    showSidebar: false
  },
  // iPad Mini (768×1024px)
  'ipad-mini': {
    navigationStyle: 'side',
    chatLayout: 'split',
    emotionDisplayStyle: 'expanded',
    touchTargetSize: 'medium',
    showSidebar: true
  },
  // iPad Pro (1024×1366px)
  'ipad-pro': {
    navigationStyle: 'side',
    chatLayout: 'split',
    emotionDisplayStyle: 'dashboard',
    touchTargetSize: 'small',
    showSidebar: true
  },
  // Galaxy Z Fold (closed: 344×882px, open: 768×1812px)
  'galaxy-fold-closed': {
    navigationStyle: 'bottom',
    chatLayout: 'single',
    emotionDisplayStyle: 'compact',
    touchTargetSize: 'large',
    showSidebar: false
  },
  'galaxy-fold-open': {
    navigationStyle: 'side',
    chatLayout: 'split',
    emotionDisplayStyle: 'dashboard',
    touchTargetSize: 'medium',
    showSidebar: true
  },
  // Desktop
  'desktop': {
    navigationStyle: 'side',
    chatLayout: 'split',
    emotionDisplayStyle: 'dashboard',
    touchTargetSize: 'small',
    showSidebar: true
  }
};

export const useResponsiveDesign = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'mobile',
    size: 'sm',
    orientation: 'portrait',
    isFoldable: false,
    isFolded: false,
    hasNotch: false,
    hasDynamicIsland: false,
    touchCapable: false,
    pixelRatio: 1,
    viewportWidth: 0,
    viewportHeight: 0
  });

  const [config, setConfig] = useState<ResponsiveConfig>({
    showSidebar: false,
    navigationStyle: 'bottom',
    chatLayout: 'single',
    emotionDisplayStyle: 'compact',
    touchTargetSize: 'medium',
    animationLevel: 'standard'
  });

  const detectDevice = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Detect device type and size
    let type: DeviceInfo['type'] = 'mobile';
    let size: DeviceInfo['size'] = 'sm';
    
    if (width >= BREAKPOINTS['2xl']) {
      type = 'desktop';
      size = '2xl';
    } else if (width >= BREAKPOINTS.xl) {
      type = 'desktop';
      size = 'xl';
    } else if (width >= BREAKPOINTS.lg) {
      type = 'tablet';
      size = 'lg';
    } else if (width >= BREAKPOINTS.md) {
      type = 'tablet';
      size = 'md';
    } else if (width >= BREAKPOINTS.sm) {
      type = 'mobile';
      size = 'sm';
    } else {
      type = 'mobile';
      size = 'xs';
    }

    // Detect specific devices
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    // Detect foldable devices
    const isFoldable = width === 344 || (width === 768 && height > 1500);
    const isFolded = width === 344;
    
    // Detect notch/Dynamic Island
    const hasNotch = isIOS && window.screen.height >= 812;
    const hasDynamicIsland = isIOS && window.screen.height >= 844 && pixelRatio >= 3;
    
    // Touch capability
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      type,
      size,
      orientation,
      isFoldable,
      isFolded,
      hasNotch,
      hasDynamicIsland,
      touchCapable,
      pixelRatio,
      viewportWidth: width,
      viewportHeight: height
    };
  };

  const getOptimalConfig = (device: DeviceInfo): ResponsiveConfig => {
    let configKey = 'desktop';
    
    // Determine config based on device characteristics
    if (device.isFoldable) {
      configKey = device.isFolded ? 'galaxy-fold-closed' : 'galaxy-fold-open';
    } else if (device.type === 'mobile') {
      if (device.viewportWidth <= 375) {
        configKey = 'iphone-se';
      } else if (device.viewportWidth >= 430) {
        configKey = 'iphone-pro-max';
      } else {
        configKey = 'iphone-standard';
      }
    } else if (device.type === 'tablet') {
      if (device.viewportWidth <= 820) {
        configKey = 'ipad-mini';
      } else {
        configKey = 'ipad-pro';
      }
    }

    const baseConfig = DEVICE_CONFIGS[configKey] || DEVICE_CONFIGS.desktop;
    
    // Adjust for performance
    const animationLevel = device.pixelRatio > 2 && device.touchCapable ? 'enhanced' : 'standard';
    
    return {
      showSidebar: false,
      navigationStyle: 'bottom',
      chatLayout: 'single',
      emotionDisplayStyle: 'compact',
      touchTargetSize: 'medium',
      animationLevel,
      ...baseConfig
    };
  };

  useEffect(() => {
    const updateDevice = () => {
      const newDeviceInfo = detectDevice();
      setDeviceInfo(newDeviceInfo);
      setConfig(getOptimalConfig(newDeviceInfo));
    };

    updateDevice();
    
    const handleResize = () => updateDevice();
    const handleOrientationChange = () => {
      setTimeout(updateDevice, 100); // Delay to ensure accurate measurements
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const updateConfig = (updates: Partial<ResponsiveConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return {
    deviceInfo,
    config,
    updateConfig,
    isCompact: deviceInfo.size === 'xs' || deviceInfo.size === 'sm',
    isMobile: deviceInfo.type === 'mobile',
    isTablet: deviceInfo.type === 'tablet',
    isDesktop: deviceInfo.type === 'desktop',
    isFoldable: deviceInfo.isFoldable,
    hasAdvancedFeatures: deviceInfo.pixelRatio > 2 || deviceInfo.type !== 'mobile'
  };
};