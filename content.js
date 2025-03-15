// 페이지의 모든 미디어 요소 제어
function controlMedia(command) {
    console.log(`미디어 제어 명령 수신: ${command}`);
    
    const mediaElements = [...document.getElementsByTagName('video'),
                          ...document.getElementsByTagName('audio')];
    
    mediaElements.forEach(media => {
      try {
        if (command === 'pause') {
          // 즉시 일시정지
          media.pause();
        } else if (command === 'play') {
          // 재생 시도를 여러 번
          const tryPlay = () => {
            const playPromise = media.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.log('재생 재시도...');
                // 실패하면 50ms 후 다시 시도
                setTimeout(tryPlay, 50);
              });
            }
          };
          tryPlay();
        }
      } catch (error) {
        console.error('미디어 제어 중 오류:', error);
      }
    });
  }
  
  // 메시지 리스너
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'controlMedia') {
      controlMedia(message.command);
      sendResponse({ success: true });
    }
    return true;
  });