const input = document.getElementById('url')
document.getElementById('ver').textContent = 'Versio ' + chrome.runtime.getManifest().version + ' · ID ' + chrome.runtime.id
chrome.storage.local.get('dashboardUrl').then(({ dashboardUrl }) => {
  input.value = dashboardUrl || 'https://villetoimela.github.io/flippari/'
})
document.getElementById('open').onclick = async () => {
  const url = input.value.trim()
  await chrome.storage.local.set({ dashboardUrl: url })
  chrome.tabs.create({ url })
}
