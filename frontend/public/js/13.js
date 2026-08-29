
gsap.registerPlugin(SplitText);

function initButton066() {
  const buttons = document.querySelectorAll('[data-button-066]');
  if (buttons.length === 0) return;

  buttons.forEach((element) => {
    const text = element.querySelector('[data-button-066-text]');
    const icon = element.querySelector('[data-button-066-icon]');
    if (!text) return;

    const splitText = new SplitText(text, {
      type: 'chars',
      tag: 'span',
      charsClass: 'button-066__split-char',
      propIndex: true,
    });

    gsap.set(splitText.chars, { display: 'inline-block' });

    const charCount = splitText.chars?.length ?? 0;
    const iconIsBeforeText = !!icon && !!(icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING);
    const getDirection = (globalIndex) => (globalIndex % 2 === 0 ? -1 : 1);

    if (icon) {
      const iconGlobalIndex = iconIsBeforeText ? 0 : charCount;
      icon.style.setProperty('--button-066-char-direction', getDirection(iconGlobalIndex));

      const index = iconIsBeforeText ? 0 : charCount + 1;
      icon.style.setProperty('--index', index);
      element.style.setProperty('--button-066-index-offset', '0');
    }

    const charStartIndex = iconIsBeforeText ? 1 : 0;

    splitText.chars.forEach((charEl, i) => {
      const globalIndex = charStartIndex + i;
      charEl.style.setProperty('--button-066-char-direction', getDirection(globalIndex));
    });
  });
}

// Initialize Button 066
document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(function () {
    initButton066();
  });
});
