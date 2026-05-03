(function () {
  var pages = ["vatax.html", "gitax.html"];
  var minDistance = 72;
  var maxVerticalDrift = 58;
  var mobileQuery = window.matchMedia("(max-width: 768px)");
  var startX = 0;
  var startY = 0;
  var startTarget = null;

  function currentPage() {
    var name = window.location.pathname.split("/").pop() || "index.html";
    return name.toLowerCase();
  }

  function isInteractive(target) {
    return !!target.closest("a, button, input, select, textarea, label, [role='button'], .mobile-sticky-cta, .social-links");
  }

  function goToPage(direction) {
    var page = currentPage();
    var index = pages.indexOf(page);

    if (index === -1) {
      return;
    }

    var nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= pages.length) {
      return;
    }

    window.location.href = pages[nextIndex];
  }

  window.addEventListener("touchstart", function (event) {
    if (!mobileQuery.matches || event.touches.length !== 1) {
      return;
    }

    startTarget = event.target;

    if (isInteractive(startTarget)) {
      startTarget = null;
      return;
    }

    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", function (event) {
    if (!mobileQuery.matches || !startTarget || event.changedTouches.length !== 1) {
      return;
    }

    var endX = event.changedTouches[0].clientX;
    var endY = event.changedTouches[0].clientY;
    var deltaX = endX - startX;
    var deltaY = endY - startY;

    startTarget = null;

    if (Math.abs(deltaX) < minDistance || Math.abs(deltaY) > maxVerticalDrift) {
      return;
    }

    goToPage(deltaX < 0 ? 1 : -1);
  }, { passive: true });
})();
