let currentTabs = [];

// 모든 오디오 스트림을 가진 탭 찾기
async function updateAudioTabs() {
  try {
    // 1. 모든 탭 가져오기
    const allTabs = await chrome.tabs.query({});
    
    // 2. 이전에 저장된 탭 ID 가져오기
    const savedSettings = await chrome.storage.local.get(['mainTabId', 'subTabId']);
    const savedTabIds = new Set([savedSettings.mainTabId, savedSettings.subTabId].filter(Boolean).map(String));

    // 3. 현재 재생 중이거나 미디어 요소가 있는 탭 필터링
    const mediaTabs = allTabs.filter(tab => {
      // 현재 소리가 나는 탭
      if (tab.audible) return true;
      // 저장된 탭
      if (savedTabIds.has(String(tab.id))) return true;
      // 미디어 관련 URL
      if (tab.url?.includes('youtube.com') || 
          tab.url?.includes('soundcloud.com') ||
          tab.url?.includes('spotify.com') ||
          tab.url?.includes('netflix.com') ||
          tab.url?.includes('classroom.google.com') ||
          tab.url?.includes('udemy.com') ||
          tab.url?.includes('coursera.org') ||
          tab.url?.includes('vimeo.com')) {
        return true;
      }
      return false;
    });

    // 4. 현재 탭 목록 업데이트
    currentTabs = mediaTabs;
    
    // 5. UI 업데이트
    updateMediaSelectors();

  } catch (error) {
    console.error('탭 업데이트 중 오류:', error);
  }
}

// 미디어 선택 드롭다운 업데이트
function updateMediaSelectors() {
  const mainSelect = document.getElementById('mainMediaSelect');
  const subSelect = document.getElementById('subMediaSelect');
  
  // 기존 옵션 초기화
  mainSelect.innerHTML = '<option value="">선택하세요</option>';
  subSelect.innerHTML = '<option value="">선택하세요</option>';
  
  if (currentTabs.length === 0) {
    const noAudio = document.createElement('div');
    noAudio.className = 'no-audio';
    noAudio.textContent = '미디어 탭을 찾을 수 없습니다.';
    document.getElementById('mediaList').appendChild(noAudio);
    return;
  }

  // 새 옵션 추가
  currentTabs.forEach(tab => {
    let status = '';
    if (tab.audible) {
      status = '(재생 중)';
    } else if (tab.url?.includes('youtube.com')) {
      status = '(YouTube)';
    } else if (tab.url?.includes('soundcloud.com')) {
      status = '(SoundCloud)';
    } else {
      status = '(미디어)';
    }

    const mainOption = new Option(`${tab.title} ${status}`, tab.id);
    const subOption = new Option(`${tab.title} ${status}`, tab.id);
    
    mainSelect.add(mainOption);
    subSelect.add(subOption);
  });

  // 저장된 설정 불러오기
  chrome.storage.local.get(['mainTabId', 'subTabId', 'controlMode', 'subVolume'], (result) => {
    if (result.mainTabId) mainSelect.value = result.mainTabId;
    if (result.subTabId) subSelect.value = result.subTabId;
    if (result.controlMode) {
      document.querySelector(`input[name="controlMode"][value="${result.controlMode}"]`).checked = true;
    }
    if (result.subVolume) {
      document.getElementById('subVolume').value = result.subVolume;
      document.getElementById('subVolumeValue').textContent = result.subVolume;
    }
  });
}

// 설정 저장
document.getElementById('saveSettings').addEventListener('click', () => {
  const settings = {
    mainTabId: document.getElementById('mainMediaSelect').value,
    subTabId: document.getElementById('subMediaSelect').value,
    controlMode: document.querySelector('input[name="controlMode"]:checked').value,
    subVolume: document.getElementById('subVolume').value
  };
  chrome.storage.local.set(settings, () => {
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    });
    alert('설정이 저장되었습니다.');
  });
});

// 볼륨 슬라이더 이벤트
document.getElementById('subVolume').addEventListener('input', (e) => {
  document.getElementById('subVolumeValue').textContent = e.target.value;
});

// 새로고침 버튼
document.getElementById('refreshTabs').addEventListener('click', () => {
  updateAudioTabs();
});

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  updateAudioTabs();
});

// 5초마다 자동 업데이트
setInterval(updateAudioTabs, 5000);