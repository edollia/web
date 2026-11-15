(function () {
  var MAIN_SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
  var MAIN_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
  var root = document.documentElement;
  var arrivedFromNote = false;

  root.classList.add('rooms-gate-pending');
  try {
    arrivedFromNote = sessionStorage.getItem('doll_rooms_from_pull') === '1';
    sessionStorage.removeItem('doll_rooms_from_pull');
  } catch (error) {
    arrivedFromNote = false;
  }

  function revealRooms() {
    root.classList.remove('rooms-gate-pending');
    if (!arrivedFromNote) return;
    root.classList.add('rooms-note-arrival');

    function beginArrival() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.classList.add('rooms-note-arrival-ready');
        });
      });

      window.setTimeout(function () {
        root.classList.remove('rooms-note-arrival', 'rooms-note-arrival-ready');
      }, 760);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', beginArrival, { once: true });
    } else {
      beginArrival();
    }
  }

  function showNotFound() {
    var target = new URL('../rooms-unavailable/', window.location.href).href;
    window.location.replace(target);
  }

  async function checkRoomsAvailability() {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeout;

    try {
      var rows = await Promise.race([
        (async function () {
          var response = await fetch(MAIN_SUPABASE_URL + '/rest/v1/site_settings?id=eq.links&select=value', {
            headers: {
              apikey: MAIN_SUPABASE_ANON,
              Authorization: 'Bearer ' + MAIN_SUPABASE_ANON
            },
            cache: 'no-store',
            signal: controller?.signal
          });
          if (!response.ok) throw new Error('rooms availability unavailable');
          return response.json();
        }()),
        new Promise(function (_, reject) {
          timeout = window.setTimeout(function () {
            controller?.abort();
            reject(new Error('rooms availability timed out'));
          }, 3000);
        })
      ]);
      if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.value?.rooms_enabled !== true) {
        showNotFound();
        return;
      }
      revealRooms();
    } catch (error) {
      // A cached ON value cannot authorize Rooms during a settings outage.
      showNotFound();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  checkRoomsAvailability();
}());
