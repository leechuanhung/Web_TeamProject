// 헤더 애니메이션
const header = document.querySelector("header");

    window.addEventListener("scroll", () => {
      if (window.scrollY > 120) {
      header.classList.add("scrolled");
    }

    if (window.scrollY < 90) {
      header.classList.remove("scrolled");
    }
    });

// 마커 클릭
const marker = document.querySelector(".map-marker");
const close = document.querySelector("#close-details");
const details = document.querySelector(".details");

marker.addEventListener("click", () => {
  details.style.display = "block";
});

close.addEventListener("click", () => {
  details.style.display = "none";
});
