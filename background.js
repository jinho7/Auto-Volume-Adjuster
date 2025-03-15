let mediaState = {
  mainTabId: null,
  subTabId: null,
  controlMode: 'playPause',
  subVolume: 80,
  lowVolume: 10
};

// 각 탭의 실제 상태 추적
let tabStates = new Map();

// 설정 로드
chrome.storage.local.get([
  'mainTabId',
  'subTabId',
  'controlMode',
  'subVolume'
], (result) => {
  if (result) {
    mediaState = { ...mediaState, ...result };
    console.log('설정 로드됨:', mediaState);
  }
});

// 디버깅을 위한 로그 함수
function logState(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
  console.log('현재 상태:', mediaState);
  console.log('탭 상태:', Array.from(tabStates.entries()));
}

// 탭 오디오 상태 모니터링
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.audible !== undefined) {
    const isPlaying = changeInfo.audible;
    tabStates.set(tabId, { isPlaying });
    logState(`탭 ${tabId} 상태 변경: ${isPlaying ? '재생' : '정지'}`);
    handleAudioStateChange(tabId, isPlaying);
  }
});

// 오디오 상태 변경 처리
async function handleAudioStateChange(tabId, isPlaying) {
  const mainTabId = parseInt(mediaState.mainTabId);
  const subTabId = parseInt(mediaState.subTabId);

  if (tabId === mainTabId && subTabId) {
    logState(`메인 탭(${mainTabId}) ${isPlaying ? '재생' : '정지'} 감지`);
    
    if (mediaState.controlMode === 'playPause') {
      try {
        if (isPlaying) {
          // 메인(강의) 재생 시 서브(음악) 즉시 정지
          await chrome.scripting.executeScript({
            target: { tabId: subTabId },
            files: ['content.js']
          });

          await chrome.tabs.sendMessage(subTabId, {
            action: 'controlMedia',
            command: 'pause'
          });
        } else {
          // 메인(강의) 정지 시 서브(음악) 즉시 재생
          // 여러 번 시도하여 확실히 재생되도록 함
          const injectAndPlay = async () => {
            await chrome.scripting.executeScript({
              target: { tabId: subTabId },
              files: ['content.js']
            });
            await chrome.tabs.sendMessage(subTabId, {
              action: 'controlMedia',
              command: 'play'
            });
          };

          // 첫 번째 시도
          await injectAndPlay();

          // 100ms 후 한 번 더 시도
          setTimeout(async () => {
            await injectAndPlay();
          }, 100);
        }
      } catch (error) {
        console.error('탭 제어 중 오류:', error);
      }
    }
  }
}

// 볼륨 제어
async function setVolume(tabId, volume) {
  try {
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: false,
      tabId: tabId
    });
    
    if (stream) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const normalizedVolume = volume / 100;
      gainNode.gain.value = normalizedVolume;
      logState(`볼륨 설정 완료: ${volume}%`);
    }
  } catch (error) {
    console.error('볼륨 제어 중 오류:', error);
  }
}

// 설정 업데이트 메시지 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSettings') {
    const oldSettings = { ...mediaState };
    mediaState = { ...mediaState, ...message.settings };
    logState('설정 업데이트됨');
    
    // 현재 상태에 따라 즉시 적용
    const mainTabState = tabStates.get(parseInt(mediaState.mainTabId));
    if (mainTabState) {
      handleAudioStateChange(parseInt(mediaState.mainTabId), mainTabState.isPlaying);
    }
    
    sendResponse({ success: true });
  }
  return true;
});

// 탭이 닫힐 때 처리
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === parseInt(mediaState.mainTabId)) {
    mediaState.mainTabId = null;
    logState('메인 탭 제거됨');
  } else if (tabId === parseInt(mediaState.subTabId)) {
    mediaState.subTabId = null;
    logState('서브 탭 제거됨');
  }
  tabStates.delete(tabId);
});

// 디버깅을 위한 초기 상태 로깅
logState('백그라운드 스크립트 초기화');