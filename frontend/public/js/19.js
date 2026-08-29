
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.testimonials_rock-wrapper').forEach((wrapper) => {
      // Negative delay drops each wrapper into a different point of the loop immediately
      const randomDelay = -(Math.random() * 7).toFixed(2);
      // Slight duration variance so they drift out of phase over time too
      const randomDuration = (6 + Math.random() * 2).toFixed(2); // 6s–8s
      // Randomly flip direction on each axis independently
      const dirX = Math.random() < 0.5 ? 1 : -1;
      const dirY = Math.random() < 0.5 ? 1 : -1;
      wrapper.style.setProperty('--float-delay', `${randomDelay}s`);
      wrapper.style.setProperty('--float-duration', `${randomDuration}s`);
      wrapper.style.setProperty('--float-dir-x', dirX);
      wrapper.style.setProperty('--float-dir-y', dirY);
    });
  });
