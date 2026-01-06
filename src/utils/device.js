export const isIOS = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

export const isAndroid = () => {
  const ua = navigator.userAgent;
  return /Android/.test(ua);
}

export const isHarmonyOS = () => {
  const ua = navigator.userAgent;
  return /HarmonyOS/.test(ua) || /Huawei/.test(ua);
}

// 获取设备类型
export const getDeviceType = () => {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  if (isHarmonyOS()) return 'harmony';
  return 'other';
}

// 添加设备类到body
export const addDeviceClass = () => {
  const deviceType = getDeviceType();
  document.body.classList.add(`${deviceType}-device`);
  // 同时添加到html根元素，方便CSS选择
  document.documentElement.classList.add(`${deviceType}-device`);
}
