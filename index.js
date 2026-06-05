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
