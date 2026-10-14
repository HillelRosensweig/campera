const screens = document.querySelectorAll("[data-screen]");

export function show(name) {
  screens.forEach((screen) => { screen.hidden = screen.dataset.screen !== name; });
}
