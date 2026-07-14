(function () {
  try {
    if (sessionStorage.getItem('doll_rooms_from_pull') !== '1') return;
    sessionStorage.removeItem('doll_rooms_from_pull');
  } catch (error) {
    return;
  }

  var root = document.documentElement;
  root.classList.add('rooms-note-arrival');

  document.addEventListener('DOMContentLoaded', function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('rooms-note-arrival-ready');
      });
    });

    window.setTimeout(function () {
      root.classList.remove('rooms-note-arrival', 'rooms-note-arrival-ready');
    }, 760);
  }, { once: true });
}());
